export function isRuRelayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_RU_RELAY === "true";
}

/** Yandex Cloud CDN path: Client → Yandex CDN → Origin → Exit */
export function isYandexCdnEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_YANDEX_CDN === "true";
}
