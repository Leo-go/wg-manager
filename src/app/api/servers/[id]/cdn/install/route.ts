import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@/lib/supabase/server";
import { isYandexCdnEnabled } from "@/lib/constants/features";
import { canUseYandexCdnForUser } from "@/lib/features/yandex-cdn-access";
import { resolveSshAuth } from "@/lib/ssh/auth";
import {
  extractUserFacingError,
  runRemoteBashScript,
} from "@/lib/ssh/run-remote";
import { extractVlessUrl } from "@/lib/relay/parse";
import { buildYandexCdnVlessUrl } from "@/lib/cdn/build-client-url";

export const runtime = "nodejs";
export const maxDuration = 300;

const serverIdSchema = z.string().uuid();

/**
 * Install Yandex CDN path: prepare exit inbound, then Origin (Nginx+Xray).
 * POST /api/servers/[exitId]/cdn/install
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isYandexCdnEnabled()) {
    return NextResponse.json(
      { error: "Yandex CDN feature is disabled" },
      { status: 404 }
    );
  }

  let fullOutput = "";
  const supabase = await createClient();
  let exitId: string | null = null;

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
    exitId = idResult.data;

    const { data: exitRow, error: fetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", exitId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !exitRow) {
      return NextResponse.json({ error: "Exit server not found" }, { status: 404 });
    }
    if (exitRow.installation_status !== "completed") {
      return NextResponse.json(
        { error: "Finish exit VPN setup first" },
        { status: 400 }
      );
    }

    const required = [
      exitRow.cdn_domain,
      exitRow.cdn_origin_domain,
      exitRow.cdn_relay_domain,
      exitRow.cdn_uuid,
      exitRow.cdn_email,
      exitRow.cdn_origin_ip,
      exitRow.cdn_origin_ssh_password,
    ];
    if (required.some((v) => !v || String(v).trim() === "")) {
      return NextResponse.json(
        { error: "Save CDN settings first (cdn/setup)" },
        { status: 400 }
      );
    }

    const listenPort = Number(exitRow.cdn_exit_listen_port) || 11443;
    const xhttpPath = (exitRow.cdn_path as string) || "/api-test";
    const paddingKey = (exitRow.cdn_padding_key as string) || "dc";

    await supabase
      .from("servers")
      .update({ cdn_status: "installing_exit" })
      .eq("id", exitId);

    const exitAuth = resolveSshAuth({
      sshPassword: exitRow.ssh_password,
      sshPrivateKey: exitRow.ssh_private_key,
    });

    const exitScriptPath = path.join(
      process.cwd(),
      "scripts",
      "install-cdn-exit.sh"
    );
    if (!fs.existsSync(exitScriptPath)) {
      throw new Error("install-cdn-exit.sh not found");
    }
    const exitScript = fs.readFileSync(exitScriptPath, "utf-8");

    const exitResult = await runRemoteBashScript({
      host: exitRow.ip_address,
      port: exitRow.ssh_port || 22,
      username: exitRow.ssh_username,
      auth: exitAuth,
      scriptContent: exitScript,
      args: [
        String(exitRow.cdn_relay_domain),
        String(exitRow.cdn_uuid),
        String(exitRow.cdn_email),
        String(listenPort),
      ],
    });
    fullOutput += exitResult.fullOutput + "\n";
    if (exitResult.code !== 0) {
      throw new Error(
        extractUserFacingError(
          exitResult.fullOutput,
          `CDN exit install failed (code ${exitResult.code})`
        )
      );
    }

    await supabase
      .from("servers")
      .update({ cdn_status: "installing_origin" })
      .eq("id", exitId);

    const originAuth = resolveSshAuth({
      sshPassword: exitRow.cdn_origin_ssh_password,
      sshPrivateKey: null,
    });

    const originScriptPath = path.join(
      process.cwd(),
      "scripts",
      "install-cdn-origin.sh"
    );
    if (!fs.existsSync(originScriptPath)) {
      throw new Error("install-cdn-origin.sh not found");
    }
    const originScript = fs.readFileSync(originScriptPath, "utf-8");

    const originResult = await runRemoteBashScript({
      host: String(exitRow.cdn_origin_ip),
      port: Number(exitRow.cdn_origin_ssh_port) || 22,
      username: String(exitRow.cdn_origin_ssh_username || "root"),
      auth: originAuth,
      scriptContent: originScript,
      args: [
        String(exitRow.cdn_origin_domain),
        String(exitRow.cdn_domain),
        String(exitRow.cdn_relay_domain),
        exitRow.ip_address,
        String(exitRow.cdn_uuid),
        String(exitRow.cdn_email),
        xhttpPath,
        paddingKey,
        String(listenPort),
      ],
    });
    fullOutput += originResult.fullOutput + "\n";
    if (originResult.code !== 0) {
      throw new Error(
        extractUserFacingError(
          originResult.fullOutput,
          `CDN origin install failed (code ${originResult.code})`
        )
      );
    }

    const fromScript = extractVlessUrl(originResult.fullOutput);
    const vlessConfigUrl =
      fromScript ||
      buildYandexCdnVlessUrl({
        uuid: String(exitRow.cdn_uuid),
        cdnHost: String(exitRow.cdn_domain),
        path: xhttpPath,
        paddingKey,
      });

    const now = new Date().toISOString();
    await supabase
      .from("servers")
      .update({
        cdn_status: "ready",
        cdn_vless_config_url: vlessConfigUrl,
        updated_at: now,
      })
      .eq("id", exitId);

    return NextResponse.json({
      success: true,
      vlessConfigUrl,
      diagnostics: fullOutput,
      message:
        "Servers ready. Finish Yandex Certificate Manager + CDN resource + CNAME, then import the URL.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "CDN install failed";
    console.error("[cdn/install]", message);
    if (exitId) {
      await supabase
        .from("servers")
        .update({ cdn_status: "error" })
        .eq("id", exitId);
    }
    const friendly = extractUserFacingError(
      `${fullOutput}\n${message}`,
      message
    );
    return NextResponse.json(
      {
        error: friendly,
        diagnostics:
          [fullOutput, friendly].filter(Boolean).join("\n") || undefined,
      },
      { status: 500 }
    );
  }
}
