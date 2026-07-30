/** Timeweb Agent referral — primary monetization CTA */
export const TIMEWEB_PARTNER_URL =
  process.env.NEXT_PUBLIC_TIMEWEB_PARTNER_URL?.trim() ||
  "https://timeweb.cloud/?i=144829";

/** Optional partner URL for Timeweb Domains inside CDN onboarding. */
export const TIMEWEB_DOMAINS_PARTNER_URL =
  process.env.NEXT_PUBLIC_TIMEWEB_DOMAINS_PARTNER_URL?.trim() ||
  "https://timeweb.com/ru/services/domains/";

/** Hide Cloud API “buy on our balance” unless explicitly enabled */
export function isTimewebApiBuyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TIMEWEB_API_BUY === "true";
}

/**
 * Public half of the platform deploy key (safe to show in UI).
 * Users add this in Timeweb when creating a VPS → we SSH with WG_SSH_PRIVATE_KEY.
 */
export function getPlatformSshPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_WG_SSH_PUBLIC_KEY?.trim().replace(/\\n/g, "\n") || ""
  );
}
