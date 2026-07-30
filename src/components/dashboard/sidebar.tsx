"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Info, LogOut, Server, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useI18n } from "@/lib/i18n/provider";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" || pathname.startsWith("/dashboard/servers")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  userEmail,
  isAdmin,
  onNavigate,
  mobileHeaderAction,
}: {
  userEmail: string | null;
  isAdmin: boolean;
  onNavigate?: () => void;
  mobileHeaderAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const navItems = [
    { href: "/dashboard", label: t.nav.servers, icon: Server },
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: t.nav.admin, icon: Shield }]
      : []),
    { href: "/dashboard/info", label: t.nav.info, icon: Info },
    { href: "/dashboard/about", label: t.nav.about, icon: FileText },
  ];

  return (
    <aside className="flex h-full min-h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4 sm:px-6">
        <span className="text-lg font-semibold">{t.common.brand}</span>
        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          {mobileHeaderAction}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isNavActive(pathname, href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        {userEmail && (
          <p className="mb-3 truncate px-1 text-xs text-muted-foreground">
            {userEmail}
          </p>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            void (async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              onNavigate?.();
              router.push("/login");
            })();
          }}
        >
          <LogOut className="h-4 w-4" />
          {t.nav.logOut}
        </Button>
      </div>
    </aside>
  );
}
