import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attachHomeJump,
  buildHomeVlessUrl,
  homeSpecFromEnv,
  isHomeProfileEnabled,
} from "@/lib/bot/home-server";
import type { BotConfig } from "@/lib/bot/config";
import type { BotSshEndpoint } from "@/lib/bot/provision-target";

describe("buildHomeVlessUrl", () => {
  it("swaps UUID on a Reality TCP template", () => {
    const template =
      "vless://11111111-1111-1111-1111-111111111111@94.103.15.20:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUB&sid=38de&type=tcp&packetEncoding=xudp#WG-HOME";
    const next = buildHomeVlessUrl(
      template,
      "22222222-2222-4222-8222-222222222222"
    );
    expect(next.startsWith("vless://22222222-2222-4222-8222-222222222222@94.103.15.20:2053?")).toBe(
      true
    );
    expect(next).toContain("security=reality");
    expect(next).toContain("sni=www.apple.com");
  });
});

describe("homeSpecFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a direct SSH target from TELEGRAM_BOT_HOME_*", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_HOST", "94.103.15.20");
    vi.stubEnv(
      "TELEGRAM_BOT_HOME_VLESS_TEMPLATE",
      "vless://00000000-0000-4000-8000-000000000001@94.103.15.20:2053?encryption=none&security=reality&sni=www.apple.com&type=tcp#WG-HOME"
    );
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_PORT", "22");
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_USERNAME", "root");
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_PASSWORD", "x");

    const spec = homeSpecFromEnv();
    expect(spec).not.toBeNull();
    expect(spec?.target.mode).toBe("direct");
    expect(spec?.target.ssh.host).toBe("94.103.15.20");
    expect(spec?.target.ssh.port).toBe(22);
    expect(spec?.vlessTemplate).toContain("94.103.15.20:2053");
  });

  it("is enabled when env host+template are set", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_HOST", "94.103.15.20");
    vi.stubEnv(
      "TELEGRAM_BOT_HOME_VLESS_TEMPLATE",
      "vless://00000000-0000-4000-8000-000000000001@94.103.15.20:2053?type=tcp#WG-HOME"
    );
    const config = { homeServerId: undefined } as BotConfig;
    expect(isHomeProfileEnabled(config)).toBe(true);
  });
});

describe("attachHomeJump", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const origin: BotSshEndpoint = {
    host: "185.247.185.3",
    port: 22,
    username: "root",
    auth: { type: "password", password: "origin" },
  };

  it("adds Origin as ProxyJump and keeps the home host", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_HOST", "94.103.15.20");
    vi.stubEnv(
      "TELEGRAM_BOT_HOME_VLESS_TEMPLATE",
      "vless://00000000-0000-4000-8000-000000000001@94.103.15.20:2053?type=tcp#WG-HOME"
    );
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_PASSWORD", "home");
    const spec = homeSpecFromEnv();
    expect(spec).not.toBeNull();
    const jumped = attachHomeJump(spec!, origin);
    expect(jumped.target.ssh.host).toBe("94.103.15.20");
    expect(jumped.target.jump?.host).toBe("185.247.185.3");
    expect(jumped.target.label).toContain("via root@185.247.185.3:22");
  });

  it("skips jump when dest is already the Origin", () => {
    const spec = {
      label: "x",
      vlessTemplate: "vless://u@94.103.15.20:2053?type=tcp#h",
      target: {
        mode: "direct" as const,
        ssh: origin,
        label: "same",
      },
    };
    expect(attachHomeJump(spec, origin).target.jump).toBeUndefined();
  });
});
