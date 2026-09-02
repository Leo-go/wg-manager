const VLESS_PREFIX = /^vless:\/\/([^@]+)@(.+)$/;

/** Replace UUID in an existing vless:// URL template. */
export function swapVlessUuid(templateUrl: string, newUuid: string): string {
  const trimmed = templateUrl.trim();
  const match = trimmed.match(VLESS_PREFIX);
  if (!match) {
    throw new Error("Invalid vless URL template");
  }
  return `vless://${newUuid}@${match[2]}`;
}

export function buildClientLabel(
  firstName?: string | null,
  username?: string | null,
  telegramId?: number
): string {
  if (username) return `tg-${username}`;
  if (firstName) return `tg-${firstName.replace(/\s+/g, "-").toLowerCase()}`;
  return `tg-${telegramId ?? "user"}`;
}
