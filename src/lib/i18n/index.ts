import { ru } from "@/lib/i18n/dictionaries/ru";
import { en } from "@/lib/i18n/dictionaries/en";
import {
  DEFAULT_LOCALE,
  type Dictionary,
  type Locale,
  LOCALES,
} from "@/lib/i18n/types";

export const dictionaries: Record<Locale, Dictionary> = { ru, en };

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Prefer Russian when Accept-Language / browser language lists ru. */
export function detectLocaleFromAcceptLanguage(
  header: string | null | undefined
): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    if (tag.startsWith("ru")) return "ru";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

export function detectLocaleFromNavigator(
  language: string | undefined,
  languages?: readonly string[]
): Locale {
  const list = [
    language,
    ...(languages ? Array.from(languages) : []),
  ].filter(Boolean) as string[];
  for (const lang of list) {
    const lower = lang.toLowerCase();
    if (lower.startsWith("ru")) return "ru";
    if (lower.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}
