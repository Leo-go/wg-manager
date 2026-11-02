import { getBotUserById } from "@/lib/bot/db";
import { isSubscriptionActive } from "@/lib/bot/config";
import { verifySubToken } from "@/lib/bot/sub-token";
import { buildSubscriptionBody } from "@/lib/bot/subscription-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(
  _request: Request,
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

  const body = buildSubscriptionBody(
    user.vless_tcp_config_url,
    user.vless_config_url
  );
  if (!body) {
    return new Response("No profiles", { status: 404 });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Profile-Update-Interval": "12",
      "Subscription-Userinfo": [
        user.subscribed_until
          ? `expire=${Math.floor(new Date(user.subscribed_until).getTime() / 1000)}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
    },
  });
}
