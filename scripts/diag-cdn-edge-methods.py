#!/usr/bin/env python3
"""Probe Yandex CDN edge vs xHTTP GET-header/cookie uplink.

Run FROM the failing ISP. Does not print VLESS keys.
Matrix from Xray v26.7.28 splithttp: bodiless GET + X-Data / Cookie.
"""
from __future__ import annotations

import ssl
import sys
from http.client import HTTPSConnection

HOST = sys.argv[1] if len(sys.argv) > 1 else "www.wg-manager.online"


def request(
    method: str,
    path: str,
    *,
    body: bytes | None,
    extra_headers: dict[str, str] | None = None,
    content_length: int | None = None,
    send_content_length: bool = True,
) -> str:
    ctx = ssl.create_default_context()
    conn = HTTPSConnection(HOST, 443, context=ctx, timeout=15)
    headers = {
        "Host": HOST,
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
    }
    if extra_headers:
        headers.update(extra_headers)
    payload = body if body is not None else b""
    if send_content_length:
        if content_length is not None:
            headers["Content-Length"] = str(content_length)
        elif body is not None:
            headers["Content-Length"] = str(len(payload))
    try:
        conn.request(
            method,
            path,
            body=payload if body is not None else None,
            headers=headers,
        )
        resp = conn.getresponse()
        interesting: list[str] = []
        for key, value in resp.getheaders():
            low = key.lower()
            if (
                low
                in {
                    "server",
                    "content-type",
                    "content-length",
                    "x-cdn-origin",
                    "x-origin-method",
                    "x-origin-content-length",
                    "via",
                    "x-cache",
                }
                or "cdn" in low
                or "yandex" in low
            ):
                interesting.append(f"{key}={value}")
        snippet = resp.read(40)
        return (
            f"{resp.status} {resp.reason} | {' ; '.join(interesting[:6])}"
            f" | body={snippet[:32]!r}"
        )
    except Exception as exc:  # noqa: BLE001 — diagnostic CLI
        return f"ERR {type(exc).__name__}: {exc}"
    finally:
        conn.close()


def main() -> None:
    print(f"host={HOST}  (http.client HTTPS, typically h2/h1 negotiated)")
    cases: list[tuple[str, str, str, dict[str, object]]] = []

    for path in ("/cdn-check",):
        for method in ("GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"):
            body: bytes | None = b"" if method in {"POST", "PUT", "PATCH"} else None
            cases.append(
                (
                    f"A {method:7} {path} no-entity",
                    method,
                    path,
                    {"body": body},
                )
            )

        cases.extend(
            [
                ("B GET 1B body CL=1", "GET", path, {"body": b"A"}),
                ("B OPTIONS 1B CL=1", "OPTIONS", path, {"body": b"A"}),
                ("B GET no-body CL=0", "GET", path, {"body": None, "content_length": 0}),
                ("B POST empty CL=0", "POST", path, {"body": b"", "content_length": 0}),
                ("B POST 1B", "POST", path, {"body": b"A"}),
            ]
        )

        for n in (100, 1000, 4000, 8000, 16000):
            referer = (
                f"https://{HOST}/api-test?x_padding=" + ("X" * n)
            )
            cases.append(
                (
                    f"C Referer {n}X",
                    "GET",
                    path,
                    {"body": None, "extra_headers": {"Referer": referer}},
                )
            )
        for n in (64, 512, 2048, 4096, 8000):
            cases.append(
                (
                    f"C X-Data-0 {n}B",
                    "GET",
                    path,
                    {"body": None, "extra_headers": {"X-Data-0": "A" * n}},
                )
            )
            cases.append(
                (
                    f"C Cookie x_data_0 {n}B",
                    "GET",
                    path,
                    {"body": None, "extra_headers": {"Cookie": f"x_data_0={'A' * n}"}},
                )
            )
        cases.append(
            (
                "C X-Data-0..7 x512",
                "GET",
                path,
                {
                    "body": None,
                    "extra_headers": {f"X-Data-{i}": "A" * 512 for i in range(8)},
                },
            )
        )

    cases.append(
        (
            "D GET /api-test/00000000-0000-4000-8000-000000000001/0",
            "GET",
            "/api-test/00000000-0000-4000-8000-000000000001/0",
            {"body": None},
        )
    )

    for title, method, path, kwargs in cases:
        result = request(method, path, **kwargs)  # type: ignore[arg-type]
        print(f"{title:48} -> {result}")


if __name__ == "__main__":
    main()
