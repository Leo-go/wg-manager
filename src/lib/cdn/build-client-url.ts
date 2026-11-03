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

/** Tele2/DPI-friendly: fewer parallel GETs on one H2 connection. */
export const CDN_XHTTP_MAX_CONCURRENT_POSTS = 2;

/** Slightly slower uplink cadence reduces middlebox resets on mobile. */
export const CDN_XHTTP_MIN_POSTS_INTERVAL_MS = 120;

type CdnXhttpExtra = {
  mode: "packet-up";
  uplinkHTTPMethod: "GET";
  uplinkDataPlacement: "header";
  uplinkDataKey: string;
  uplinkChunkSize: number;
  scMaxEachPostBytes: number;
  scMinPostsIntervalMs: number;
  scMaxBufferedPosts: number;
  scMaxConcurrentPosts: number;
  xPaddingObfsMode: boolean;
  xPaddingBytes: string;
  xPaddingKey: string;
  xPaddingHeader: string;
  xPaddingMethod: string;
  xPaddingPlacement: string;
};

function buildCdnXhttpExtra(paddingKey: string): CdnXhttpExtra {
  return {
    mode: "packet-up",
    uplinkHTTPMethod: "GET",
    uplinkDataPlacement: "header",
    uplinkDataKey: "X-Data",
    uplinkChunkSize: 2048,
    scMaxEachPostBytes: CDN_XHTTP_MAX_POST_BYTES,
    scMinPostsIntervalMs: CDN_XHTTP_MIN_POSTS_INTERVAL_MS,
    scMaxBufferedPosts: 10,
    scMaxConcurrentPosts: CDN_XHTTP_MAX_CONCURRENT_POSTS,
    xPaddingObfsMode: true,
    xPaddingBytes: "100-200",
    xPaddingKey: paddingKey,
    xPaddingHeader: "X-Cache",
    xPaddingMethod: "tokenish",
    xPaddingPlacement: "queryInHeader",
  };
}

/** True if a stored CDN vless:// still uses POST/OPTIONS body uplink or noisy defaults. */
export function cdnVlessUrlNeedsXhttpRefresh(url: string): boolean {
  if (/[?&]alpn=http(?:%2F|\/)1\.1(?:&|#|$)/i.test(url)) return true;
  if (url.includes("1000000")) return true;
  if (url.includes("262144")) return true;
  if (url.includes("%22uplinkHTTPMethod%22%3A%22POST%22")) return true;
  if (url.includes("%22uplinkHTTPMethod%22%3A%22OPTIONS%22")) return true;
  if (!url.includes("%22uplinkHTTPMethod%22%3A%22GET%22")) return true;
  if (!url.includes("%22uplinkDataPlacement%22%3A%22header%22")) return true;
  if (!/[?&]scMaxEachPostBytes=8192(?:&|#|$)/.test(url)) return true;
  if (!url.includes("%22scMaxConcurrentPosts%22%3A2")) return true;
  if (!url.includes("%22scMinPostsIntervalMs%22%3A120")) return true;
  return false;
}

export function buildYandexCdnVlessUrl(opts: {
  uuid: string;
  cdnHost: string;
  path: string;
  paddingKey: string;
  /** Force HTTP/1.1 ALPN — experimental Tele2 / DPI profile. */
  alpnHttp11?: boolean;
}): string {
  const cdnHost = normalizeCdnClientHost(opts.cdnHost);
  const pathEnc = encodeURIComponent(opts.path);
  const extra = buildCdnXhttpExtra(opts.paddingKey);
  const extraEnc = encodeURIComponent(JSON.stringify(extra));
  const alpn = opts.alpnHttp11 ? "&alpn=http%2F1.1" : "";
  const fragment = opts.alpnHttp11 ? "WG-Yandex-CDN-H1" : "WG-Yandex-CDN";
  return (
    `vless://${opts.uuid}@${cdnHost}:443` +
    `?encryption=none&security=tls&sni=${cdnHost}&host=${cdnHost}${alpn}` +
    `&fp=chrome&type=xhttp&path=${pathEnc}&mode=packet-up` +
    `&scMaxEachPostBytes=${CDN_XHTTP_MAX_POST_BYTES}` +
    `&scMaxConcurrentPosts=${CDN_XHTTP_MAX_CONCURRENT_POSTS}` +
    `&scMinPostsIntervalMs=${CDN_XHTTP_MIN_POSTS_INTERVAL_MS}` +
    `&extra=${extraEnc}` +
    `#${fragment}`
  );
}

/**
 * Derive an HTTP/1.1 ALPN sibling from an existing CDN vless:// URL
 * (same UUID/path/extra). Used as Tele2 fallback in subscriptions.
 */
export function withCdnHttp1Alpn(vlessUrl: string): string {
  const trimmed = vlessUrl.trim();
  if (!trimmed.toLowerCase().startsWith("vless://")) {
    return trimmed;
  }
  const hash = trimmed.indexOf("#");
  const withoutHash = hash >= 0 ? trimmed.slice(0, hash) : trimmed;
  const q = withoutHash.indexOf("?");
  if (q < 0) {
    return `${withoutHash}?alpn=http%2F1.1#WG-Yandex-CDN-H1`;
  }
  const base = withoutHash.slice(0, q + 1);
  const query = withoutHash.slice(q + 1);
  const stripped = query
    .split("&")
    .filter((p) => p && !/^alpn=/i.test(p))
    .join("&");
  const next = stripped
    ? `${base}alpn=http%2F1.1&${stripped}`
    : `${base}alpn=http%2F1.1`;
  return `${next}#WG-Yandex-CDN-H1`;
}
