import type { Profile } from "@/lib/supabase/types";
import { createServiceClient } from "@/lib/supabase/admin";

export type LoadProfilesResult =
  | { profiles: Profile[]; error: null }
  | { profiles: Profile[]; error: string };

export async function loadAdminProfiles(): Promise<LoadProfilesResult> {
  let admin;
  try {
    admin = createServiceClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create service client";
    return { profiles: [], error: message };
  }

  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return {
      profiles: [],
      error: `auth.admin.listUsers: ${authError.message}`,
    };
  }

  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("id, email, enable_yandex_cdn, created_at, updated_at");

  if (profileError) {
    // Column may be missing in prod if CDN migration was not applied.
    const fallback = await admin
      .from("profiles")
      .select("id, email, created_at, updated_at");

    if (fallback.error) {
      return {
        profiles: [],
        error: `profiles: ${profileError.message}`,
      };
    }

    const byId = new Map(
      (fallback.data ?? []).map((row) => [row.id as string, row])
    );

    const profiles: Profile[] = (authData.users ?? []).map((user) => {
      const row = byId.get(user.id);
      return {
        id: user.id,
        email: user.email ?? row?.email ?? "",
        enable_yandex_cdn: null,
        created_at: row?.created_at ?? user.created_at,
        updated_at: row?.updated_at ?? user.updated_at ?? user.created_at,
      };
    });

    return {
      profiles,
      error: `profiles.enable_yandex_cdn missing — run CDN profile SQL migration. Showing users without CDN flags. (${profileError.message})`,
    };
  }

  const byId = new Map(
    (profileRows ?? []).map((row) => [row.id as string, row as Profile])
  );

  const profiles: Profile[] = (authData.users ?? [])
    .map((user) => {
      const row = byId.get(user.id);
      return {
        id: user.id,
        email: user.email ?? row?.email ?? "",
        enable_yandex_cdn: row?.enable_yandex_cdn ?? null,
        created_at: row?.created_at ?? user.created_at,
        updated_at: row?.updated_at ?? user.updated_at ?? user.created_at,
      } satisfies Profile;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  return { profiles, error: null };
}
