import { describe, expect, it } from "vitest";
import { buildYandexCdnVlessUrl } from "@/lib/cdn/build-client-url";
import { swapVlessUuid } from "@/lib/bot/build-vless-url";
import { isCdnBotServer, resolveBotProvisionTarget } from "@/lib/bot/provision-target";
import type { Server } from "@/lib/supabase/types";

const baseServer = {
  id: "1",
  user_id: "u",
  name: "exit",
  ip_address: "216.57.107.94",
  ssh_port: 22,
  status: "active" as const,
  created_at: "",
  updated_at: "",
};

describe("isCdnBotServer", () => {
  it("detects ready CDN exit", () => {
    const server: Server = {
      ...baseServer,
      cdn_status: "ready",
      cdn_domain: "cdn.example.com",
      cdn_origin_ip: "1.2.3.4",
      cdn_vless_config_url: buildYandexCdnVlessUrl({
        uuid: "11111111-1111-1111-1111-111111111111",
        cdnHost: "cdn.example.com",
        path: "/api-test",
        paddingKey: "dc",
      }),
    };
    expect(isCdnBotServer(server)).toBe(true);
  });

  it("targets CDN origin host for SSH", () => {
    process.env.TELEGRAM_BOT_SSH_PASSWORD = "test-password";
    const server: Server = {
      ...baseServer,
      cdn_status: "ready",
      cdn_domain: "cdn.example.com",
      cdn_origin_ip: "1.2.3.4",
      cdn_vless_config_url: "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&type=xhttp#WG-Yandex-CDN",
    };
    const target = resolveBotProvisionTarget(server);
    expect(target.mode).toBe("yandex_cdn");
    expect(target.ssh.host).toBe("1.2.3.4");
    delete process.env.TELEGRAM_BOT_SSH_PASSWORD;
  });

  it("uses direct mode when CDN is not ready", () => {
    expect(isCdnBotServer({ ...baseServer, vless_config_url: "vless://x@1" })).toBe(
      false
    );
  });
});

describe("CDN vless url swap", () => {
  it("replaces uuid in CDN template", () => {
    const template = buildYandexCdnVlessUrl({
      uuid: "11111111-1111-1111-1111-111111111111",
      cdnHost: "cdn.example.com",
      path: "/api-test",
      paddingKey: "dc",
    });
    const next = swapVlessUuid(
      template,
      "22222222-2222-2222-2222-222222222222"
    );
    expect(next.includes("cdn.example.com")).toBe(true);
    expect(next.startsWith("vless://22222222-2222-2222-2222-222222222222@")).toBe(
      true
    );
  });
});
