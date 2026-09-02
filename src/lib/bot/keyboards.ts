import { InlineKeyboard } from "grammy";

export function mainMenuKeyboard(siteUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔌 Подключиться", "action:connect")
    .text("💰 Поддержать", "action:donate")
    .row()
    .text("📊 Статус", "action:status")
    .url("🛠 Создать свой VPN", `${siteUrl}/login?ref=telegram`)
    .row()
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
