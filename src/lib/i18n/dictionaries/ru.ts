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
    whitelistTitle: "Контекст: белые IP адреса",
    whitelistBody:
      "Иногда приложения или сети «проверяют» источник подключения по IP (белый список). Если прямое подключение к зарубежному VPS не проходит по таким правилам, помогает смена VPS сервера или маршрута. Ниже — справочный репозиторий с примерами белых IP. Мы не интегрируемся с ним напрямую — добавляем контекст, чтобы вы понимали причины различного поведения.",
    whitelistLinkLabel: "Список белых IP (GitHub)",
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
    deleteConfirm:
      "Удалить сервер «{name}» ({ip})?\n\nЭто удалит запись только из VLESS Manager — Xray на VPS не снимается.",
    deleteFailed: "Не удалось удалить сервер",
    addRelay: "RU Relay",
    relayChildOf: "→ {name}",
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
      "Отсканируйте QR или скопируйте VLESS URL — клиент идёт через российский хоп.",
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
    reRun: "Переустановить",
    backServers: "К списку серверов",
    relayCardTitle: "RU Relay — российский хоп",
    relayCardHint:
      "Опциональный российский хоп: трафик маскируется под локальный сайт, выход — через этот зарубежный VPS.",
    addRelay: "Добавить RU Relay",
    openRelay: "Открыть конфиг релея",
    openRelaySetup: "Открыть установку релея",
    replaceRelay: "Заменить / переустановить RU Relay",
    replaceRelayHint:
      "Повторное добавление заменяет текущий RU VPS: старый конфиг сбросится, установку нужно пройти заново.",
    viaRelay: "Через RU-релей (если прямой режут)",
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
    relaySniHint: "По умолчанию маскировка под gosuslugi на :443.",
    continue: "Продолжить → Установка",
    installing: "Сохранение…",
    cancel: "Отмена",
    failed: "Не удалось зарегистрировать RU Relay",
  },
};
