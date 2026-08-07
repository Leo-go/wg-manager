import type { LegalDocument } from "@/lib/legal/types";

export function getTermsRu(supportEmail: string): LegalDocument {
  return {
    title: "Условия использования",
    updatedAt: "2026-08-07",
    intro: [
      "Это черновик условий для личного некоммерческого/раннего проекта VLESS Manager. Документ не является публичной офертой в смысле ст. 437 ГК РФ от имени юридического лица и не заменяет консультацию юриста.",
      "Оператор сервиса — физическое лицо (автор проекта), без регистрации ИП/ООО на момент публикации. Контакт: " +
        supportEmail +
        ".",
      "Продолжая регистрацию или вход, вы подтверждаете, что ознакомились с этими условиями и Политикой конфиденциальности.",
    ],
    sections: [
      {
        title: "1. Что такое сервис",
        paragraphs: [
          "VLESS Manager — веб-панель, которая помогает установить и настроить ПО (Xray / VLESS Reality и связанные режимы) на VPS, который вы сами арендуете у стороннего хостинг-провайдера.",
          "Мы не предоставляем доступ к чужому VPN-серверу, не продаём «подписку на VPN-трафик» и не являемся оператором связи.",
        ],
      },
      {
        title: "2. Ваш контроль и ответственность",
        paragraphs: [
          "VPS, root/SSH-доступ, ключи и трафик принадлежат вам (или вашему договору с хостером). После установки конфигурация выполняется на вашей машине.",
          "Вы самостоятельно выбираете провайдера, регион, ОС и способ использования. Вы обязаны соблюдать законы применимой юрисдикции и правила хостинг-провайдера.",
        ],
        bullets: [
          "не использовать сервис для незаконной деятельности;",
          "не нарушать права третьих лиц;",
          "самостоятельно оценивать риски блокировок, DPI и совместимости клиентов.",
        ],
      },
      {
        title: "3. «Как есть» (as is)",
        paragraphs: [
          "Сервис предоставляется «как есть» и «как доступен», без гарантий бесперебойности, пригодности для конкретной цели, обхода любых ограничений сети или сохранности данных на стороне третьих сервисов.",
          "Автор не гарантирует, что установка всегда завершится успешно: это зависит от сети, VPS, firewall, DNS, клиента и внешних API.",
        ],
      },
      {
        title: "4. Аккаунт и доступ",
        paragraphs: [
          "Для работы нужна учётная запись (email/пароль через Supabase Auth). Вы отвечаете за сохранность пароля и действий в аккаунте.",
          "Мы можем ограничить доступ при злоупотреблениях, угрозе безопасности или по техническим причинам, включая раннюю стадию проекта.",
        ],
      },
      {
        title: "5. Партнёрские ссылки",
        paragraphs: [
          "В интерфейсе могут быть партнёрские (реферальные) ссылки на хостинг (например Timeweb). Оплата хостинга идёт напрямую провайдеру. Автор может получать вознаграждение по партнёрской программе.",
        ],
      },
      {
        title: "6. Платные функции",
        paragraphs: [
          "Сейчас базовый функционал может предоставляться бесплатно. Если появятся платные опции (Pro и т.п.), условия оплаты, возвратов и чеков будут описаны отдельно.",
        ],
      },
      {
        title: "7. Ограничение ответственности",
        paragraphs: [
          "В максимальной степени, допустимой применимым правом, автор не отвечает за косвенные убытки, упущенную выгоду, простой, потерю данных на VPS, действия хостера, CDN, DNS или клиента VPN, а также за решения третьих лиц (блокировки, фильтры, модерация).",
        ],
      },
      {
        title: "8. Изменения",
        paragraphs: [
          "Условия могут обновляться. Актуальная версия публикуется на этой странице с датой обновления. Существенные изменения по возможности будут отражены в интерфейсе.",
        ],
      },
      {
        title: "9. Контакты",
        paragraphs: [
          "Вопросы по сервису: " + supportEmail + ".",
        ],
      },
    ],
  };
}

export function getTermsEn(supportEmail: string): LegalDocument {
  return {
    title: "Terms of Use",
    updatedAt: "2026-08-07",
    intro: [
      "This is a draft for the personal early-stage VLESS Manager project. It is not a formal public offer by a registered company and is not legal advice.",
      "The service operator is an individual (the project author), without a registered sole proprietorship / company at the time of publication. Contact: " +
        supportEmail +
        ".",
      "By signing up or signing in, you confirm that you have read these Terms and the Privacy Policy.",
    ],
    sections: [
      {
        title: "1. What the service is",
        paragraphs: [
          "VLESS Manager is a web panel that helps install and configure software (Xray / VLESS Reality and related modes) on a VPS that you rent yourself from a third-party hosting provider.",
          "We do not sell access to someone else’s VPN server, do not sell “VPN traffic subscriptions”, and are not a telecom carrier.",
        ],
      },
      {
        title: "2. Your control and responsibility",
        paragraphs: [
          "The VPS, SSH access, keys, and traffic belong to you (or your hosting contract). After setup, the stack runs on your machine.",
          "You choose the provider, region, OS, and how you use the setup. You must follow applicable law and your hoster’s terms.",
        ],
        bullets: [
          "do not use the service for unlawful activity;",
          "do not infringe third-party rights;",
          "assess blocking / DPI / client compatibility risks yourself.",
        ],
      },
      {
        title: "3. As is",
        paragraphs: [
          "The service is provided “as is” and “as available”, without warranties of uptime, fitness for a particular purpose, bypassing network restrictions, or data durability on third-party platforms.",
          "Successful install is not guaranteed and depends on network, VPS, firewall, DNS, clients, and external APIs.",
        ],
      },
      {
        title: "4. Account",
        paragraphs: [
          "You need an account (email/password via Supabase Auth). You are responsible for your password and account activity.",
          "Access may be limited in case of abuse, security risk, or operational reasons, including early-stage instability.",
        ],
      },
      {
        title: "5. Partner links",
        paragraphs: [
          "The UI may include referral links (e.g. Timeweb). You pay the hoster directly. The author may receive partner commission.",
        ],
      },
      {
        title: "6. Paid features",
        paragraphs: [
          "Core features may be free. If paid plans appear, billing terms will be published separately.",
        ],
      },
      {
        title: "7. Limitation of liability",
        paragraphs: [
          "To the fullest extent permitted by law, the author is not liable for indirect damages, lost profits, downtime, VPS data loss, or acts of hosters, CDNs, DNS, VPN clients, or third-party filters.",
        ],
      },
      {
        title: "8. Changes",
        paragraphs: [
          "These Terms may change. The current version is published on this page with an update date.",
        ],
      },
      {
        title: "9. Contact",
        paragraphs: ["Questions: " + supportEmail + "."],
      },
    ],
  };
}
