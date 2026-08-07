import { afterEach, describe, expect, it } from "vitest";
import {
  isRuRelayEnabled,
  isYandexCdnEnabled,
} from "@/lib/constants/features";
import {
  getPlatformSshPublicKey,
  isTimewebApiBuyEnabled,
} from "@/lib/constants/partner";

describe("feature flags", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_RU_RELAY;
    delete process.env.NEXT_PUBLIC_ENABLE_YANDEX_CDN;
    delete process.env.NEXT_PUBLIC_ENABLE_TIMEWEB_API_BUY;
    delete process.env.NEXT_PUBLIC_WG_SSH_PUBLIC_KEY;
  });

  it("treats only exact 'true' as enabled", () => {
    expect(isRuRelayEnabled()).toBe(false);
    expect(isYandexCdnEnabled()).toBe(false);
    expect(isTimewebApiBuyEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_ENABLE_RU_RELAY = "true";
    process.env.NEXT_PUBLIC_ENABLE_YANDEX_CDN = "1";
    process.env.NEXT_PUBLIC_ENABLE_TIMEWEB_API_BUY = "true";

    expect(isRuRelayEnabled()).toBe(true);
    expect(isYandexCdnEnabled()).toBe(false);
    expect(isTimewebApiBuyEnabled()).toBe(true);
  });

  it("normalizes public SSH key escaped newlines", () => {
    process.env.NEXT_PUBLIC_WG_SSH_PUBLIC_KEY = "ssh-ed25519 AAAAtest comment\\n";
    expect(getPlatformSshPublicKey()).toBe("ssh-ed25519 AAAAtest comment");
  });
});
