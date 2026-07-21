import type { Dictionary } from "@/lib/i18n/types";

export const ru: Dictionary = {
  meta: {
    title: "WG Manager",
    description: "Установка VLESS Reality на ваш VPS: SSH, QR и готовая ссылка для клиента",
  },
  common: {
    brand: "WG Manager",
    loading: "Загрузка...",
    cancel: "Отмена",
    close: "Закрыть",
    copy: "Копировать",
    copied: "Скопировано",
    back: "Назад",
    continue: "Продолжить",
    language: "Язык",
    russian: "Русский",
    english: "English",
  },
  landing: {
    headline: "WG Manager",
    tagline:
      "Вы покупаете VPS — мы ставим VLESS Reality по SSH и выдаём готовый QR / ссылку для клиента.",
    cta: "Начать",
    signIn: "Войти",
    whatTitle: "Что мы делаем",
    whatLead:
      "Это не «облачный VPN-сервис». Сервер принадлежит вам. WG Manager — панель, которая подключается по SSH и настраивает Xray (VLESS + Reality) на вашей машине.",
    whatItems: [
      {
        title: "Ваш VPS, ваши ключи",
        body: "Хостинг оплачиваете у провайдера (например Timeweb). Мы не храним трафик и не продаём «подписку на чужой сервер».",
      },
      {
        title: "VLESS Reality за минуты",
        body: "Один клик Setup VPN: установка Xray, Reality-ключи, порт 443, ссылка vless:// и QR для Hiddify / v2rayN / Streisand.",
      },
      {
        title: "Клиенты и импорт по QR",
        body: "Отсканируйте QR или вставьте vless:// в Hiddify, v2rayN, Streisand и другие Reality-клиенты — без ручной правки конфигов.",
      },
    ],
    howTitle: "Как начать",
    howSteps: [
      {
        title: "Купите VPS",
        body: "Рекомендуем Timeweb Cloud по партнёрской ссылке. Добавьте наш SSH-ключ при создании — пароль root в панели не нужен.",
      },
      {
        title: "Добавьте сервер в WG Manager",
        body: "Укажите IPv4 и порт SSH. Выберите вход по SSH-ключу (предпочтительно) или паролю.",
      },
      {
        title: "Нажмите Setup VPN",
        body: "Дождитесь установки, импортируйте QR в клиент. Готово.",
      },
    ],
    osTitle: "Какую ОС выбрать при покупке VPS",
    osLead:
      "Инсталлятор рассчитан на обычный Ubuntu/Debian с systemd, apt и доступом root по SSH. Неверная ОС — частая причина сбоев setup.",
    osRecommendedTitle: "Рекомендуем",
    osRecommended: [
      "Ubuntu 24.04 LTS (лучший выбор)",
      "Ubuntu 22.04 LTS",
      "Debian 12 (Bookworm)",
    ],
    osOkTitle: "Обычно подходит",
    osOk: [
      "Ubuntu 20.04 LTS (устаревает — лучше 22.04/24.04)",
      "Debian 11 (Bullseye)",
    ],
    osAvoidTitle: "Не берите для этой панели",
    osAvoid: [
      "Windows Server / любой Windows",
      "Образы только с Docker / «app platform» без root SSH",
      "Минимальные Alpine / OpenWRT без systemd и apt",
      "Панели вроде ISPmanager как единственный доступ (нужен root SSH)",
    ],
    osTip:
      "В Timeweb при создании: ОС Ubuntu 24.04 или 22.04, регион за рубежом (например NL), обязательно IPv4.",
    relayTitle: "Прямой доступ",
    relayBody:
      "После Setup VPN вы получите QR и vless:// для прямого подключения к вашему зарубежному VPS.",
    disclaimer:
      "Используйте сервис в рамках закона. Реклама хостинга: партнёрская ссылка Timeweb — вы платите провайдеру напрямую.",
  },
  auth: {
    signIn: "Войти",
    signUp: "Регистрация",
    createAccount: "Создать аккаунт",
    subtitle: "WG Manager — установка VLESS Reality на ваш VPS",
    email: "Email",
    password: "Пароль",
    loading: "Загрузка...",
    haveAccount: "Уже есть аккаунт?",
    noAccount: "Нет аккаунта?",
    backHome: "На главную",
    accountCreated:
      "Аккаунт создан. Проверьте почту для подтверждения или войдите, если подтверждение отключено.",
    authFailed: "Ошибка входа",
  },
  nav: {
    servers: "Серверы",
    logOut: "Выйти",
  },
  dashboard: {
    title: "Мои серверы",
    getVps: "Купить VPS в Timeweb",
    addServer: "Добавить сервер",
    demoBuy: "Демо: покупка через API",
    empty: "Серверов пока нет. Добавьте первый VPS, чтобы начать.",
    name: "Имя",
    ip: "IP",
    status: "Статус",
    setup: "Установка",
    actions: "Действия",
    ready: "Готов",
    installing: "Установка",
    failed: "Ошибка",
    pending: "Ожидает",
    viewConfig: "Конфиг",
    retrySetup: "Повторить",
    viewProgress: "Прогресс",
    setupVpn: "Setup VPN",
    badgeRelay: "RU релей",
    badgePlusRelay: "+релей",
    deleteConfirm:
      "Удалить сервер «{name}» ({ip})?\n\nЭто удалит запись только из WG Manager — Xray на VPS не снимается.",
    deleteFailed: "Не удалось удалить сервер",
  },
  partner: {
    title: "VPS через Timeweb (партнёрская ссылка)",
    description:
      "Сервер покупаете у Timeweb. Мы только ставим VLESS Reality — пароль root не нужен, если добавите наш SSH-ключ.",
    step1Title: "1. Откройте Timeweb по партнёрской ссылке",
    step1Body:
      "Зарегистрируйтесь / войдите и создайте cloud-сервер. Хостинг оплачивается в Timeweb.",
    step1Link: "timeweb.cloud (реферал)",
    step2Title: "2. Добавьте наш SSH public key (рекомендуем)",
    step2Body:
      "При создании VPS: SSH-ключи → добавить → вставьте ключ ниже → выберите его для сервера. Тогда пароль root в WG Manager сохранять не нужно.",
    copyKey: "Копировать public key",
    keyMissing:
      "Публичный ключ платформы ещё не настроен (NEXT_PUBLIC_WG_SSH_PUBLIC_KEY). Попросите оператора или используйте пароль root.",
    step3Title: "3. Дождитесь статуса Online",
    step3Body:
      "Скопируйте IPv4 из панели Timeweb (одного IPv6 для большинства клиентов недостаточно).",
    step4Title: "4. Добавьте сервер здесь → Setup VPN",
    step4Body:
      "Выберите «SSH-ключ (рекомендуем)», чтобы не хранить пароль. Пароль остаётся запасным вариантом.",
    haveIp: "У меня есть IP — добавить сервер",
    osTip:
      "В Timeweb при создании: ОС Ubuntu 24.04 или 22.04, регион за рубежом (например NL), обязательно IPv4.",
  },
  addServer: {
    title: "Добавить сервер",
    name: "Имя сервера",
    namePlaceholder: "Мой VPN-сервер",
    ipv4: "IPv4 адрес",
    sshPort: "SSH порт",
    auth: "SSH-аутентификация",
    sshKey: "SSH-ключ",
    sshKeyHint: "Рекомендуем — безопаснее",
    password: "Пароль root",
    passwordAlt: "Альтернатива",
    rootPassword: "Пароль root",
    rootPasswordPlaceholder: "Введите пароль root",
    vlessPort: "Порт VLESS",
    vlessPortTip:
      "По умолчанию 443 — лучше всего для Reality в РФ; инсталлятор проверяет доступность SNI.",
    helpPrivateKey:
      "Установка идёт с приватным ключом платформы на сервере (WG_SSH_PRIVATE_KEY).",
    helpPasswordRisk:
      "Менее безопасно: пароль сохраняется в базе, чтобы setup мог подключиться по SSH. По возможности используйте SSH-ключ.",
    saving: "Сохранение...",
    submit: "Добавить",
    helpNoPassword:
      "При SSH-ключе пароль не сохраняется. Добавьте публичный ключ платформы на VPS заранее.",
    failed: "Не удалось добавить сервер",
    errors: {
      passwordRequired: "В режиме пароля нужен пароль root",
      platformKeyMissing:
        "SSH-ключ платформы не настроен. Используйте режим пароля или попросите оператора задать NEXT_PUBLIC_WG_SSH_PUBLIC_KEY / WG_SSH_PRIVATE_KEY.",
      notAuthenticated: "Вы не авторизованы",
      missingId: "Сервер создан, но ID отсутствует",
    },
  },
  sni: {
    label: "SNI-домен (маска)",
    help: "Reality использует этот домен как маскировку. Инсталлятор проверяет доступность dest с вашего VPS (при необходимости подставит запасной).",
    recommended: "рекомендуем",
    custom: "Свой домен",
  },
  editServer: {
    title: "Редактировать сервер",
    name: "Имя",
    ipv4: "IPv4 адрес",
    ipv4Tip: "Исправьте опечатку в IP здесь, затем при необходимости снова запустите Setup.",
    sshPort: "SSH порт",
    saving: "Сохранение…",
    save: "Сохранить",
    errors: {
      nameRequired: "Укажите имя",
      ipRequired: "Укажите IP-адрес",
      failed: "Не удалось обновить сервер",
    },
  },
  setup: {
    title: "Установка VPN",
    subtitle: "Установка VLESS Reality на этот VPS по SSH",
    back: "Назад",
    details: "Параметры подключения",
    ip: "IP-адрес",
    sshPort: "SSH порт",
    sni: "SNI домен",
    vlessPort: "Порт VLESS",
    installation: "Установка",
    installationHint: "Обычно занимает несколько минут. Не закрывайте страницу.",
    setupVpn: "Установить VPN",
    installing: "Установка на удалённом сервере...",
    retry: "Повторить установку",
    readyTitle: "VPN готов",
    readyHint: "Отсканируйте QR или скопируйте VLESS URL в клиент.",
    sniTip:
      "Используется SNI: {sni}. Если подключение не удаётся — смените SNI выше и перезапустите установку.",
    qrAlt: "QR-код VLESS",
    relayQrAlt: "QR-код VLESS через RU-релей",
    previousFailed: "Предыдущая установка не удалась. Можно повторить.",
    serverNotFound: "Сервер не найден",
    setupFailed: "Установка не удалась",
    diagnosticsTitle: "Диагностика установки",
    directUrl: "Прямой VLESS (exit)",
    relayUrl: "VLESS через RU-релей",
    reRun: "Переустановить",
    backServers: "К списку серверов",
    relayCardTitle: "RU Relay (слой 1)",
    relayCardHint:
      "Опциональный российский хоп: трафик маскируется под локальный сайт, выход — через этот зарубежный VPS.",
    addRelay: "Добавить RU Relay",
    replaceRelay: "Заменить / переустановить RU Relay",
    viaRelay: "Через RU-релей (если прямой режут)",
    statusReady: "Готов",
    statusInstalling: "Установка",
    statusFailed: "Ошибка",
    statusPending: "Ожидает setup",
    stepConnect: "Подключение по SSH",
    stepUpload: "Загрузка скрипта",
    stepUpdate: "Обновление пакетов",
    stepInstall: "Установка Xray",
    stepConfigure: "Генерация ключей",
    stepFinalize: "Сохранение VLESS URL",
    errors: {
      portInUse:
        "Скрипт не выполнился: порт {port} уже занят. Остановите конфликтующую службу на VPS и повторите.",
      portInUseGeneric:
        "Скрипт не выполнился: порт уже занят. Остановите конфликтующую службу на VPS и повторите.",
      missingPassword:
        "Нельзя начать установку: нет SSH-пароля. Отредактируйте или заново добавьте сервер с паролем.",
      missingIp: "Нельзя начать установку: не указан IP-адрес сервера.",
      serverNotFound:
        "Сервер не найден. Возможно, он удалён — вернитесь на дашборд.",
      parseVless:
        "Установка на VPS завершилась, но приложение не смогло прочитать VLESS URL. Проверьте диагностику и повторите.",
    },
  },
  relay: {
    title: "Добавить RU Relay",
    description:
      "Слой 1: клиент → VPS в РФ (Reality) → {name} (exit) → интернет. Несколько минут — не закрывайте окно.",
    name: "Имя",
    ipv4: "IPv4 RU VPS",
    sshPort: "SSH порт",
    auth: "SSH-аутентификация",
    sshKey: "SSH-ключ",
    password: "Пароль",
    relaySni: "SNI релея (клиент → РФ)",
    relaySniHint: "По умолчанию маскировка под gosuslugi на :443.",
    install: "Установить RU Relay",
    installing: "Установка…",
    cancel: "Отмена",
  },
};
