import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot/bot";

export const runtime = "nodejs";
export const maxDuration = 60;

const handleUpdate = (() => {
  const bot = getBot();
  if (!bot) return null;
  return webhookCallback(bot, "std/http");
})();

export async function POST(request: Request): Promise<Response> {
  if (!handleUpdate) {
    return new Response("Telegram bot is not configured", { status: 503 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return handleUpdate(request);
}
