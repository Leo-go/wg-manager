"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

const REF_KEY = "wg_ref";

function isTelegramRef(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "telegram";
}

/** Banner for visitors who arrived from the Telegram bot (?ref=telegram). */
export function TelegramRefBanner() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("ref");
    if (isTelegramRef(fromQuery)) {
      try {
        sessionStorage.setItem(REF_KEY, "telegram");
      } catch {
        // ignore private mode / blocked storage
      }
      setShow(true);
      return;
    }
    try {
      setShow(isTelegramRef(sessionStorage.getItem(REF_KEY)));
    } catch {
      setShow(false);
    }
  }, [searchParams]);

  if (!show) return null;

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  const botHref = botUsername
    ? `https://t.me/${botUsername.replace(/^@/, "")}`
    : null;

  return (
    <div
      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-foreground"
      role="status"
    >
      <p className="font-medium">{t.funnel.telegramTitle}</p>
      <p className="mt-1 text-muted-foreground">{t.funnel.telegramBody}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {botHref ? (
          <Link
            href={botHref}
            className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.funnel.backToBot}
          </Link>
        ) : null}
        <Link
          href="/login?ref=telegram"
          className="font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
        >
          {t.funnel.createOwnVpn}
        </Link>
      </div>
    </div>
  );
}
