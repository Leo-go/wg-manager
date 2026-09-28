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

/** Yandex CDN HTTP/2 edges return 413 on 1MB xHTTP posts + padding headers. */
export const CDN_XHTTP_MAX_POST_BYTES = 262_144;

/** True if a stored CDN vless:// still uses HTTP/2 or 1MB posts. */
export function cdnVlessUrlNeedsXhttpRefresh(url: string): boolean {
  const hasHttp11 = /[?&]alpn=http(?:%2F|\/)1\.1(?:&|#|$)/i.test(url);
  if (!hasHttp11) return true;
  return url.includes("1000000");
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
    scMaxEachPostBytes: CDN_XHTTP_MAX_POST_BYTES,
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
    `&alpn=http%2F1.1&fp=chrome&type=xhttp&path=${pathEnc}&mode=packet-up&extra=${extraEnc}` +
    `#WG-Yandex-CDN`
  );
}