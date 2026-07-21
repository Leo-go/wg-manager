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
import {
  extractVlessUrl,
  parseExitRelayMarkers,
} from "@/lib/relay/parse";

export const runtime = "nodejs";
export const maxDuration = 300;

const serverIdSchema = z.string().uuid("serverId must be a valid UUID");

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  ip_address: z.string().trim().min(1).max(255),
  ssh_port: z.coerce.number().int().min(1).max(65535).default(22),
  ssh_password: z.string().optional(),
  auth_mode: z.enum(["ssh_key", "password"]).default("ssh_key"),
  /** Client-facing SNI on the RU hop (looks like RU gov site). */
  relay_sni: z.string().trim().min(1).max(255).default("www.gosuslugi.ru"),
});

const DEFAULT_RELAY_PORT = 10443;
const DEFAULT_RELAY_PATH = "/wg-relay";
const DEFAULT_EXIT_SNI = "www.microsoft.com";

type ExitRelayCreds = {
  uuid: string;
  publicKey: string;
  shortId: string;
  port: number;
  path: string;
  sni: string;
};

type ExitServerRow = {
  id: string;
  ip_address: string;
  ssh_port: number | null;
  ssh_password?: string | null;
  ssh_private_key?: string | null;
  sni_domain?: string | null;
  relay_uuid?: string | null;
  relay_public_key?: string | null;
  relay_short_id?: string | null;
  relay_listen_port?: number | null;
  relay_path?: string | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function ensureExitRelayInbound(opts: {
  exitRow: ExitServerRow;
  supabase: SupabaseServer;
}): Promise<{ creds: ExitRelayCreds; diagnostics: string }> {
  const { exitRow, supabase } = opts;

  if (
    exitRow.relay_uuid &&
    exitRow.relay_public_key &&
    exitRow.relay_short_id
  ) {
    return {
      creds: {
        uuid: exitRow.relay_uuid,
        publicKey: exitRow.relay_public_key,
        shortId: exitRow.relay_short_id,
        port: exitRow.relay_listen_port || DEFAULT_RELAY_PORT,
        path: exitRow.relay_path || DEFAULT_RELAY_PATH,
        sni: exitRow.sni_domain || DEFAULT_EXIT_SNI,
      },
      diagnostics: "",
    };
  }

  const sshAuth = resolveSshAuth({
    sshPassword: exitRow.ssh_password,
    sshPrivateKey: exitRow.ssh_private_key,
  });

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "add-exit-relay-inbound.sh"
  );
  if (!fs.existsSync(scriptPath)) {
    throw new Error("add-exit-relay-inbound.sh not found on the app server");
  }
  const scriptContent = fs.readFileSync(scriptPath, "utf-8");

  const relayPort = exitRow.relay_listen_port || DEFAULT_RELAY_PORT;
  const exitSni = exitRow.sni_domain || DEFAULT_EXIT_SNI;
  const relayPath = exitRow.relay_path || DEFAULT_RELAY_PATH;

  await supabase
    .from("servers")
    .update({ relay_status: "preparing" })
    .eq("id", exitRow.id);

  const result = await runRemoteBashScript({
    host: exitRow.ip_address,
    port: exitRow.ssh_port || 22,
    auth: sshAuth,
    scriptContent,
    args: [String(relayPort), exitSni, relayPath],
  });

  if (result.code !== 0) {
    throw new Error(
      extractUserFacingError(
        result.fullOutput,
        `Prepare exit failed (exit code ${result.code})`
      )
    );
  }

  const markers = parseExitRelayMarkers(result.fullOutput);

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
    .eq("id", exitRow.id);

  return { creds: markers, diagnostics: result.fullOutput };
}

