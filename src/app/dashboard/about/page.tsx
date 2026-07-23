"use client";

import { AboutContent } from "@/components/marketing/about-content";
import { useI18n } from "@/lib/i18n/provider";

export default function DashboardAboutPage() {
  const { t } = useI18n();

  return (
    <div className="p-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        {t.about.pageTitle}
      </h1>
      <AboutContent />
    </div>
  );
}
