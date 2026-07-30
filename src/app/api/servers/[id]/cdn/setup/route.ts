import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isYandexCdnEnabled } from "@/lib/constants/features";
import { randomUUID } from "crypto";
import { canUseYandexCdnForUser } from "@/lib/features/yandex-cdn-access";

export const runtime = "nodejs";

const serverIdSchema = z.string().uuid();

const bodySchema = z.object({
  cdn_domain: z.string().trim().min(3).max(255),
  cdn_origin_domain: z.string().trim().min(3).max(255),
  cdn_relay_domain: z.string().trim().min(3).max(255),
  cdn_email: z.string().trim().email(),
  cdn_path: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .refine((v) => v.startsWith("/"), "cdn_path must start with '/'")
    .default("/api-test"),
  cdn_padding_key: z.string().trim().min(1).max(64).default("dc"),
  cdn_origin_ip: z.string().trim().min(1).max(255),
  cdn_origin_ssh_port: z.coerce.number().int().min(1).max(65535).default(22),
  cdn_origin_ssh_username: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .default("root"),
  cdn_origin_ssh_password: z.string().min(1),
  cdn_uuid: z.string().uuid().optional(),
});

/**
 * Save Yandex CDN path settings on the exit server (pending install).
 * POST /api/servers/[exitId]/cdn/setup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isYandexCdnEnabled()) {
    return NextResponse.json(
      { error: "Yandex CDN feature is disabled" },
      { status: 404 }
    );
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canUseYandexCdnForUser(supabase, user.id))) {
      return NextResponse.json(
        { error: "Yandex CDN is not enabled for this account" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const idResult = serverIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Invalid server id" }, { status: 400 });
    }
    const exitId = idResult.data;

    const json = await request.json().catch(() => null);
    const bodyResult = bodySchema.safeParse(json);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          error: bodyResult.error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400 }
      );
    }
    const body = bodyResult.data;

    const { data: exitRow, error: fetchError } = await supabase
      .from("servers")
      .select("id, installation_status, role")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !exitRow) {
      return NextResponse.json({ error: "Exit server not found" }, { status: 404 });
    }
    if (exitRow.role === "relay") {
      return NextResponse.json(
        { error: "CDN path is configured on the exit server, not on a relay" },
        { status: 400 }
      );
    }
    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        { error: "Finish exit VPN setup before enabling Yandex CDN" },
        { status: 400 }
      );
    }

    const uuid = body.cdn_uuid ?? randomUUID();
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("servers")
      .update({
        cdn_status: "pending",
        cdn_domain: body.cdn_domain,
        cdn_origin_domain: body.cdn_origin_domain,
        cdn_relay_domain: body.cdn_relay_domain,
        cdn_email: body.cdn_email,
        cdn_path: body.cdn_path,
        cdn_padding_key: body.cdn_padding_key,
        cdn_uuid: uuid,
        cdn_origin_ip: body.cdn_origin_ip,
        cdn_origin_ssh_port: body.cdn_origin_ssh_port,
        cdn_origin_ssh_username: body.cdn_origin_ssh_username,
        cdn_origin_ssh_password: body.cdn_origin_ssh_password,
        cdn_exit_listen_port: 11443,
        cdn_vless_config_url: null,
        updated_at: now,
      })
      .eq("id", exitId)
      .eq("user_id", user.id);

    if (updateError) {
      const msg = updateError.message;
      const missing =
        /cdn_/i.test(msg) || /Could not find the 'cdn_/i.test(msg);
      return NextResponse.json(
        {
          error: missing
            ? "Database is missing CDN columns. Run scripts/cdn-columns.sql in Supabase, then retry."
            : msg,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cdnUuid: uuid,
      message: "CDN settings saved. Run install next.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save CDN settings";
    console.error("[cdn/setup]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