/**
 * Provision RU relay linked to an exit server.
 * POST /api/servers/[id]/relay/setup
 * Body: { name, ip_address, ssh_port?, auth_mode?, ssh_password?, relay_sni? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fullOutput = "";
  let relayServerId: string | null = null;
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

    const json = await request.json().catch(() => null);
    const bodyResult = bodySchema.safeParse(json);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          error:
            bodyResult.error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400 }
      );
    }
    const body = bodyResult.data;

    if (body.auth_mode === "password" && !body.ssh_password?.trim()) {
      return NextResponse.json(
        { error: "ssh_password is required when auth_mode=password" },
        { status: 400 }
      );
    }

    const { data: exitRow, error: fetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to load exit server", details: fetchError.message },
        { status: 500 }
      );
    }
    if (!exitRow) {
      return NextResponse.json(
        { error: "Exit server not found" },
        { status: 404 }
      );
    }
    if (exitRow.role === "relay") {
      return NextResponse.json(
        { error: "Cannot attach a relay to another relay" },
        { status: 400 }
      );
    }
    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        { error: "Finish exit VPN setup before adding a RU relay" },
        { status: 400 }
      );
    }

    const prepared = await ensureExitRelayInbound({
      exitRow,
      supabase,
    });
    if (prepared.diagnostics) {
      fullOutput += prepared.diagnostics + "\n";
    }
    const exitCreds = prepared.creds;

    const { data: existingRelays } = await supabase
      .from("servers")
      .select("id")
      .eq("user_id", user.id)
      .eq("exit_server_id", exitId)
      .eq("role", "relay")
      .order("created_at", { ascending: false })
      .limit(1);

    const existingRelayId = existingRelays?.[0]?.id as string | undefined;

    let relayRow: {
      id: string;
      ssh_password?: string | null;
      ssh_private_key?: string | null;
    };

    if (existingRelayId) {
      const { data: updated, error: updateError } = await supabase
        .from("servers")
        .update({
          name: body.name,
          ip_address: body.ip_address,
          ssh_port: body.ssh_port,
          ssh_password:
            body.auth_mode === "password" ? body.ssh_password?.trim() : null,
          sni_domain: body.relay_sni,
          vless_port: 443,
          role: "relay",
          exit_server_id: exitId,
          installation_status: "installing",
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRelayId)
        .select("*")
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          {
            error: updateError?.message ?? "Failed to update relay server row",
          },
          { status: 500 }
        );
      }
      relayRow = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("servers")
        .insert({
          user_id: user.id,
          name: body.name,
          ip_address: body.ip_address,
          ssh_port: body.ssh_port,
          ssh_password:
            body.auth_mode === "password" ? body.ssh_password?.trim() : null,
          sni_domain: body.relay_sni,
          vless_port: 443,
          role: "relay",
          exit_server_id: exitId,
          installation_status: "installing",
          status: "inactive",
          provider: "manual",
        })
        .select("*")
        .single();

      if (insertError || !inserted) {
        console.error("[relay/setup] insert failed:", insertError?.message);
        return NextResponse.json(
          {
            error:
              insertError?.message?.includes("column") ||
              insertError?.message?.includes("role")
                ? "Database is missing relay columns. Run scripts/relay-columns.sql in Supabase, then retry."
                : insertError?.message ?? "Failed to create relay server row",
          },
          { status: 500 }
        );
      }
      relayRow = inserted;
    }
    relayServerId = relayRow.id;

    let relayAuth;
    try {
      relayAuth = resolveSshAuth({
        sshPassword: relayRow.ssh_password,
        sshPrivateKey: relayRow.ssh_private_key,
      });
    } catch (authErr) {
      const message =
        authErr instanceof Error ? authErr.message : "SSH auth missing";
      await supabase
        .from("servers")
        .update({ installation_status: "error", status: "error" })
        .eq("id", relayRow.id);
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const installPath = path.join(
      process.cwd(),
      "scripts",
      "install-ru-relay.sh"
    );
    if (!fs.existsSync(installPath)) {
      throw new Error("install-ru-relay.sh not found on the app server");
    }
    const installScript = fs.readFileSync(installPath, "utf-8");

    await supabase
      .from("servers")
      .update({ relay_status: "installing_relay" })
      .eq("id", exitId);

    const installResult = await runRemoteBashScript({
      host: body.ip_address,
      port: body.ssh_port,
      auth: relayAuth,
      scriptContent: installScript,
      args: [
        exitRow.ip_address,
        String(exitCreds.port),
        exitCreds.uuid,
        exitCreds.publicKey,
        exitCreds.shortId,
        exitCreds.sni,
        exitCreds.path,
        body.ip_address,
        body.relay_sni,
      ],
    });
    fullOutput += installResult.fullOutput;

    if (installResult.code !== 0) {
      throw new Error(
        extractUserFacingError(
          installResult.fullOutput,
          `RU relay install failed (exit code ${installResult.code})`
        )
      );
    }

    const vlessConfigUrl = extractVlessUrl(installResult.fullOutput);
    if (!vlessConfigUrl) {
      throw new Error(
        "Could not parse VLESS config URL from RU relay installer output"
      );
    }

    const now = new Date().toISOString();

    await supabase
      .from("servers")
      .update({
        vless_config_url: vlessConfigUrl,
        installation_status: "completed",
        status: "active",
        last_check: now,
        updated_at: now,
      })
      .eq("id", relayRow.id);

    await supabase
      .from("servers")
      .update({
        relay_vless_config_url: vlessConfigUrl,
        relay_status: "ready",
        updated_at: now,
      })
      .eq("id", exitId);

    return NextResponse.json({
      success: true,
      relayServerId: relayRow.id,
      vlessConfigUrl,
      directVlessConfigUrl: exitRow.vless_config_url ?? null,
      diagnostics: fullOutput,
      message: "RU relay is ready",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "RU relay setup failed";
    console.error("[relay/setup]", message);

    if (relayServerId) {
      await supabase
        .from("servers")
        .update({
          installation_status: "error",
          status: "error",
        })
        .eq("id", relayServerId);
    }

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
        relayServerId,
      },
      { status: 500 }
    );
  }
}
