import type { LegalDocument } from "@/lib/legal/types";

export function getPrivacyRu(supportEmail: string): LegalDocument {
  return {
    title: "Политика конфиденциальности",
    updatedAt: "2026-08-07",
    intro: [
      "Эта политика описывает, какие данные обрабатывает VLESS Manager и зачем. Контакт: " +
        supportEmail +
        ".",
    ],
    sections: [
      {
        title: "1. Какие данные мы обрабатываем",
        paragraphs: [
          "В зависимости от того, как вы пользуетесь сервисом, могут обрабатываться:",
        ],
        bullets: [
          "email и данные аутентификации (через Supabase Auth);",
          "метаданные серверов: имя, IPv4, SSH-порт, статус установки;",
          "SSH-учётные данные, которые вы сами сохраняете в панели (пароль и/или ключ) — для установки по SSH;",
          "параметры CDN/Relay (домены, статусы), если вы включаете эти режимы;",
          "технические логи приложения (ошибки API, диагностика установки) на стороне хостинга приложения (например Vercel);",
          "cookie/локаль интерфейса;",
          "агрегированная аналитика посещений (например Vercel Analytics), без цели продавать персональные профили.",
        ],
      },
      {
        title: "2. Зачем",
        paragraphs: [
          "Данные нужны, чтобы предоставить функцию панели: вход, хранение списка VPS, SSH-установка, выдача конфигов/QR, админ-функции автора, улучшение стабильности.",
        ],
      },
      {
        title: "3. Где хранится",
        paragraphs: [
          "Основные данные аккаунта и серверов — в Supabase (облачная БД/Auth). Приложение может быть размещено на Vercel или аналоге. Хостинг VPS и Timeweb — отдельные контролёры по своим правилам.",
          "Чувствительные поля (SSH-пароли) в текущей MVP-версии могут храниться в БД в открытом виде. Это известный компромисс ранней версии: предпочтителен вход по SSH-ключу платформы без сохранения пароля.",
        ],
      },
      {
        title: "4. Передача третьим лицам",
        paragraphs: [
          "Мы не продаём ваши персональные данные. Передача возможна процессорам, необходимым для работы (Supabase, Vercel и т.п.), по их инфраструктуре, а также если это требуется законом.",
          "Партнёрские переходы на Timeweb происходят на стороне провайдера; их обработка данных регулируется политикой Timeweb.",
        ],
      },
      {
        title: "5. Сроки",
        paragraphs: [
          "Данные хранятся, пока нужен аккаунт и функции сервиса, либо до удаления аккаунта/данных по запросу (в разумные сроки, с учётом бэкапов).",
        ],
      },
      {
        title: "6. Ваши действия",
        paragraphs: [
          "Вы можете запросить уточнение, исправление или удаление данных аккаунта, написав на " +
            supportEmail +
            ". Для удаления может потребоваться подтверждение владения email.",
          "Не сохраняйте в панели пароли, которые используете в других критичных системах.",
        ],
      },
      {
        title: "7. Безопасность",
        paragraphs: [
          "Мы применяем разумные меры (HTTPS, разделение client/server ключей, RLS в Supabase где настроено). Абсолютной безопасности не существует; риск компрометации облачных зависимостей и сохранённых SSH-секретов остаётся.",
        ],
      },
      {
        title: "8. Изменения",
        paragraphs: [
          "Политика может обновляться; дата актуальной версии указана выше.",
        ],
      },
    ],
  };
}

export function getPrivacyEn(supportEmail: string): LegalDocument {
  return {
    title: "Privacy Policy",
    updatedAt: "2026-08-07",
    intro: [
      "This policy describes what data VLESS Manager processes and why. Contact: " +
        supportEmail +
        ".",
    ],
    sections: [
      {
        title: "1. Data we process",
        paragraphs: ["Depending on usage, we may process:"],
        bullets: [
          "email and auth data (via Supabase Auth);",
          "server metadata: name, IPv4, SSH port, install status;",
          "SSH credentials you choose to store (password and/or key) for remote install;",
          "CDN/Relay parameters if you enable those modes;",
          "app/technical logs (API errors, install diagnostics) on the app host (e.g. Vercel);",
          "UI locale cookie;",
          "aggregated visit analytics (e.g. Vercel Analytics), not for selling personal profiles.",
        ],
      },
      {
        title: "2. Purpose",
        paragraphs: [
          "To provide the panel: sign-in, VPS list, SSH setup, configs/QR, operator admin tools, and reliability improvements.",
        ],
      },
      {
        title: "3. Storage",
        paragraphs: [
          "Account and server data primarily live in Supabase. The app may run on Vercel or similar. Your VPS hoster is a separate controller under its own terms.",
          "In this MVP, SSH passwords may be stored in the database in plaintext — a known early-stage tradeoff. Prefer the platform SSH key flow without storing a password.",
        ],
      },
      {
        title: "4. Sharing",
        paragraphs: [
          "We do not sell personal data. Sharing may occur with processors needed to run the service (Supabase, Vercel, etc.), or when required by law.",
          "Referral clicks to Timeweb are handled under Timeweb’s policies.",
        ],
      },
      {
        title: "5. Retention",
        paragraphs: [
          "Data is kept while the account/features are needed, or until deletion is requested (subject to reasonable backup windows).",
        ],
      },
      {
        title: "6. Your choices",
        paragraphs: [
          "Request access, correction, or deletion via " +
            supportEmail +
            " (email ownership may need verification).",
          "Do not store passwords you reuse for other critical systems.",
        ],
      },
      {
        title: "7. Security",
        paragraphs: [
          "We use reasonable measures (HTTPS, server-only secrets, Supabase RLS where configured). No system is perfectly secure; cloud and stored SSH secret risks remain.",
        ],
      },
      {
        title: "8. Changes",
        paragraphs: [
          "This policy may change; the update date is shown above.",
        ],
      },
    ],
  };
}
