/**
 * Client CDN host for VLESS. Apex domains (example.com) → www.example.com,
 * because Yandex CDN is usually bound to www, not the bare zone apex.
 */
export function normalizeCdnClientHost(raw: string): string {
  const host = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    ?.toLowerCase()
    .replace(/\.$/, "");

  if (!host) {
    throw new Error("CDN host is empty");
  }
  if (host.startsWith("www.")) {
    return host;
  }
  // example.com → www.example.com; leave cdn.example.com / a.b.example.com
  if (host.split(".").length === 2) {
    return `www.${host}`;
  }
  return host;
}

export function buildYandexCdnVlessUrl(opts: {
  uuid: string;
  cdnHost: string;
  path: string;
  paddingKey: string;
}): string {
  const cdnHost = normalizeCdnClientHost(opts.cdnHost);
  const pathEnc = encodeURIComponent(opts.path);
  const extra = {
    mode: "packet-up",
    scMaxEachPostBytes: 1_000_000,
    scMinPostsIntervalMs: 30,
    scMaxBufferedPosts: 30,
    xPaddingObfsMode: true,
    xPaddingKey: opts.paddingKey,
    xPaddingHeader: "X-Cache",
    xPaddingMethod: "tokenish",
    xPaddingPlacement: "queryInHeader",
    uplinkHTTPMethod: "OPTIONS",
  };
  const extraEnc = encodeURIComponent(JSON.stringify(extra));
  return (
    `vless://${opts.uuid}@${cdnHost}:443` +
    `?encryption=none&security=tls&sni=${cdnHost}&host=${cdnHost}` +
    `&type=xhttp&path=${pathEnc}&mode=packet-up&extra=${extraEnc}` +
    `#WG-Yandex-CDN`
  );
}