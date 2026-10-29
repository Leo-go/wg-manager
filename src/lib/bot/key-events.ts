import { createServiceClient } from "@/lib/supabase/admin";

export type BotKeyEventAction =
  | "add"
  | "remove"
  | "restore"
  | "revoke"
  | "provision";

export type BotKeyEventHost = "origin" | "home" | "both";

export type BotKeyEventInput = {
  botUserId?: string | null;
  telegramId?: number | null;
  xrayUuid?: string | null;
  host?: BotKeyEventHost;
  action: BotKeyEventAction;
  ok: boolean;
  error?: string | null;
};

/** Best-effort insert — never throws to callers (provisioning must not fail on audit). */
export async function logBotKeyEvent(input: BotKeyEventInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("bot_key_events").insert({
      bot_user_id: input.botUserId ?? null,
      telegram_id: input.telegramId ?? null,
      xray_uuid: input.xrayUuid ?? null,
      host: input.host ?? "both",
      action: input.action,
      ok: input.ok,
      error: input.error ?? null,
    });
    if (error) {
      console.error("logBotKeyEvent failed:", error.message);
    }
  } catch (error) {
    console.error("logBotKeyEvent exception:", error);
  }
}

export async function listBotKeyEvents(
  telegramId: number,
  limit = 20
): Promise<
  Array<{
    action: string;
    host: string;
    ok: boolean;
    error: string | null;
    xray_uuid: string | null;
    created_at: string;
  }>
> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bot_key_events")
    .select("action, host, ok, error, xray_uuid, created_at")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (error) throw new Error(error.message);
  return (data as Array<{
    action: string;
    host: string;
    ok: boolean;
    error: string | null;
    xray_uuid: string | null;
    created_at: string;
  }>) ?? [];
}
