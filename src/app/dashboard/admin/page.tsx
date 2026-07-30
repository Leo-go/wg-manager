import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { isAdminEmail } from "@/lib/auth/admin";
import { AdminUsersPageClient } from "@/components/admin/admin-users-page-client";

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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, enable_yandex_cdn, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load profiles:", error.message);
  }

  return <AdminUsersPageClient initialProfiles={(data ?? []) as Profile[]} />;
}
