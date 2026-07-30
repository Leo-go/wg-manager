import { createClient } from "@/lib/supabase/server";
import { canUseYandexCdnForUser } from "@/lib/features/yandex-cdn-access";
import { InfoPageContent } from "@/components/dashboard/info-page-content";

export default async function DashboardInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasCdnAccess = user
    ? await canUseYandexCdnForUser(supabase, user.id)
    : false;

  return (
    <div className="p-8">
      <InfoPageContent hasCdnAccess={hasCdnAccess} />
    </div>
  );
}
