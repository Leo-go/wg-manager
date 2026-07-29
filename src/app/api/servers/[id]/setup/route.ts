import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@/lib/supabase/server";
import { resolveSshAuth } from "@/lib/ssh/auth";
import {
  extractUserFacingError,
  mapSshError,
  runRemoteBashScript,
} from "@/lib/ssh/run-remote";
import {
  encodeSetupStreamEvent,
  parseProgressFromChunk,
  type SetupStepIndex,
  type SetupStreamEvent,
} from "@/lib/setup/progress";

export const runtime = "nodejs";
export const maxDuration = 300;

const serverIdSchema = z.string().uuid("serverId must be a valid UUID");

const serverCredentialsSchema = z.object({
  id: z.string().uuid(),
  ip_address: z
    .string()
    .trim()
    .min(1, "Server is missing ip_address"),
  ssh_port: z.number().int().min(1).max(65535).nullable().optional(),
  ssh_username: z.union([z.string(), z.null(), z.undefined()]).optional(),
  ssh_password: z.union([z.string(), z.null(), z.undefined()]).optional(),
  ssh_private_key: z.union([z.string(), z.null(), z.undefined()]).optional(),
  sni_domain: z.string().nullable().optional(),
  vless_port: z.number().int().min(1).max(65535).nullable().optional(),
});

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function extractVlessUrl(output: string): string | null {
  const clean = stripAnsi(output);
  const marked = clean.match(/VLESS_CONFIG_URL=(vless:\/\/\S+)/);
  if (marked?.[1]) {
    return marked[1].trim();
  }
  const fallback = clean.match(/vless:\/\/[^\s]+/);
  return fallback?.[0]?.trim() ?? null;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let serverId = "";
  let fullOutput = "";
  const supabase = await createClient();
  const streamMode = wantsStream(request);

  const emitJsonError = (status: number, body: Record<string, unknown>) =>
    NextResponse.json(body, { status });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[setup] Unauthorized:", authError?.message);
      return emitJsonError(401, {
        error: "Unauthorized — sign in again and retry setup",
      });
    }

    const { id } = await params;
    const idResult = serverIdSchema.safeParse(id);
    if (!idResult.success) {
      const message =
        idResult.error.issues[0]?.message ?? "Invalid server id";
      console.error("[setup] Validation failed (serverId):", message);
      return emitJsonError(400, { error: message });
    }
    serverId = idResult.data;

    const { data: serverRow, error: fetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", serverId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[setup] Server fetch error:", serverId, fetchError.message);
      return emitJsonError(500, {
        error: "Failed to load server from database",
        details: fetchError.message,
      });
    }

    if (!serverRow) {
      console.error("[setup] Server not found for user:", serverId, user.id);
      return emitJsonError(404, {
        error:
          "Server not found (or you do not own it). Refresh the dashboard and try again.",
      });
    }

    const credentials = serverCredentialsSchema.safeParse({
      id: serverRow.id,
      ip_address: serverRow.ip_address,
      ssh_port: serverRow.ssh_port,
      ssh_username: serverRow.ssh_username,
      ssh_password: serverRow.ssh_password,
      ssh_private_key: serverRow.ssh_private_key,
      sni_domain: serverRow.sni_domain,
      vless_port: serverRow.vless_port,
    });

    if (!credentials.success) {
      const message =
        credentials.error.issues[0]?.message ??
        "Server is missing required SSH fields";
      console.error("[setup] Validation failed (credentials):", message);
      return emitJsonError(400, { error: message });
    }

    const server = credentials.data;
    const sshPort = server.ssh_port || 22;
    const sni = server.sni_domain || "www.cloudflare.com";
    const vlessPort = server.vless_port || 443;

    let sshAuth;
    try {
      sshAuth = resolveSshAuth({
        sshPassword: server.ssh_password,
        sshPrivateKey: server.ssh_private_key,
      });
    } catch (authErr) {
      const message =
        authErr instanceof Error ? authErr.message : "SSH auth missing";
      return emitJsonError(400, { error: message });
    }

    await supabase
      .from("servers")
      .update({ installation_status: "installing" })
      .eq("id", serverId);

    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "install-vless-reality.sh"
    );
    if (!fs.existsSync(scriptPath)) {
      throw new Error(
        "Script execution failed: install-vless-reality.sh not found on the app server"
      );
    }
    const scriptContent = fs.readFileSync(scriptPath, "utf-8");

    const runInstall = async (
      onEvent?: (event: SetupStreamEvent) => void
    ): Promise<{ vlessConfigUrl: string; diagnostics: string }> => {
      let highestStep: SetupStepIndex = 0;
      const pushStep = (step: SetupStepIndex) => {
        if (step < highestStep) return;
        highestStep = step;
        onEvent?.({ type: "step", step });
      };

      pushStep(0);

      console.log(
        `Connecting to ${server.ip_address}:${sshPort} via ${sshAuth.type}...`
      );

      let execResult;
      try {
        execResult = await runRemoteBashScript({
          host: server.ip_address,
          port: sshPort,
          username: server.ssh_username,
          auth: sshAuth,
          scriptContent,
          args: [sni, String(vlessPort), server.ip_address],
          onConnected: () => {
            console.log("SSH connected successfully");
            pushStep(1);
          },
          onOutput: (chunk) => {
            parseProgressFromChunk(chunk, pushStep);
          },
        });
      } catch (sshError) {
        console.error(
          `SSH connection failed: ${
            sshError instanceof Error ? sshError.message : String(sshError)
          }`
        );
        throw mapSshError(sshError);
      }

      fullOutput = execResult.fullOutput;
      console.log(`Script completed with code ${execResult.code}`);

      if (execResult.code !== 0) {
        const raw = `Script execution failed (exit code ${execResult.code})`;
        throw new Error(extractUserFacingError(fullOutput, raw));
      }

      const vlessConfigUrl = extractVlessUrl(fullOutput);
      if (!vlessConfigUrl) {
        console.error("Failed to parse VLESS config URL from script output");
        throw new Error(
          "Script execution failed: could not parse VLESS config URL from installer output"
        );
      }

      pushStep(5);
      console.log("Installation script finished successfully; VLESS URL parsed");

      await supabase
        .from("servers")
        .update({
          vless_config_url: vlessConfigUrl,
          installation_status: "completed",
          status: "active",
          last_check: new Date().toISOString(),
        })
        .eq("id", serverId);

      return { vlessConfigUrl, diagnostics: fullOutput };
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
              diagnostics: result.diagnostics,
              message: "VPN successfully configured!",
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Setup failed unexpectedly";
            console.error("Setup error:", message);
            if (serverId) {
              await supabase
                .from("servers")
                .update({
                  installation_status: "error",
                  status: "error",
                })
                .eq("id", serverId);
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
      vlessConfigUrl: result.vlessConfigUrl,
      diagnostics: result.diagnostics,
      message: "VPN successfully configured!",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Setup failed unexpectedly";
    console.error("Setup error:", message);

    if (serverId) {
      await supabase
        .from("servers")
        .update({
          installation_status: "error",
          status: "error",
        })
        .eq("id", serverId);
    }

    const friendly = extractUserFacingError(
      `${fullOutput}\n${message}`,
      message
    );

    const status = /validation|missing|required|uuid/i.test(friendly)
      ? 400
      : 500;

    return NextResponse.json(
      {
        error: friendly,
        diagnostics:
          [fullOutput, friendly].filter(Boolean).join("\n") || undefined,
      },
      { status }
    );
  }
}
