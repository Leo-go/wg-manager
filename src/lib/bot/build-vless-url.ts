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

function slugifyName(firstName: string): string {
  return firstName.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Stable unique Xray client email. Always includes telegram id so two people
 * never share a label (Xray rejects duplicate emails inside an inbound).
 */
export function buildClientLabel(
  firstName?: string | null,
  username?: string | null,
  telegramId?: number
): string {
  const id = telegramId ?? "user";
  if (username) return `tg-${username}-${id}`;
  if (firstName) return `tg-${slugifyName(firstName)}-${id}`;
  return `tg-${id}`;
}

/**
 * Primary label plus the legacy label this user would have had before we
 * appended telegram id — so upsert/revoke can clean stale `tg-username` rows.
 */
export function buildClientLabelAliases(
  firstName?: string | null,
  username?: string | null,
  telegramId?: number
): string[] {
  const primary = buildClientLabel(firstName, username, telegramId);
  const aliases = [primary];
  if (username) aliases.push(`tg-${username}`);
  else if (firstName) aliases.push(`tg-${slugifyName(firstName)}`);
  return [...new Set(aliases)];
}

/** Comma-separated aliases for xray-client-manager.sh */
export function buildClientLabelArg(
  firstName?: string | null,
  username?: string | null,
  telegramId?: number
): string {
  return buildClientLabelAliases(firstName, username, telegramId).join(",");
}
