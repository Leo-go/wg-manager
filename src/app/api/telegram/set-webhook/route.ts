import { getBotConfig } from "@/lib/bot/config";

export const runtime = "nodejs";

function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export async function GET(request: Request): Promise<Response> {
  const config = getBotConfig();
  if (!config) {
    return Response.json(
      { error: "TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_SERVER_ID are required" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const setupSecret = url.searchParams.get("secret");
  const expectedSecret = process.env.TELEGRAM_SETUP_SECRET?.trim();

  if (!expectedSecret || setupSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = `${getSiteOrigin()}/api/telegram/webhook`;
  const body: Record<string, string> = { url: webhookUrl };
  if (config.webhookSecret) {
    body.secret_token = config.webhookSecret;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${config.token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const payload = (await response.json()) as Record<string, unknown>;
  return Response.json({
    webhookUrl,
    telegram: payload,
  });
}
