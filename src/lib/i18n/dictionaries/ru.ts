import type { Dictionary } from "@/lib/i18n/types";

export const ru: Dictionary = {
  meta: {
    title: "VLESS Manager",
    description: "Установка VLESS Reality на ваш VPS: SSH, QR и готовая ссылка для клиента",
  },
  common: {
    brand: "VLESS Manager",
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
    headline: "VLESS Manager",
    tagline:
      "Вы покупаете VPS — мы ставим VLESS Reality по SSH и выдаём готовый QR / ссылку для клиента.",
    cta: "Начать",
    signIn: "Войти",
    whatTitle: "Что мы делаем",
    whatLead:
      "Это не «облачный VPN-сервис». Сервер принадлежит вам. VLESS Manager — панель, которая подключается по SSH и настраивает Xray (VLESS + Reality) на вашей машине.",
    whatItems: [
      {
        title: "Ваш VPS, ваши ключи",
        body: "Хостинг оплачиваете у провайдера (например Timeweb). Мы не храним трафик и не продаём «подписку на чужой сервер».",
      },
      {
        title: "VLESS Reality за минуты",
        body: "Один клик «Установить VPN»: установка Xray, Reality-ключи, порт 443, ссылка vless:// и QR для Hiddify / v2rayN / Streisand.",
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
        title: "Добавьте сервер в VLESS Manager",
        body: "Укажите IPv4 и порт SSH. Выберите вход по SSH-ключу (предпочтительно) или паролю.",
      },
      {
        title: "Нажмите «Установить VPN»",
        body: "Дождитесь установки, импортируйте QR в клиент. Готово.",
      },
    ],
    osTitle: "Какую ОС выбрать при покупке VPS",
    osLead:
      "Инсталлятор рассчитан на обычный Ubuntu/Debian с systemd, apt и доступом root по SSH. Неверная ОС — частая причина сбоев установки.",
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
      "В Timeweb при создании: ОС Ubuntu 24.04 или 22.04, регион за рубежом (например NL), обязательно IPv4. Для RU Relay — отдельный VPS в России на той же Ubuntu.",
    relayTitle: "Что такое RU Relay",
    relayBody:
      "Обычно клиент подключается напрямую к вашему зарубежному VPS серверу через VLESS Reality. Если в РФ прямое подключение не работает (или нестабильно), добавьте RU Relay на странице установки зарубежного VPS сервера: трафик сначала попадёт на VPS в РФ, а затем выйдет за границу через ваш зарубежный VPS сервер. После установки вы получите второй VLESS URL/QR — «через Россию».",
    cdnTitle: "Что такое режим Yandex CDN",
    cdnBody:
      "Это продвинутый режим для сложных сетей, где direct и даже RU Relay могут резаться мобильным фильтром или whitelist-логикой. В этом режиме клиент подключается не к вашему VPS напрямую, а к домену за Yandex Cloud CDN.",
    cdnHowTitle: "Как это работает",
    cdnHowItems: [
      "Схема: клиент → Yandex CDN → Origin → Exit.",
      "Сначала пробуйте обычный direct VPN.",
      "Если direct нестабилен — включайте RU Relay.",
      "Если и этого мало, и доступна advanced-фича — настраивайте CDN-режим.",
    ],
    cdnAccessTitle: "Доступ к CDN-режиму",
    cdnAccessEnabled:
      "Для вашего аккаунта режим CDN включён. На странице настройки exit-сервера вы увидите отдельную карточку Yandex CDN.",
    cdnAccessRestricted:
      "Режим CDN показывается не всем пользователям. Обычно он открывается для реферальных / одобренных аккаунтов как advanced-сценарий.",
    whitelistTitle: "Контекст: белые IP адреса",
    whitelistBody:
      "Иногда приложения или сети «проверяют» источник подключения по IP (белый список). Если прямое подключение к зарубежному VPS не проходит по таким правилам, помогает смена VPS сервера или маршрута.",
    whitelistLinkLabel: "Список белых IP",
    disclaimer:
      "Используйте сервис в рамках закона. Реклама хостинга: партнёрская ссылка Timeweb — вы платите провайдеру напрямую.",
  },
  auth: {
    signIn: "Войти",
    signUp: "Регистрация",
    createAccount: "Создать аккаунт",
    subtitle: "VLESS Manager — установка VLESS Reality на ваш VPS",
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
    admin: "Админка",
    info: "Информация",
    about: "О проекте",
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
    setupVpn: "Установить VPN",
    badgeRelay: "RU релей",
    badgePlusRelay: "+релей",
    badgeCdn: "CDN",
    badgeCdnReady: "CDN готов",
    badgeCdnInstalling: "CDN ставится",
    badgeCdnFailed: "CDN ошибка",
    badgeCdnPending: "CDN ожидает",
    deleteConfirm:
      "Удалить сервер «{name}» ({ip})?\n\nЭто удалит запись только из VLESS Manager — Xray на VPS не снимается.",
    deleteFailed: "Не удалось удалить сервер",
    addRelay: "RU Relay",
    relayChildOf: "→ {name}",
    adminPanel: "Админ-панель",
  },
  admin: {
    title: "Админ-панель",
    subtitle:
      "Включайте доступ к Yandex CDN точечно для нужных пользователей без SQL.",
    email: "Email",
    access: "Доступ к Yandex CDN",
    enabled: "Включен",
    disabled: "Выключен",
    updated: "Обновлено",
    enable: "Включить",
    disable: "Выключить",
    loading: "Сохранение...",
    failed: "Не удалось обновить доступ",
    empty: "Пользователи не найдены.",
    back: "Назад к серверам",
    loadErrorTitle: "Не удалось загрузить пользователей",
    loadErrorHint:
      "Проверьте в Vercel → Environment Variables: SUPABASE_SERVICE_ROLE_KEY (Production) и сделайте Redeploy. Ключ берётся в Supabase → Project Settings → API → service_role.",
  },
  about: {
    pageTitle: "О проекте",
    missionTitle: "Зачем VLESS Manager",
    missionBody:
      "Мы сделали панель, чтобы настройка своего VPN на VPS занимала минуты, а не вечер с SSH и конфигами. Вы владеете сервером и ключами — мы автоматизируем установку Xray (VLESS + Reality) и выдаём готовый QR.",
    notTitle: "Чем мы не являемся",
    notItems: [
      "Не продаём «подписку на VPN» и не хостим ваш трафик",
      "Не гарантируем обход любых блокировок — это зависит от сети, VPS и клиента",
      "Не заменяем юридическую или ИБ-экспертизу вашей организации",
    ],
    principlesTitle: "Принципы",
    principles: [
      {
        title: "Ваш VPS — ваш контроль",
        body: "Хостинг оплачиваете провайдеру. Мы не имеем доступа к вашему трафику после установки.",
      },
      {
        title: "Прозрачная автоматизация",
        body: "Установка идёт по SSH открытыми скриптами; диагностика видна в интерфейсе.",
      },
      {
        title: "Минимум лишнего",
        body: "Нет биллинга внутри продукта — только управление серверами, которые вы добавили сами.",
      },
    ],
    disclaimerTitle: "Ответственность",
    disclaimerBody:
      "Вы сами выбираете провайдера, регион VPS и способ использования. Соблюдайте законы вашей страны и правила хостинга. VLESS Manager предоставляется «как есть», без гарантий доступности или пригодности для конкретной цели. Партнёрские ссылки на Timeweb — реферальная программа; оплата хостинга идёт напрямую провайдеру.",
  },
  partner: {
    title: "VPS через Timeweb (партнёрская ссылка)",
    description:
      "Сервер покупаете у Timeweb. Мы только ставим VLESS Reality — пароль root не нужен, если добавите наш SSH-ключ.",
    step1Title: "1. Откройте Timeweb по партнёрской ссылке",
    step1Body:
      "Зарегистрируйтесь / войдите и создайте cloud-сервер. Хостинг оплачивается в Timeweb.",
    step1Link: "timeweb.cloud (реферал)",
    step2Title: "2. Добавьте наш SSH-публичный ключ (рекомендуем)",
    step2Body:
      "При создании VPS: SSH-ключи → добавить → вставьте ключ ниже → выберите его для сервера. Тогда пароль root в VLESS Manager сохранять не нужно.",
    copyKey: "Копировать публичный ключ",
    keyMissing:
      "Публичный ключ платформы ещё не настроен (NEXT_PUBLIC_WG_SSH_PUBLIC_KEY). Попросите оператора или используйте пароль root.",
    step3Title: "3. Дождитесь, пока сервер будет в сети",
    step3Body:
      "Скопируйте IPv4 из панели Timeweb (одного IPv6 для большинства клиентов недостаточно).",
    step4Title: "4. Добавьте сервер здесь → Установить VPN",
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
    sshUsername: "SSH пользователь",
    sshUsernameHint:
      "По умолчанию root. Если вход под ubuntu/debian — укажите его; для установки нужен passwordless sudo (sudo -n).",
    auth: "SSH-аутентификация",
    sshKey: "SSH-ключ",
    sshKeyHint: "Рекомендуем — безопаснее",
    password: "Пароль",
    passwordAlt: "Альтернатива",
    rootPassword: "Пароль SSH",
    rootPasswordPlaceholder: "Пароль пользователя SSH",
    vlessPort: "Порт VLESS",
    vlessPortTip:
      "По умолчанию 443 — лучше всего для Reality в РФ; инсталлятор проверяет доступность SNI.",
    helpPrivateKey:
      "Установка идёт с приватным ключом платформы на сервере (WG_SSH_PRIVATE_KEY).",
    helpPasswordRisk:
      "Менее безопасно: пароль сохраняется в базе, чтобы установка могла подключиться по SSH. По возможности используйте SSH-ключ.",
    saving: "Сохранение...",
    submit: "Добавить",
    helpNoPassword:
      "При SSH-ключе пароль не сохраняется. Добавьте публичный ключ платформы на VPS заранее.",
    failed: "Не удалось добавить сервер",
    errors: {
      passwordRequired: "В режиме пароля нужен пароль SSH",
      platformKeyMissing:
        "SSH-ключ платформы не настроен. Используйте режим пароля или попросите оператора задать NEXT_PUBLIC_WG_SSH_PUBLIC_KEY / WG_SSH_PRIVATE_KEY.",
      notAuthenticated: "Вы не авторизованы",
      missingId: "Сервер создан, но ID отсутствует",
    },
  },
  sni: {
    label: "SNI-домен (маска)",
    help: "Reality использует этот домен как маскировку. Инсталлятор проверяет доступность целевого хоста с вашего VPS (при необходимости подставит запасной).",
    recommended: "рекомендуем",
    custom: "Свой домен",
  },
  editServer: {
    title: "Редактировать сервер",
    name: "Имя",
    ipv4: "IPv4 адрес",
    ipv4Tip: "Исправьте опечатку в IP здесь, затем при необходимости снова запустите установку.",
    sshPort: "SSH порт",
    sshUsername: "SSH пользователь",
    sshUsernameHint:
      "Не-root пользователь должен иметь passwordless sudo на VPS.",
    saving: "Сохранение…",
    save: "Сохранить",
    errors: {
      nameRequired: "Укажите имя",
      ipRequired: "Укажите IP-адрес",
      usernameInvalid: "Некорректное имя пользователя SSH",
      failed: "Не удалось обновить сервер",
    },
  },
  setup: {
    title: "Установка VPN",
    subtitle: "Установка VLESS Reality на этот VPS по SSH",
    relayTitle: "Установка RU Relay",
    relaySubtitle:
      "Российский хоп: клиент подключается к VPS в РФ, трафик идёт на ваш зарубежный VPS сервер",
    linkedExit: "Зарубежный VPS сервер: {name} ({ip})",
    back: "Назад",
    details: "Параметры подключения",
    ip: "IP-адрес",
    sshPort: "SSH порт",
    sshUsername: "SSH пользователь",
    sni: "SNI домен",
    vlessPort: "Порт VLESS",
    installation: "Установка",
    installationHint: "Обычно занимает несколько минут. Не закрывайте страницу.",
    setupVpn: "Установить VPN",
    setupRelay: "Установить RU Relay",
    installing: "Установка на удалённом сервере...",
    installingStuck:
      "Похоже, предыдущая установка зависла (страница была перезагружена). Можно повторить.",
    retry: "Повторить установку",
    readyTitle: "VPN готов",
    readyHint: "Отсканируйте QR или скопируйте VLESS URL в клиент.",
    readyTitleRelay: "RU Relay готов",
    readyHintRelay:
      "На мобильной сети импортируйте xHTTP URL. TCP classic (:8443) — запасной вариант для Wi‑Fi.",
    sniTip:
      "Используется SNI: {sni}. Если подключение не удаётся — смените SNI выше и перезапустите установку.",
    relaySniTip:
      "SNI релея: {sni}. Чтобы сменить маскировку, замените RU Relay и укажите другой SNI в диалоге.",
    qrAlt: "QR-код VLESS",
    relayQrAlt: "QR-код VLESS через RU-релей",
    previousFailed: "Предыдущая установка не удалась. Можно повторить.",
    serverNotFound: "Сервер не найден",
    setupFailed: "Установка не удалась",
    diagnosticsTitle: "Диагностика установки",
    diagnosticsDetectedIssue: "Что похоже сломалось",
    diagnosticsNextSteps: "Что делать дальше",
    diagnosticsSignals: "Сигналы из логов",
    diagnosticsRawOutput: "Сырые логи установки",
    diagnosticsHealthy: "Похоже, всё в порядке",
    diagnosticsNeedsAttention: "Нужно внимание",
    diagIssueSshAuth: "Проблема с SSH-аутентификацией",
    diagIssueSshNetwork: "Проблема с доступностью сервера по SSH",
    diagIssueSshKey: "Проблема с SSH-ключом платформы",
    diagIssuePortInUse: "Конфликт порта на VPS",
    diagIssueRelayDependency: "Не готова зависимость для relay",
    diagIssueInstallScript: "Ошибка во время установки на сервере",
    diagIssueParseConfig: "Конфиг создался, но приложение не смогло его прочитать",
    diagIssueUnknown: "Точная причина не определилась автоматически",
    diagStepCheckCredentials:
      "Проверьте SSH-логин, пароль или приватный ключ для этого сервера.",
    diagStepCheckIpPort:
      "Проверьте IP-адрес сервера, SSH-порт, security groups и доступность порта 22/вашего SSH-порта.",
    diagStepCheckPublicKey:
      "Если используете режим SSH key, заново вставьте публичный ключ платформы на VPS и убедитесь, что он попал в authorized_keys нужного пользователя.",
    diagStepCheckPortConflict:
      "Освободите занятый порт или смените VLESS-порт в настройках сервера и повторите установку.",
    diagStepCheckExitReady:
      "Сначала завершите установку основного exit-сервера, затем заново запускайте relay.",
    diagStepRetrySetup: "После исправления проблемы повторите установку.",
    diagStepTryAnotherSni:
      "Если SSH и установка проходят, но подключение потом нестабильно, попробуйте другой SNI-домен.",
    diagStepReviewRawOutput:
      "Если причина всё ещё не ясна, откройте сырые логи ниже и ищите первую явную ошибку.",
    directUrl: "Прямой VLESS",
    relayUrl: "VLESS через RU-релей",
    relayUrlXhttp: "VLESS xHTTP (мобильный, :443)",
    relayUrlTcp: "VLESS TCP classic (:8443)",
    relayTransportHint:
      "На LTE сначала xHTTP. TCP classic — запасной для Wi‑Fi, если провайдер не режет TCP Reality.",
    reRun: "Переустановить",
    backServers: "К списку серверов",
    relayCardTitle: "RU Relay — российский хоп",
    relayCardHint:
      "Сначала должен быть готов зарубежный VPN. Затем добавьте RU VPS, установите релей и в клиенте используйте URL «через RU-релей» — не прямой.",
    addRelay: "Добавить RU Relay",
    openRelay: "Открыть конфиг релея",
    openRelaySetup: "Открыть установку релея",
    replaceRelay: "Заменить / переустановить RU Relay",
    replaceRelayHint:
      "Повторное добавление заменяет текущий RU VPS: старый конфиг сбросится, установку нужно пройти заново.",
    viaRelay: "Через RU-релей — xHTTP (если прямой режут)",
    viaRelayTcp: "Через RU-релей — TCP classic (:8443)",
    statusReady: "Готов",
    statusInstalling: "Установка",
    statusFailed: "Ошибка",
    statusPending: "Ожидает установки",
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
        "Нельзя начать установку: нет SSH-доступа. Отредактируйте сервер и укажите пароль, либо добавьте публичный ключ платформы на VPS (режим SSH-ключа).",
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
      "Укажите RU VPS — дальше откроется страница установки, как для обычного сервера. Зарубежный VPS сервер: {name}.",
    name: "Имя",
    namePlaceholder: "RU релей → {name}",
    ipv4: "IPv4 RU VPS",
    sshPort: "SSH порт",
    sshUsername: "SSH пользователь",
    sshUsernameHint:
      "По умолчанию root. Для ubuntu/debian нужен passwordless sudo.",
    auth: "SSH-аутентификация",
    sshKey: "SSH-ключ",
    password: "Пароль",
    authHint:
      "SSH-ключ работает только если на этом RU VPS уже добавлен публичный ключ платформы. Иначе выберите пароль root.",
    relaySni: "SNI релея (клиент → РФ)",
    relaySniHint:
      "Маскировка под российский сайт на :443. Рекомендуем eh.vk.com; если нестабильно — попробуйте max.ru или rutube.ru.",
    howItWorksTitle: "Как это работает (порядок)",
    howItWorksStep1:
      "Зарубежный VPN уже установлен (эта страница — готовый exit).",
    howItWorksStep2:
      "Укажите IP и SSH доступ к VPS в России — ничего про xHTTP/path вводить не нужно.",
    howItWorksStep3:
      "На следующей странице нажмите «Установить RU Relay» и дождитесь успеха.",
    howItWorksStep4:
      "В клиенте импортируйте QR/URL с релея (или «через RU-релей» на exit) — не прямой VLESS exit.",
    howItWorksNote:
      "После установки будут два URL: xHTTP на :443 (для мобильной сети) и TCP classic на :8443 (запасной). Связь RU → exit настраивается автоматически.",
    continue: "Продолжить → Установка",
    installing: "Сохранение…",
    cancel: "Отмена",
    failed: "Не удалось зарегистрировать RU Relay",
  },
  cdn: {
    cardTitle: "Yandex CDN — обход без белого IP",
    cardHint:
      "Клиент → Yandex Cloud CDN → Origin → этот Exit. Нужны домен, второй VPS (Origin) и аккаунт Yandex Cloud.",
    openSetup: "Настроить Yandex CDN",
    replaceSetup: "Перенастроить Yandex CDN",
    shopTitle: "Что купить / подготовить",
    shopDomain:
      "Домен с DNS (записи origin.*, relay.*, cdn.*):",
    shopExit:
      "Exit VPS за границей — уже есть (эта страница). Порты 80 и 11443 откроет установщик.",
    shopOrigin:
      "Origin VPS с публичным IP (отдельный сервер или ваш RU Relay VPS). Порты 80/443 откроет установщик. Для покупки можно использовать Timeweb Cloud. Внимание: на Origin ставится Nginx на :443 — роль RU Relay на этом же IP будет заменена.",
    shopYandex:
      "Yandex Cloud — Certificate Manager + Cloud CDN (Compute VM для CDN не нужен):",
    shopDns:
      "Сначала пропишите DNS (см. подсказки у полей ниже), дождитесь резолва, затем жмите установку.",
    title: "Yandex CDN",
    description:
      "Сохраним параметры и по SSH поставим Exit (:11443 TLS) + Origin (Nginx+Xray). CDN в консоли Яндекса — вручную по чеклисту.",
    dnsBeforeInstallTitle: "DNS до установки на серверы",
    dnsBeforeInstallBody:
      "В панели регистратора доменов создайте записи ниже. Без корректного DNS Let's Encrypt и установка упадут. CNAME для CDN-домена — только после ресурса в Yandex Cloud.",
    cdnDomain: "CDN домен (клиент)",
    cdnDomainDnsHint:
      "Рекомендуется сразу использовать www-домен, например www.example.com. Пока не создавайте A-запись. После CDN в Яндексе: CNAME этого имени → адрес из панели Cloud CDN (обычно *.topology.gslb.yccdn.ru).",
    originDomain: "Origin домен",
    originDomainDnsHint:
      "Обычно это отдельный поддомен, например origin.example.com. Сейчас: A-запись этого имени → IPv4 Origin VPS (поле ниже). Нужна до установки — для сертификата и как origin в Yandex CDN.",
    relayDomain: "Relay домен (Exit TLS)",
    relayDomainDnsHint:
      "Обычно это отдельный поддомен, например relay.example.com. Сейчас: A-запись этого имени → IPv4 этого Exit ({exitIp}). Нужна до установки — Let's Encrypt на Exit для :11443.",
    email: "Email для Let's Encrypt",
    path: "XHTTP path",
    paddingKey: "Padding key",
    originIp: "IPv4 Origin VPS",
    originIpDnsHint:
      "Сюда должен указывать A Origin-домена. Можно указать IP вашего RU Relay VPS — тогда он станет Origin (RU Relay на :443 будет заменён).",
    originRoleWarning:
      "Установщик Origin перезапишет Xray и займёт :443 (Nginx). Если IP — ваш RU Relay, клиентские URL релея перестанут работать; путь станет Client → Yandex CDN → этот Origin → Exit.",
    originSshPort: "SSH порт Origin",
    originSshUser: "SSH пользователь Origin",
    originSshPassword: "SSH пароль Origin",
    saveAndInstall: "Сохранить и установить на серверы",
    installing: "Установка Exit + Origin…",
    cancel: "Отмена",
    failed: "Не удалось настроить Yandex CDN",
    readyTitle: "Серверы CDN готовы",
    readyHint:
      "Скрипт установил Exit + Origin. Дальше — вручную Certificate Manager, CDN-ресурс и CNAME. Откройте «Что делать дальше».",
    clientUrl: "VLESS через Yandex CDN",
    whatNext: "Что делать дальше",
    checklistTitle: "Краткий чеклист",
    checklistDns: "1) DNS: A origin→Origin IP, A relay→Exit IP уже должны работать.",
    checklistCert:
      "2) Certificate Manager → Let's Encrypt для CDN-домена (DNS-проверка).",
    checklistCdn:
      "3) Cloud CDN → ресурс: origin=Origin-домен, HTTPS, Host=Origin, без кеша, методы GET/HEAD/OPTIONS.",
    checklistCname:
      "4) CNAME CDN-домена → адрес из панели CDN (*.topology.gslb.yccdn.ru), HTTP→HTTPS.",
    checklistTest:
      "5) curl OPTIONS https://CDN-домен/cdn-check → 204 и X-CDN-Origin: ok, затем импорт VLESS в v2rayNG.",
    docsCert: "Документация Certificate Manager",
    docsCdn: "Документация Cloud CDN",
    docsCreate: "Создание CDN-ресурса",
    nextSteps: {
      title: "Что делать дальше после установки CDN",
      intro:
        "Скрипт уже поставил Exit (:11443) и Origin (Nginx+Xray). Осталось вручную настроить Yandex Cloud и DNS для клиентского домена — по шагам ниже. Подставляйте свои значения из блока «Ваши данные».",
      yourValuesTitle: "Ваши данные (из формы установки)",
      labelCdn: "CDN-домен (клиент)",
      labelOrigin: "Origin-домен",
      labelRelay: "Relay-домен (Exit TLS)",
      labelOriginIp: "IP Origin",
      labelExitIp: "IP Exit",
      openConsole: "Открыть консоль Yandex Cloud",
      step1Title: "Certificate Manager — сертификат для CDN-домена",
      step1Body:
        "Откройте Yandex Cloud → Certificate Manager → создать сертификат Let's Encrypt.",
      step1Item1:
        "Домен(ы) сертификата: ровно {cdnDomain} (если используете www — добавьте www.{cdnDomain} или укажите www как основной клиентский хост).",
      step1Item2:
        "Тип проверки: DNS. Создайте CNAME _acme-challenge (как покажет Яндекс) у регистратора зоны {cdnDomain}. Не путайте с CNAME для самого CDN.",
      step1Item3:
        "Дождитесь статуса «Выпущен». Запись _acme-challenge оставьте — нужна для продления.",
      step2Title: "Cloud CDN — создать ресурс",
      step2Body:
        "Cloud CDN → создать ресурс. Заполните поля точно так:",
      step2Origin: "Доменное имя источника (Origin)",
      step2Protocol: "Протокол до источника",
      step2Host: "Заголовок Host (своё значение)",
      step2Domain: "Доменное имя (клиентский / персональный)",
      step2Cert: "Сертификат",
      step2CertValue: "тот, что выпущен на {cdnDomain}",
      step2Extra:
        "Перенаправление запросов к origin и «следовать редиректам origin» — выключить. Доступ пользователям — разрешён.",
      step3Title: "Кеширование и контент",
      step3Item1: "Кеширование в CDN — выключить.",
      step3Item2: "Кеширование в браузере — выключить.",
      step3Item3: "gzip — не сжимать.",
      step3Item4: "Сегментация больших файлов — не сегментировать.",
      step4Title: "HTTP-методы",
      step4Item1:
        "Разрешённые методы: GET, HEAD, OPTIONS (POST в Yandex CDN часто недоступен — так и задумано).",
      step4Item2: "CORS — «Не добавлять». Настраиваемый HTTP-ответ — выкл.",
      step5Title: "DNS CNAME для клиентского домена",
      step5Body:
        "В карточке CDN-ресурса скопируйте CNAME-цель (часто *.topology.gslb.yccdn.ru).",
      step5Item1:
        "У регистратора зоны для имени {cdnDomain} (часто host www или @) создайте CNAME → значение из Яндекса.",
      step5Item2:
        "Если регистратор не даёт CNAME на корень — используйте www.{cdnDomain}: сертификат и персональный домен CDN тоже на www.",
      step5Item3:
        "В CDN: переадресация клиентов «С HTTP на HTTPS». Запись _acme-challenge не удаляйте.",
      step6Title: "Проверка",
      step6Body: "С компьютера (антивирус не должен блокировать DNS):",
      step6Cmd:
        "curl -sI -X OPTIONS \"https://{cdnDomain}/cdn-check\"",
      step6Expect:
        "Ожидайте HTTP 204 и заголовок X-CDN-Origin: ok. Сертификат должен быть на {cdnDomain}, не *.yccdn.cloud.yandex.net.",
      step7Title: "Клиент — импорт VLESS",
      step7Body:
        "Скопируйте VLESS URL / QR с этой страницы (после шагов выше). Рекомендуемые клиенты с поддержкой xHTTP packet-up + extra:",
      step7Item1: "Android: v2rayNG (свежий APK с GitHub Releases).",
      step7Item2: "Windows: v2rayN (свежий релиз, core Xray ≥ 26.5.9).",
      step7Item3:
        "Импортируйте ссылку как есть — не упрощайте и не выкидывайте параметр extra (там padding для Yandex CDN).",
      step7Warning:
        "Hiddify и часть старых клиентов часто ломают padding (в логах Origin видно x_padding=XXXX) — через Yandex CDN будет таймаут. Используйте v2rayNG / v2rayN.",
      clientAndroid: "v2rayNG (Android)",
      clientWindows: "v2rayN (Windows)",
      tipsTitle: "Если не подключается",
      tip1:
        "Проверьте DNS: dig/nslookup {cdnDomain} должен вести на CDN, не на Origin IP.",
      tip2:
        "Временно выключите антивирус/фильтр DNS — он может ломать резолв CDN-домена.",
      tip3:
        "Прямой URL на Origin (без CDN) может работать, а через CDN — нет: сначала добейтесь 204 на /cdn-check через CDN-домен.",
    },
  },
};
