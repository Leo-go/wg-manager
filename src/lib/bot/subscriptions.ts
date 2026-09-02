import {
  daysUntilExpiry,
  extendSubscriptionDays,
  type BotConfig,
} from "@/lib/bot/config";
import { createServiceClient } from "@/lib/supabase/admin";
import type { BotUser } from "@/lib/supabase/types";
import { getVpnServer, updateBotUser } from "@/lib/bot/db";
import { revokeBotUserClient } from "@/lib/bot/xray-clients";

export type SubscriptionCronResult = {
  remindersSent: number;
  revoked: number;
  errors: string[];
};

export async function listUsersNeedingRenewalReminder(
  daysBefore: number
): Promise<BotUser[]> {
  const supabase = createServiceClient();
  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + daysBefore);

  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .eq("is_active", true)
    .not("subscribed_until", "is", null)
    .gt("subscribed_until", now.toISOString())
    .lte("subscribed_until", until.toISOString())
    .is("renewal_reminder_sent_at", null);

  if (error) throw new Error(error.message);
  return (data as BotUser[]) ?? [];
}

export async function markRenewalReminderSent(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("bot_users")
    .update({ renewal_reminder_sent_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function clearRenewalReminder(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("bot_users")
    .update({ renewal_reminder_sent_at: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function listExpiredUsersWithVpn(): Promise<BotUser[]> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .eq("is_active", true)
    .not("xray_uuid", "is", null)
    .not("subscribed_until", "is", null)
    .lt("subscribed_until", now);

  if (error) throw new Error(error.message);
  return (data as BotUser[]) ?? [];
}

export async function revokeUserVpnAccess(
  config: BotConfig,
  user: BotUser
): Promise<BotUser> {
  if (user.xray_uuid) {
    const server = await getVpnServer(config.serverId);
    await revokeBotUserClient(server, user.xray_uuid);
  }

  return updateBotUser(user.id, {
    xray_uuid: null,
    vless_config_url: null,
    vless_tcp_config_url: null,
  });
}

export function buildRenewalReminderText(user: BotUser): string {
  const days = daysUntilExpiry(user.subscribed_until);
  const until = user.subscribed_until
    ? new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "numeric",
        month: "long",
      }).format(new Date(user.subscribed_until))
    : "—";

  return [
    "⏰ Напоминание о подписке VPN",
    "",
    days !== null && days > 0
      ? `Доступ активен ещё ${days} дн. (до ${until}).`
      : `Доступ заканчивается ${until}.`,
    "",
    "Нажмите «Поддержать» → оплатите Stars ⭐ или СБП.",
  ].join("\n");
}

export async function runSubscriptionMaintenance(
  config: BotConfig,
  sendMessage: (telegramId: number, text: string) => Promise<void>
): Promise<SubscriptionCronResult> {
  const result: SubscriptionCronResult = {
    remindersSent: 0,
    revoked: 0,
    errors: [],
  };

  const reminderUsers = await listUsersNeedingRenewalReminder(
    config.reminderDaysBefore
  );

  for (const user of reminderUsers) {
    try {
      await sendMessage(user.telegram_id, buildRenewalReminderText(user));
      await markRenewalReminderSent(user.id);
      result.remindersSent += 1;
    } catch (error) {
      result.errors.push(
        `reminder ${user.telegram_id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const expiredUsers = await listExpiredUsersWithVpn();

  for (const user of expiredUsers) {
    try {
      await revokeUserVpnAccess(config, user);
      await sendMessage(
        user.telegram_id,
        [
          "⛔ Подписка VPN истекла — доступ отключён.",
          "",
          "Чтобы снова подключиться, нажмите «Поддержать» и продлите подписку.",
        ].join("\n")
      );
      result.revoked += 1;
    } catch (error) {
      result.errors.push(
        `revoke ${user.telegram_id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return result;
}

export function extendUserSubscription(user: BotUser, days = 30): string {
  return extendSubscriptionDays(days, user.subscribed_until);
}
