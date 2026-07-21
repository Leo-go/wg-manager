/**
 * Timeweb Cloud API client (cloud VPS).
 * Docs: https://api.timeweb.cloud — POST /api/v1/servers, GET /api/v1/servers/{id}
 *
 * MOCK mode: when TIMEWEB_CLOUD_API_TOKEN is missing, no real API calls / charges.
 */

import { randomBytes } from "crypto";

const TIMEWEB_API_BASE = "https://api.timeweb.cloud/api/v1";

export type TimewebLocation = "nl-1" | "de-1" | "ru-1" | "ru-2" | "ru-3" | "kz-1";

export type ProvisionConfig = {
  name?: string;
  /** Timeweb location code, e.g. nl-1 (Amsterdam) */
  location?: TimewebLocation | string;
  /** Optional preset override; otherwise resolved / taken from env */
  presetId?: number;
  /** Optional OS override; otherwise resolved / taken from env */
  osId?: number;
};

export type ProvisionedServer = {
  id: string;
  providerServerId: string;
  ip: string;
  password: string;
  name: string;
  location: string;
  mock: boolean;
};

export type TimewebServerStatus = {
  id: number;
  name: string;
  status: string;
  ip: string | null;
};

function getToken(): string | null {
  const token = process.env.TIMEWEB_CLOUD_API_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export function isTimewebMockMode(): boolean {
  return !getToken();
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new Error("TIMEWEB_CLOUD_API_TOKEN is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function twFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${TIMEWEB_API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(
      `Timeweb API returned non-JSON (${response.status}): ${text.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : text.slice(0, 300);
    throw new Error(`Timeweb API ${response.status}: ${message}`);
  }

  return { status: response.status, data };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateRootPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(24);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function buildCloudInit(rootPassword: string): string {
  // Sets a known root password so we can SSH without panel/email.
  return `#cloud-config
ssh_pwauth: true
disable_root: false
chpasswd:
  list: |
    root:${rootPassword}
  expire: false
`;
}

function isIpv4Address(value: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

function extractIpv4(server: Record<string, unknown>): string | null {
  const networks = server.networks;
  if (Array.isArray(networks)) {
    for (const network of networks) {
      if (!network || typeof network !== "object") continue;
      const net = network as {
        ips?: unknown;
        ip?: unknown;
        type?: unknown;
      };

      if (typeof net.ip === "string" && isIpv4Address(net.ip)) {
        return net.ip;
      }

      if (!Array.isArray(net.ips)) continue;
      for (const ipEntry of net.ips) {
        if (!ipEntry || typeof ipEntry !== "object") continue;
        const type = (ipEntry as { type?: string }).type;
        const ip = (ipEntry as { ip?: string }).ip;
        if (typeof ip !== "string") continue;
        if (type === "ipv6" || ip.includes(":")) continue;
        if (isIpv4Address(ip) || (ip.includes(".") && type !== "ipv6")) {
          return ip;
        }
      }
    }
  }

  for (const key of ["main_ipv4", "ipv4", "ip", "public_ip"]) {
    const value = server[key];
    if (typeof value === "string" && isIpv4Address(value)) return value;
  }

  return null;
}

async function listServerIpv4(providerServerId: string): Promise<string | null> {
  try {
    const { data } = await twFetch<{
      server_ips?: Array<{ ip?: string; type?: string }>;
      ips?: Array<{ ip?: string; type?: string }>;
    }>(`/servers/${providerServerId}/ips`);

    const list = data.server_ips ?? data.ips ?? [];
    for (const entry of list) {
      const ip = entry.ip;
      if (typeof ip !== "string") continue;
      if (entry.type === "ipv6" || ip.includes(":")) continue;
      if (isIpv4Address(ip) || ip.includes(".")) return ip;
    }
  } catch {
    // Some accounts may not expose /ips until an address exists — ignore.
  }
  return null;
}

/**
 * Some NL/DE presets boot with IPv6 only. Request a public IPv4 via API.
 * POST /api/v1/servers/{id}/ips  { "type": "ipv4" }
 */
export async function ensurePublicIpv4(
  providerServerId: string
): Promise<string | null> {
  const existing = await listServerIpv4(providerServerId);
  if (existing) return existing;

  const { data } = await twFetch<{
    server_ip?: { ip?: string; type?: string };
    ip?: string;
  }>(`/servers/${providerServerId}/ips`, {
    method: "POST",
    body: JSON.stringify({ type: "ipv4" }),
  });

  const created =
    data.server_ip?.ip ??
    (typeof data.ip === "string" ? data.ip : null);

  if (created && (isIpv4Address(created) || created.includes("."))) {
    return created;
  }

  // Address may appear after a short delay
  await sleep(5_000);
  return listServerIpv4(providerServerId);
}

type Preset = {
  id: number;
  location?: string;
  description?: string;
  description_short?: string;
  cpu?: number;
  ram?: number;
  disk?: number;
  disk_type?: string;
  bandwidth?: number;
  /** Timeweb usually returns monthly ₽ as number; sometimes nested object */
  price?: unknown;
  price_month?: number;
};

export type TimewebOffer = {
  presetId: number;
  location: string;
  title: string;
  cpu: number | null;
  ramMb: number | null;
  diskMb: number | null;
  /** Monthly price from Timeweb API (₽), if present */
  priceMonthRub: number | null;
  /**
   * Estimated daily cost. Timeweb Cloud is typically hourly-billed;
   * we show month/30 as a planning estimate (not a prepaid “1 day pack”).
   */
  priceDayEstimateRub: number | null;
  billingNote: string;
};

type OsItem = {
  id: number;
  name?: string;
  version?: string;
};

function parsePriceRub(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of [
      "amount",
      "value",
      "month",
      "monthly",
      "price",
      "price_month",
    ]) {
      const nested = parsePriceRub(obj[key]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function presetMonthlyPrice(preset: Preset): number | null {
  return (
    parsePriceRub(preset.price) ??
    (typeof preset.price_month === "number" ? preset.price_month : null)
  );
}

function toOffer(preset: Preset, fallbackLocation: string): TimewebOffer {
  const month = presetMonthlyPrice(preset);
  const day =
    month !== null ? Math.max(1, Math.round((month / 30) * 100) / 100) : null;
  const title =
    preset.description_short ||
    preset.description ||
    `${preset.cpu ?? "?"} CPU / ${preset.ram ? Math.round(preset.ram / 1024) : "?"} GB RAM`;

  return {
    presetId: preset.id,
    location: preset.location || fallbackLocation,
    title,
    cpu: typeof preset.cpu === "number" ? preset.cpu : null,
    ramMb: typeof preset.ram === "number" ? preset.ram : null,
    diskMb: typeof preset.disk === "number" ? preset.disk : null,
    priceMonthRub: month,
    priceDayEstimateRub: day,
    billingNote:
      "Timeweb Cloud normally bills hourly. “Per day” ≈ monthly÷30; delete the VPS after the test to stop charges.",
  };
}

/** List tariffs for a location with prices from Timeweb (or mock offers). */
export async function listServerOffers(
  location: string = "nl-1"
): Promise<{ mock: boolean; offers: TimewebOffer[] }> {
  if (isTimewebMockMode()) {
    return {
      mock: true,
      offers: [
        {
          presetId: 0,
          location,
          title: "MOCK Start (1 CPU / 1 GB)",
          cpu: 1,
          ramMb: 1024,
          diskMb: 15 * 1024,
          priceMonthRub: 299,
          priceDayEstimateRub: 10,
          billingNote: "MOCK — no real Timeweb charge.",
        },
      ],
    };
  }

  const { data } = await twFetch<{ server_presets?: Preset[] }>(
    "/presets/servers"
  );
  const presets = data.server_presets ?? [];
  const inLocation = presets.filter(
    (p) => !p.location || p.location === location
  );
  const pool = inLocation.length > 0 ? inLocation : presets;

  const offers = pool
    .map((p) => toOffer(p, location))
    .sort(
      (a, b) =>
        (a.priceMonthRub ?? Number.POSITIVE_INFINITY) -
        (b.priceMonthRub ?? Number.POSITIVE_INFINITY)
    );

  return { mock: false, offers };
}

async function resolvePresetId(location: string): Promise<number> {
  const fromEnv = Number.parseInt(process.env.TIMEWEB_PRESET_ID ?? "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  const { offers } = await listServerOffers(location);
  const cheapest = offers[0];
  if (!cheapest?.presetId) {
    throw new Error(
      `No Timeweb presets found for location ${location}. Set TIMEWEB_PRESET_ID.`
    );
  }
  return cheapest.presetId;
}

async function resolveOsId(): Promise<number> {
  const fromEnv = Number.parseInt(process.env.TIMEWEB_OS_ID ?? "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  // Common documented Ubuntu id in Timeweb examples; override via env in prod.
  // Prefer listing OS if the endpoint is available.
  try {
    const { data } = await twFetch<{ servers_os?: OsItem[]; os?: OsItem[] }>(
      "/os/servers"
    );
    const list = data.servers_os ?? data.os ?? [];
    const ubuntu = list.find(
      (o) =>
        /ubuntu/i.test(o.name ?? "") &&
        (o.version?.startsWith("22") || o.version?.startsWith("24"))
    );
    if (ubuntu?.id) return ubuntu.id;
  } catch {
    // fall through to default
  }

  // Documented sample in Timeweb tutorials (Ubuntu)
  return 99;
}

export async function getServerStatus(
  providerServerId: string
): Promise<TimewebServerStatus> {
  if (isTimewebMockMode()) {
    return {
      id: Number(providerServerId) || 0,
      name: "mock-server",
      status: "on",
      ip: "92.51.45.35",
    };
  }

  const { data } = await twFetch<{ server: Record<string, unknown> }>(
    `/servers/${providerServerId}`
  );
  const server = data.server ?? {};
  const fromServer = extractIpv4(server);
  const fromIpsApi = fromServer
    ? null
    : await listServerIpv4(providerServerId);

  return {
    id: Number(server.id) || 0,
    name: String(server.name ?? ""),
    status: String(server.status ?? "unknown"),
    ip: fromServer ?? fromIpsApi,
  };
}

/**
 * Create a cloud VPS (or mock), wait until it is on, return IP + root password.
 */
export async function provisionServer(
  config: ProvisionConfig = {}
): Promise<ProvisionedServer> {
  const location = config.location ?? process.env.TIMEWEB_LOCATION ?? "nl-1";
  const name =
    config.name ??
    `wg-${location}-${Date.now().toString(36)}`.slice(0, 40);

  if (isTimewebMockMode()) {
    await sleep(3000);
    return {
      id: "mock-123",
      providerServerId: "mock-123",
      ip: "92.51.45.35",
      password: "mock_password",
      name,
      location,
      mock: true,
    };
  }

  const password = generateRootPassword();
  const presetId = config.presetId ?? (await resolvePresetId(location));
  const osId = config.osId ?? (await resolveOsId());

  const body = {
    name,
    is_ddos_guard: false,
    is_local_network: false,
    bandwidth: 200,
    os_id: osId,
    preset_id: presetId,
    comment: "Provisioned by WG Manager",
    cloud_init: buildCloudInit(password),
  };

  const { data: created } = await twFetch<{
    server?: Record<string, unknown>;
  }>("/servers", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const serverObj = created.server ?? {};
  const providerServerId = String(serverObj.id ?? "");
  if (!providerServerId) {
    throw new Error("Timeweb create server response missing server.id");
  }

  const ready = await waitUntilServerReady(providerServerId, {
    maxAttempts: 18,
    intervalMs: 10_000,
  });

  if (!ready.ip) {
    throw new Error(
      "Timeweb server is on but has no public IPv4. Open the Timeweb panel → Networks and add IPv4, or retry — we now auto-request IPv4 via API."
    );
  }

  return {
    id: providerServerId,
    providerServerId,
    ip: ready.ip,
    password,
    name: ready.name || name,
    location,
    mock: false,
  };
}

export async function waitUntilServerReady(
  providerServerId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<TimewebServerStatus> {
  const maxAttempts = options.maxAttempts ?? 18;
  const intervalMs = options.intervalMs ?? 10_000;

  if (isTimewebMockMode()) {
    await sleep(500);
    return getServerStatus(providerServerId);
  }

  let last: TimewebServerStatus | null = null;
  let ipv4Requested = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await getServerStatus(providerServerId);
    const poweredOn = last.status === "on" || last.status === "active";

    if (poweredOn && last.ip) {
      return last;
    }

    // Server can be "on" with only IPv6 (common in nl-1). Allocate IPv4 once.
    if (poweredOn && !last.ip && !ipv4Requested) {
      ipv4Requested = true;
      try {
        console.log(
          `[timeweb] Server ${providerServerId} is ${last.status} without IPv4 — requesting ipv4…`
        );
        const ipv4 = await ensurePublicIpv4(providerServerId);
        if (ipv4) {
          return { ...last, ip: ipv4 };
        }
      } catch (err) {
        console.error(
          "[timeweb] Failed to allocate IPv4:",
          err instanceof Error ? err.message : err
        );
      }
    }

    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for Timeweb server ${providerServerId} (last status: ${last?.status ?? "unknown"}, ipv4: ${last?.ip ?? "none"}). If the VPS is online with IPv6 only, add a public IPv4 in Timeweb → Networks, then retry.`
  );
}
