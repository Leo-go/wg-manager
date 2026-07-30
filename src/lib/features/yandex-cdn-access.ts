import type { SupabaseClient } from "@supabase/supabase-js";

export async function canUseYandexCdnForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("enable_yandex_cdn")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return data.enable_yandex_cdn === true;
}
