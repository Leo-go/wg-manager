import { InputFile } from "grammy";

export const V2RAYNG_RELEASES_URL =
  "https://github.com/2dust/v2rayNG/releases/latest";

export const V2RAYN_RELEASES_URL =
  "https://github.com/2dust/v2rayN/releases/latest";

/** Happ — Proxy Utility (global App Store). */
export const HAPP_IOS_APPSTORE_URL =
  "https://apps.apple.com/app/happ-proxy-utility/id6504287215";

/** Happ+ listing often used with RU Apple ID. */
export const HAPP_IOS_APPSTORE_RU_URL =
  "https://apps.apple.com/ru/app/happ-proxy-utility/id6783623643";

export const HAPP_SITE_URL = "https://www.happ.su/main";

export function iosHappGuideText(): string {
  return [
    "🍎 iOS: клиент Happ",
    "",
    "1. Установите «Happ - Proxy Utility» из App Store.",
    "   Если не находится — откройте вариант для РФ (Happ+) по кнопке ниже.",
    "2. В боте: «Подключиться» → скопируйте ключ.",
    "3. В Happ: «+» → вставить из буфера → включить подключение.",
    "",
    "⚠️ Hiddify с нашим ключом (Yandex CDN) не используйте.",
  ].join("\n");
}

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

/** Reuse Telegram file_id after first successful upload (warm instance / env). */
let cachedApkFileId: string | null =
  process.env.TELEGRAM_V2RAYNG_FILE_ID?.trim() || null;

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

/** Latest official v2rayNG arm64 APK metadata from GitHub Releases. */
export async function fetchLatestV2rayNgApkMeta(): Promise<{
  url: string;
  name: string;
  tag: string;
  size: number;
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
    size: apk.size,
  };
}

/** Download APK bytes ourselves — Telegram often cannot fetch GitHub URLs. */
export async function downloadV2rayNgApk(): Promise<{
  file: InputFile;
  name: string;
  tag: string;
}> {
  const meta = await fetchLatestV2rayNgApkMeta();
  const res = await fetch(meta.url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "vpn-saas-mvp-bot",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`APK download: HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength < 1024) {
    throw new Error("Скачанный APK пустой или слишком маленький");
  }
  if (buffer.byteLength > BOT_DOCUMENT_MAX_BYTES) {
    throw new Error("APK слишком большой для отправки в Telegram");
  }

  return {
    file: new InputFile(buffer, meta.name),
    name: meta.name,
    tag: meta.tag,
  };
}

export function getCachedV2rayNgFileId(): string | null {
  return cachedApkFileId;
}

export function setCachedV2rayNgFileId(fileId: string): void {
  cachedApkFileId = fileId;
}

/** @deprecated use fetchLatestV2rayNgApkMeta */
export async function fetchLatestV2rayNgApk(): Promise<{
  url: string;
  name: string;
  tag: string;
}> {
  const meta = await fetchLatestV2rayNgApkMeta();
  return { url: meta.url, name: meta.name, tag: meta.tag };
}
