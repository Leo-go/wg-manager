export function isRuRelayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_RU_RELAY === "true";
}
