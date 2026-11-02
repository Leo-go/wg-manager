import { createHmac, timingSafeEqual } from "node:crypto";

function subSigningSecret(): string {
  return (
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.TELEGRAM_SETUP_SECRET?.trim() ||
    ""
  );
}

/** Signed subscription token: `{botUserId}.{hmac}` (bot_users.id is a UUID). */
export function signSubToken(botUserId: string): string {
  const secret = subSigningSecret();
  if (!secret) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET or TELEGRAM_SETUP_SECRET required for subscription links"
    );
  }
  const sig = createHmac("sha256", secret)
    .update(`sub:${botUserId}`)
    .digest("base64url");
  return `${botUserId}.${sig}`;
}

export function verifySubToken(token: string): string | null {
  const secret = subSigningSecret();
  if (!secret || !token?.trim()) return null;

  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;

  const botUserId = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!botUserId || !sig) return null;

  const expected = createHmac("sha256", secret)
    .update(`sub:${botUserId}`)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return botUserId;
}
