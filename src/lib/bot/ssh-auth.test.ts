import { afterEach, describe, expect, it, vi } from "vitest";
import { getBotSshAuthMode, resolveBotSshAuth } from "@/lib/bot/ssh-auth";
import type { Server } from "@/lib/supabase/types";

const server = {
  ssh_private_key: null,
  ip_address: "94.103.15.20",
} as Server;

describe("resolveBotSshAuth home vs mobile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses TELEGRAM_BOT_HOME_SSH_PASSWORD for home role", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_SSH_PASSWORD", "home-secret");
    vi.stubEnv("TELEGRAM_BOT_SSH_PASSWORD", "origin-secret");
    expect(getBotSshAuthMode(server, "home")).toBe("env_password");
    expect(resolveBotSshAuth(server, "home")).toEqual({
      type: "password",
      password: "home-secret",
    });
    expect(resolveBotSshAuth(server, "mobile")).toEqual({
      type: "password",
      password: "origin-secret",
    });
  });
});
