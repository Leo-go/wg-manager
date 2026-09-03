import { InlineKeyboard } from "grammy";
import {
  HAPP_IOS_APPSTORE_RU_URL,
  HAPP_IOS_APPSTORE_URL,
  HAPP_SITE_URL,
  V2RAYN_RELEASES_URL,
  V2RAYNG_RELEASES_URL,
} from "@/lib/bot/clients";

/** Telegram copy_text button limit. */
export const TELEGRAM_COPY_TEXT_MAX = 256;

export function canUseCopyTextButton(text: string): boolean {
  return text.length > 0 && text.length <= TELEGRAM_COPY_TEXT_MAX;
}

/** Compact main menu — downloads live under «Клиенты». */
export function mainMenuKeyboard(siteUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔌 Подключиться", "action:connect")
    .text("💰 Поддержать", "action:donate")
    .row()
    .text("📲 Клиенты", "action:clients")
    .text("📊 Статус", "action:status")
    .row()
    .url("🛠 Свой VPN", `${siteUrl}/login?ref=telegram`)
    .text("❓ Помощь", "action:help");
}

/** All download links in one place. */
export function clientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📱 APK Android (v2rayNG)", "action:download_android")
    .row()
    .url("🍎 Happ iOS", HAPP_IOS_APPSTORE_URL)
    .url("🍎 Happ+ РФ", HAPP_IOS_APPSTORE_RU_URL)
    .row()
    .url("💻 v2rayN Windows", V2RAYN_RELEASES_URL)
    .url("🌐 happ.su", HAPP_SITE_URL)
    .row()
    .url("📱 v2rayNG GitHub", V2RAYNG_RELEASES_URL)
    .text("« Назад", "action:help");
}

/** After key issue — only what you need next. */
export function afterConnectKeyboard(vlessUrl?: string | null): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (vlessUrl && canUseCopyTextButton(vlessUrl)) {
    kb.copyText("📋 Скопировать ключ", vlessUrl).row();
  } else if (vlessUrl) {
    kb.text("📋 Скопировать ключ", "action:copy_key").row();
  }

  return kb
    .text("📲 Клиенты", "action:clients")
    .text("❓ Помощь", "action:help");
}

export function iosClientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("🍎 App Store (Global)", HAPP_IOS_APPSTORE_URL)
    .row()
    .url("🍎 Happ+ (РФ)", HAPP_IOS_APPSTORE_RU_URL)
    .row()
    .url("🌐 happ.su", HAPP_SITE_URL)
    .row()
    .text("🔌 Подключиться", "action:connect")
    .text("📲 Все клиенты", "action:clients");
}

export function helpKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📲 Клиенты", "action:clients")
    .text("🍎 iOS Happ", "action:download_ios")
    .row()
    .text("🔌 Подключиться", "action:connect")
    .text("💰 Поддержать", "action:donate");
}

export function donateKeyboard(starsAmount: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(`⭐ Оплатить Stars (${starsAmount})`, "action:pay_stars")
    .row()
    .text("✅ Я оплатил (СБП)", "action:paid");
}

export function adminApproveKeyboard(donationId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Подтвердить", `admin:approve:${donationId}`)
    .text("❌ Отклонить", `admin:reject:${donationId}`);
}
