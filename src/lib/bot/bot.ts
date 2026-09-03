import { Bot, type Context } from "grammy";
import {
  formatCapacityReport,
  getBotCapacityStats,
} from "@/lib/bot/capacity";
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
  describeBotProvisionTarget,
  getBotProvisionMode,
} from "@/lib/bot/provision-target";
import { getBotSshAuthMode } from "@/lib/bot/ssh-auth";
import {
  downloadV2rayNgApk,
  getCachedV2rayNgFileId,
  HAPP_IOS_APPSTORE_RU_URL,
  HAPP_IOS_APPSTORE_URL,
  HAPP_SITE_URL,
  iosHappGuideText,
  setCachedV2rayNgFileId,
  V2RAYN_RELEASES_URL,
  V2RAYNG_RELEASES_URL,
} from "@/lib/bot/clients";
import {
  adminApproveKeyboard,
  afterConnectKeyboard,
  clientsKeyboard,
  donateKeyboard,
  helpKeyboard,
  iosClientsKeyboard,
  mainMenuKeyboard,
} from "@/lib/bot/keyboards";
import {
  confirmStarsPayment,
  notifyStarsPaymentSuccess,
  parseStarsInvoicePayload,
  sendStarsInvoice,
} from "@/lib/bot/payments";
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Send VLESS URL as a tappable code block (Telegram copies on tap). */
async function replyCopyableKey(
  ctx: Context,
  url: string,
  label = "📋 Нажмите на ключ, чтобы скопировать:"
): Promise<void> {
  await ctx.reply(`${label}\n\n<code>${escapeHtml(url)}</code>`, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

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
        reply_markup: helpKeyboard(),
        link_preview_options: { is_disabled: true },
      });
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("connect", async (ctx) => {
    try {
      await handleConnect(ctx, config, bot);
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
      const [users, capacity] = await Promise.all([
        listBotUsers(),
        getBotCapacityStats(config),
      ]);
      const lines = users.slice(0, 30).map((u) => {
        const active = isSubscriptionActive(u.subscribed_until);
        const name = u.telegram_username
          ? `@${u.telegram_username}`
          : u.first_name || String(u.telegram_id);
        return `${active ? "✅" : "⏸"} ${name} (${u.telegram_id})`;
      });
      await ctx.reply(
        [
          formatCapacityReport(capacity),
          "",
          lines.length ? lines.join("\n") : "Пока нет пользователей.",
        ].join("\n")
      );
    } catch (error) {
      await replyError(ctx, error);
    }
  });

  bot.command("capacity", async (ctx) => {
    try {
      if (!requireAdmin(ctx, config)) {
        await replyNotAdmin(ctx);
        return;
      }
      const capacity = await getBotCapacityStats(config);
      await ctx.reply(formatCapacityReport(capacity));
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
        await handleConnect(ctx, config, bot);
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
          reply_markup: helpKeyboard(),
          link_preview_options: { is_disabled: true },
        });
        return;
      }
      if (data === "action:clients") {
        await ctx.reply(
          [
            "📲 Клиенты для нашего ключа",
            "",
            "Android — v2rayNG (кнопка APK ниже)",
            "iOS — Happ (App Store / Happ+ для РФ)",
            "Windows — v2rayN",
            "",
            "⚠️ Hiddify не использовать.",
          ].join("\n"),
          {
            reply_markup: clientsKeyboard(),
            link_preview_options: { is_disabled: true },
          }
        );
        return;
      }
      if (data === "action:download_android") {
        await handleDownloadAndroid(ctx, bot);
        return;
      }
      if (data === "action:download_ios") {
        await handleDownloadIos(ctx);
        return;
      }
      if (data === "action:copy_key") {
        await handleCopyKey(ctx);
        return;
      }
      if (data === "action:paid") {
        await handlePaid(ctx, config, bot);
        return;
      }
      if (data === "action:pay_stars") {
        await handlePayStars(ctx, config, bot);
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

  bot.on("pre_checkout_query", async (ctx) => {
    try {
      parseStarsInvoicePayload(ctx.preCheckoutQuery.invoice_payload);
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: formatBotError(error),
      });
    }
  });

  bot.on("message:successful_payment", async (ctx) => {
    try {
      const payment = ctx.message.successful_payment;
      if (!payment || payment.currency !== "XTR") return;

      const from = ctx.from;
      if (!from) return;

      const payload = parseStarsInvoicePayload(payment.invoice_payload);
      if (payload.telegramId !== from.id) {
        throw new Error("Payment user mismatch");
      }

      const user = await confirmStarsPayment({
        botUserId: payload.botUserId,
        telegramId: from.id,
        starsAmount: payment.total_amount,
        amountRub: config.suggestedDonationRub,
        chargeId: payment.telegram_payment_charge_id,
      });

      await notifyStarsPaymentSuccess(
        bot,
        config,
        from.id,
        user.subscribed_until
      );
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
    "1. Скачайте клиент (кнопка «📲 Клиенты»):",
    "   • Android — v2rayNG (APK из бота или GitHub)",
    "   • iOS — Happ из App Store",
    "   • Windows — v2rayN",
    "2. «Поддержать» → Stars ⭐ или СБП.",
    "3. «Подключиться» → «📋 Скопировать ключ» (или нажмите на серый ключ).",
    "4. В клиенте: импорт из буфера → Connect.",
    "",
    "🍎 iOS (Happ):",
    "   • App Store: Happ - Proxy Utility",
    "   • Если не находится с РФ Apple ID — Happ+",
    "   • В Happ: «+» → вставить из буфера → включить",
    `   • ${HAPP_IOS_APPSTORE_URL}`,
    `   • РФ: ${HAPP_IOS_APPSTORE_RU_URL}`,
    `   • Сайт: ${HAPP_SITE_URL}`,
    "",
    "⚠️ Yandex CDN: только v2rayNG / Happ / v2rayN. Не Hiddify.",
    "",
    `Stars: ${config.starsAmount} ⭐ / мес · СБП: ${formatRub(config.suggestedDonationRub)}`,
    "",
    `Android: ${V2RAYNG_RELEASES_URL}`,
    `Windows: ${V2RAYN_RELEASES_URL}`,
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

async function handleConnect(ctx: Context, config: BotConfig, bot: Bot) {
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
      { reply_markup: donateKeyboard(config.starsAmount) }
    );
    return;
  }

  if (!user.xray_uuid) {
    const capacity = await getBotCapacityStats(config);
    if (capacity.atLimit) {
      await ctx.reply(
        [
          "⚠️ Сейчас все soft-слоты на сервере заняты.",
          `Активных: ${capacity.activeSubscribers} / ${capacity.softLimit}.`,
          "",
          "Напишите админу — добавим вместимость или выдадим доступ вручную.",
        ].join("\n")
      );
      await notifyAdmins(
        bot,
        config,
        `⚠️ Soft-лимит: пользователь ${user.telegram_id} не получил новый ключ (${capacity.activeSubscribers}/${capacity.softLimit}).`
      );
      return;
    }
  }

  await ctx.reply("⏳ Генерирую ключ на сервере, подождите 10–30 сек…");

  let updated: Awaited<ReturnType<typeof ensureProvisioned>>;
  try {
    updated = await ensureProvisioned(config, user);
  } catch (error) {
    const server = await getVpnServer(config.serverId).catch(() => null);
    const hint = server
      ? [
          "",
          `Режим: ${getBotProvisionMode(server)}`,
          `SSH: ${describeBotProvisionTarget(server)}`,
          getBotProvisionMode(server) === "yandex_cdn"
            ? "TELEGRAM_BOT_SSH_PASSWORD = пароль CDN Origin (не exit и не RU relay)."
            : getBotSshAuthMode(server) === "platform_key"
              ? "Добавьте TELEGRAM_BOT_SSH_PASSWORD в Vercel (Production) и Redeploy."
              : "Проверьте TELEGRAM_BOT_SSH_PASSWORD.",
        ].join("\n")
      : "";
    throw new Error(`${formatBotError(error)}${hint}`);
  }

  const keyUrl = updated.vless_config_url?.trim() || "";

  const header = [
    "🔌 Ваш ключ VPN",
    "",
    "Импорт: Android — v2rayNG · iOS — Happ · Windows — v2rayN",
    "⚠️ Hiddify не использовать.",
    `Подписка до: ${formatDate(updated.subscribed_until)}`,
  ];

  if (updated.vless_config_url?.includes("WG-Yandex-CDN")) {
    header.splice(2, 0, "🌐 Ключ через Yandex CDN.");
  }

  await ctx.reply(header.join("\n"), {
    reply_markup: afterConnectKeyboard(keyUrl || null),
  });

  if (keyUrl) {
    await replyCopyableKey(ctx, keyUrl);
  } else {
    await ctx.reply("Ключ не получен — напишите админу.");
  }

  if (updated.vless_tcp_config_url?.trim()) {
    await replyCopyableKey(
      ctx,
      updated.vless_tcp_config_url.trim(),
      "📶 Wi‑Fi fallback (TCP) — нажмите, чтобы скопировать:"
    );
  }
}

async function handleCopyKey(ctx: Context) {
  const from = ctx.from;
  if (!from) return;

  const user = await getBotUserByTelegramId(from.id);
  const url = user?.vless_config_url?.trim();

  if (!user || !url) {
    await ctx.reply(
      "Ключа пока нет. Нажмите «Подключиться», чтобы получить его."
    );
    return;
  }

  await replyCopyableKey(
    ctx,
    url,
    "📋 Нажмите на ключ ниже — он скопируется в буфер:"
  );

  const tcpUrl = user.vless_tcp_config_url?.trim();
  if (tcpUrl) {
    await replyCopyableKey(
      ctx,
      tcpUrl,
      "📶 TCP fallback — нажмите, чтобы скопировать:"
    );
  }
}

async function handleDownloadIos(ctx: Context) {
  await ctx.reply(iosHappGuideText(), {
    reply_markup: iosClientsKeyboard(),
  });
}

async function handleDownloadAndroid(ctx: Context, bot: Bot) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await ctx.reply("⏳ Прикрепляю свежий APK v2rayNG…");

  const caption = [
    "📱 v2rayNG (Android)",
    "",
    "1. Установите APK (разрешите установку из неизвестных источников).",
    "2. В боте нажмите «Подключиться» и скопируйте ключ.",
    "3. В v2rayNG: «+» → Import config from clipboard.",
  ].join("\n");

  try {
    const cachedId = getCachedV2rayNgFileId();
    if (cachedId) {
      await bot.api.sendDocument(chatId, cachedId, { caption });
      return;
    }

    const apk = await downloadV2rayNgApk();
    const sent = await bot.api.sendDocument(chatId, apk.file, {
      caption: [
        `📱 v2rayNG ${apk.tag} (Android)`,
        "",
        "1. Установите APK (разрешите установку из неизвестных источников).",
        "2. В боте нажмите «Подключиться» и скопируйте ключ.",
        "3. В v2rayNG: «+» → Import config from clipboard.",
      ].join("\n"),
    });

    const fileId = sent.document?.file_id;
    if (fileId) {
      setCachedV2rayNgFileId(fileId);
      console.info(
        `Cached v2rayNG file_id (set TELEGRAM_V2RAYNG_FILE_ID=${fileId} on Vercel to skip re-upload)`
      );
    }
  } catch (error) {
    console.error("Failed to send v2rayNG APK:", error);
    await ctx.reply(
      [
        "Не удалось прикрепить APK прямо в чат (часто из‑за GitHub/размера).",
        "Скачайте официальный релиз — файл *arm64-v8a.apk*:",
      ].join("\n"),
      { reply_markup: clientsKeyboard() }
    );
  }
}

async function handleDonate(ctx: Context, config: BotConfig) {
  await ctx.reply(
    [
      "💰 Поддержка VPN",
      "",
      `⭐ Stars: ${config.starsAmount} — мгновенная активация`,
      `💳 СБП: ${formatRub(config.suggestedDonationRub)} — ручное подтверждение`,
      "",
      config.donateDetails,
    ].join("\n"),
    { reply_markup: donateKeyboard(config.starsAmount) }
  );
}

async function handlePayStars(ctx: Context, config: BotConfig, bot: Bot) {
  const from = ctx.from;
  if (!from) return;

  const user = await upsertBotUser({
    telegram_id: from.id,
    telegram_username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
  });

  await sendStarsInvoice(bot, from.id, config, user);
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
