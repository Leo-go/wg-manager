import { Bot, type Context } from "grammy";
import {
  formatRub,
  getBotConfig,
  isAdmin,
  isSubscriptionActive,
  progressBar,
  type BotConfig,
} from "@/lib/bot/config";
import { formatBotError } from "@/lib/bot/errors";
import {
  adminApproveKeyboard,
  donateKeyboard,
  mainMenuKeyboard,
} from "@/lib/bot/keyboards";
import {
  confirmDonation,
  confirmDonationByTelegramId,
  createPendingDonation,
  getBotUserByTelegramId,
  getLatestPendingDonation,
  getMonthlyStatus,
  getVpnServer,
  grantSubscription,
  listBotUsers,
  rejectDonation,
  setMonthlyGoal,
  updateBotUser,
  upsertBotUser,
} from "@/lib/bot/db";
import {
  provisionBotUserClient,
  revokeBotUserClient,
} from "@/lib/bot/xray-clients";

function welcomeText(config: BotConfig): string {
  return [
    "👋 Привет! Это VPN для нашей компании.",
    "",
    "Здесь можно получить личный ключ, поддержать сервер и следить за сбором.",
    "",
    `Рекомендуемый взнос: ${formatRub(config.suggestedDonationRub)} / месяц`,
    "",
    "Выберите действие:",
  ].join("\n");
}

async function replyError(ctx: Context, error: unknown): Promise<void> {
  const text = `❌ Ошибка: ${formatBotError(error)}`;
  console.error("Telegram bot handler error:", error);
  try {
    await ctx.reply(text);
  } catch {
    // ignore secondary failures
  }
}

function requireAdmin(ctx: Context, config: BotConfig): boolean {
  const from = ctx.from;
  if (!from) return false;
  if (isAdmin(from.id, config.adminIds)) return true;
  return false;
}

