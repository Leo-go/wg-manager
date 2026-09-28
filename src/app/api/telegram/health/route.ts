import { getBotConfig } from "@/lib/bot/config";
import { getBotCapacityStats } from "@/lib/bot/capacity";
import { getVpnServer } from "@/lib/bot/db";
import {
  describeBotProvisionTarget,
  getBotProvisionMode,
  isCdnBotServer,
} from "@/lib/bot/provision-target";
import { runXrayClientAction } from "@/lib/bot/xray-clients";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const setupSecret = url.searchParams.get("secret");
  const expectedSecret = process.env.TELEGRAM_SETUP_SECRET?.trim();

  if (!expectedSecret || setupSecret !== expectedSecret) {
    return unauthorized();
  }

  const config = getBotConfig();
  if (!config) {
    return Response.json({
      ok: false,
      error: "Bot not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_SERVER_ID)",
    });
  }

  const sshPasswordConfigured = Boolean(
    process.env.TELEGRAM_BOT_SSH_PASSWORD?.trim()
  );
  const sshKeyConfigured = Boolean(
    process.env.TELEGRAM_BOT_SSH_PRIVATE_KEY?.trim()
  );

  let capacity: Awaited<ReturnType<typeof getBotCapacityStats>> | null = null;
  try {
    capacity = await getBotCapacityStats(config);
  } catch (error) {
    console.error("capacity stats failed:", error);
  }

  try {
    const server = await getVpnServer(config.serverId);
    const provisionMode = getBotProvisionMode(server);
    const target = describeBotProvisionTarget(server);
    const clients = await runXrayClientAction(server, "list");

    let home: { ok: boolean; label?: string; error?: string } | null = null;
    try {
      const { homeSpecFromEnv, homeSpecFromServer } = await import(
        "@/lib/bot/home-server"
      );
      const spec = config.homeServerId
        ? homeSpecFromServer(await getVpnServer(config.homeServerId))
        : homeSpecFromEnv();
      if (spec) {
        const { runXrayClientOnTarget } = await import("@/lib/bot/xray-clients");
        await runXrayClientOnTarget(spec.target, "list");
        home = { ok: true, label: spec.label };
      }
    } catch (error) {
      home = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return Response.json({
      ok: true,
      provisionMode,
      cdnReady: isCdnBotServer(server),
      target,
      capacity,
      home,
      server: {
        id: server.id,
        name: server.name,
        ip: server.ip_address,
        role: server.role,
        cdnStatus: server.cdn_status,
        cdnDomain: server.cdn_domain,
        cdnOriginIp: server.cdn_origin_ip,
        hasCdnUrl: Boolean(server.cdn_vless_config_url),
        hasVlessUrl: Boolean(server.vless_config_url),
      },
      auth: {
        sshPasswordConfigured,
        sshKeyConfigured,
        homeSshPasswordConfigured: Boolean(
          process.env.TELEGRAM_BOT_HOME_SSH_PASSWORD?.trim()
        ),
        platformKeyConfigured: Boolean(process.env.WG_SSH_PRIVATE_KEY?.trim()),
      },
      xrayClients: clients
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
  } catch (error) {
    let provisionMode: string | undefined;
    let target: string | undefined;
    try {
      const server = await getVpnServer(config.serverId);
      provisionMode = getBotProvisionMode(server);
      target = describeBotProvisionTarget(server);
    } catch {
      // ignore secondary lookup errors
    }

    return Response.json({
      ok: false,
      provisionMode,
      target,
      capacity,
      auth: {
        sshPasswordConfigured,
        sshKeyConfigured,
        homeSshPasswordConfigured: Boolean(
          process.env.TELEGRAM_BOT_HOME_SSH_PASSWORD?.trim()
        ),
        platformKeyConfigured: Boolean(process.env.WG_SSH_PRIVATE_KEY?.trim()),
      },
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
