import { getBotUserById } from "@/lib/bot/db";
import { isSubscriptionActive } from "@/lib/bot/config";
import { verifySubToken } from "@/lib/bot/sub-token";
import {
  buildHappAddUrl,
  buildSubscriptionUrl,
} from "@/lib/bot/subscription-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw || "").trim();
  const userId = verifySubToken(token);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getBotUserById(userId);
  if (!user || !user.is_active || !isSubscriptionActive(user.subscribed_until)) {
    return new Response("Subscription inactive", { status: 403 });
  }

  const origin = new URL(request.url).origin;
  const subUrl = buildSubscriptionUrl(origin, token);
  const happUrl = buildHappAddUrl(subUrl);
  const subEsc = escapeHtml(subUrl);
  const happEsc = escapeHtml(happUrl);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Подписка VPN → Happ / INCY</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.45; }
    code { word-break: break-all; background: #f4f4f5; padding: 0.15rem 0.35rem; border-radius: 4px; }
    a.btn { display: inline-block; margin: 0.75rem 0; padding: 0.75rem 1.1rem; background: #111; color: #fff; text-decoration: none; border-radius: 8px; }
    ol { padding-left: 1.2rem; }
    .muted { color: #666; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>Добавить подписку</h1>
  <p>Кнопка в Telegram открывает эту страницу. Сама подписка — адрес ниже, не страница с «кракозябрами».</p>
  <p><a class="btn" href="${happEsc}">Открыть в Happ</a></p>
  <p class="muted">Если Happ не открылся: скопируйте ссылку и в клиенте «+» → «По ссылке / URL».</p>
  <p><strong>Ссылка подписки:</strong><br /><code id="sub">${subEsc}</code></p>
  <ol>
    <li>Скопируйте ссылку выше</li>
    <li>Happ / INCY → «+» → добавить по URL</li>
    <li>Выберите профиль <strong>HOME</strong> (Wi‑Fi) или <strong>MOBILE</strong> (сотовая)</li>
  </ol>
  <script>
    try { location.replace(${JSON.stringify(happUrl)}); } catch (_) {}
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
