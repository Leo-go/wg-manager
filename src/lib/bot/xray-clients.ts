import { randomUUID } from "node:crypto";
import {
  buildYandexCdnVlessUrl,
  cdnVlessUrlNeedsXhttpRefresh,
  normalizeCdnClientHost,
} from "@/lib/cdn/build-client-url";
import type { BotConfig } from "@/lib/bot/config";
import {
  buildClientLabelArg,
  swapVlessUuid,
} from "@/lib/bot/build-vless-url";
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

  // Set TELEGRAM_BOT_HOME_SSH_NO_JUMP=1 when RU relay is reachable from Vercel
  // without ProxyJump (CDN Origin). Do not hardcode relay IPs here.
  if (process.env.TELEGRAM_BOT_HOME_SSH_NO_JUMP?.trim() === "1") {
    return spec;
  }

  try {
    const mobileServer = await getVpnServer(config.serverId);
    spec = attachHomeJump(spec, resolveBotProvisionTarget(mobileServer).ssh);
  } catch (error) {
    console.error("home SSH jump (CDN Origin) unavailable:", error);
  }
  return spec;
}

/** Home inbound listen port (RU relay xHTTP :443; legacy Reality was :2053). */
export function homeInboundPort(): number {
  const raw = process.env.TELEGRAM_BOT_HOME_INBOUND_PORT?.trim();
  const n = raw ? Number(raw) : 443;
  return Number.isInteger(n) && n > 0 ? n : 443;
}

/**
 * True if stored home key does not match the current HOME template
 * (host/port/type/pbk/sid/sni/path — e.g. legacy 94.103:2053 TCP vs RU xHTTP).
 */
export function botHomeUrlNeedsRefresh(
  storedUrl: string | null | undefined,
  template: string | null | undefined
): boolean {
  if (!template?.trim()) return false;
  if (!storedUrl?.trim()) return true;

  const hostOf = (u: string) =>
    u.match(/^vless:\/\/[^@]+@([^:?/]+)/i)?.[1]?.toLowerCase();
  const portOf = (u: string) =>
    u.match(/^vless:\/\/[^@]+@[^:]+:(\d+)/i)?.[1];
  const paramOf = (u: string, key: string) => {
    const raw = u.match(new RegExp(`[?&]${key}=([^&]+)`, "i"))?.[1];
    if (raw == null) return undefined;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const expHost = hostOf(template);
  const curHost = hostOf(storedUrl);
  // Do not roll RU relay keys back if Production env still has legacy 94.103 template.
  if (curHost === "5.129.215.254" && expHost && expHost !== "5.129.215.254") {
    return false;
  }
  if (expHost && curHost && expHost !== curHost) return true;

  const expPort = portOf(template);
  const curPort = portOf(storedUrl);
  if (expPort && curPort && expPort !== curPort) return true;

  for (const key of ["type", "pbk", "sid", "sni", "path"] as const) {
    const exp = paramOf(template, key)?.toLowerCase();
    const cur = paramOf(storedUrl, key)?.toLowerCase();
    if (exp && cur && exp !== cur) return true;
  }

  return false;
}

export async function syncHomeProfile(
  config: BotConfig,
  uuid: string,
  email: string,
  action: "add" | "remove"
): Promise<{ url: string | null; error?: string; template?: string }> {
  const spec = await resolveHomeSpec(config);
  if (!spec) return { url: null };

  try {
    await runXrayClientOnTarget(spec.target, action, uuid, email, {
      inboundPort: homeInboundPort(),
    });
    return {
      url: action === "add" ? buildHomeVlessUrl(spec.vlessTemplate, uuid) : null,
      template: spec.vlessTemplate,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`home profile ${action} failed (${spec.label}):`, error);
    return { url: null, error: message, template: spec.vlessTemplate };
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
  const email = buildClientLabelArg(
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
  const email = buildClientLabelArg(
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
  uuid: string,
  email?: string
): Promise<void> {
  await runXrayClientAction(server, "remove", uuid, email);
}

export async function revokeBotUserEverywhere(
  config: BotConfig,
  mobileServer: Server,
  uuid: string,
  email?: string
): Promise<void> {
  const errors: string[] = [];
  try {
    await revokeBotUserClient(mobileServer, uuid, email);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const home = await syncHomeProfile(config, uuid, email ?? "", "remove");
  if (home.error) errors.push(home.error);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export type RestoreVpnResult = {
  restored: boolean;
  homeError?: string;
  vlessConfigUrl?: string | null;
  vlessTcpConfigUrl?: string | null;
};

/**
 * Re-add an existing UUID to Origin + home after renewal.
 * No-op when the user never had a key (first Connect still required).
 */
export async function restoreVpnAccess(
  config: BotConfig,
  user: Pick<
    BotUser,
    | "telegram_id"
    | "telegram_username"
    | "first_name"
    | "xray_uuid"
    | "vless_config_url"
    | "vless_tcp_config_url"
  >
): Promise<RestoreVpnResult> {
  const uuid = user.xray_uuid?.trim();
  if (!uuid) {
    return { restored: false };
  }

  const mobileServer = await getVpnServer(config.serverId);
  const email = buildClientLabelArg(
    user.first_name,
    user.telegram_username,
    user.telegram_id
  );

  await runXrayClientAction(mobileServer, "add", uuid, email);
  const urls = buildClientUrls(mobileServer, uuid);
  const home = await syncHomeProfile(config, uuid, email, "add");

  return {
    restored: true,
    homeError: home.error,
    vlessConfigUrl: urls.vlessConfigUrl,
    vlessTcpConfigUrl: home.url ?? user.vless_tcp_config_url ?? null,
  };
}
