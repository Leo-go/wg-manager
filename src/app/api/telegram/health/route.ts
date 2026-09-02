import { getBotConfig } from "@/lib/bot/config";
import { getVpnServer } from "@/lib/bot/db";
import {
  describeBotProvisionTarget,
  getBotProvisionMode,
  isCdnBotServer,
} from "@/lib/bot/provision-target";
import { getBotSshAuthMode } from "@/lib/bot/ssh-auth";
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

  try {
    const server = await getVpnServer(config.serverId);
    const provisionMode = getBotProvisionMode(server);
    const target = describeBotProvisionTarget(server);
    const clients = await runXrayClientAction(server, "list");

    return Response.json({
      ok: true,
      provisionMode,
      cdnReady: isCdnBotServer(server),
      target,
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
      auth: {
        sshPasswordConfigured,
        sshKeyConfigured,
        platformKeyConfigured: Boolean(process.env.WG_SSH_PRIVATE_KEY?.trim()),
      },
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
