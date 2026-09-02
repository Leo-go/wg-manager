import { randomUUID } from "node:crypto";
import { buildClientLabel, swapVlessUuid } from "@/lib/bot/build-vless-url";
import { readXrayClientManagerScript } from "@/lib/bot/config";
import { getBotSshUsername, resolveBotSshAuth } from "@/lib/bot/ssh-auth";
import { runRemoteBashScript } from "@/lib/ssh/run-remote";
import type { BotUser, Server } from "@/lib/supabase/types";

export type ProvisionedClient = {
  uuid: string;
  vlessConfigUrl: string;
  vlessTcpConfigUrl: string | null;
};

function pickTemplateUrls(server: Server): {
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

export async function runXrayClientAction(
  server: Server,
  action: "add" | "remove" | "list",
  uuid?: string,
  email?: string
): Promise<string> {
  const auth = resolveBotSshAuth(server);

  const args: string[] = [action];
  if (uuid) args.push(uuid);
  if (email) args.push(email);

  const result = await runRemoteBashScript({
    host: server.ip_address,
    port: server.ssh_port ?? 22,
    username: getBotSshUsername(server),
    auth,
    scriptContent: readXrayClientManagerScript(),
    args,
    readyTimeoutMs: 45_000,
  });

  if (result.code !== 0) {
    throw new Error(
      result.fullOutput.trim() || `xray-client-manager ${action} failed`
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
  const uuid = user.xray_uuid?.trim() || randomUUID();
  const email = buildClientLabel(
    user.first_name,
    user.telegram_username,
    user.telegram_id
  );

  await runXrayClientAction(server, "add", uuid, email);

  const templates = pickTemplateUrls(server);
  return {
    uuid,
    vlessConfigUrl: swapVlessUuid(templates.primary, uuid),
    vlessTcpConfigUrl: templates.tcp
      ? swapVlessUuid(templates.tcp, uuid)
      : null,
  };
}

export async function revokeBotUserClient(
  server: Server,
  uuid: string
): Promise<void> {
  await runXrayClientAction(server, "remove", uuid);
}
