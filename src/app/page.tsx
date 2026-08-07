"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ProductInfoContent } from "@/components/marketing/product-info-content";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export default function HomePage() {
  const { t } = useI18n();
  const L = t.landing;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-16 px-4 py-10 sm:py-16">
        <header className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold tracking-tight">
            {t.common.brand}
          </span>
          <LanguageSwitcher compact />
        </header>

        <section className="space-y-6 text-center sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {L.headline}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{L.tagline}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Button asChild size="lg">
              <Link href="/login">{L.cta}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{L.signIn}</Link>
            </Button>
          </div>
        </section>

        <ProductInfoContent />

        <SiteFooter />
      </div>
    </main>
  );
}
