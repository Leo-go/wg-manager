import { cookies, headers } from "next/headers";
import {
  detectLocaleFromAcceptLanguage,
  getDictionary,
  isLocale,
} from "@/lib/i18n/index";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return detectLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function getRequestDictionary() {
  const locale = await getRequestLocale();
  return { locale, dictionary: getDictionary(locale) };
}

export { DEFAULT_LOCALE, LOCALE_COOKIE };
