export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

export function extractMarkedValue(
  output: string,
  key: string
): string | null {
  const clean = stripAnsi(output);
  const re = new RegExp(`(?:^|\\n)${key}=(\\S+)`, "m");
  const match = clean.match(re);
  return match?.[1]?.trim() ?? null;
}

export function extractVlessUrl(output: string): string | null {
  const marked = extractMarkedValue(output, "VLESS_CONFIG_URL");
  if (marked?.startsWith("vless://")) {
    return marked;
  }
  const clean = stripAnsi(output);
  const fallback = clean.match(/vless:\/\/[^\s]+/);
  return fallback?.[0]?.trim() ?? null;
}

/** Classic TCP Reality fallback URL from RU relay installer. */
export function extractVlessTcpUrl(output: string): string | null {
  const marked = extractMarkedValue(output, "VLESS_TCP_CONFIG_URL");
  if (marked?.startsWith("vless://")) {
    return marked;
  }
  return null;
}

export type ExitRelayMarkers = {
  uuid: string;
  publicKey: string;
  shortId: string;
  port: number;
  path: string;
  sni: string;
};

export function parseExitRelayMarkers(output: string): ExitRelayMarkers {
  const uuid = extractMarkedValue(output, "RELAY_EXIT_UUID");
  const publicKey = extractMarkedValue(output, "RELAY_EXIT_PBK");
  const shortId = extractMarkedValue(output, "RELAY_EXIT_SID");
  const portRaw = extractMarkedValue(output, "RELAY_EXIT_PORT");
  const path = extractMarkedValue(output, "RELAY_EXIT_PATH");
  const sni = extractMarkedValue(output, "RELAY_EXIT_SNI");

  if (!uuid || !publicKey || !shortId || !portRaw || !path || !sni) {
    throw new Error(
      "Could not parse relay exit markers from installer output (expected RELAY_EXIT_*)"
    );
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("Invalid RELAY_EXIT_PORT from installer output");
  }

  return { uuid, publicKey, shortId, port, path, sni };
}
