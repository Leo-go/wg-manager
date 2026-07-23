"use client";

import { useI18n } from "@/lib/i18n/provider";

export function AboutContent() {
  const { t } = useI18n();
  const a = t.about;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{a.missionTitle}</h2>
        <p className="text-muted-foreground">{a.missionBody}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{a.notTitle}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {a.notItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{a.principlesTitle}</h2>
        <ul className="space-y-3">
          {a.principles.map((p) => (
            <li key={p.title} className="border-l-2 border-border pl-4">
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <h2 className="text-lg font-semibold">{a.disclaimerTitle}</h2>
        <p className="text-sm text-muted-foreground">{a.disclaimerBody}</p>
      </section>
    </div>
  );
}
