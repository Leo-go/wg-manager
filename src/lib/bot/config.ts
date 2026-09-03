import { readFileSync } from "node:fs";
import path from "node:path";

export type BotConfig = {
  token: string;
  adminIds: string[];
  serverId: string;
  donateDetails: string;
  suggestedDonationRub: number;
  monthlyGoalRub: number;
  starsAmount: number;
  reminderDaysBefore: number;
  /** Soft cap for active subscribers before advising a second server. */
  softUserLimit: number;
  siteUrl: string;
  webhookSecret?: string;
};

function parseAdminIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getBotConfig(): BotConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  const serverId = process.env.TELEGRAM_BOT_SERVER_ID?.trim();
  if (!serverId) return null;

  const suggested = Number(process.env.TELEGRAM_SUGGESTED_DONATION_RUB ?? "150");
  const goal = Number(process.env.TELEGRAM_MONTHLY_GOAL_RUB ?? "2000");
  const stars = Number(process.env.TELEGRAM_STARS_AMOUNT ?? "100");
  const reminderDays = Number(process.env.TELEGRAM_REMINDER_DAYS ?? "3");
  const softLimit = Number(process.env.TELEGRAM_BOT_SOFT_LIMIT ?? "40");

  return {
    token,
    adminIds: parseAdminIds(process.env.TELEGRAM_ADMIN_IDS),
    serverId,
    donateDetails:
      process.env.TELEGRAM_DONATE_DETAILS?.trim() ||
      "Переведите 150 ₽ на СБП и нажмите «Я оплатил».",
    suggestedDonationRub: Number.isFinite(suggested) ? suggested : 150,
    monthlyGoalRub: Number.isFinite(goal) ? goal : 2000,
    starsAmount: Number.isFinite(stars) && stars > 0 ? stars : 100,
    reminderDaysBefore:
      Number.isFinite(reminderDays) && reminderDays > 0 ? reminderDays : 3,
    softUserLimit:
      Number.isFinite(softLimit) && softLimit > 0 ? Math.floor(softLimit) : 40,
    siteUrl: (() => {
      const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (explicit) return explicit.replace(/\/$/, "");
      const vercel = process.env.VERCEL_URL?.trim();
      if (vercel) return `https://${vercel}`;
      return "http://localhost:3000";
    })(),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined,
  };
}

export function isAdmin(telegramId: number, adminIds: string[]): boolean {
  const id = String(telegramId);
  return adminIds.includes(id);
}

export function currentMonthMoscow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function readXrayClientManagerScript(): string {
  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "xray-client-manager.sh"
  );
  return readFileSync(scriptPath, "utf8");
}

export function progressBar(ratio: number, width = 14): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function isSubscriptionActive(
  subscribedUntil: string | null | undefined
): boolean {
  if (!subscribedUntil) return false;
  return new Date(subscribedUntil).getTime() > Date.now();
}

export function extendSubscriptionDays(
  days = 30,
  currentUntil?: string | null
): string {
  const base = new Date();
  if (currentUntil) {
    const current = new Date(currentUntil);
    if (!Number.isNaN(current.getTime()) && current.getTime() > base.getTime()) {
      base.setTime(current.getTime());
    }
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export function daysUntilExpiry(
  subscribedUntil: string | null | undefined
): number | null {
  if (!subscribedUntil) return null;
  const ms = new Date(subscribedUntil).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
