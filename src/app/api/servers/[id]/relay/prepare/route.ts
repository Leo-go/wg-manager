import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@/lib/supabase/server";
import { resolveSshAuth } from "@/lib/ssh/auth";
import {
  extractUserFacingError,
  runRemoteBashScript,
} from "@/lib/ssh/run-remote";
import { parseExitRelayMarkers } from "@/lib/relay/parse";

export const runtime = "nodejs";
export const maxDuration = 300;

const serverIdSchema = z.string().uuid("serverId must be a valid UUID");

const DEFAULT_RELAY_PORT = 10443;
const DEFAULT_RELAY_PATH = "/wg-relay";
const DEFAULT_EXIT_SNI = "www.microsoft.com";

/**
 * Prepare exit VPS: add xHTTP Reality inbound for RU relays (keeps main :443).
 * POST /api/servers/[id]/relay/prepare
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fullOutput = "";
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const idResult = serverIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: idResult.error.issues[0]?.message ?? "Invalid server id" },
        { status: 400 }
      );
    }
    const exitId = idResult.data;

    const { data: exitRow, error: fetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to load server", details: fetchError.message },
        { status: 500 }
      );
    }
    if (!exitRow) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    if (exitRow.role === "relay") {
      return NextResponse.json(
        { error: "This server is a RU relay, not an exit node" },
        { status: 400 }
      );
    }

    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Exit VPN must be set up first (installation_status=completed)",
        },
        { status: 400 }
      );
    }

    let sshAuth;
    try {
      sshAuth = resolveSshAuth({
        sshPassword: exitRow.ssh_password,
        sshPrivateKey: exitRow.ssh_private_key,
      });
    } catch (authErr) {
      const message =
        authErr instanceof Error ? authErr.message : "SSH auth missing";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "add-exit-relay-inbound.sh"
    );
    if (!fs.existsSync(scriptPath)) {
      throw new Error("add-exit-relay-inbound.sh not found on the app server");
    }
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");

    const relayPort = Number(exitRow.relay_listen_port) || DEFAULT_RELAY_PORT;
    const exitSni = exitRow.sni_domain || DEFAULT_EXIT_SNI;
    const relayPath = exitRow.relay_path || DEFAULT_RELAY_PATH;

    await supabase
      .from("servers")
      .update({ relay_status: "preparing" })
      .eq("id", exitId);

    const result = await runRemoteBashScript({
      host: exitRow.ip_address,
      port: exitRow.ssh_port || 22,
      username: exitRow.ssh_username,
      auth: sshAuth,
      scriptContent,
      args: [String(relayPort), exitSni, relayPath],
    });
    fullOutput = result.fullOutput;

    if (result.code !== 0) {
      throw new Error(
        extractUserFacingError(
          fullOutput,
          `Script execution failed (exit code ${result.code})`
        )
      );
    }

    const markers = parseExitRelayMarkers(fullOutput);

    await supabase
      .from("servers")
      .update({
        role: "exit",
        relay_uuid: markers.uuid,
        relay_public_key: markers.publicKey,
        relay_short_id: markers.shortId,
        relay_listen_port: markers.port,
        relay_path: markers.path,
        relay_status: "exit_ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", exitId);

    return NextResponse.json({
      success: true,
      relay: markers,
      diagnostics: fullOutput,
      message: "Exit VPS is ready for RU relays",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Prepare exit failed";
    console.error("[relay/prepare]", message);

    const { id } = await params;
    if (z.string().uuid().safeParse(id).success) {
      await supabase
        .from("servers")
        .update({ relay_status: "error" })
        .eq("id", id);
    }

    return NextResponse.json(
      {
        error: extractUserFacingError(`${fullOutput}\n${message}`, message),
        diagnostics: fullOutput || undefined,
      },
      { status: 500 }
    );
  }
}
