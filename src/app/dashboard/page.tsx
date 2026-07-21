import { createClient } from "@/lib/supabase/server";
import type { Server } from "@/lib/supabase/types";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servers")
    .select(
      "id, user_id, name, ip_address, ssh_port, status, installation_status, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load servers:", error.message);
    return <DashboardPageClient initialServers={[]} />;
  }

  return (
    <DashboardPageClient initialServers={(data ?? []) as Server[]} />
  );
}
