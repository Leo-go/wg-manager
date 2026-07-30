import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";

export const runtime = "nodejs";

const paramsSchema = z.string().uuid();
const bodySchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = paramsSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Service role not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: authUser, error: getUserError } =
    await admin.auth.admin.getUserById(parsedId.data);
  if (getUserError || !authUser.user) {
    return NextResponse.json(
      { error: getUserError?.message || "User not found" },
      { status: 404 }
    );
  }

  const email = authUser.user.email ?? "";
  const { error } = await admin.from("profiles").upsert(
    {
      id: parsedId.data,
      email,
      enable_yandex_cdn: parsedBody.data.enabled,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
