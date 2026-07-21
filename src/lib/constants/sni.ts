export const DEFAULT_SNI_DOMAIN = "www.cloudflare.com";
export const DEFAULT_VLESS_PORT = 443;
export const DEFAULT_SHORT_ID = "6d5a6f5b";

export const SNI_PRESET_OPTIONS = [
  { value: "www.cloudflare.com", id: "cloudflare" },
  { value: "www.apple.com", id: "apple" },
  { value: "www.microsoft.com", id: "microsoft" },
  { value: "dl.google.com", id: "google" },
  { value: "custom", id: "custom" },
] as const;

export type SniPresetValue = (typeof SNI_PRESET_OPTIONS)[number]["value"];

export function resolveSniDomain(
  preset: SniPresetValue | string,
  customValue: string
): string {
  if (preset === "custom") {
    return customValue.trim() || DEFAULT_SNI_DOMAIN;
  }
  return preset;
}

export function getSniPresetFromDomain(domain: string | null | undefined): {
  preset: SniPresetValue | string;
  customValue: string;
} {
  const normalized = domain?.trim() || DEFAULT_SNI_DOMAIN;
  const match = SNI_PRESET_OPTIONS.find(
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

export function displayVlessPort(port: number | null | undefined): number {
  return port && port > 0 ? port : DEFAULT_VLESS_PORT;
}
