import { describe, expect, it } from "vitest";
import { formatCapacityReport, type BotCapacityStats } from "@/lib/bot/capacity";

function stats(partial: Partial<BotCapacityStats>): BotCapacityStats {
  return {
    softLimit: 40,
    totalUsers: 10,
    activeSubscribers: 10,
    withKey: 8,
    inactive: 0,
    utilization: 0.25,
    nearLimit: false,
    atLimit: false,
    ...partial,
  };
}

describe("formatCapacityReport", () => {
  it("marks healthy capacity", () => {
    const text = formatCapacityReport(stats({}));
    expect(text).toContain("10 / 40");
    expect(text).toContain("Запас");
  });

  it("warns near limit", () => {
    const text = formatCapacityReport(
      stats({
        activeSubscribers: 32,
        utilization: 0.8,
        nearLimit: true,
      })
    );
    expect(text).toContain("Близко к лимиту");
  });

  it("warns at limit", () => {
    const text = formatCapacityReport(
      stats({
        activeSubscribers: 40,
        utilization: 1,
        nearLimit: true,
        atLimit: true,
      })
    );
    expect(text).toContain("Soft-лимит достигнут");
  });
});
