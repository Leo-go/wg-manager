export function buildYandexCdnVlessUrl(opts: {
  uuid: string;
  cdnHost: string;
  path: string;
  paddingKey: string;
}): string {
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
    `vless://${opts.uuid}@${opts.cdnHost}:443` +
    `?encryption=none&security=tls&sni=${opts.cdnHost}&host=${opts.cdnHost}` +
    `&type=xhttp&path=${pathEnc}&mode=packet-up&extra=${extraEnc}` +
    `#WG-Yandex-CDN`
  );
}
