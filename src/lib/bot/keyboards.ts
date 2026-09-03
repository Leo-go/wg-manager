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

export function mainMenuKeyboard(siteUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔌 Подключиться", "action:connect")
    .text("💰 Поддержать", "action:donate")
    .row()
    .text("📱 Android", "action:download_android")
    .text("🍎 iOS Happ", "action:download_ios")
    .row()
    .text("📊 Статус", "action:status")
    .url("🛠 Создать свой VPN", `${siteUrl}/login?ref=telegram`)
    .row()
    .text("❓ Помощь", "action:help");
}

export function clientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📱 Прислать APK (Android)", "action:download_android")
    .row()
    .url("📱 v2rayNG GitHub", V2RAYNG_RELEASES_URL)
    .url("💻 v2rayN Windows", V2RAYN_RELEASES_URL)
    .row()
    .url("🍎 Happ App Store", HAPP_IOS_APPSTORE_URL)
    .url("🍎 Happ+ (РФ)", HAPP_IOS_APPSTORE_RU_URL)
    .row()
    .url("🌐 happ.su", HAPP_SITE_URL);
}

export function afterConnectKeyboard(vlessUrl?: string | null): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (vlessUrl && canUseCopyTextButton(vlessUrl)) {
    kb.copyText("📋 Скопировать ключ", vlessUrl).row();
  } else if (vlessUrl) {
    kb.text("📋 Скопировать ключ", "action:copy_key").row();
  }

  return kb
    .text("📱 Android APK", "action:download_android")
    .text("🍎 iOS Happ", "action:download_ios")
    .row()
    .url("📱 v2rayNG", V2RAYNG_RELEASES_URL)
    .url("💻 v2rayN", V2RAYN_RELEASES_URL)
    .row()
    .url("🍎 Happ App Store", HAPP_IOS_APPSTORE_URL)
    .url("🍎 Happ+ (РФ)", HAPP_IOS_APPSTORE_RU_URL)
    .row()
    .text("💰 Поддержать", "action:donate")
    .text("❓ Помощь", "action:help");
}

export function iosClientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("🍎 App Store (Global)", HAPP_IOS_APPSTORE_URL)
    .row()
    .url("🍎 App Store Happ+ (РФ)", HAPP_IOS_APPSTORE_RU_URL)
    .row()
    .url("🌐 Сайт happ.su", HAPP_SITE_URL)
    .row()
    .text("🔌 Подключиться", "action:connect");
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
