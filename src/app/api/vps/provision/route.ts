import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isTimewebMockMode,
  provisionServer,
  type TimewebLocation,
} from "@/lib/timeweb";
import {
  DEFAULT_SNI_DOMAIN,
  DEFAULT_VLESS_PORT,
} from "@/lib/constants/sni";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  location: z.string().default("nl-1"),
  name: z.string().trim().min(1).max(80).optional(),
  presetId: z.number().int().positive().optional(),
  /** When true (default), after provision call existing VPN setup for non-mock */
  runSetup: z.boolean().optional().default(true),
});

/**
 * Buy (or mock) a Timeweb VPS, save it to `servers`, optionally kick off VPN setup.
 *
 * Flow is split for Vercel timeouts:
 * 1) This route provisions + inserts the row and returns `serverId`.
 * 2) Client then POSTs `/api/servers/[id]/setup` (existing installer).
 * In MOCK mode we skip real VPN install and return a placeholder config URL.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized — sign in again" },
        { status: 401 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const location = (parsed.data.location || "nl-1") as TimewebLocation;
    const mock = isTimewebMockMode();

    const provisioned = await provisionServer({
      location,
      name: parsed.data.name ?? `VPN ${location.toUpperCase()}`,
      presetId: parsed.data.presetId,
    });

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      name: provisioned.name,
      ip_address: provisioned.ip,
      ssh_port: 22,
      ssh_password: provisioned.password,
      sni_domain: DEFAULT_SNI_DOMAIN,
      vless_port: DEFAULT_VLESS_PORT,
      status: "inactive",
      installation_status: mock ? "completed" : "pending",
    };

    // Optional columns — apply supabase/timeweb.sql if present
    insertPayload.provider = "timeweb";
    insertPayload.provider_server_id = provisioned.providerServerId;
    insertPayload.ssh_username = "root";

    let insertResult = await supabase
      .from("servers")
      .insert(insertPayload)
      .select("id")
      .single();

    // Retry without optional columns if schema not migrated yet
    if (
      insertResult.error &&
      /provider|column/i.test(insertResult.error.message)
    ) {
      const { provider: _p, provider_server_id: _ps, ...basic } = insertPayload;
      insertResult = await supabase
        .from("servers")
        .insert(basic)
        .select("id")
        .single();
    }

    if (insertResult.error || !insertResult.data?.id) {
      return NextResponse.json(
        {
          error: "Failed to save server in database",
          details: insertResult.error?.message,
        },
        { status: 500 }
      );
    }

    const serverId = insertResult.data.id as string;

    if (mock) {
      const mockVless =
        "vless://00000000-0000-4000-8000-000000000000@" +
        `${provisioned.ip}:443?encryption=none&flow=xtls-rprx-vision` +
        `&security=reality&sni=${DEFAULT_SNI_DOMAIN}&fp=chrome&type=tcp` +
        `#mock-timeweb`;

      await supabase
        .from("servers")
        .update({
          vless_config_url: mockVless,
          installation_status: "completed",
          status: "active",
          last_check: new Date().toISOString(),
        })
        .eq("id", serverId);

      return NextResponse.json({
        success: true,
        mock: true,
        serverId,
        ip: provisioned.ip,
        providerServerId: provisioned.providerServerId,
        vlessConfigUrl: mockVless,
        message:
          "MOCK: VPS provisioned locally (no Timeweb charge). Add TIMEWEB_CLOUD_API_TOKEN for real creates.",
        nextStep: "done",
      });
    }

    // Real mode: client should call setup API next (keeps function under timeout budget)
    return NextResponse.json({
      success: true,
      mock: false,
      serverId,
      ip: provisioned.ip,
      providerServerId: provisioned.providerServerId,
      message: "VPS created. Starting VPN setup…",
      nextStep: parsed.data.runSetup ? "setup" : "manual",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Provision failed unexpectedly";
    console.error("[vps/provision]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
