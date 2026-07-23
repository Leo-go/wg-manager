/**
 * Resolve SSH auth for setup.
 * Order: per-server private key → per-server password → platform key.
 *
 * Password is only stored when the user chose password auth for that server,
 * so it must win over the global platform key (otherwise RU relays / foreign
 * VPS without our pubkey fail with "invalid credentials").
 */

export type SshAuthMode = "platform_key" | "password";

export function normalizePemKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

export function getPlatformSshPrivateKey(): string | null {
  const raw = process.env.WG_SSH_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return normalizePemKey(raw);
}

export function getPlatformSshPassphrase(): string | undefined {
  const raw = process.env.WG_SSH_PRIVATE_KEY_PASSPHRASE;
  if (raw === undefined || raw === "") return undefined;
  return raw;
}

export type SshConnectAuth =
  | { type: "privateKey"; privateKey: string; passphrase?: string }
  | { type: "password"; password: string };

export function resolveSshAuth(input: {
  sshPassword?: string | null;
  sshPrivateKey?: string | null;
  sshPrivateKeyPassphrase?: string | null;
}): SshConnectAuth {
  const rowKey = input.sshPrivateKey?.trim()
    ? normalizePemKey(input.sshPrivateKey)
    : null;
  if (rowKey) {
    return {
      type: "privateKey",
      privateKey: rowKey,
      passphrase: input.sshPrivateKeyPassphrase?.trim() || undefined,
    };
  }

  const password = input.sshPassword?.trim();
  if (password) {
    return { type: "password", password };
  }

  const platformKey = getPlatformSshPrivateKey();
  if (platformKey) {
    return {
      type: "privateKey",
      privateKey: platformKey,
      passphrase: getPlatformSshPassphrase(),
    };
  }

  throw new Error(
    "No SSH credentials: add the platform public key on the VPS (recommended), set WG_SSH_PRIVATE_KEY on the app, or provide a root password."
  );
}
