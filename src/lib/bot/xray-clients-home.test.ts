import { afterEach, describe, expect, it, vi } from "vitest";
import {
  botHomeUrlNeedsRefresh,
  homeInboundPort,
} from "@/lib/bot/xray-clients";

const SYNTH_UUID = "00000000-0000-4000-8000-0000000000aa";
const SYNTH_UUID_B = "00000000-0000-4000-8000-0000000000bb";

const RU_TEMPLATE =
  `vless://${SYNTH_UUID}@5.129.215.254:443?encryption=none&security=reality&sni=eh.vk.com&fp=chrome&pbk=SYNTH_PUBLIC_KEY_AAAA&sid=abcd1234&type=xhttp&path=%2Fru-xhttp&mode=auto&packetEncoding=xudp#WG-HOME`;

const LEGACY =
  `vless://${SYNTH_UUID_B}@94.103.15.20:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=SYNTH_PUBLIC_KEY_BBBB&sid=00ff&type=tcp&packetEncoding=xudp#WG-HOME`;

describe("botHomeUrlNeedsRefresh", () => {
  it("refreshes legacy 94.103:2053 TCP against RU xHTTP template", () => {
    expect(botHomeUrlNeedsRefresh(LEGACY, RU_TEMPLATE)).toBe(true);
  });

  it("keeps matching RU relay URL", () => {
    const ok =
      `vless://${SYNTH_UUID_B}@5.129.215.254:443?encryption=none&security=reality&sni=eh.vk.com&fp=chrome&pbk=SYNTH_PUBLIC_KEY_AAAA&sid=abcd1234&type=xhttp&path=%2Fru-xhttp&mode=auto#WG-HOME`;
    expect(botHomeUrlNeedsRefresh(ok, RU_TEMPLATE)).toBe(false);
  });

  it("treats missing stored URL as needing refresh when template set", () => {
    expect(botHomeUrlNeedsRefresh(null, RU_TEMPLATE)).toBe(true);
  });

  it("does not roll RU relay back to a legacy 94.103 template", () => {
    const ruStored =
      `vless://${SYNTH_UUID_B}@5.129.215.254:443?type=xhttp#WG-HOME`;
    const legacyTemplate =
      `vless://${SYNTH_UUID}@94.103.15.20:2053?type=tcp#WG-HOME`;
    expect(botHomeUrlNeedsRefresh(ruStored, legacyTemplate)).toBe(false);
  });

  it("refreshes when pbk drifts", () => {
    const stale =
      `vless://${SYNTH_UUID_B}@5.129.215.254:443?type=xhttp&pbk=OLD_KEY&sid=abcd1234&sni=eh.vk.com&path=%2Fru-xhttp`;
    expect(botHomeUrlNeedsRefresh(stale, RU_TEMPLATE)).toBe(true);
  });

  it("refreshes when sid or path drifts", () => {
    const badSid =
      `vless://${SYNTH_UUID_B}@5.129.215.254:443?type=xhttp&pbk=SYNTH_PUBLIC_KEY_AAAA&sid=deadbeef&sni=eh.vk.com&path=%2Fru-xhttp`;
    expect(botHomeUrlNeedsRefresh(badSid, RU_TEMPLATE)).toBe(true);
    const badPath =
      `vless://${SYNTH_UUID_B}@5.129.215.254:443?type=xhttp&pbk=SYNTH_PUBLIC_KEY_AAAA&sid=abcd1234&sni=eh.vk.com&path=%2Fold`;
    expect(botHomeUrlNeedsRefresh(badPath, RU_TEMPLATE)).toBe(true);
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
