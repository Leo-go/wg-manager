import { getBot } from "@/lib/bot/bot";
import { getBotConfig } from "@/lib/bot/config";
import {
  aggregateHealthReport,
  evaluateWgHandshake,
  formatHealthAlert,
  httpStatusCheck,
  parseWgHandshakeAgeSeconds,
  tcpConnectCheck,
  type HealthCheckResult,
} from "@/lib/bot/health-checks";
import { runRemoteBashScript } from "@/lib/ssh/run-remote";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() ||
    process.env.TELEGRAM_SETUP_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function homeTcpTarget(): { host: string; port: number } {
  const host =
    process.env.TELEGRAM_BOT_HOME_SSH_HOST?.trim() || "5.129.215.254";
  const portRaw = process.env.TELEGRAM_BOT_HOME_HEALTH_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 443;
  return {
    host,
    port: Number.isInteger(port) && port > 0 ? port : 443,
  };
}

function cdnHealthUrl(): string {
  return (
    process.env.CDN_HEALTH_URL?.trim() ||
    "https://www.wg-manager.online/cdn-check"
  );
}

async function checkWgHandshake(): Promise<HealthCheckResult> {
  const host = process.env.TELEGRAM_BOT_HOME_SSH_HOST?.trim();
  const password = process.env.TELEGRAM_BOT_HOME_SSH_PASSWORD?.trim();
  if (!host || !password) {
    return {
      name: "wg-home0",
      status: "warn",
      detail: "HOME SSH not configured — skipped",
      hardFail: false,
    };
  }

  const port = Number(process.env.TELEGRAM_BOT_HOME_SSH_PORT?.trim() || "22");
  const username =
    process.env.TELEGRAM_BOT_HOME_SSH_USERNAME?.trim() || "root";

  try {
    const result = await runRemoteBashScript({
      host,
      port: Number.isInteger(port) && port > 0 ? port : 22,
      username,
      auth: { type: "password", password },
      scriptContent: "#!/bin/bash\nwg show wg-home0 2>&1\n",
      args: [],
      readyTimeoutMs: 20_000,
    });
    const out = `${result.stdout}\n${result.stderr}`;
    if (result.code !== 0 && !/latest handshake/i.test(out)) {
      return {
        name: "wg-home0",
        status: "warn",
        detail: out.trim().slice(0, 200) || `exit ${result.code}`,
        hardFail: false,
      };
    }
    const age = parseWgHandshakeAgeSeconds(out);
    return evaluateWgHandshake(age, 180);
  } catch (error) {
    return {
      name: "wg-home0",
      status: "warn",
      detail: error instanceof Error ? error.message : String(error),
      hardFail: false,
    };
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getBotConfig();
  const bot = getBot();
  if (!config || !bot) {
    return Response.json(
      { error: "Telegram bot is not configured" },
      { status: 503 }
    );
  }

  const tcp = homeTcpTarget();
  const [tcpCheck, httpCheck, wgCheck] = await Promise.all([
    tcpConnectCheck(tcp.host, tcp.port),
    httpStatusCheck(cdnHealthUrl()),
    checkWgHandshake(),
  ]);

  const report = aggregateHealthReport([tcpCheck, httpCheck, wgCheck]);

  if (!report.ok) {
    const text = formatHealthAlert(report);
    await Promise.all(
      config.adminIds.map((id) =>
        bot.api.sendMessage(Number(id), text).catch(() => undefined)
      )
    );
  }

  return Response.json(report);
}
