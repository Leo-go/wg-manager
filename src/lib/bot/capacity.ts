import { isSubscriptionActive, type BotConfig } from "@/lib/bot/config";
import { listBotUsers } from "@/lib/bot/db";

export type BotCapacityStats = {
  softLimit: number;
  totalUsers: number;
  activeSubscribers: number;
  withKey: number;
  inactive: number;
  utilization: number;
  nearLimit: boolean;
  atLimit: boolean;
};

export function getSoftLimit(config: BotConfig): number {
  return config.softUserLimit;
}

export async function getBotCapacityStats(
  config: BotConfig
): Promise<BotCapacityStats> {
  const users = await listBotUsers();
  const softLimit = getSoftLimit(config);
  const activeSubscribers = users.filter((u) =>
    isSubscriptionActive(u.subscribed_until)
  ).length;
  const withKey = users.filter((u) => Boolean(u.xray_uuid)).length;
  const inactive = users.filter((u) => !u.is_active).length;
  const utilization =
    softLimit > 0 ? Math.min(1, activeSubscribers / softLimit) : 0;

  return {
    softLimit,
    totalUsers: users.length,
    activeSubscribers,
    withKey,
    inactive,
    utilization,
    nearLimit: softLimit > 0 && activeSubscribers >= Math.ceil(softLimit * 0.8),
    atLimit: softLimit > 0 && activeSubscribers >= softLimit,
  };
}

export function formatCapacityReport(stats: BotCapacityStats): string {
  const pct = Math.round(stats.utilization * 100);
  const lines = [
    "📈 Нагрузка shared VPN",
    "",
    `Активных подписок: ${stats.activeSubscribers} / ${stats.softLimit} (${pct}%)`,
    `Ключей на сервере: ${stats.withKey}`,
    `Всего в боте: ${stats.totalUsers}`,
    `Отключено: ${stats.inactive}`,
  ];

  if (stats.atLimit) {
    lines.push(
      "",
      "⚠️ Soft-лимит достигнут. Пора поднимать второй exit/CDN Origin или поднять TELEGRAM_BOT_SOFT_LIMIT."
    );
  } else if (stats.nearLimit) {
    lines.push(
      "",
      "🟡 Близко к лимиту (~80%). Запланируйте второй сервер, пока друзья не упёрлись в отказ."
    );
  } else {
    lines.push("", "✅ Запас по вместимости есть.");
  }

  return lines.join("\n");
}
