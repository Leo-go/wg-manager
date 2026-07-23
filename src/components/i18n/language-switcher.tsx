"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  const options: { id: Locale; label: string }[] = [
    { id: "ru", label: compact ? "RU" : t.common.russian },
    { id: "en", label: compact ? "EN" : t.common.english },
  ];

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label={t.common.language}
    >
      {options.map((opt) => (
        <Button
          key={opt.id}
          type="button"
          size="sm"
          variant={locale === opt.id ? "default" : "ghost"}
          className="h-8 px-2.5 text-xs"
          onClick={() => setLocale(opt.id)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
