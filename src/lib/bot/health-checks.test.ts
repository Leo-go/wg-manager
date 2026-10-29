import { describe, expect, it } from "vitest";
import {
  aggregateHealthReport,
  evaluateWgHandshake,
  formatHealthAlert,
  parseWgHandshakeAgeSeconds,
  type HealthCheckResult,
} from "@/lib/bot/health-checks";

describe("parseWgHandshakeAgeSeconds", () => {
  it("parses human-readable ago line", () => {
    const out = [
      "interface: wg-home0",
      "  public key: xxx",
      "peer: yyy",
      "  latest handshake: 1 minute, 47 seconds ago",
    ].join("\n");
    expect(parseWgHandshakeAgeSeconds(out)).toBe(107);
  });

  it("parses epoch handshake against now", () => {
    const now = 1_700_000_100;
    const out = `latest handshake: ${now - 42}`;
    expect(parseWgHandshakeAgeSeconds(out, now)).toBe(42);
  });

  it("returns null when missing", () => {
    expect(parseWgHandshakeAgeSeconds("interface: wg-home0")).toBeNull();
  });
});

describe("evaluateWgHandshake", () => {
  it("fails when stale", () => {
    const r = evaluateWgHandshake(400, 180);
    expect(r.status).toBe("fail");
    expect(r.hardFail).toBe(true);
  });

  it("passes when fresh", () => {
    expect(evaluateWgHandshake(30, 180).status).toBe("pass");
  });
});

describe("aggregateHealthReport", () => {
  it("fails only on hard failures", () => {
    const checks: HealthCheckResult[] = [
      {
        name: "a",
        status: "warn",
        detail: "x",
        hardFail: false,
      },
      {
        name: "b",
        status: "fail",
        detail: "y",
        hardFail: true,
      },
    ];
    expect(aggregateHealthReport(checks).ok).toBe(false);
    expect(
      aggregateHealthReport([
        { name: "a", status: "pass", detail: "ok", hardFail: false },
      ]).ok
    ).toBe(true);
  });
});

describe("formatHealthAlert", () => {
  it("includes check lines", () => {
    const text = formatHealthAlert({
      ok: false,
      checks: [
        { name: "tcp", status: "fail", detail: "timeout", hardFail: true },
      ],
    });
    expect(text).toMatch(/FAIL/);
    expect(text).toMatch(/tcp: timeout/);
  });
});
