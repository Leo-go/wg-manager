import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listServerOffers } from "@/lib/timeweb";

export const runtime = "nodejs";

/**
 * GET /api/vps/offers?location=nl-1
 * Returns Timeweb presets + prices (or MOCK offers without token).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const location =
    request.nextUrl.searchParams.get("location")?.trim() || "nl-1";

  try {
    const { mock, offers } = await listServerOffers(location);
    return NextResponse.json({
      location,
      mock,
      offers,
      billing:
        "Cloud VPS is typically hourly. Use ~day estimate (month÷30) for planning; delete the server after a test to avoid ongoing charges.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load offers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
