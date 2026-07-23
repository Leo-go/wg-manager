import { createClient } from "@/lib/supabase/server";
import type { Server } from "@/lib/supabase/types";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("servers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load servers:", error.message);
    return <DashboardPageClient initialServers={[]} />;
  }

  return (
    <DashboardPageClient initialServers={(data ?? []) as Server[]} />
  );
}
