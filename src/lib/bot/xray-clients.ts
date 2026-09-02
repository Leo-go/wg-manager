import { randomUUID } from "node:crypto";
import { buildYandexCdnVlessUrl } from "@/lib/cdn/build-client-url";
import { buildClientLabel, swapVlessUuid } from "@/lib/bot/build-vless-url";
import { readXrayClientManagerScript } from "@/lib/bot/config";
import {
  isCdnBotServer,
  resolveBotProvisionTarget,
} from "@/lib/bot/provision-target";
import { runRemoteBashScript } from "@/lib/ssh/run-remote";
import type { BotUser, Server } from "@/lib/supabase/types";

export type ProvisionedClient = {
  uuid: string;
  vlessConfigUrl: string;
  vlessTcpConfigUrl: string | null;
  mode: "yandex_cdn" | "direct";
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

function pickCdnTemplateUrl(server: Server): string {
  const template = server.cdn_vless_config_url?.trim();
  if (template) return template;

  if (!server.cdn_domain?.trim()) {
    throw new Error("cdn_domain is missing on exit server");
  }

  const uuid = server.cdn_uuid?.trim() || "00000000-0000-4000-8000-000000000001";
  return buildYandexCdnVlessUrl({
    uuid,
    cdnHost: server.cdn_domain.trim(),
    path: (server.cdn_path as string) || "/api-test",
    paddingKey: (server.cdn_padding_key as string) || "dc",
  });
}

function buildClientUrls(
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

export async function runXrayClientAction(
  server: Server,
  action: "add" | "remove" | "list",
  uuid?: string,
  email?: string
): Promise<string> {
  const target = resolveBotProvisionTarget(server);
  const args: string[] = [action];
  if (uuid) args.push(uuid);
  if (email) args.push(email);

  const result = await runRemoteBashScript({
    host: target.ssh.host,
    port: target.ssh.port,
    username: target.ssh.username,
    auth: target.ssh.auth,
    scriptContent: readXrayClientManagerScript(),
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

  return {
    uuid,
    ...buildClientUrls(server, uuid),
  };
}

export async function revokeBotUserClient(
  server: Server,
  uuid: string
): Promise<void> {
  await runXrayClientAction(server, "remove", uuid);
}
