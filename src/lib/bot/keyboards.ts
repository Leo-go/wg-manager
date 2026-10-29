import { InlineKeyboard } from "grammy";
import {
  HAPP_DESKTOP_RELEASES_URL,
  HAPP_IOS_APPSTORE_URL,
  HAPP_SITE_URL,
  INCY_ANDROID_APK_URL,
  INCY_ANDROID_PLAY_URL,
  INCY_DESKTOP_WINDOWS_URL,
  INCY_IOS_APPSTORE_URL,
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
    .url("📱 INCY Android (Play)", INCY_ANDROID_PLAY_URL)
    .text("📱 Гайд Android", "action:download_android")
    .row()
    .url("🍎 INCY iOS (РФ)", INCY_IOS_APPSTORE_URL)
    .text("🍎 Гайд iOS", "action:download_ios")
    .row()
    .url("💻 INCY Windows", INCY_DESKTOP_WINDOWS_URL)
    .url("💻 Happ ПК", HAPP_DESKTOP_RELEASES_URL)
    .row()
    .text("💻 Гайд ПК", "action:download_desktop")
    .row()
    .url("📱 INCY APK (без Play)", INCY_ANDROID_APK_URL)
    .text("📱 v2rayNG APK", "action:download_android_apk")
    .row()
    .url("💻 v2rayN (запасной)", V2RAYN_RELEASES_URL)
    .url("📱 v2rayNG GitHub", V2RAYNG_RELEASES_URL)
    .row()
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
    .url("🍎 INCY — App Store (РФ)", INCY_IOS_APPSTORE_URL)
    .row()
    .url("🍎 Happ (если есть зарубежный ID)", HAPP_IOS_APPSTORE_URL)
    .row()
    .url("🌐 happ.su / TestFlight", HAPP_SITE_URL)
    .row()
    .text("🔌 Подключиться", "action:connect")
    .text("📲 Все клиенты", "action:clients");
}

export function androidClientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("📱 INCY — Google Play", INCY_ANDROID_PLAY_URL)
    .row()
    .url("📱 INCY APK (без Play)", INCY_ANDROID_APK_URL)
    .row()
    .text("📱 v2rayNG APK (запасной)", "action:download_android_apk")
    .row()
    .text("🔌 Подключиться", "action:connect")
    .text("📲 Все клиенты", "action:clients");
}

export function desktopClientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("💻 INCY Windows", INCY_DESKTOP_WINDOWS_URL)
    .row()
    .url("💻 Happ (Windows / Mac / Linux)", HAPP_DESKTOP_RELEASES_URL)
    .row()
    .url("🌐 happ.su", HAPP_SITE_URL)
    .url("💻 v2rayN (запасной)", V2RAYN_RELEASES_URL)
    .row()
    .text("🔌 Подключиться", "action:connect")
    .text("📲 Все клиенты", "action:clients");
}

export function helpKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📲 Клиенты", "action:clients")
    .text("📱 Android", "action:download_android")
    .row()
    .text("🍎 iOS", "action:download_ios")
    .text("💻 ПК", "action:download_desktop")
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
