import Link from "next/link";
import { cookies } from "next/headers";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getTermsEn, getTermsRu } from "@/lib/legal/terms";
import { getSupportEmail } from "@/lib/legal/types";
import { isLocale } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "@/lib/i18n/types";

export default async function TermsPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const email = getSupportEmail();
  const doc = locale === "en" ? getTermsEn(email) : getTermsRu(email);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-8">
        <Link href="/" className="text-sm font-semibold hover:underline">
          VLESS Manager
        </Link>
        <LanguageSwitcher compact />
      </div>
      <LegalDocumentView doc={doc} />
    </main>
  );
}
