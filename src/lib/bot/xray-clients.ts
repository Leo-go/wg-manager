import { randomUUID } from "node:crypto";
import {
  buildYandexCdnVlessUrl,
  cdnVlessUrlNeedsXhttpRefresh,
  normalizeCdnClientHost,
} from "@/lib/cdn/build-client-url";
import type { BotConfig } from "@/lib/bot/config";
import { buildClientLabel, swapVlessUuid } from "@/lib/bot/build-vless-url";
import { getVpnServer } from "@/lib/bot/db";
import {
  attachHomeJump,
  buildHomeVlessUrl,
  homeSpecFromEnv,
  homeSpecFromServer,
  type HomeProvisionSpec,
} from "@/lib/bot/home-server";
import { readXrayClientManagerScript } from "@/lib/bot/config";
import {
  isCdnBotServer,
  resolveBotProvisionTarget,
  type BotProvisionTarget,
} from "@/lib/bot/provision-target";
import { runRemoteBashScript } from "@/lib/ssh/run-remote";
import type { BotUser, Server } from "@/lib/supabase/types";

export type ProvisionedClient = {
  uuid: string;
  vlessConfigUrl: string;
  vlessTcpConfigUrl: string | null;
  mode: "yandex_cdn" | "direct";
  homeError?: string;
};

function pickDirectTemplateUrls(server: Server): {
  primary: string;
  tcp: string | null;
} {
  const primary = server.vless_config_url?.trim();
  if (!primary) {
    throw new Error(
      "VPN server has no vless_config_url — run Setup VPN in the dashboard first"
    );
  }
  return {
    primary,
    tcp: server.vless_tcp_config_url?.trim() || null,
  };
}

/** Always build from cdn_* fields so host gets www-normalization. */
function pickCdnTemplateUrl(server: Server): string {
  if (!server.cdn_domain?.trim()) {
    throw new Error("cdn_domain is missing on exit server");
  }

  const uuid = server.cdn_uuid?.trim() || "00000000-0000-4000-8000-000000000001";
  return buildYandexCdnVlessUrl({
    uuid,
    cdnHost: server.cdn_domain.trim(),
    path: server.cdn_path?.trim() || "/api-test",
    paddingKey: server.cdn_padding_key?.trim() || "dc",
  });
}

export function buildClientUrls(
  server: Server,
  uuid: string
): Pick<ProvisionedClient, "vlessConfigUrl" | "vlessTcpConfigUrl" | "mode"> {
  if (isCdnBotServer(server)) {
    return {
      mode: "yandex_cdn",
      vlessConfigUrl: swapVlessUuid(pickCdnTemplateUrl(server), uuid),
      vlessTcpConfigUrl: null,
    };
  }

  const templates = pickDirectTemplateUrls(server);
  return {
    mode: "direct",
    vlessConfigUrl: swapVlessUuid(templates.primary, uuid),
    vlessTcpConfigUrl: templates.tcp
      ? swapVlessUuid(templates.tcp, uuid)
      : null,
  };
}

/** True if stored key host differs from normalized CDN host (e.g. missing www). */
export function botCdnUrlNeedsHostRefresh(
  vlessConfigUrl: string | null | undefined,
  server: Server
): boolean {
  if (!isCdnBotServer(server) || !vlessConfigUrl?.trim() || !server.cdn_domain) {
    return false;
  }
  const expected = normalizeCdnClientHost(server.cdn_domain);
  const match = vlessConfigUrl.trim().match(/^vless:\/\/[^@]+@([^:?/]+)/i);
  const currentHost = match?.[1]?.toLowerCase();
  return Boolean(currentHost && currentHost !== expected);
}

/** Host www-normalization or xHTTP 413 workaround (no header padding). */
export function botCdnUrlNeedsRefresh(
  vlessConfigUrl: string | null | undefined,
  server: Server
): boolean {
  if (!isCdnBotServer(server) || !vlessConfigUrl?.trim()) {
    return false;
  }
  if (botCdnUrlNeedsHostRefresh(vlessConfigUrl, server)) {
    return true;
  }
  return cdnVlessUrlNeedsXhttpRefresh(vlessConfigUrl.trim());
}

