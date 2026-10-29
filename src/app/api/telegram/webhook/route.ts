import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot/bot";

export const runtime = "nodejs";
export const maxDuration = 120;

const handleUpdate = (() => {
  const bot = getBot();
  if (!bot) return null;
  // Default grammY timeout is 10s; Connect does 2–3 SSH hops (10–30s).
  // Align with maxDuration so Telegram does not retry and duplicate provision.
  return webhookCallback(bot, "std/http", {
    timeoutMilliseconds: 110_000,
  });
})();

export async function POST(request: Request): Promise<Response> {
  if (!handleUpdate) {
    return new Response("Telegram bot is not configured", { status: 503 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (botToken && !secret) {
    console.error(
      "TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_BOT_TOKEN is set"
    );
    return new Response("Webhook secret not configured", { status: 503 });
  }
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return handleUpdate(request);
}
