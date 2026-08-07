import { describe, expect, it } from "vitest";
import { buildYandexCdnVlessUrl } from "@/lib/cdn/build-client-url";

describe("buildYandexCdnVlessUrl", () => {
  it("builds a vless URL with encoded path and CDN host", () => {
    const url = buildYandexCdnVlessUrl({
      uuid: "11111111-1111-1111-1111-111111111111",
      cdnHost: "cdn.example.com",
      path: "/api-test",
      paddingKey: "dc",
    });

    expect(url.startsWith("vless://11111111-1111-1111-1111-111111111111@cdn.example.com:443?")).toBe(
      true
    );
    expect(url).toContain("security=tls");
    expect(url).toContain("sni=cdn.example.com");
    expect(url).toContain("host=cdn.example.com");
    expect(url).toContain("type=xhttp");
    expect(url).toContain("path=%2Fapi-test");
    expect(url).toContain("mode=packet-up");
    expect(url).toContain("extra=");
    expect(url.endsWith("#WG-Yandex-CDN")).toBe(true);

    const query = url.split("?")[1]?.split("#")[0] ?? "";
    const params = new URLSearchParams(query);
    const extraParam = params.get("extra");
    expect(extraParam).toBeTruthy();
    const extra = JSON.parse(decodeURIComponent(extraParam!)) as {
      xPaddingKey: string;
      uplinkHTTPMethod: string;
    };
    expect(extra.xPaddingKey).toBe("dc");
    expect(extra.uplinkHTTPMethod).toBe("OPTIONS");
  });
});
