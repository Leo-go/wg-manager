import type { BotConfig } from "@/lib/bot/config";
import { swapVlessUuid } from "@/lib/bot/build-vless-url";
import type {
  BotProvisionTarget,
  BotSshEndpoint,
} from "@/lib/bot/provision-target";
import { resolveBotSshAuth } from "@/lib/bot/ssh-auth";
import type { Server } from "@/lib/supabase/types";

export type HomeProvisionSpec = {
  label: string;
  vlessTemplate: string;
  target: BotProvisionTarget;
};

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** Direct SSH target for the home Reality host (not CDN Origin). */
export function buildHomeSshTarget(server: Pick<Server, "ip_address" | "ssh_port" | "ssh_username">): BotProvisionTarget {
  const host = env("TELEGRAM_BOT_HOME_SSH_HOST") || server.ip_address;
  const port = Number(env("TELEGRAM_BOT_HOME_SSH_PORT")) || server.ssh_port || 22;
  const username =
    env("TELEGRAM_BOT_HOME_SSH_USERNAME") ||
    env("TELEGRAM_BOT_SSH_USERNAME") ||
    server.ssh_username?.trim() ||
    "root";

  return {
    mode: "direct",
    ssh: {
      host,
      port,
      username,
      auth: resolveBotSshAuth(server as Server, "home"),
    },
    label: `home Reality ${username}@${host}:${port}`,
  };
}

export function homeSpecFromEnv(): HomeProvisionSpec | null {
  const host = env("TELEGRAM_BOT_HOME_SSH_HOST");
  const template = env("TELEGRAM_BOT_HOME_VLESS_TEMPLATE");
  if (!host || !template) return null;

  const stub = {
    ip_address: host,
    ssh_port: Number(env("TELEGRAM_BOT_HOME_SSH_PORT")) || 22,
    ssh_username: env("TELEGRAM_BOT_HOME_SSH_USERNAME") || "root",
  };

  return {
    label: `env home ${host}`,
    vlessTemplate: template,
    target: buildHomeSshTarget(stub),
  };
}

export function homeSpecFromServer(server: Server): HomeProvisionSpec | null {
  const template =
    env("TELEGRAM_BOT_HOME_VLESS_TEMPLATE") ||
    server.vless_config_url?.trim() ||
    server.vless_tcp_config_url?.trim();
  if (!template) return null;

  return {
    label: `db home ${server.ip_address}`,
    vlessTemplate: template,
    target: buildHomeSshTarget(server),
  };
}

export function buildHomeVlessUrl(template: string, uuid: string): string {
  return swapVlessUuid(template, uuid);
}

export function isHomeProfileEnabled(config: BotConfig): boolean {
  return Boolean(
    config.homeServerId ||
      (env("TELEGRAM_BOT_HOME_SSH_HOST") && env("TELEGRAM_BOT_HOME_VLESS_TEMPLATE"))
  );
}

/** Route home SSH through Origin/exit when Vercel is refused on :22. */
export function attachHomeJump(
  spec: HomeProvisionSpec,
  jump: BotSshEndpoint
): HomeProvisionSpec {
  if (
    jump.host === spec.target.ssh.host &&
    jump.port === spec.target.ssh.port
  ) {
    return spec;
  }

  return {
    ...spec,
    target: {
      ...spec.target,
      jump,
      label: `${spec.target.label} via ${jump.username}@${jump.host}:${jump.port}`,
    },
  };
}
