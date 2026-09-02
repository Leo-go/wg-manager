import { describe, expect, it } from "vitest";
import { daysUntilExpiry, extendSubscriptionDays } from "@/lib/bot/config";
import { extendUserSubscription } from "@/lib/bot/subscriptions";
import type { BotUser } from "@/lib/supabase/types";

describe("extendSubscriptionDays", () => {
  it("extends from now when no active subscription", () => {
    const next = extendSubscriptionDays(30);
    const diff = new Date(next).getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000);
  });

  it("stacks on existing subscription end date", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);
    const next = extendSubscriptionDays(30, future.toISOString());
    const expected = new Date(future);
    expected.setUTCDate(expected.getUTCDate() + 30);
    expect(Math.abs(new Date(next).getTime() - expected.getTime())).toBeLessThan(
      1000
    );
  });
});

describe("extendUserSubscription", () => {
  it("uses bot user subscribed_until as base", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    const user = {
      subscribed_until: future.toISOString(),
    } as BotUser;
    const next = extendUserSubscription(user, 30);
    const expected = new Date(future);
    expected.setUTCDate(expected.getUTCDate() + 30);
    expect(Math.abs(new Date(next).getTime() - expected.getTime())).toBeLessThan(
      1000
    );
  });
});

describe("daysUntilExpiry", () => {
  it("returns positive days for future date", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 3);
    expect(daysUntilExpiry(future.toISOString())).toBe(3);
  });
});
