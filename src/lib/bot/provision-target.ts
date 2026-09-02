import type { SshConnectAuth } from "@/lib/ssh/auth";
import type { Server } from "@/lib/supabase/types";
import { resolveBotSshAuth } from "@/lib/bot/ssh-auth";

export type BotProvisionTarget = {
  mode: "yandex_cdn" | "direct";
  ssh: {
    host: string;
    port: number;
    username: string;
    auth: SshConnectAuth;
  };
  label: string;
};

export function isCdnBotServer(server: Server): boolean {
  return (
    server.cdn_status === "ready" &&
    Boolean(server.cdn_domain?.trim()) &&
    Boolean(server.cdn_origin_ip?.trim()) &&
    Boolean(server.cdn_vless_config_url?.trim() || server.cdn_uuid?.trim())
  );
}

/** Bot SSH target: CDN Origin VPS (not exit / RU relay). */
export function resolveBotProvisionTarget(server: Server): BotProvisionTarget {
  if (isCdnBotServer(server)) {
    const host = server.cdn_origin_ip!.trim();
    const port = Number(server.cdn_origin_ssh_port) || 22;
    const username =
      process.env.TELEGRAM_BOT_SSH_USERNAME?.trim() ||
      server.cdn_origin_ssh_username?.trim() ||
      "root";

    return {
      mode: "yandex_cdn",
      ssh: {
        host,
        port,
        username,
        auth: resolveBotSshAuth(server),
      },
      label: `CDN origin ${username}@${host}:${port} (exit ${server.ip_address})`,
    };
  }

  return {
    mode: "direct",
    ssh: {
      host: server.ip_address,
      port: server.ssh_port ?? 22,
      username:
        process.env.TELEGRAM_BOT_SSH_USERNAME?.trim() ||
        server.ssh_username?.trim() ||
        "root",
      auth: resolveBotSshAuth(server),
    },
    label: `${server.ssh_username || "root"}@${server.ip_address}:${server.ssh_port ?? 22}`,
  };
}

export function describeBotProvisionTarget(server: Server): string {
  return resolveBotProvisionTarget(server).label;
}

export function getBotProvisionMode(server: Server): BotProvisionTarget["mode"] {
  return resolveBotProvisionTarget(server).mode;
}
