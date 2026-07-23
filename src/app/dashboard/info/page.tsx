"use client";

import { ProductInfoContent } from "@/components/marketing/product-info-content";
import { useI18n } from "@/lib/i18n/provider";

export default function DashboardInfoPage() {
  const { t } = useI18n();

  return (
    <div className="p-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t.nav.info}</h1>
      <ProductInfoContent />
    </div>
  );
}
