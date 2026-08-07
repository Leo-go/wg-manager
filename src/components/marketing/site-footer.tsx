"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export function SiteFooter({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <footer
      className={
        className ??
        "border-t border-border pt-6 text-xs text-muted-foreground"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{t.landing.disclaimer}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/terms" className="hover:underline">
            {t.common.terms}
          </Link>
          <Link href="/privacy" className="hover:underline">
            {t.common.privacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