export async function runXrayClientOnTarget(
  target: BotProvisionTarget,
  action: "add" | "remove" | "list",
  uuid?: string,
  email?: string,
  opts?: { inboundPort?: number }
): Promise<string> {
  const args: string[] = [action];
  if (uuid) args.push(uuid);
  if (email) args.push(email);

  const inboundPort = opts?.inboundPort;
  const portPrefix =
    typeof inboundPort === "number" && Number.isInteger(inboundPort) && inboundPort > 0
      ? `export XRAY_INBOUND_PORT=${inboundPort}\n`
      : "";

  const result = await runRemoteBashScript({
    host: target.ssh.host,
    port: target.ssh.port,
    username: target.ssh.username,
    auth: target.ssh.auth,
    jump: target.jump,
    scriptContent: `${portPrefix}${readXrayClientManagerScript()}`,
    args,
    readyTimeoutMs: 45_000,
  });

  if (result.code !== 0) {
    throw new Error(
      result.fullOutput.trim() ||
        `xray-client-manager ${action} failed on ${target.label}`
    );
  }

  return result.stdout.trim();
}

export async function runXrayClientAction(
  server: Server,
  action: "add" | "remove" | "list",
  uuid?: string,
  email?: string
): Promise<string> {
  return runXrayClientOnTarget(
    resolveBotProvisionTarget(server),
    action,
    uuid,
    email
  );
}

async function resolveHomeSpec(
  config: BotConfig
): Promise<HomeProvisionSpec | null> {
  let spec: HomeProvisionSpec | null;
  if (config.homeServerId) {
    const homeServer = await getVpnServer(config.homeServerId);
    spec = homeSpecFromServer(homeServer);
  } else {
    spec = homeSpecFromEnv();
  }
  if (!spec) return null;

  try {
    const mobileServer = await getVpnServer(config.serverId);
    spec = attachHomeJump(spec, resolveBotProvisionTarget(mobileServer).ssh);
  } catch (error) {
    console.error("home SSH jump (CDN Origin) unavailable:", error);
  }
  return spec;
}

export async function syncHomeProfile(
  config: BotConfig,
  uuid: string,
  email: string,
  action: "add" | "remove"
): Promise<{ url: string | null; error?: string }> {
  const spec = await resolveHomeSpec(config);
  if (!spec) return { url: null };

  try {
    await runXrayClientOnTarget(spec.target, action, uuid, email, {
      inboundPort: 2053,
    });
    return {
      url: action === "add" ? buildHomeVlessUrl(spec.vlessTemplate, uuid) : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`home Reality ${action} failed (${spec.label}):`, error);
    return { url: null, error: message };
  }
}

export async function provisionBotUserClient(
  server: Server,
  user: Pick<
    BotUser,
    "telegram_id" | "telegram_username" | "first_name" | "xray_uuid"
  >
): Promise<ProvisionedClient> {
  if (!isCdnBotServer(server) && !server.vless_config_url?.trim()) {
    throw new Error(
      "Exit server has no CDN ready and no vless_config_url — finish Yandex CDN or VPN setup in dashboard"
    );
  }

  const uuid = user.xray_uuid?.trim() || randomUUID();
  const email = buildClientLabel(
    user.first_name,
    user.telegram_username,
    user.telegram_id
  );

  await runXrayClientAction(server, "add", uuid, email);

  const urls = buildClientUrls(server, uuid);
  return {
    uuid,
    ...urls,
  };
}

export async function provisionBotUserDual(
  config: BotConfig,
  mobileServer: Server,
  user: Pick<
    BotUser,
    "telegram_id" | "telegram_username" | "first_name" | "xray_uuid"
  >
): Promise<ProvisionedClient> {
  const mobile = await provisionBotUserClient(mobileServer, user);
  const email = buildClientLabel(
    user.first_name,
    user.telegram_username,
    user.telegram_id
  );
  const home = await syncHomeProfile(config, mobile.uuid, email, "add");
  return {
    ...mobile,
    vlessTcpConfigUrl: home.url ?? mobile.vlessTcpConfigUrl,
    homeError: home.error,
  };
}

export async function revokeBotUserClient(
  server: Server,
  uuid: string
): Promise<void> {
  await runXrayClientAction(server, "remove", uuid);
}

export async function revokeBotUserEverywhere(
  config: BotConfig,
  mobileServer: Server,
  uuid: string
): Promise<void> {
  const errors: string[] = [];
  try {
    await revokeBotUserClient(mobileServer, uuid);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const home = await syncHomeProfile(config, uuid, "", "remove");
  if (home.error) errors.push(home.error);
  if (errors.length === 2) {
    throw new Error(errors.join("; "));
  }
  if (errors.length === 1) {
    console.error("revoke partial:", errors[0]);
  }
}
