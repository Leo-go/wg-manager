import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const serverIdSchema = z.string().uuid("serverId must be a valid UUID");

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  ip_address: z.string().trim().min(1).max(255),
  ssh_port: z.coerce.number().int().min(1).max(65535).default(22),
  ssh_username: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid SSH username")
    .default("root"),
  ssh_password: z.string().optional(),
  auth_mode: z.enum(["ssh_key", "password"]).default("ssh_key"),
  relay_sni: z.string().trim().min(1).max(255).default("www.gosuslugi.ru"),
});

/**
 * Register RU relay row (pending). Install happens on relay setup page.
 * POST /api/servers/[exitId]/relay/setup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const idResult = serverIdSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: idResult.error.issues[0]?.message ?? "Invalid server id" },
        { status: 400 }
      );
    }
    const exitId = idResult.data;

    const json = await request.json().catch(() => null);
    const bodyResult = bodySchema.safeParse(json);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          error:
            bodyResult.error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400 }
      );
    }
    const body = bodyResult.data;

    if (body.auth_mode === "password" && !body.ssh_password?.trim()) {
      return NextResponse.json(
        { error: "ssh_password is required when auth_mode=password" },
        { status: 400 }
      );
    }

    const { data: exitRow, error: fetchError } = await supabase
      .from("servers")
      .select("id, installation_status, role")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to load exit server", details: fetchError.message },
        { status: 500 }
      );
    }
    if (!exitRow) {
      return NextResponse.json({ error: "Exit server not found" }, { status: 404 });
    }
    if (exitRow.role === "relay") {
      return NextResponse.json(
        { error: "Cannot attach a relay to another relay" },
        { status: 400 }
      );
    }
    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        { error: "Finish exit VPN setup before adding a RU relay" },
        { status: 400 }
      );
    }

    const { data: existingRelays } = await supabase
      .from("servers")
      .select("id")
      .eq("user_id", user.id)
      .eq("exit_server_id", exitId)
      .eq("role", "relay")
      .order("created_at", { ascending: false })
      .limit(1);

    const existingRelayId = existingRelays?.[0]?.id as string | undefined;
    const rowPayload = {
      name: body.name,
      ip_address: body.ip_address,
      ssh_port: body.ssh_port,
      ssh_username: body.ssh_username || "root",
      ssh_password:
        body.auth_mode === "password" ? body.ssh_password?.trim() : null,
      sni_domain: body.relay_sni,
      vless_port: 443,
      role: "relay" as const,
      exit_server_id: exitId,
      installation_status: "pending" as const,
      status: "inactive" as const,
      updated_at: new Date().toISOString(),
    };

    if (existingRelayId) {
      const { data: updated, error: updateError } = await supabase
        .from("servers")
        .update(rowPayload)
        .eq("id", existingRelayId)
        .select("id")
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          { error: updateError?.message ?? "Failed to update relay server row" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        relayServerId: updated.id,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("servers")
      .insert({ ...rowPayload, user_id: user.id })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[relay/setup] insert failed:", insertError?.message);
      const msg = insertError?.message ?? "Failed to create relay server row";
      const missingRelayCols =
        /Could not find the '(role|exit_server_id|relay_[^']+)' column/i.test(
          msg
        ) || /column servers\.(role|exit_server_id)/i.test(msg);
      return NextResponse.json(
        {
          error: missingRelayCols
            ? "Database is missing relay columns. Run scripts/relay-columns.sql in Supabase, then retry."
            : msg,
          details: msg,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      relayServerId: inserted.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register RU relay";
    console.error("[relay/setup]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
