import {
  currentMonthMoscow,
  extendSubscriptionDays,
  type BotConfig,
} from "@/lib/bot/config";
import { createServiceClient } from "@/lib/supabase/admin";
import type { BotUser, Donation, MonthlyGoal } from "@/lib/supabase/types";

export async function getVpnServer(serverId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("VPN server not found in database");
  return data;
}

export async function upsertBotUser(input: {
  telegram_id: number;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): Promise<BotUser> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_users")
    .upsert(
      {
        telegram_id: input.telegram_id,
        telegram_username: input.telegram_username ?? null,
        first_name: input.first_name ?? null,
        last_name: input.last_name ?? null,
      },
      { onConflict: "telegram_id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BotUser;
}

export async function getBotUserByTelegramId(
  telegramId: number
): Promise<BotUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as BotUser | null) ?? null;
}

export async function updateBotUser(
  id: string,
  patch: Partial<
    Pick<
      BotUser,
      | "xray_uuid"
      | "vless_config_url"
      | "vless_tcp_config_url"
      | "is_active"
      | "subscribed_until"
    >
  >
): Promise<BotUser> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_users")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BotUser;
}

export async function createPendingDonation(
  botUserId: string,
  amountRub: number
): Promise<Donation> {
  const supabase = createServiceClient();
  const month = currentMonthMoscow();
  const { data, error } = await supabase
    .from("donations")
    .insert({
      bot_user_id: botUserId,
      amount_rub: amountRub,
      month,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Donation;
}

export async function confirmDonation(
  donationId: string,
  adminTelegramId: number
): Promise<{ donation: Donation; user: BotUser }> {
  const supabase = createServiceClient();

  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .update({
      status: "confirmed",
      confirmed_by: adminTelegramId,
    })
    .eq("id", donationId)
    .select("*")
    .single();

  if (donationError) throw new Error(donationError.message);

  const { data: user, error: userError } = await supabase
    .from("bot_users")
    .update({
      subscribed_until: extendSubscriptionDays(30),
      is_active: true,
    })
    .eq("id", donation.bot_user_id)
    .select("*")
    .single();

  if (userError) throw new Error(userError.message);

  return { donation: donation as Donation, user: user as BotUser };
}

export async function confirmDonationByTelegramId(
  telegramId: number,
  adminTelegramId: number
): Promise<{ donation: Donation; user: BotUser } | null> {
  const user = await getBotUserByTelegramId(telegramId);
  if (!user) return null;

  const supabase = createServiceClient();
  const { data: pending, error } = await supabase
    .from("donations")
    .select("*")
    .eq("bot_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!pending) return null;

  return confirmDonation(pending.id, adminTelegramId);
}

export async function getMonthlyStatus(config: BotConfig): Promise<{
  month: string;
  targetRub: number;
  collectedRub: number;
  confirmedCount: number;
  activeSubscribers: number;
  goal: MonthlyGoal | null;
}> {
  const supabase = createServiceClient();
  const month = currentMonthMoscow();

  const [{ data: goal }, { data: donations }, { count: activeSubscribers }] =
    await Promise.all([
      supabase.from("monthly_goals").select("*").eq("month", month).maybeSingle(),
      supabase
        .from("donations")
        .select("amount_rub, status")
        .eq("month", month)
        .eq("status", "confirmed"),
      supabase
        .from("bot_users")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("subscribed_until", new Date().toISOString()),
    ]);

  const collectedRub =
    donations?.reduce((sum, row) => sum + (row.amount_rub ?? 0), 0) ?? 0;
  const targetRub = goal?.target_rub ?? config.monthlyGoalRub;

  return {
    month,
    targetRub,
    collectedRub,
    confirmedCount: donations?.length ?? 0,
    activeSubscribers: activeSubscribers ?? 0,
    goal: (goal as MonthlyGoal | null) ?? null,
  };
}

export async function listBotUsers(): Promise<BotUser[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as BotUser[]) ?? [];
}

export async function setMonthlyGoal(
  targetRub: number,
  description?: string
): Promise<MonthlyGoal> {
  const supabase = createServiceClient();
  const month = currentMonthMoscow();
  const { data, error } = await supabase
    .from("monthly_goals")
    .upsert(
      {
        month,
        target_rub: targetRub,
        description: description ?? null,
      },
      { onConflict: "month" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MonthlyGoal;
}

export async function grantSubscription(telegramId: number): Promise<BotUser> {
  const supabase = createServiceClient();
  const existing = await getBotUserByTelegramId(telegramId);

  if (existing) {
    const { data, error } = await supabase
      .from("bot_users")
      .update({
        subscribed_until: extendSubscriptionDays(30),
        is_active: true,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as BotUser;
  }

  const { data, error } = await supabase
    .from("bot_users")
    .insert({
      telegram_id: telegramId,
      subscribed_until: extendSubscriptionDays(30),
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BotUser;
}

export async function rejectDonation(donationId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("donations")
    .update({ status: "rejected" })
    .eq("id", donationId);

  if (error) throw new Error(error.message);
}

export async function getLatestPendingDonation(
  botUserId: string
): Promise<Donation | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("bot_user_id", botUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Donation | null) ?? null;
}
