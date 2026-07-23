"use client";

import { useI18n } from "@/lib/i18n/provider";

export function ProductInfoContent() {
  const { t } = useI18n();
  const L = t.landing;

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{L.whatTitle}</h2>
        <p className="text-muted-foreground">{L.whatLead}</p>
        <ul className="space-y-4">
          {L.whatItems.map((item) => (
            <li
              key={item.title}
              className="space-y-1 border-l-2 border-border pl-4"
            >
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

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{L.relayTitle}</h2>
        <p className="text-muted-foreground">{L.relayBody}</p>
      </section>

      <section className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <h2 className="text-lg font-semibold">{L.whitelistTitle}</h2>
        <p className="text-sm text-muted-foreground">{L.whitelistBody}</p>
        <a
          className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          href="https://github.com/hxehex/russia-mobile-internet-whitelist.git"
          target="_blank"
          rel="noreferrer noopener"
        >
          {L.whitelistLinkLabel}
        </a>
      </section>

      <p className="border-t border-border pt-6 text-xs text-muted-foreground">
        {L.disclaimer}
      </p>
    </div>
  );
}
