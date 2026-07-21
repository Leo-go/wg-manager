"use client";

import { useI18n } from "@/lib/i18n/provider";

interface DiagnosticsPanelProps {
  output: string;
}

export function DiagnosticsPanel({ output }: DiagnosticsPanelProps) {
  const { t } = useI18n();
  if (!output) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t.setup.diagnosticsTitle}</p>
      <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted p-3 text-xs whitespace-pre-wrap break-words">
        {output}
      </pre>
    </div>
  );
}
