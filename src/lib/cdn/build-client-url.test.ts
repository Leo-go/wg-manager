import { describe, expect, it } from "vitest";
import {
  buildYandexCdnVlessUrl,
  CDN_XHTTP_MAX_POST_BYTES,
  cdnVlessUrlNeedsXhttpRefresh,
  normalizeCdnClientHost,
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
    expect(url).toContain("extra=");
    expect(url.endsWith("#WG-Yandex-CDN")).toBe(true);

    const query = url.split("?")[1]?.split("#")[0] ?? "";
    const params = new URLSearchParams(query);
    const extraParam = params.get("extra");
    expect(extraParam).toBeTruthy();
    const extra = JSON.parse(decodeURIComponent(extraParam!)) as {
      xPaddingKey: string;
      uplinkHTTPMethod: string;
      scMaxEachPostBytes: number;
    };
    expect(extra.xPaddingKey).toBe("dc");
    expect(extra.uplinkHTTPMethod).toBe("OPTIONS");
    expect(extra.scMaxEachPostBytes).toBe(CDN_XHTTP_MAX_POST_BYTES);
    expect(cdnVlessUrlNeedsXhttpRefresh(url)).toBe(false);
  });

  it("flags HTTP/1.1 ALPN and Happ 1MB post default", () => {
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&type=xhttp&extra=%7B%22scMaxEachPostBytes%22%3A1000000%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&alpn=http%2F1.1&fp=chrome&type=xhttp&extra=%7B%22scMaxEachPostBytes%22%3A262144%7D#WG-Yandex-CDN"
      )
    ).toBe(true);
    expect(
      cdnVlessUrlNeedsXhttpRefresh(
        "vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?encryption=none&security=tls&fp=chrome&type=xhttp&scMaxEachPostBytes=262144&extra=%7B%22scMaxEachPostBytes%22%3A262144%7D#WG-Yandex-CDN"
      )
    ).toBe(false);
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