async function replyNotAdmin(ctx: Context): Promise<void> {
  const id = ctx.from?.id;
  await ctx.reply(
    [
      "⛔ Нет прав администратора.",
      id ? `Ваш Telegram ID: ${id}` : "",
      "Добавьте этот ID в TELEGRAM_ADMIN_IDS на Vercel.",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

async function safeEditOrReply(ctx: Context, text: string): Promise<void> {
  try {
    await ctx.editMessageText(text);
  } catch {
    await ctx.reply(text);
  }
}

async function notifyAdmins(
  bot: Bot,
  config: BotConfig,
  text: string,
  extra?: { reply_markup?: ReturnType<typeof adminApproveKeyboard> }
): Promise<void> {
  if (config.adminIds.length === 0) {
    console.error("TELEGRAM_ADMIN_IDS is empty — no admin notifications sent");
    return;
  }

  await Promise.all(
    config.adminIds.map((id) =>
      bot.api.sendMessage(Number(id), text, extra).catch((error) => {
        console.error(`Failed to notify admin ${id}:`, error);
        return undefined;
      })
    )
  );
}

async function ensureProvisioned(
  config: BotConfig,
  user: Awaited<ReturnType<typeof getBotUserByTelegramId>>
) {
  if (!user) throw new Error("User not found");

  if (user.vless_config_url && user.xray_uuid) {
    return user;
  }

  const server = await getVpnServer(config.serverId);
  const provisioned = await provisionBotUserClient(server, user);
  return updateBotUser(user.id, {
    xray_uuid: provisioned.uuid,
    vless_config_url: provisioned.vlessConfigUrl,
    vless_tcp_config_url: provisioned.vlessTcpConfigUrl,
  });
}

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.token);

  bot.command("start", async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      await upsertBotUser({
        telegram_id: from.id,
        telegram_username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
      });

      await ctx.reply(welcomeText(config), {
        reply_markup: mainMenuKeyboard(config.siteUrl),
      });
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("whoami", async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      const user = await getBotUserByTelegramId(from.id);
      await ctx.reply(
        [
          `🆔 Telegram ID: ${from.id}`,
          user
            ? `Подписка до: ${formatDate(user.subscribed_until)}`
            : "Вы ещё не зарегистрированы — нажмите /start",
          isSubscriptionActive(user?.subscribed_until)
            ? "✅ Подписка активна"
            : "🔒 Подписка не активна",
          isAdmin(from.id, config.adminIds) ? "👑 Вы админ" : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("help", async (ctx) => {
    try {
      await ctx.reply(helpText(config), {
        reply_markup: mainMenuKeyboard(config.siteUrl),
      });
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("connect", async (ctx) => {
    try {
      await handleConnect(ctx, config);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("donate", async (ctx) => {
    try {
      await handleDonate(ctx, config);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("status", async (ctx) => {
    try {
      await handleStatus(ctx, config);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("users", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const users = await listBotUsers();
      const lines = users.slice(0, 30).map((u) => {
        const active = isSubscriptionActive(u.subscribed_until);
        const name = u.telegram_username
          ? `@${u.telegram_username}`
          : u.first_name || String(u.telegram_id);
        return `${active ? "✅" : "⏸"} ${name} (${u.telegram_id})`;
      });
      await ctx.reply(
        lines.length ? lines.join("\n") : "Пока нет пользователей."
      );
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("grant", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const targetId = Number(ctx.match);
      if (!Number.isFinite(targetId)) {
        await ctx.reply("Использование: /grant <telegram_id>");
        return;
      }

      const user = await grantSubscription(targetId);
      await ctx.reply(
        `✅ Доступ выдан ${targetId} до ${formatDate(user.subscribed_until)}`
      );
      await bot.api
        .sendMessage(
          targetId,
          "✅ Вам выдан доступ! Нажмите «Подключиться» для получения ключа.",
          { reply_markup: mainMenuKeyboard(config.siteUrl) }
        )
        .catch(() => undefined);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("approve", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const targetId = Number(ctx.match);
      if (!Number.isFinite(targetId)) {
        await ctx.reply("Использование: /approve <telegram_id>");
        return;
      }

      const result = await confirmDonationByTelegramId(targetId, ctx.from!.id);
      if (!result) {
        await ctx.reply("Нет ожидающих платежей для этого пользователя.");
        return;
      }

      await ctx.reply(
        `✅ Подтверждено для ${targetId}. Подписка до ${formatDate(result.user.subscribed_until)}`
      );
      await bot.api.sendMessage(
        targetId,
        "✅ Оплата подтверждена! Нажмите «Подключиться» для получения ключа.",
        { reply_markup: mainMenuKeyboard(config.siteUrl) }
      );
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("revoke", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const targetId = Number(ctx.match);
      if (!Number.isFinite(targetId)) {
        await ctx.reply("Использование: /revoke <telegram_id>");
        return;
      }

      const user = await getBotUserByTelegramId(targetId);
      if (!user) {
        await ctx.reply("Пользователь не найден.");
        return;
      }

      if (user.xray_uuid) {
        const server = await getVpnServer(config.serverId);
        await revokeBotUserClient(server, user.xray_uuid);
      }

      await updateBotUser(user.id, {
        is_active: false,
        subscribed_until: null,
        vless_config_url: null,
        vless_tcp_config_url: null,
        xray_uuid: null,
      });

      await ctx.reply(`⛔ Доступ отозван для ${targetId}`);
      await bot.api
        .sendMessage(
          targetId,
          "⛔ Ваш доступ к VPN отключён. Свяжитесь с админом."
        )
        .catch(() => undefined);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("setgoal", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const amount = Number(ctx.match);
      if (!Number.isFinite(amount) || amount <= 0) {
        await ctx.reply("Использование: /setgoal <сумма_в_рублях>");
        return;
      }
      await setMonthlyGoal(amount);
      await ctx.reply(`🎯 Цель месяца обновлена: ${formatRub(amount)}`);
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery().catch(() => undefined);

    try {
      if (data === "action:connect") {
        await handleConnect(ctx, config);
        return;
      }
      if (data === "action:donate") {
        await handleDonate(ctx, config);
        return;
      }
      if (data === "action:status") {
        await handleStatus(ctx, config);
        return;
      }
      if (data === "action:help") {
        await ctx.reply(helpText(config), {
          reply_markup: mainMenuKeyboard(config.siteUrl),
        });
        return;
      }
      if (data === "action:paid") {
        await handlePaid(ctx, config, bot);
        return;
      }

      if (data.startsWith("admin:approve:")) {
        if (!requireAdmin(ctx, config)) {
          await replyNotAdmin(ctx);
          return;
        }
        const donationId = data.slice("admin:approve:".length);
        const result = await confirmDonation(donationId, ctx.from!.id);
        await safeEditOrReply(
          ctx,
          `✅ Подтверждено: ${result.user.telegram_id}, до ${formatDate(result.user.subscribed_until)}`
        );
        await bot.api.sendMessage(
          result.user.telegram_id,
          "✅ Оплата подтверждена! Нажмите «Подключиться».",
          { reply_markup: mainMenuKeyboard(config.siteUrl) }
        );
        return;
      }

      if (data.startsWith("admin:reject:")) {
        if (!requireAdmin(ctx, config)) {
          await replyNotAdmin(ctx);
          return;
        }
        const donationId = data.slice("admin:reject:".length);
        if (donationId) await rejectDonation(donationId);
        await safeEditOrReply(ctx, "❌ Платёж отклонён.");
      }
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.catch((err) => {
    console.error("Telegram bot error:", err);
  });

  return bot;
}

function helpText(config: BotConfig): string {
  return [
    "❓ Помощь",
    "",
    "1. Нажмите «Поддержать» и переведите взнос.",
    "2. После подтверждения админом — «Подключиться».",
    "3. Импортируйте ссылку в Hiddify / v2rayN / Streisand.",
    "",
    `Рекомендуемый взнос: ${formatRub(config.suggestedDonationRub)} / месяц`,
    "",
    "Команды: /connect /donate /status /whoami /help",
  ].join("\n");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

async function handleConnect(ctx: Context, config: BotConfig) {
  const from = ctx.from;
  if (!from) return;

  await upsertBotUser({
    telegram_id: from.id,
    telegram_username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
  });

  const user = await getBotUserByTelegramId(from.id);
  if (!user) {
    throw new Error("Не удалось загрузить профиль. Попробуйте /start");
  }

  if (!user.is_active) {
    await ctx.reply("⛔ Доступ отключён. Напишите админу.");
    return;
  }

  if (!isSubscriptionActive(user.subscribed_until)) {
    await ctx.reply(
      [
        "🔒 Для получения ключа нужна активная подписка.",
        "",
        `Рекомендуемый взнос: ${formatRub(config.suggestedDonationRub)} / месяц`,
        "",
        "Нажмите «Поддержать», переведите и отметьте «Я оплатил».",
      ].join("\n"),
      { reply_markup: donateKeyboard() }
    );
    return;
  }

  await ctx.reply("⏳ Генерирую ключ на сервере, подождите 10–30 сек…");

  const updated = await ensureProvisioned(config, user);
  const lines = [
    "🔌 Ваш ключ VPN:",
    "",
    updated.vless_config_url ?? "—",
  ];

  if (updated.vless_tcp_config_url) {
    lines.push("", "📶 Wi‑Fi fallback (TCP):", updated.vless_tcp_config_url);
  }

  lines.push(
    "",
    "Скопируйте ссылку в Hiddify / v2rayN / Streisand.",
    `Подписка активна до: ${formatDate(updated.subscribed_until)}`
  );

  await ctx.reply(lines.join("\n"), {
    reply_markup: mainMenuKeyboard(config.siteUrl),
  });
}

async function handleDonate(ctx: Context, config: BotConfig) {
  await ctx.reply(
    [
      "💰 Поддержка VPN",
      "",
      config.donateDetails,
      "",
      `Рекомендуемый взнос: ${formatRub(config.suggestedDonationRub)}`,
      "",
      "После перевода нажмите «Я оплатил» — админ подтвердит в течение дня.",
    ].join("\n"),
    { reply_markup: donateKeyboard() }
  );
}

async function handleStatus(ctx: Context, config: BotConfig) {
  const status = await getMonthlyStatus(config);
  const ratio =
    status.targetRub > 0 ? status.collectedRub / status.targetRub : 0;
  const pct = Math.round(ratio * 100);

  await ctx.reply(
    [
      "📊 Статус сбора",
      "",
      `🎯 Цель (${status.month}): ${formatRub(status.targetRub)}`,
      `${progressBar(ratio)} ${formatRub(status.collectedRub)} (${pct}%)`,
      `👥 Подтверждённых взносов: ${status.confirmedCount}`,
      `✅ Активных подписок: ${status.activeSubscribers}`,
    ].join("\n"),
    { reply_markup: mainMenuKeyboard(config.siteUrl) }
  );
}

async function handlePaid(ctx: Context, config: BotConfig, bot: Bot) {
  const from = ctx.from;
  if (!from) return;

  const user = await upsertBotUser({
    telegram_id: from.id,
    telegram_username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
  });

  const existing = await getLatestPendingDonation(user.id);
  if (existing) {
    await ctx.reply(
      "⏳ Ваш платёж уже на проверке. Админ скоро подтвердит."
    );
    return;
  }

  const donation = await createPendingDonation(
    user.id,
    config.suggestedDonationRub
  );

  await ctx.reply(
    "✅ Заявка отправлена! Админ проверит перевод и подтвердит доступ."
  );

  const label = from.username
    ? `@${from.username}`
    : from.first_name || String(from.id);

  await notifyAdmins(
    bot,
    config,
    [
      "💳 Новый взнос на проверке",
      "",
      `Пользователь: ${label} (${from.id})`,
      `Сумма: ${formatRub(donation.amount_rub)}`,
      `Месяц: ${donation.month}`,
      "",
      "Или подтвердите: /approve " + from.id,
    ].join("\n"),
    {
      reply_markup: adminApproveKeyboard(donation.id),
    }
  );
}

let botInstance: Bot | null = null;

export function getBot(): Bot | null {
  if (botInstance) return botInstance;
  const config = getBotConfig();
  if (!config) return null;
  botInstance = createBot(config);
  return botInstance;
}
