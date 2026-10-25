import { afterEach, describe, expect, it, vi } from "vitest";
import {
  botHomeUrlNeedsRefresh,
  homeInboundPort,
} from "@/lib/bot/xray-clients";

const RU_TEMPLATE =
  "vless://00000000-0000-4000-8000-000000000001@5.129.215.254:443?encryption=none&security=reality&sni=eh.vk.com&fp=chrome&pbk=PUB&sid=21d7dc1a&type=xhttp&path=%2Fru-xhttp&mode=auto&packetEncoding=xudp#WG-HOME";

const LEGACY =
  "vless://a3f0c8cf-498a-4cd0-867a-2a0a6cf13e9c@94.103.15.20:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=PUB&sid=38de&type=tcp&packetEncoding=xudp#WG-HOME";

describe("botHomeUrlNeedsRefresh", () => {
  it("refreshes legacy 94.103:2053 TCP against RU xHTTP template", () => {
    expect(botHomeUrlNeedsRefresh(LEGACY, RU_TEMPLATE)).toBe(true);
  });

  it("keeps matching RU relay URL", () => {
    const ok =
      "vless://a3f0c8cf-498a-4cd0-867a-2a0a6cf13e9c@5.129.215.254:443?encryption=none&security=reality&sni=eh.vk.com&fp=chrome&pbk=PUB&sid=21d7dc1a&type=xhttp&path=%2Fru-xhttp&mode=auto#WG-HOME";
    expect(botHomeUrlNeedsRefresh(ok, RU_TEMPLATE)).toBe(false);
  });

  it("treats missing stored URL as needing refresh when template set", () => {
    expect(botHomeUrlNeedsRefresh(null, RU_TEMPLATE)).toBe(true);
  });
});

describe("homeInboundPort", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 443", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_INBOUND_PORT", "");
    expect(homeInboundPort()).toBe(443);
  });

  it("reads TELEGRAM_BOT_HOME_INBOUND_PORT", () => {
    vi.stubEnv("TELEGRAM_BOT_HOME_INBOUND_PORT", "2053");
    expect(homeInboundPort()).toBe(2053);
  });
});
