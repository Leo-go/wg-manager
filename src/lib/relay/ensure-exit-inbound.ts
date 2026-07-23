import * as fs from "fs";
import * as path from "path";
import { resolveSshAuth } from "@/lib/ssh/auth";
import { extractUserFacingError, runRemoteBashScript } from "@/lib/ssh/run-remote";
import { parseExitRelayMarkers } from "@/lib/relay/parse";

const DEFAULT_RELAY_PORT = 10443;
const DEFAULT_RELAY_PATH = "/wg-relay";
const DEFAULT_EXIT_SNI = "www.microsoft.com";

export type ExitRelayCreds = {
  uuid: string;
  publicKey: string;
  shortId: string;
  port: number;
  path: string;
  sni: string;
};

export type ExitServerRow = {
  id: string;
  ip_address: string;
  ssh_port: number | null;
  ssh_username?: string | null;
  ssh_password?: string | null;
  ssh_private_key?: string | null;
  sni_domain?: string | null;
  relay_uuid?: string | null;
  relay_public_key?: string | null;
  relay_short_id?: string | null;
  relay_listen_port?: number | null;
  relay_path?: string | null;
};

type SupabaseServer = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      // Supabase returns a thenable filter builder, not a bare Promise
      eq: (col: string, val: string) => PromiseLike<unknown>;
    };
  };
};

export async function ensureExitRelayInbound(opts: {
  exitRow: ExitServerRow;
  supabase: SupabaseServer;
}): Promise<{ creds: ExitRelayCreds; diagnostics: string }> {
  const { exitRow, supabase } = opts;

  if (
    exitRow.relay_uuid &&
    exitRow.relay_public_key &&
    exitRow.relay_short_id
  ) {
    return {
      creds: {
        uuid: exitRow.relay_uuid,
        publicKey: exitRow.relay_public_key,
        shortId: exitRow.relay_short_id,
        port: exitRow.relay_listen_port || DEFAULT_RELAY_PORT,
        path: exitRow.relay_path || DEFAULT_RELAY_PATH,
        sni: exitRow.sni_domain || DEFAULT_EXIT_SNI,
      },
      diagnostics: "",
    };
  }

  const sshAuth = resolveSshAuth({
    sshPassword: exitRow.ssh_password,
    sshPrivateKey: exitRow.ssh_private_key,
  });

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "add-exit-relay-inbound.sh"
  );
  if (!fs.existsSync(scriptPath)) {
    throw new Error("add-exit-relay-inbound.sh not found on the app server");
  }
  const scriptContent = fs.readFileSync(scriptPath, "utf-8");

  const relayPort = exitRow.relay_listen_port || DEFAULT_RELAY_PORT;
  const exitSni = exitRow.sni_domain || DEFAULT_EXIT_SNI;
  const relayPath = exitRow.relay_path || DEFAULT_RELAY_PATH;

  await supabase
    .from("servers")
    .update({ relay_status: "preparing" })
    .eq("id", exitRow.id);

  const result = await runRemoteBashScript({
    host: exitRow.ip_address,
    port: exitRow.ssh_port || 22,
    username: exitRow.ssh_username,
    auth: sshAuth,
    scriptContent,
    args: [String(relayPort), exitSni, relayPath],
  });

  if (result.code !== 0) {
    throw new Error(
      extractUserFacingError(
        result.fullOutput,
        `Prepare exit failed (exit code ${result.code})`
      )
    );
  }

  const markers = parseExitRelayMarkers(result.fullOutput);

  await supabase
    .from("servers")
    .update({
      role: "exit",
      relay_uuid: markers.uuid,
      relay_public_key: markers.publicKey,
      relay_short_id: markers.shortId,
      relay_listen_port: markers.port,
      relay_path: markers.path,
      relay_status: "exit_ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", exitRow.id);

  return { creds: markers, diagnostics: result.fullOutput };
}
