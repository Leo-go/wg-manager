export const V2RAYNG_RELEASES_URL =
  "https://github.com/2dust/v2rayNG/releases/latest";

export const V2RAYN_RELEASES_URL =
  "https://github.com/2dust/v2rayN/releases/latest";

type GithubAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type GithubRelease = {
  tag_name?: string;
  assets: GithubAsset[];
};

const BOT_DOCUMENT_MAX_BYTES = 49 * 1024 * 1024;

function pickAndroidApk(assets: GithubAsset[]): GithubAsset | null {
  const candidates = assets.filter(
    (a) =>
      a.name.endsWith(".apk") &&
      !a.name.endsWith(".apk.sig") &&
      !a.name.includes("fdroid")
  );

  return (
    candidates.find((a) => a.name.includes("arm64-v8a")) ??
    candidates.find((a) => a.name.includes("universal")) ??
    candidates[0] ??
    null
  );
}

/** Latest official v2rayNG arm64 APK from GitHub Releases. */
export async function fetchLatestV2rayNgApk(): Promise<{
  url: string;
  name: string;
  tag: string;
}> {
  const res = await fetch(
    "https://api.github.com/repos/2dust/v2rayNG/releases/latest",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "vpn-saas-mvp-bot",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub releases: HTTP ${res.status}`);
  }

  const data = (await res.json()) as GithubRelease;
  const apk = pickAndroidApk(data.assets ?? []);
  if (!apk) {
    throw new Error("В релизе нет APK");
  }
  if (apk.size > BOT_DOCUMENT_MAX_BYTES) {
    throw new Error("APK слишком большой для отправки в Telegram");
  }

  return {
    url: apk.browser_download_url,
    name: apk.name,
    tag: data.tag_name ?? "latest",
  };
}
