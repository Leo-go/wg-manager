import {
  getPlatformSshPassphrase,
  getPlatformSshPrivateKey,
  normalizePemKey,
  resolveSshAuth,
  type SshConnectAuth,
} from "@/lib/ssh/auth";
import type { Server } from "@/lib/supabase/types";

/**
 * SSH auth for the Telegram bot only.
 * Prefers Vercel env credentials — never reads ssh_password from Supabase.
 *
 * Order:
 * 1. TELEGRAM_BOT_SSH_PASSWORD
 * 2. TELEGRAM_BOT_SSH_PRIVATE_KEY (+ optional TELEGRAM_BOT_SSH_PRIVATE_KEY_PASSPHRASE)
 * 3. WG_SSH_PRIVATE_KEY (platform deploy key)
 */
export function resolveBotSshAuth(server: Server): SshConnectAuth {
  const envPassword = process.env.TELEGRAM_BOT_SSH_PASSWORD?.trim();
  if (envPassword) {
    return { type: "password", password: envPassword };
  }

  const envKey = process.env.TELEGRAM_BOT_SSH_PRIVATE_KEY?.trim();
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
