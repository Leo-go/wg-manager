import { createClient } from "@/lib/supabase/server";
import type { Server } from "@/lib/supabase/types";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { isAdminEmail } from "@/lib/auth/admin";
import { canUseYandexCdnForUser } from "@/lib/features/yandex-cdn-access";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasCdnAccess = user
    ? await canUseYandexCdnForUser(supabase, user.id)
    : false;
  const { data, error } = await supabase
    .from("servers")
    .select(
      "id, name, ip_address, ssh_port, ssh_username, status, installation_status, created_at, role, exit_server_id, relay_vless_config_url, cdn_status"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load servers:", error.message);
    return (
      <DashboardPageClient
        initialServers={[]}
        isAdmin={isAdminEmail(user?.email)}
        hasCdnAccess={hasCdnAccess}
      />
    );
  }

  return (
    <DashboardPageClient
      initialServers={(data ?? []) as Server[]}
      isAdmin={isAdminEmail(user?.email)}
      hasCdnAccess={hasCdnAccess}
    />
  );
}
