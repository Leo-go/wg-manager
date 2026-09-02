import { describe, expect, it } from "vitest";
import { buildClientLabel, swapVlessUuid } from "@/lib/bot/build-vless-url";

describe("swapVlessUuid", () => {
  it("replaces uuid in vless url", () => {
    const template =
      "vless://11111111-1111-1111-1111-111111111111@1.2.3.4:443?encryption=none&security=reality&sni=example.com&fp=chrome&pbk=abc&sid=def&type=tcp#WG";
    const next = swapVlessUuid(
      template,
      "22222222-2222-2222-2222-222222222222"
    );
    expect(next.startsWith("vless://22222222-2222-2222-2222-222222222222@")).toBe(
      true
    );
    expect(next.endsWith("#WG")).toBe(true);
  });
});

describe("buildClientLabel", () => {
  it("prefers username", () => {
    expect(buildClientLabel("Ivan", "ivanov", 1)).toBe("tg-ivanov");
  });
});
