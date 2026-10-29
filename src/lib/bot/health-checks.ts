import net from "node:net";

export type HealthCheckStatus = "pass" | "fail" | "warn";

export type HealthCheckResult = {
  name: string;
  status: HealthCheckStatus;
  detail: string;
  hardFail: boolean;
};

export type HealthReport = {
  ok: boolean;
  checks: HealthCheckResult[];
};

/** Parse `wg show` output: latest handshake age in seconds, or null if unknown. */
export function parseWgHandshakeAgeSeconds(
  wgShowOutput: string,
  nowSec = Math.floor(Date.now() / 1000)
): number | null {
  const line = wgShowOutput
    .split("\n")
    .find((l) => /latest handshake/i.test(l));
  if (!line) return null;

  // Human form: "latest handshake: 1 minute, 47 seconds ago"
  const ago = line.match(/latest handshake:\s*(.+?)\s*ago/i);
  if (ago) {
    const text = ago[1].toLowerCase();
    let sec = 0;
    const days = text.match(/(\d+)\s*day/);
    const hours = text.match(/(\d+)\s*hour/);
    const mins = text.match(/(\d+)\s*minute/);
    const secs = text.match(/(\d+)\s*second/);
    if (days) sec += Number(days[1]) * 86400;
    if (hours) sec += Number(hours[1]) * 3600;
    if (mins) sec += Number(mins[1]) * 60;
    if (secs) sec += Number(secs[1]);
    if (sec > 0 || /second|minute|hour|day/.test(text)) return sec;
  }

  // Epoch form sometimes used by `wg show wg-home0 dump`
  const epoch = line.match(/latest handshake:\s*(\d{9,})/i);
  if (epoch) {
    const ts = Number(epoch[1]);
    if (Number.isFinite(ts) && ts > 0) return Math.max(0, nowSec - ts);
  }

  return null;
}

export function evaluateWgHandshake(
  ageSeconds: number | null,
  maxAgeSeconds = 180
): HealthCheckResult {
  if (ageSeconds === null) {
    return {
      name: "wg-home0",
      status: "warn",
      detail: "could not parse handshake age",
      hardFail: false,
    };
  }
  if (ageSeconds > maxAgeSeconds) {
    return {
      name: "wg-home0",
      status: "fail",
      detail: `handshake age ${ageSeconds}s > ${maxAgeSeconds}s`,
      hardFail: true,
    };
  }
  return {
    name: "wg-home0",
    status: "pass",
    detail: `handshake age ${ageSeconds}s`,
    hardFail: false,
  };
}

export function aggregateHealthReport(
  checks: HealthCheckResult[]
): HealthReport {
  const ok = !checks.some((c) => c.hardFail && c.status === "fail");
  return { ok, checks };
}

export function tcpConnectCheck(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (result: HealthCheckResult) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      finish({
        name: `tcp:${host}:${port}`,
        status: "pass",
        detail: "connected",
        hardFail: false,
      });
    });
    socket.once("timeout", () => {
      finish({
        name: `tcp:${host}:${port}`,
        status: "fail",
        detail: `timeout ${timeoutMs}ms`,
        hardFail: true,
      });
    });
    socket.once("error", (err) => {
      finish({
        name: `tcp:${host}:${port}`,
        status: "fail",
        detail: err.message,
        hardFail: true,
      });
    });
    socket.connect(port, host);
  });
}

export async function httpStatusCheck(
  url: string,
  timeoutMs = 8000
): Promise<HealthCheckResult> {
  const name = `http:${url}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status >= 200 && res.status < 300) {
      return {
        name,
        status: "pass",
        detail: `HTTP ${res.status}`,
        hardFail: false,
      };
    }
    return {
      name,
      status: "fail",
      detail: `HTTP ${res.status}`,
      hardFail: true,
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
      hardFail: true,
    };
  }
}

export function formatHealthAlert(report: HealthReport): string {
  const lines = [
    report.ok ? "✅ Bot health OK" : "⚠️ Bot health FAIL",
    "",
    ...report.checks.map(
      (c) =>
        `${c.status === "pass" ? "✓" : c.status === "warn" ? "~" : "✗"} ${c.name}: ${c.detail}`
    ),
  ];
  return lines.join("\n");
}
