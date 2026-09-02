import { getBot } from "@/lib/bot/bot";
import { getBotConfig } from "@/lib/bot/config";
import { runSubscriptionMaintenance } from "@/lib/bot/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() ||
    process.env.TELEGRAM_SETUP_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getBotConfig();
  const bot = getBot();

  if (!config || !bot) {
    return Response.json(
      { error: "Telegram bot is not configured" },
      { status: 503 }
    );
  }

  const result = await runSubscriptionMaintenance(config, async (telegramId, text) => {
    await bot.api.sendMessage(telegramId, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💰 Поддержать", callback_data: "action:donate" },
            { text: "🔌 Подключиться", callback_data: "action:connect" },
          ],
        ],
      },
    });
  });

  return Response.json({ ok: true, ...result });
}
