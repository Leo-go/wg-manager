import { describe, expect, it } from "vitest";
import { botHomeUrlNeedsRefresh } from "@/lib/bot/xray-clients";

const SYNTH = "00000000-0000-4000-8000-000000000001";
const RU = `vless://${SYNTH}@5.129.215.254:443?encryption=none&security=reality&sni=eh.vk.com&fp=chrome&pbk=AAA&sid=21d7dc1a&type=xhttp&path=%2Fru-xhttp&mode=auto#WG-HOME`;
const LEGACY = `vless://${SYNTH}@94.103.15.20:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=BBB&sid=00ff&type=tcp#WG-HOME`;

describe("home refresh eligibility", () => {
  it("flags legacy 94.103 keys for refresh against RU template", () => {
    expect(botHomeUrlNeedsRefresh(LEGACY, RU)).toBe(true);
  });

  it("skips refresh when host/params already match", () => {
    expect(botHomeUrlNeedsRefresh(RU, RU)).toBe(false);
  });

  it("flags missing home URL", () => {
    expect(botHomeUrlNeedsRefresh(null, RU)).toBe(true);
  });
});
