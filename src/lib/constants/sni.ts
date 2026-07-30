export const DEFAULT_SNI_DOMAIN = "www.cloudflare.com";
export const DEFAULT_VLESS_PORT = 443;
export const DEFAULT_SHORT_ID = "6d5a6f5b";

/** Default Reality SNI for RU Relay (client → RU hop). */
export const DEFAULT_RELAY_SNI_DOMAIN = "eh.vk.com";

export const SNI_PRESET_OPTIONS = [
  { value: "www.cloudflare.com", id: "cloudflare" },
  { value: "www.apple.com", id: "apple" },
  { value: "www.microsoft.com", id: "microsoft" },
  { value: "dl.google.com", id: "google" },
  { value: "custom", id: "custom" },
] as const;

/** Domestic high-traffic donors recommended for RU Relay Reality. */
export const RELAY_SNI_PRESET_OPTIONS = [
  { value: "eh.vk.com", id: "vk" },
  { value: "max.ru", id: "max" },
  { value: "rutube.ru", id: "rutube" },
  { value: "custom", id: "custom" },
] as const;

export type SniPresetValue = (typeof SNI_PRESET_OPTIONS)[number]["value"];
export type RelaySniPresetValue =
  (typeof RELAY_SNI_PRESET_OPTIONS)[number]["value"];

export function resolveSniDomain(
  preset: SniPresetValue | string,
  customValue: string,
  fallback: string = DEFAULT_SNI_DOMAIN
): string {
  if (preset === "custom") {
    return customValue.trim() || fallback;
  }
  return preset;
}

export function getSniPresetFromDomain(
  domain: string | null | undefined,
  options: ReadonlyArray<{ value: string; id: string }> = SNI_PRESET_OPTIONS,
  fallback: string = DEFAULT_SNI_DOMAIN
): {
  preset: SniPresetValue | string;
  customValue: string;
} {
  const normalized = domain?.trim() || fallback;
  const match = options.find(
    (option) => option.value !== "custom" && option.value === normalized
  );
  if (match) {
    return { preset: match.value, customValue: "" };
  }
  return { preset: "custom", customValue: normalized };
}

export function displaySniDomain(domain: string | null | undefined): string {
  return domain?.trim() || DEFAULT_SNI_DOMAIN;
}

export function displayRelaySniDomain(
  domain: string | null | undefined
): string {
  return domain?.trim() || DEFAULT_RELAY_SNI_DOMAIN;
}

export function displayVlessPort(port: number | null | undefined): number {
  return port && port > 0 ? port : DEFAULT_VLESS_PORT;
}
