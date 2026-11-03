import { withCdnHttp1Alpn } from "@/lib/cdn/build-client-url";

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
 * HOME first, then MOBILE (H2), then MOBILE-H1 (HTTP/1.1 ALPN — Tele2/DPI fallback).
 */
export function buildSubscriptionBody(
  homeUrl: string | null | undefined,
  mobileUrl: string | null | undefined
): string {
  const lines: string[] = [];
  const home = homeUrl?.trim();
  const mobile = mobileUrl?.trim();
  if (home) lines.push(withProfileName(home, "HOME"));
  if (mobile) {
    lines.push(withProfileName(mobile, "MOBILE"));
    lines.push(withProfileName(withCdnHttp1Alpn(mobile), "MOBILE-H1"));
  }
  return Buffer.from(lines.join("\n"), "utf8").toString("base64");
}

export function buildSubscriptionUrl(
  siteUrl: string,
  token: string
): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/telegram/sub/${encodeURIComponent(token)}`;
}
