import type { Bot } from "grammy";
import { currentMonthMoscow, type BotConfig } from "@/lib/bot/config";
import {
  clearRenewalReminder,
  extendUserSubscription,
} from "@/lib/bot/subscriptions";import { createServiceClient } from "@/lib/supabase/admin";
import type { BotUser } from "@/lib/supabase/types";
import { getBotUserByTelegramId, updateBotUser } from "@/lib/bot/db";
import { mainMenuKeyboard } from "@/lib/bot/keyboards";

export type StarsInvoicePayload = {
  botUserId: string;
  telegramId: number;
};

export function buildStarsInvoicePayload(
  user: Pick<BotUser, "id" | "telegram_id">
): string {
  const payload: StarsInvoicePayload = {
    botUserId: user.id,
    telegramId: user.telegram_id,
  };
  return JSON.stringify(payload);
}

export function parseStarsInvoicePayload(raw: string): StarsInvoicePayload {
  const parsed = JSON.parse(raw) as StarsInvoicePayload;
  if (!parsed.botUserId || !parsed.telegramId) {
    throw new Error("Invalid invoice payload");
  }
  return parsed;
}

export async function sendStarsInvoice(
  bot: Bot,
  chatId: number,
  config: BotConfig,
  user: Pick<BotUser, "id" | "telegram_id">
): Promise<void> {
  await bot.api.sendInvoice(
    chatId,
    "VPN — 30 дней",
    "Подписка на общий VPN (Yandex CDN). Автопродление вручную раз в месяц.",
    buildStarsInvoicePayload(user),
    "XTR",
    [{ label: "30 дней VPN", amount: config.starsAmount }],
    { provider_token: "" }
  );
}

export async function confirmStarsPayment(input: {
  botUserId: string;
  telegramId: number;
  starsAmount: number;
  amountRub: number;
  chargeId: string;
}): Promise<BotUser> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("donations")
    .select("id")
    .eq("telegram_payment_charge_id", input.chargeId)
    .maybeSingle();

  if (existing) {
    const user = await getBotUserByTelegramId(input.telegramId);
    if (!user) throw new Error("User not found");
    return user;
  }

  const user = await getBotUserByTelegramId(input.telegramId);
  if (!user || user.id !== input.botUserId) {
    throw new Error("Payment user mismatch");
  }

  const subscribedUntil = extendUserSubscription(user, 30);

  const { error: donationError } = await supabase.from("donations").insert({
    bot_user_id: user.id,
    amount_rub: input.amountRub,
    month: currentMonthMoscow(),
    status: "confirmed",
    payment_method: "stars",
    stars_amount: input.starsAmount,
    telegram_payment_charge_id: input.chargeId,
    confirmed_by: null,
    note: "Telegram Stars",
  });

  if (donationError) throw new Error(donationError.message);

  const { data: updated, error: userError } = await supabase
    .from("bot_users")
    .update({
      subscribed_until: subscribedUntil,
      is_active: true,
      renewal_reminder_sent_at: null,
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (userError) throw new Error(userError.message);
  return updated as BotUser;
}

export async function notifyStarsPaymentSuccess(
  bot: Bot,
  config: BotConfig,
  telegramId: number,
  subscribedUntil: string | null | undefined
): Promise<void> {
  const until = subscribedUntil
    ? new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(subscribedUntil))
    : "—";

  await bot.api.sendMessage(
    telegramId,
    [
      "✅ Оплата Stars прошла успешно!",
      `Подписка активна до ${until}.`,
      "",
      "Нажмите «Подключиться» для получения ключа.",
    ].join("\n"),
    { reply_markup: mainMenuKeyboard(config.siteUrl) }
  );
}

export async function activateSubscriptionForUser(
  user: BotUser,
  days = 30
): Promise<BotUser> {
  await clearRenewalReminder(user.id);
  return updateBotUser(user.id, {
    subscribed_until: extendUserSubscription(user, days),
    is_active: true,
    renewal_reminder_sent_at: null,
  });
}
