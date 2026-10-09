import { describe, expect, it } from "vitest";
import {
  buildClientLabel,
  buildClientLabelAliases,
  buildClientLabelArg,
  swapVlessUuid,
} from "@/lib/bot/build-vless-url";

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
  it("includes telegram id so labels stay unique", () => {
    expect(buildClientLabel("Ivan", "ivanov", 42)).toBe("tg-ivanov-42");
  });

  it("falls back to first name + id", () => {
    expect(buildClientLabel("Ivan Petrov", null, 7)).toBe("tg-ivan-petrov-7");
  });
});

describe("buildClientLabelAliases", () => {
  it("includes legacy username-only label for cleanup", () => {
    expect(buildClientLabelAliases("Ivan", "JonyPenza", 99)).toEqual([
      "tg-JonyPenza-99",
      "tg-JonyPenza",
    ]);
  });

  it("includes legacy first-name label when username is missing", () => {
    expect(buildClientLabelAliases("Ivan Petrov", null, 7)).toEqual([
      "tg-ivan-petrov-7",
      "tg-ivan-petrov",
    ]);
  });
});

describe("buildClientLabelArg", () => {
  it("joins aliases for the shell script", () => {
    expect(buildClientLabelArg("Ivan", "ivanov", 1)).toBe(
      "tg-ivanov-1,tg-ivanov"
    );
  });
});
