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

/** Header/cookie xHTTP packets; keep small so Yandex GET edges do not 413. */
export const CDN_XHTTP_MAX_POST_BYTES = 8_192;

/** True if a stored CDN vless:// still uses POST/OPTIONS body uplink or 1MB posts. */
export function cdnVlessUrlNeedsXhttpRefresh(url: string): boolean {
  if (/[?&]alpn=http(?:%2F|\/)1\.1(?:&|#|$)/i.test(url)) return true;
  if (url.includes("1000000")) return true;
  if (url.includes("262144")) return true;
  if (url.includes("%22uplinkHTTPMethod%22%3A%22POST%22")) return true;
  if (url.includes("%22uplinkHTTPMethod%22%3A%22OPTIONS%22")) return true;
  if (!url.includes("%22uplinkHTTPMethod%22%3A%22GET%22")) return true;
  if (!url.includes("%22uplinkDataPlacement%22%3A%22header%22")) return true;
  return !/[?&]scMaxEachPostBytes=8192(?:&|#|$)/.test(url);
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
    uplinkHTTPMethod: "GET",
    uplinkDataPlacement: "header",
    uplinkDataKey: "X-Data",
    uplinkChunkSize: 2048,
    scMaxEachPostBytes: CDN_XHTTP_MAX_POST_BYTES,
    scMinPostsIntervalMs: 30,
    scMaxBufferedPosts: 30,
    xPaddingObfsMode: true,
    xPaddingBytes: "100-200",
    xPaddingKey: opts.paddingKey,
    xPaddingHeader: "X-Cache",
    xPaddingMethod: "tokenish",
    xPaddingPlacement: "queryInHeader",
  };
  const extraEnc = encodeURIComponent(JSON.stringify(extra));
  return (
    `vless://${opts.uuid}@${cdnHost}:443` +
    `?encryption=none&security=tls&sni=${cdnHost}&host=${cdnHost}` +
    `&fp=chrome&type=xhttp&path=${pathEnc}&mode=packet-up` +
    `&scMaxEachPostBytes=${CDN_XHTTP_MAX_POST_BYTES}&extra=${extraEnc}` +
    `#WG-Yandex-CDN`
  );
}