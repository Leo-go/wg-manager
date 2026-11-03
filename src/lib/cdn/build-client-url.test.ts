import { describe, expect, it } from "vitest";
import {
  buildYandexCdnVlessUrl,
  CDN_XHTTP_MAX_CONCURRENT_POSTS,
  CDN_XHTTP_MAX_POST_BYTES,
  CDN_XHTTP_MIN_POSTS_INTERVAL_MS,
  cdnVlessUrlNeedsXhttpRefresh,
  normalizeCdnClientHost,
  withCdnHttp1Alpn,
} from "@/lib/cdn/build-client-url";

describe("normalizeCdnClientHost", () => {
  it("adds www to apex domains", () => {
    expect(normalizeCdnClientHost("wg-manager.online")).toBe(
      "www.wg-manager.online"
    );
  });

  it("keeps existing www and subdomains", () => {
    expect(normalizeCdnClientHost("www.wg-manager.online")).toBe(
      "www.wg-manager.online"
    );
    expect(normalizeCdnClientHost("cdn.example.com")).toBe("cdn.example.com");
  });
});

describe("buildYandexCdnVlessUrl", () => {
  it("builds a vless URL with encoded path and CDN host", () => {
    const url = buildYandexCdnVlessUrl({
      uuid: "11111111-1111-1111-1111-111111111111",
      cdnHost: "cdn.example.com",
      path: "/api-test",
      paddingKey: "dc",
    });

    expect(
      url.startsWith(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?"
      )
    ).toBe(true);
    expect(url).toContain("security=tls");
    expect(url).toContain("sni=cdn.example.com");
    expect(url).toContain("host=cdn.example.com");
    expect(url).not.toContain("alpn=http%2F1.1");
    expect(url).toContain("fp=chrome");
    expect(url).toContain("type=xhttp");
    expect(url).toContain("path=%2Fapi-test");
    expect(url).toContain("mode=packet-up");
    expect(url).toContain(`scMaxEachPostBytes=${CDN_XHTTP_MAX_POST_BYTES}`);
    expect(url).toContain(
      `scMaxConcurrentPosts=${CDN_XHTTP_MAX_CONCURRENT_POSTS}`
    );
    expect(url).toContain(
      `scMinPostsIntervalMs=${CDN_XHTTP_MIN_POSTS_INTERVAL_MS}`
    );
    expect(url).toContain("extra=");
    expect(url.endsWith("#WG-Yandex-CDN")).toBe(true);

    const query = url.split("?")[1]?.split("#")[0] ?? "";
    const params = new URLSearchParams(query);
    const extraParam = params.get("extra");
    expect(extraParam).toBeTruthy();
    const extra = JSON.parse(decodeURIComponent(extraParam!)) as {
      uplinkHTTPMethod: string;
      uplinkDataPlacement: string;
      scMaxEachPostBytes: number;
      scMaxConcurrentPosts: number;
      scMinPostsIntervalMs: number;
      xPaddingObfsMode: boolean;
      xPaddingKey: string;
    };
    expect(extra.uplinkHTTPMethod).toBe("GET");
    expect(extra.uplinkDataPlacement).toBe("header");
    expect(extra.scMaxEachPostBytes).toBe(CDN_XHTTP_MAX_POST_BYTES);
    expect(extra.scMaxConcurrentPosts).toBe(CDN_XHTTP_MAX_CONCURRENT_POSTS);
    expect(extra.scMinPostsIntervalMs).toBe(CDN_XHTTP_MIN_POSTS_INTERVAL_MS);
    expect(extra.xPaddingObfsMode).toBe(true);
    expect(extra.xPaddingKey).toBe("dc");
    expect(cdnVlessUrlNeedsXhttpRefresh(url)).toBe(false);
  });

  it("builds HTTP/1.1 ALPN variant", () => {
    const url = buildYandexCdnVlessUrl({
      uuid: "11111111-1111-1111-1111-111111111111",
      cdnHost: "cdn.example.com",
      path: "/api-test",
      paddingKey: "dc",
      alpnHttp11: true,
    });
    expect(url).toContain("alpn=http%2F1.1");
    expect(url.endsWith("#WG-Yandex-CDN-H1")).toBe(true);
  });

  it("flags POST/OPTIONS body uplink and old post sizes", () => {
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&type=xhttp&extra=%7B%22scMaxEachPostBytes%22%3A1000000%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&alpn=http%2F1.1&fp=chrome&type=xhttp&scMaxEachPostBytes=8192&extra=%7B%22uplinkHTTPMethod%22%3A%22GET%22%2C%22uplinkDataPlacement%22%3A%22header%22%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&fp=chrome&type=xhttp&scMaxEachPostBytes=8192&extra=%7B%22uplinkHTTPMethod%22%3A%22POST%22%2C%22uplinkDataPlacement%22%3A%22header%22%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&fp=chrome&type=xhttp&scMaxEachPostBytes=8192&extra=%7B%22uplinkHTTPMethod%22%3A%22GET%22%2C%22uplinkDataPlacement%22%3A%22header%22%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
  });

  it("normalizes apex CDN host to www in the URL", () => {
    const url = buildYandexCdnVlessUrl({
      uuid: "11111111-1111-1111-1111-111111111111",
      cdnHost: "wg-manager.online",
      path: "/api-test",
      paddingKey: "dc",
    });
    expect(url).toContain("@www.wg-manager.online:443?");
    expect(url).toContain("sni=www.wg-manager.online");
    expect(url).toContain("host=www.wg-manager.online");
  });
});

describe("withCdnHttp1Alpn", () => {
  it("injects alpn and renames fragment", () => {
    const src =
      "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&fp=chrome&type=xhttp#WG-Yandex-CDN";
    const out = withCdnHttp1Alpn(src);
    expect(out).toContain("alpn=http%2F1.1&");
    expect(out.endsWith("#WG-Yandex-CDN-H1")).toBe(true);
    expect(out).not.toContain("alpn=http%2F1.1&alpn=");
  });

  it("replaces existing alpn", () => {
    const src =
      "vless://u@cdn.example.com:443?alpn=h2&security=tls#old";
    const out = withCdnHttp1Alpn(src);
    expect(out.startsWith("vless://u@cdn.example.com:443?alpn=http%2F1.1&")).toBe(
      true
    );
    expect(out).not.toContain("alpn=h2");
  });
});
