"use client";

import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/provider";

type AdminUsersPageClientProps = {
  initialProfiles: Profile[];
  loadError?: string | null;
};

export function AdminUsersPageClient({
  initialProfiles,
  loadError = null,
}: AdminUsersPageClientProps) {
  const { t } = useI18n();
  const a = t.admin;
  const [profiles, setProfiles] = useState(initialProfiles);
  const [savingId, setSavingId] = useState<string | null>(null);

  const toggleAccess = async (profile: Profile) => {
    setSavingId(profile.id);
    try {
      const nextEnabled = !(profile.enable_yandex_cdn === true);
      const response = await fetch(`/api/admin/profiles/${profile.id}/cdn-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || a.failed);
      }

      setProfiles((prev) =>
        prev.map((item) =>
          item.id === profile.id
            ? { ...item, enable_yandex_cdn: nextEnabled }
            : item
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : a.failed;
      window.alert(`${a.failed}: ${message}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{a.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{a.subtitle}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">{a.back}</Link>
        </Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">{a.loadErrorTitle}</p>
          <p className="mt-1 break-words opacity-90">{loadError}</p>
          <p className="mt-2 text-muted-foreground">{a.loadErrorHint}</p>
        </div>
      )}

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{a.empty}</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{a.email}</TableHead>
                <TableHead>{a.access}</TableHead>
                <TableHead className="text-right">{t.dashboard.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const enabled = profile.enable_yandex_cdn === true;
                const saving = savingId === profile.id;
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email}</TableCell>
                    <TableCell>
                      <span
                        className={
                          enabled
                            ? "rounded-full bg-green-500/15 px-2 py-1 text-xs text-green-400"
                            : "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                        }
                      >
                        {enabled ? a.enabled : a.disabled}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={enabled ? "outline" : "default"}
                        size="sm"
                        disabled={saving}
                        onClick={() => void toggleAccess(profile)}
                      >
                        {saving ? a.loading : enabled ? a.disable : a.enable}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
