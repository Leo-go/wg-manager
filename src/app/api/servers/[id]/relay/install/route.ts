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
import { DEFAULT_RELAY_SNI_DOMAIN } from "@/lib/constants/sni";
import { extractVlessTcpUrl, extractVlessUrl } from "@/lib/relay/parse";
import { ensureExitRelayInbound } from "@/lib/relay/ensure-exit-inbound";
import {
  encodeSetupStreamEvent,
  parseProgressFromChunk,
  type SetupStepIndex,
  type SetupStreamEvent,
} from "@/lib/setup/progress";

export const runtime = "nodejs";
export const maxDuration = 300;

const serverIdSchema = z.string().uuid("serverId must be a valid UUID");

function wantsStream(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/x-ndjson")) return true;
  return request.nextUrl.searchParams.get("stream") === "1";
}

function ndjsonResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Install RU relay on VPS (relay server row must exist, status pending/error).
 * POST /api/servers/[relayId]/relay/install
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fullOutput = "";
  let relayServerId: string | null = null;
  let exitId: string | null = null;
  const supabase = await createClient();
  const streamMode = wantsStream(request);

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
    relayServerId = idResult.data;

    const { data: relayRow, error: relayFetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", relayServerId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (relayFetchError) {
      return NextResponse.json(
        { error: "Failed to load relay server", details: relayFetchError.message },
        { status: 500 }
      );
    }
    if (!relayRow || relayRow.role !== "relay") {
      return NextResponse.json(
        { error: "Relay server not found" },
        { status: 404 }
      );
    }
    if (!relayRow.exit_server_id) {
      return NextResponse.json(
        { error: "Relay is not linked to an exit server" },
        { status: 400 }
      );
    }
    exitId = relayRow.exit_server_id;

    const { data: exitRow, error: exitFetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (exitFetchError || !exitRow) {
      return NextResponse.json(
        { error: "Exit server not found for this relay" },
        { status: 404 }
      );
    }
    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        { error: "Exit VPN must be ready before installing the relay" },
        { status: 400 }
      );
    }

    await supabase
      .from("servers")
      .update({ installation_status: "installing" })
      .eq("id", relayServerId);

    const prepared = await ensureExitRelayInbound({
      exitRow,
      supabase,
    });
    if (prepared.diagnostics) {
      fullOutput += prepared.diagnostics + "\n";
    }
    const exitCreds = prepared.creds;

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
        .eq("id", relayServerId);
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

    const runInstall = async (
      onEvent?: (event: SetupStreamEvent) => void
    ): Promise<{
      vlessConfigUrl: string;
      vlessTcpConfigUrl: string | null;
      diagnostics: string;
    }> => {
      let highestStep: SetupStepIndex = 0;
      const pushStep = (step: SetupStepIndex) => {
        if (step < highestStep) return;
        highestStep = step;
        onEvent?.({ type: "step", step });
      };

      pushStep(0);

      let installResult;
      try {
        installResult = await runRemoteBashScript({
          host: relayRow.ip_address,
          port: relayRow.ssh_port || 22,
          username: relayRow.ssh_username,
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
            relayRow.ip_address,
            relayRow.sni_domain || DEFAULT_RELAY_SNI_DOMAIN,
          ],
          onConnected: () => pushStep(1),
          onOutput: (chunk) => parseProgressFromChunk(chunk, pushStep),
        });
      } catch (sshErr) {
        const base =
          sshErr instanceof Error ? sshErr.message : "SSH connection failed";
        const who = `${relayRow.ssh_username || "root"}@${relayRow.ip_address}`;
        if (/invalid credentials/i.test(base)) {
          throw new Error(
            `SSH to RU relay VPS (${who}) failed: invalid credentials. ` +
              `Check username/password, or add the platform public key for that user.`
          );
        }
        throw new Error(`SSH to RU relay VPS (${who}): ${base}`);
      }

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
      const vlessTcpConfigUrl =
        extractVlessTcpUrl(installResult.fullOutput) || null;

      pushStep(5);

      const now = new Date().toISOString();

      await supabase
        .from("servers")
        .update({
          vless_config_url: vlessConfigUrl,
          vless_tcp_config_url: vlessTcpConfigUrl,
          installation_status: "completed",
          status: "active",
          last_check: now,
          updated_at: now,
        })
        .eq("id", relayServerId);

      await supabase
        .from("servers")
        .update({
          relay_vless_config_url: vlessConfigUrl,
          relay_status: "ready",
          updated_at: now,
        })
        .eq("id", exitId);

      return {
        vlessConfigUrl,
        vlessTcpConfigUrl,
        diagnostics: fullOutput,
      };
    };

    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: SetupStreamEvent) => {
            controller.enqueue(encoder.encode(encodeSetupStreamEvent(event)));
          };
          try {
            const result = await runInstall(send);
            send({
              type: "done",
              vlessConfigUrl: result.vlessConfigUrl,
              vlessTcpConfigUrl: result.vlessTcpConfigUrl ?? undefined,
              diagnostics: result.diagnostics,
              message: "RU relay is ready",
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "RU relay setup failed";
            console.error("[relay/install]", message);
            if (relayServerId) {
              await supabase
                .from("servers")
                .update({
                  installation_status: "error",
                  status: "error",
                })
                .eq("id", relayServerId);
            }
            if (exitId) {
              await supabase
                .from("servers")
                .update({ relay_status: "error" })
                .eq("id", exitId);
            }
            const friendly = extractUserFacingError(
              `${fullOutput}\n${message}`,
              message
            );
            send({
              type: "error",
              error: friendly,
              diagnostics:
                [fullOutput, friendly].filter(Boolean).join("\n") || undefined,
            });
          } finally {
            controller.close();
          }
        },
      });
      return ndjsonResponse(stream);
    }

    const result = await runInstall();
    return NextResponse.json({
      success: true,
      relayServerId,
      vlessConfigUrl: result.vlessConfigUrl,
      vlessTcpConfigUrl: result.vlessTcpConfigUrl,
      directVlessConfigUrl: exitRow.vless_config_url ?? null,
      diagnostics: result.diagnostics,
      message: "RU relay is ready",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "RU relay setup failed";
    console.error("[relay/install]", message);

    if (relayServerId) {
      await supabase
        .from("servers")
        .update({
          installation_status: "error",
          status: "error",
        })
        .eq("id", relayServerId);
    }

    if (exitId) {
      await supabase
        .from("servers")
        .update({ relay_status: "error" })
        .eq("id", exitId);
    }

    const friendly = extractUserFacingError(
      `${fullOutput}\n${message}`,
      message
    );

    return NextResponse.json(
      {
        error: friendly,
        diagnostics: [fullOutput, friendly].filter(Boolean).join("\n") || undefined,
        relayServerId,
      },
      { status: 500 }
    );
  }
}
