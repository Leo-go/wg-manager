import type { Server } from "@/lib/supabase/types";

export type ServerTreeNode = {
  server: Server;
  children: Server[];
};

/** Exit nodes with nested RU relays; orphan relays listed at the end. */
export function buildServerTree(servers: Server[]): ServerTreeNode[] {
  const relays = servers.filter((s) => s.role === "relay");
  const exits = servers.filter((s) => s.role !== "relay");

  const tree: ServerTreeNode[] = exits.map((server) => ({
    server,
    children: relays
      .filter((r) => r.exit_server_id === server.id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
  }));

  const orphans = relays.filter(
    (r) => !r.exit_server_id || !exits.some((e) => e.id === r.exit_server_id)
  );
  for (const relay of orphans) {
    tree.push({ server: relay, children: [] });
  }

  return tree;
}
