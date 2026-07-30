import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { loadAdminProfiles } from "@/lib/admin/load-profiles";
import { AdminUsersPageClient } from "@/components/admin/admin-users-page-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { profiles, error } = await loadAdminProfiles();

  if (error) {
    console.error("Failed to load admin profiles:", error);
  }

  return (
    <AdminUsersPageClient initialProfiles={profiles} loadError={error} />
  );
}
