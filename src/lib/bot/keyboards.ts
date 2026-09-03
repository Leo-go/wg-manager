import { InlineKeyboard } from "grammy";
import {
  V2RAYN_RELEASES_URL,
  V2RAYNG_RELEASES_URL,
} from "@/lib/bot/clients";

export function mainMenuKeyboard(siteUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔌 Подключиться", "action:connect")
    .text("💰 Поддержать", "action:donate")
    .row()
    .text("📱 Скачать Android", "action:download_android")
    .text("📊 Статус", "action:status")
    .row()
    .url("🛠 Создать свой VPN", `${siteUrl}/login?ref=telegram`)
    .text("❓ Помощь", "action:help");
}

export function clientsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📱 Прислать APK (Android)", "action:download_android")
    .row()
    .url("📱 v2rayNG на GitHub", V2RAYNG_RELEASES_URL)
    .url("💻 v2rayN (Windows)", V2RAYN_RELEASES_URL);
}

export function afterConnectKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📱 Прислать APK (Android)", "action:download_android")
    .row()
    .url("📱 v2rayNG на GitHub", V2RAYNG_RELEASES_URL)
    .url("💻 v2rayN (Windows)", V2RAYN_RELEASES_URL)
    .row()
    .text("💰 Поддержать", "action:donate")
    .text("❓ Помощь", "action:help");
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
