import type { LegalDocument } from "@/lib/legal/types";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">
          Updated: {doc.updatedAt}
        </p>
      </header>

      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {doc.intro.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>

      {doc.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
