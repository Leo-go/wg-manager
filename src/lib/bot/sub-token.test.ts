import { afterEach, describe, expect, it, vi } from "vitest";
import { signSubToken, verifySubToken } from "@/lib/bot/sub-token";
import {
  buildSubscriptionBody,
  buildSubscriptionUrl,
  withProfileName,
} from "@/lib/bot/subscription-feed";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sub-token", () => {
  it("round-trips a signed token", () => {
    vi.stubEnv("TELEGRAM_SETUP_SECRET", "test-setup-secret");
    const token = signSubToken("11111111-1111-4111-8111-111111111111");
    expect(verifySubToken(token)).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects tampered tokens", () => {
    vi.stubEnv("TELEGRAM_SETUP_SECRET", "test-setup-secret");
    const token = signSubToken("11111111-1111-4111-8111-111111111111");
    expect(verifySubToken(token + "x")).toBeNull();
    expect(verifySubToken("not-a-token")).toBeNull();
  });
});

describe("subscription-feed", () => {
  it("puts HOME, MOBILE, then MOBILE-H1 and base64-encodes", () => {
    const body = buildSubscriptionBody(
      "vless://aaa@home:443?type=xhttp#old",
      "vless://bbb@cdn:443?type=xhttp#old"
    );
    const decoded = Buffer.from(body, "base64").toString("utf8");
    const lines = decoded.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("@home:443");
    expect(lines[0].endsWith("#HOME")).toBe(true);
    expect(lines[1]).toContain("@cdn:443");
    expect(lines[1].endsWith("#MOBILE")).toBe(true);
    expect(lines[2]).toContain("alpn=http%2F1.1");
    expect(lines[2].endsWith("#MOBILE-H1")).toBe(true);
  });

  it("builds subscription URL", () => {
    expect(buildSubscriptionUrl("https://wg-manager.ru/", "uid.sig")).toBe(
      "https://wg-manager.ru/api/telegram/sub/uid.sig"
    );
  });

  it("renames fragment", () => {
    expect(withProfileName("vless://x@h:1?a=1#z", "HOME")).toBe(
      "vless://x@h:1?a=1#HOME"
    );
  });
});
