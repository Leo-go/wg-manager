# Три чата Cursor: PM, SaaS, складчина

Cursor не режет историю пополам. Рабочая схема:

| Чат | Роль |
|-----|------|
| **VPN PM / складчина** (этот) | Приоритеты, инциденты, «что говорим друзьям». Не код каждый день. |
| **SaaS / свой VPN** (новый) | Сайт, установка на чужой VPS, Timeweb, дашборд, `?ref=telegram`. |
| **Складчина / бот** (новый) | grammY, ключи, CDN Origin, домашний хост `94.103.15.20`, клиенты. |

На Mac: тот же аккаунт Cursor → Cloud Agent / история чатов подтягивается. Репозиторий: `git clone` `Leo-go/wg-manager`, открыть папку `~/vpn-saas-mvp-wsl`. WSL на Mac нет — либо remote SSH на Ubuntu, либо клон файлов локально.

---

## Вклеить целиком: чат «SaaS / свой VPN»

```
Ты работаешь только над SaaS / своим VPN в репозитории wg-manager (Next.js App Router, TypeScript strict, Tailwind, shadcn, Supabase, pnpm).

Не трогай складчину: grammY-бота, выдачу ключей друзьям, Yandex CDN xHTTP для бота, домашний хост 94.103.15.20, тексты в Telegram-группе.

Фокус:
- сайт и дашборд (серверы, Setup VPN, Timeweb);
- установка VLESS/Reality на чужой VPS;
- воронка из бота: кнопка «Свой VPN» → /login?ref=telegram;
- не смешивать инцидент складчины в этот бэклог, кроме самой кнопки в меню бота (её копи правит чат «Складчина / бот»).

Стек: App Router only, без any, Server Components по умолчанию, shadcn через CLI, pnpm.

Сначала прочитай README и текущие env в .env.example. Не коммить секреты. Не клади реальные UUID/pbk в репозиторий.
```

---

## Вклеить целиком: чат «Складчина / бот»

```
Ты работаешь только над складчиной VPN в репозитории wg-manager: Telegram-бот (grammY), персональные UUID, два профиля ключей, CDN и старый хост.

Не трогай SaaS-сайт, Timeweb-установку на чужой VPS и дашборд, кроме того что нужно боту (servers.id, SSH, health).

Продукт — два профиля в одном боте:
1) Дом — VLESS Reality TCP на 94.103.15.20:2053 (SNI www.apple.com). Клиенты: v2rayNG / INCY / Happ / Hiddify. URL в bot_users.vless_tcp_config_url.
2) Мобильный — Yandex CDN xHTTP, домен www.wg-manager.online → Origin 185.247.185.3 → Exit 216.57.107.94. Клиенты: v2rayNG / INCY / Happ / v2rayN, не Hiddify. URL в bot_users.vless_config_url.

Правило людям: сначала дом, если не встаёт — мобильный. Не один универсальный ключ.

Код:
- src/lib/bot/home-server.ts, xray-clients.ts (provisionBotUserDual, revokeBotUserEverywhere, syncHomeProfile), bot.ts (sendDualKeys), subscriptions.ts (cron revoke оба хоста).
- Env: TELEGRAM_BOT_HOME_SERVER_ID или TELEGRAM_BOT_HOME_SSH_HOST + TELEGRAM_BOT_HOME_VLESS_TEMPLATE + TELEGRAM_BOT_HOME_SSH_PASSWORD.
- TELEGRAM_BOT_SSH_PASSWORD = пароль CDN Origin, не exit и не домашний хост.
- scripts/xray-client-manager.sh add/remove UUID на всех vless inbound; гонять на Origin и на 94.103.
- Диагностика: bash scripts/diag-home-host.sh (jump SSH) и bash scripts/diag-cdn-from-isp.sh (с «мёртвой» сети оператора).
- Закреп группы: docs/group-pin.md.

Не светить в git и в чат общий UUID/pbk из старого Hiddify JSON. Друзьям — персональные UUID.

Стек: App Router, TypeScript strict, без any, pnpm. Не коммить .env и посторонние грязные файлы.
```

---

## Mac через 2 дня (складчина, не SaaS)

На Mac **не** v2rayNG. Практичный набор: **Happ desktop** (предпочтительно) или v2rayN. Импорт того же `vless://`.

Чеклист до выхода на работу:

1. Тот же аккаунт Cursor, клон `Leo-go/wg-manager` в `~/vpn-saas-mvp-wsl`.
2. Поставить Happ desktop.
3. В боте «Подключиться» — импортировать **оба** профиля (🏠 дом и 📱 мобильный).
4. Проверка с домашней Wi‑Fi: сначала дом (Reality).
5. Проверка с телефона как hotspot: если дом не встаёт — мобильный CDN.
6. Если туннель мёртв и «пропал интернет» — выключить VPN (kill switch), не ждать.

Домашний Reality проще и стабильнее на Wi‑Fi офиса/квартиры. CDN — запас, если офисный провайдер режет как мобильный DPI.

---

## Диагностика (агент, не с «мёртвого» ISP)

Прогон `scripts/diag-cdn-from-isp.sh` из WSL (не Билайн/Йота):

- `www.wg-manager.online` → A `188.72.103.4`, TCP 443 open, TLS 1.3, GET/OPTIONS `/cdn-check` **HTTP 204**. Значит с этой сети CDN не «мёртвый»; если у друга VPN не встаёт — это DNS/IP/DPI **его** оператора или отпечаток xHTTP. Скрипт нужно прогнать с хотспота, где ломается.
- `94.103.15.20:2053` TCP **open** — Reality-порт жив. `:22` тоже open, но SSH без ключа/пароля закрывает сессию (`Connection closed`). Jump `216.57.107.94` с этой сети timeout. Админка: `ssh -J root@216.57.107.94 root@94.103.15.20` с ключом, либо VNC хостера.
- На хосте: `xray-client-manager.sh add <uuid> <email>` — персональные UUID, не общий JSON из Hiddify.
