/** Rename #fragment so Happ/INCY show clear profile names. */
export function withProfileName(vlessUrl: string, name: string): string {
  const trimmed = vlessUrl.trim();
  if (!trimmed) return trimmed;
  const hash = trimmed.indexOf("#");
  const base = hash >= 0 ? trimmed.slice(0, hash) : trimmed;
  return `${base}#${encodeURIComponent(name)}`;
}

/**
 * Classic base64 subscription body: one URI per line.
 * HOME first, then MOBILE (Yandex CDN xHTTP over HTTP/2).
 * Do not force alpn=http/1.1 — Yandex CDN speaks HTTP/2 and H1 ALPN breaks xHTTP.
 */
export function buildSubscriptionBody(
  homeUrl: string | null | undefined,
  mobileUrl: string | null | undefined
): string {
  const lines: string[] = [];
  const home = homeUrl?.trim();
  const mobile = mobileUrl?.trim();
  if (home) lines.push(withProfileName(home, "HOME"));
  if (mobile) lines.push(withProfileName(mobile, "MOBILE"));
  return Buffer.from(lines.join("\n"), "utf8").toString("base64");
}

export function buildSubscriptionUrl(
  siteUrl: string,
  token: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/telegram/sub/${encodeURIComponent(token)}`;
}

/** Landing page that opens Happ via deeplink (Telegram url buttons only allow http/https). */
export function buildSubscriptionImportUrl(
  siteUrl: string,
  token: string
): string {
  return `${buildSubscriptionUrl(siteUrl, token)}/import`;
}

/** Happ deeplink: plain subscription URL after add/ (no base64, no encode). */
export function buildHappAddUrl(subscriptionUrl: string): string {
  return `happ://add/${subscriptionUrl.trim()}`;
}
