import {
  getPlatformSshPassphrase,
  getPlatformSshPrivateKey,
  normalizePemKey,
  resolveSshAuth,
  type SshConnectAuth,
} from "@/lib/ssh/auth";
import type { Server } from "@/lib/supabase/types";

export type BotSshAuthMode =
  | "env_password"
  | "env_key"
  | "platform_key"
  | "server_key"
  | "none";

function cleanEnvSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getBotSshAuthMode(server: Server): BotSshAuthMode {
  if (cleanEnvSecret(process.env.TELEGRAM_BOT_SSH_PASSWORD)) return "env_password";
  if (cleanEnvSecret(process.env.TELEGRAM_BOT_SSH_PRIVATE_KEY)) return "env_key";
  if (process.env.WG_SSH_PRIVATE_KEY?.trim()) return "platform_key";
  if (server.ssh_private_key?.trim()) return "server_key";
  return "none";
}

export function describeBotSshTarget(server: Server): string {
  const user = getBotSshUsername(server) || "root";
  const port = server.ssh_port ?? 22;
  return `${user}@${server.ip_address}:${port}`;
}

/** SSH auth for the Telegram bot only (see resolveBotSshAuth). */
export function resolveBotSshAuth(server: Server): SshConnectAuth {
  const envPassword = cleanEnvSecret(process.env.TELEGRAM_BOT_SSH_PASSWORD);
  if (envPassword) {
    return { type: "password", password: envPassword };
  }

  const envKey = cleanEnvSecret(process.env.TELEGRAM_BOT_SSH_PRIVATE_KEY);
  if (envKey) {
    const passphrase =
      process.env.TELEGRAM_BOT_SSH_PRIVATE_KEY_PASSPHRASE?.trim() || undefined;
    return {
      type: "privateKey",
      privateKey: normalizePemKey(envKey),
      passphrase,
    };
  }

  const platformKey = getPlatformSshPrivateKey();
  if (platformKey) {
    return {
      type: "privateKey",
      privateKey: platformKey,
      passphrase: getPlatformSshPassphrase(),
    };
  }

  return resolveSshAuth({
    sshPassword: null,
    sshPrivateKey: server.ssh_private_key,
  });
}

export function getBotSshUsername(server: Server): string | null | undefined {
  const fromEnv = process.env.TELEGRAM_BOT_SSH_USERNAME?.trim();
  if (fromEnv) return fromEnv;
  return server.ssh_username;
}
