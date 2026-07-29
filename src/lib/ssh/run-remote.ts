import { Client as SSHClient } from "ssh2";
import type { SshConnectAuth } from "@/lib/ssh/auth";

export type RemoteExecResult = {
  stdout: string;
  stderr: string;
  code: number;
  fullOutput: string;
};

function buildFullOutput(stdout: string, stderr: string): string {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
}

export function mapSshError(error: unknown): Error {
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
  if (
    /Cannot parse privateKey|Encrypted private OpenSSH key|passphrase/i.test(
      message
    )
  ) {
    return new Error(
      "SSH private key is encrypted or invalid. Use a key created with an empty passphrase (`ssh-keygen -N \"\"`), or set WG_SSH_PRIVATE_KEY_PASSPHRASE to match the key password."
    );
  }
  return new Error(`SSH connection failed: ${message}`);
}

export function extractUserFacingError(
  output: string,
  fallback: string
): string {
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

  if (/sudo:\s*(a password is required|a terminal is required|sorry)/i.test(output)) {
    return "SSH user is not root and needs passwordless sudo (sudo -n). Use root, or configure NOPASSWD for that user.";
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

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function normalizeSshUsername(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "root";
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error(
      "Invalid SSH username (allowed: letters, digits, . _ -)"
    );
  }
  return trimmed;
}

/**
 * Upload a bash script via stdin and run with positional args.
 * Non-root users run via `sudo -n` (needs passwordless sudo on the VPS).
 */
export async function runRemoteBashScript(opts: {
  host: string;
  port: number;
  auth: SshConnectAuth;
  scriptContent: string;
  args?: string[];
  username?: string | null;
  readyTimeoutMs?: number;
  onConnected?: () => void;
  onOutput?: (chunk: string) => void;
}): Promise<RemoteExecResult> {
  const ssh = new SSHClient();
  const username = normalizeSshUsername(opts.username);
  const args = opts.args ?? [];
  const argSuffix = args.map(shellSingleQuote).join(" ");
  const escapedScript = opts.scriptContent.replace(/'/g, `'\\''`);
  const bashRunner =
    username === "root"
      ? "bash --noprofile --norc -s --"
      : "sudo -n bash --noprofile --norc -s --";
  const command = `export DEBIAN_FRONTEND=noninteractive TERM=xterm CURL_HOME=/tmp; echo '${escapedScript}' | ${bashRunner} ${argSuffix}`;

  try {
    await new Promise<void>((resolve, reject) => {
      ssh
        .on("ready", () => resolve())
        .on("error", (err) => reject(err))
        .connect({
          host: opts.host,
          port: opts.port,
          username,
          readyTimeout: opts.readyTimeoutMs ?? 30_000,
          ...(opts.auth.type === "privateKey"
            ? {
                privateKey: opts.auth.privateKey,
                ...(opts.auth.passphrase
                  ? { passphrase: opts.auth.passphrase }
                  : {}),
              }
            : { password: opts.auth.password }),
        });
    });
  } catch (sshError) {
    ssh.end();
    throw mapSshError(sshError);
  }

  opts.onConnected?.();

  try {
    const execResult = await new Promise<{
      stdout: string;
      stderr: string;
      code: number;
    }>((resolve, reject) => {
      ssh.exec(command, { pty: false }, (err, stream) => {
        if (err) return reject(err);

        let stdout = "";
        let stderr = "";

        const push = (text: string) => {
          if (text) opts.onOutput?.(text);
        };

        stream
          .on("close", (code: number | null) => {
            resolve({ stdout, stderr, code: code ?? 0 });
          })
          .on("data", (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            push(text);
          });
        stream.stderr.on("data", (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          push(text);
        });
      });
    });

    return {
      ...execResult,
      fullOutput: buildFullOutput(execResult.stdout, execResult.stderr),
    };
  } finally {
    ssh.end();
  }
}
