import { NextRequest, NextResponse } from "next/server";
import { Client as SSHClient } from "ssh2";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@/lib/supabase/server";
import { resolveSshAuth } from "@/lib/ssh/auth";
import { normalizeSshUsername } from "@/lib/ssh/run-remote";

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

function buildFullOutput(stdout: string, stderr: string): string {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
}

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

function extractUserFacingError(output: string, fallback: string): string {
  const portInUse = output.match(
    /ERROR:\s*Port\s+(\d+)\s+is already in use\.?\s*Please stop the conflicting process\.?/i
  );
  if (portInUse) {
    return `Script execution failed: port ${portInUse[1]} is already in use`;
  }

  const bindFailed = output.match(
    /ERROR:\s*Xray failed to bind to port\s+(\d+)\.?/i
  );
  if (bindFailed) {
    return `Script execution failed: port ${bindFailed[1]} is already in use`;
  }

  if (/address already in use/i.test(output)) {
    const portFromListen = output.match(/failed to listen.*?(\d{2,5})/i);
    if (portFromListen) {
      return `Script execution failed: port ${portFromListen[1]} is already in use`;
    }
    return "Script execution failed: port is already in use";
  }

  if (/All configured authentication methods failed/i.test(output)) {
    return "SSH connection failed: invalid credentials";
  }

  if (
    /Timed out while waiting for handshake|Connection timed out|ETIMEDOUT|connect.*timed out/i.test(
      output
    )
  ) {
    return "SSH connection failed: connection timed out";
  }

  if (/ECONNREFUSED/i.test(output)) {
    return "SSH connection failed: connection refused (check IP and SSH port)";
  }

  if (/ENOTFOUND|getaddrinfo/i.test(output)) {
    return "SSH connection failed: host not found (check ip_address)";
  }

  return fallback;
}

function mapSshError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/All configured authentication methods failed/i.test(message)) {
    return new Error("SSH connection failed: invalid credentials");
  }
  if (
    /Timed out while waiting for handshake|Connection timed out|ETIMEDOUT|connect.*timed out|Timed out/i.test(
      message
    )
  ) {
    return new Error("SSH connection failed: connection timed out");
  }
  if (/ECONNREFUSED/i.test(message)) {
    return new Error(
      "SSH connection failed: connection refused (check IP and SSH port)"
    );
  }
  if (/ENOTFOUND|getaddrinfo/i.test(message)) {
    return new Error("SSH connection failed: host not found (check ip_address)");
  }
  if (/Cannot parse privateKey|Encrypted private OpenSSH key|passphrase/i.test(message)) {
    return new Error(
      "SSH private key is encrypted or invalid. Use a key created with an empty passphrase (`ssh-keygen -N \"\"`), or set WG_SSH_PRIVATE_KEY_PASSPHRASE to match the key password."
    );
  }
  return new Error(`SSH connection failed: ${message}`);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let serverId = "";
  let fullOutput = "";
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[setup] Unauthorized:", authError?.message);
      return NextResponse.json(
        { error: "Unauthorized — sign in again and retry setup" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const idResult = serverIdSchema.safeParse(id);
    if (!idResult.success) {
      const message =
        idResult.error.issues[0]?.message ?? "Invalid server id";
      console.error("[setup] Validation failed (serverId):", message);
      return NextResponse.json({ error: message }, { status: 400 });
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
      return NextResponse.json(
        {
          error: "Failed to load server from database",
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!serverRow) {
      console.error("[setup] Server not found for user:", serverId, user.id);
      return NextResponse.json(
        {
          error:
            "Server not found (or you do not own it). Refresh the dashboard and try again.",
        },
        { status: 404 }
      );
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
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const server = credentials.data;
    const sshPort = server.ssh_port || 22;
    const sshUsername = normalizeSshUsername(server.ssh_username);
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
      return NextResponse.json({ error: message }, { status: 400 });
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

    const ssh = new SSHClient();

    console.log(
      `Connecting to ${sshUsername}@${server.ip_address}:${sshPort} via ${sshAuth.type}...`
    );
    try {
      await new Promise<void>((resolve, reject) => {
        ssh
          .on("ready", () => resolve())
          .on("error", (err) => reject(err))
          .connect({
            host: server.ip_address,
            port: sshPort,
            username: sshUsername,
            readyTimeout: 30_000,
            ...(sshAuth.type === "privateKey"
              ? {
                  privateKey: sshAuth.privateKey,
                  ...(sshAuth.passphrase
                    ? { passphrase: sshAuth.passphrase }
                    : {}),
                }
              : { password: sshAuth.password }),
          });
      });
    } catch (sshError) {
      console.error(
        `SSH connection failed: ${
          sshError instanceof Error ? sshError.message : String(sshError)
        }`
      );
      throw mapSshError(sshError);
    }
    console.log("SSH connected successfully");

    const escapedScript = scriptContent.replace(/'/g, "'\\''");
    const bashRunner =
      sshUsername === "root"
        ? "bash --noprofile --norc -s --"
        : "sudo -n bash --noprofile --norc -s --";
    const command = `export DEBIAN_FRONTEND=noninteractive TERM=xterm CURL_HOME=/tmp; echo '${escapedScript}' | ${bashRunner} ${sni} ${vlessPort} ${server.ip_address}`;

    console.log("Running installation script...");
    const execResult = await new Promise<{
      stdout: string;
      stderr: string;
      code: number;
    }>((resolve, reject) => {
      ssh.exec(command, { pty: false }, (err, stream) => {
        if (err) return reject(err);

        let stdout = "";
        let stderr = "";

        stream
          .on("close", (code: number | null) => {
            resolve({ stdout, stderr, code: code ?? 0 });
          })
          .on("data", (data: Buffer) => {
            stdout += data.toString();
          });
        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
      });
    });

    ssh.end();

    fullOutput = buildFullOutput(execResult.stdout, execResult.stderr);
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

    return NextResponse.json({
      success: true,
      vlessConfigUrl,
      diagnostics: fullOutput,
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
        // Always return something diagnosable — early SSH failures leave fullOutput empty.
        diagnostics: [fullOutput, friendly].filter(Boolean).join("\n") || undefined,
      },
      { status }
    );
  }
}
