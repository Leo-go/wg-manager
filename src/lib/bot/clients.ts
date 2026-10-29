import { InputFile } from "grammy";

export const V2RAYNG_RELEASES_URL =
  "https://github.com/2dust/v2rayNG/releases/latest";

export const V2RAYN_RELEASES_URL =
  "https://github.com/2dust/v2rayN/releases/latest";

/** INCY — primary client (Play / App Store / desktop). */
export const INCY_IOS_APPSTORE_URL =
  "https://apps.apple.com/ru/app/incy/id6756943388";

export const INCY_ANDROID_PLAY_URL =
  "https://play.google.com/store/apps/details?id=llc.itdev.incy";

/** Official sideload if Play is unavailable. */
export const INCY_ANDROID_APK_URL =
  "https://github.com/INCY-DEV/incy-platforms/releases/download/latest/Incy.apk";

export const INCY_DESKTOP_WINDOWS_URL =
  "https://github.com/INCY-DEV/incy-platforms/releases/download/latest/incy-windows-setup.exe";

export const INCY_DESKTOP_RELEASES_URL =
  "https://github.com/INCY-DEV/incy-platforms/releases/latest";

/** Happ — iOS optional (non-RU Apple ID); desktop is a solid PC option. */
export const HAPP_IOS_APPSTORE_URL =
  "https://apps.apple.com/app/happ-proxy-utility/id6504287215";

export const HAPP_SITE_URL = "https://www.happ.su/main";

export const HAPP_DESKTOP_RELEASES_URL =
  "https://github.com/Happ-proxy/happ-desktop/releases/latest";

export function iosGuideText(): string {
  return [
    "🍎 iPhone / iPad",
    "",
    "Основной клиент — INCY (есть в российском App Store):",
    "1. Установите INCY по кнопке ниже.",
    "2. В боте: «Подключиться» → сначала ключ «Дом», если не встаёт — «Мобильный».",
    "3. В клиенте: импорт из буфера. Сначала ключ «Дом», если не встаёт — «Мобильный».",
    "",
    "Запасной вариант: Happ (часто недоступен в РФ App Store) — нужен зарубежный Apple ID или TestFlight с happ.su.",
    "",
    "Hiddify можно только для ключа «Дом» (Reality). Ключ «Мобильный» (CDN) — INCY / Happ, не Hiddify.",
  ].join("\n");
}

export function androidGuideText(): string {
  return [
    "📱 Android",
    "",
    "Основной клиент — INCY (есть в Google Play):",
    "1. Установите INCY по кнопке ниже (издатель LLC ITDEV).",
    "2. В боте: «Подключиться» → скопируйте ключ «Дом», если не встаёт — «Мобильный».",
    "3. В INCY: вставить из буфера → разрешить VPN → Connect.",
    "",
    "Нет Google Play — APK с официального GitHub (кнопка ниже) или запасной v2rayNG.",
    "",
    "Hiddify можно только для ключа «Дом». Мобильный CDN — INCY / Happ / v2rayNG.",
  ].join("\n");
}

export function desktopGuideText(): string {
  return [
    "💻 Windows / Mac / Linux",
    "",
    "Рекомендуем INCY или Happ (оба умеют наш дом и мобильный ключ):",
    "1. Скачайте установщик по кнопке ниже.",
    "2. В боте: «Подключиться» → скопируйте ключ.",
    "3. Импорт из буфера → Connect. Wi‑Fi → 🏠 дом, сотовая → 📱 мобильный.",
    "",
    "INCY desktop ещё pre-alpha — если глючит, возьмите Happ.",
    "Запасной: v2rayN (Windows).",
  ].join("\n");
}

/** @deprecated use iosGuideText */
export function iosHappGuideText(): string {
  return iosGuideText();
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
