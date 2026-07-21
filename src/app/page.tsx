"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{L.whatTitle}</h2>
          <p className="text-muted-foreground">{L.whatLead}</p>
          <ul className="space-y-4">
            {L.whatItems.map((item) => (
              <li key={item.title} className="space-y-1 border-l-2 border-border pl-4">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{L.howTitle}</h2>
          <ol className="space-y-4">
            {L.howSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">{L.osTitle}</h2>
          <p className="text-muted-foreground">{L.osLead}</p>

          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-400">
              {L.osRecommendedTitle}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {L.osRecommended.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{L.osOkTitle}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {L.osOk.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-amber-400">{L.osAvoidTitle}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {L.osAvoid.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {L.osTip}
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          {L.disclaimer}
        </footer>
      </div>
    </main>
  );
}
