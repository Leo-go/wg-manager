"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { CornerDownRight, Pencil, Server as ServerIcon, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Server } from "@/lib/supabase/types";
import { buildServerTree } from "@/lib/servers/build-server-tree";
import { Button } from "@/components/ui/button";
import { isRuRelayEnabled } from "@/lib/constants/features";
import { isTimewebApiBuyEnabled } from "@/lib/constants/partner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/types";

const AddServerDialog = dynamic(
  () => import("@/components/AddServerDialog"),
  { ssr: false }
);
const BuyVpsDialog = dynamic(
  () =>
    import("@/components/servers/buy-vps-dialog").then((m) => m.BuyVpsDialog),
  { ssr: false }
);
const EditServerDialog = dynamic(
  () =>
    import("@/components/servers/edit-server-dialog").then(
      (m) => m.EditServerDialog
    ),
  { ssr: false }
);
const GetStartedPartnerDialog = dynamic(
  () =>
    import("@/components/servers/get-started-partner-dialog").then(
      (m) => m.GetStartedPartnerDialog
    ),
  { ssr: false }
);

function installationLabel(
  status: InstallationStatus | null | undefined,
  d: Dictionary["dashboard"]
) {
  switch (status) {
    case "completed":
      return d.ready;
    case "installing":
      return d.installing;
    case "error":
      return d.failed;
    case "pending":
    default:
      return d.pending;
  }
}

function installationClass(status: InstallationStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "bg-green-500/15 text-green-400";
    case "installing":
      return "bg-amber-500/15 text-amber-400";
    case "error":
      return "bg-red-500/15 text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function actionLabel(
  status: InstallationStatus | null | undefined,
  d: Dictionary["dashboard"]
) {
  switch (status) {
    case "completed":
      return d.viewConfig;
    case "error":
      return d.retrySetup;
    case "installing":
      return d.viewProgress;
    default:
      return d.setupVpn;
  }
}

function ServerTableRow({
  server,
  depth,
  parentName,
  hasRelayChildren,
  d,
  deletingId,
  onEdit,
  onDelete,
}: {
  server: Server;
  depth: number;
  parentName?: string;
  hasRelayChildren?: boolean;
  d: Dictionary["dashboard"];
  deletingId: string | null;
  onEdit: (server: Server) => void;
  onDelete: (server: Server) => void;
}) {
  const isRelay = server.role === "relay";

  return (
    <TableRow className={depth > 0 ? "bg-muted/20" : undefined}>
      <TableCell className="font-medium">
        <div
          className="flex flex-wrap items-center gap-2"
          style={{ paddingLeft: depth > 0 ? `${depth * 1.25}rem` : 0 }}
        >
          {depth > 0 && (
            <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <span>{server.name}</span>
            {isRelay && parentName && (
              <p className="text-xs font-normal text-muted-foreground">
                {d.relayChildOf.replace("{name}", parentName)}
              </p>
            )}
          </div>
          {isRuRelayEnabled() && isRelay && (
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-400">
              {d.badgeRelay}
            </span>
          )}
          {isRuRelayEnabled() && !isRelay && hasRelayChildren && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
              {d.badgePlusRelay}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {server.ip_address}:{server.ssh_port}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs",
            server.status === "active"
              ? "bg-green-500/15 text-green-400"
              : server.status === "error"
                ? "bg-red-500/15 text-red-400"
                : "bg-muted text-muted-foreground"
          )}
        >
          {server.status}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs",
            installationClass(server.installation_status)
          )}
        >
          {installationLabel(server.installation_status, d)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/servers/${server.id}/setup`}>
              {actionLabel(server.installation_status, d)}
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(server)}
            aria-label={`Edit ${server.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deletingId === server.id}
            onClick={() => void onDelete(server)}
            aria-label={`Delete ${server.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function DashboardPageClient({
  initialServers,
}: {
  initialServers: Server[];
}) {
  const { t } = useI18n();
  const d = t.dashboard;
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [buyVpsOpen, setBuyVpsOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const showApiBuy = isTimewebApiBuyEnabled();

  const serverTree = useMemo(() => buildServerTree(servers), [servers]);

  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  const handleDelete = useCallback(
    async (server: Server) => {
      const ok = window.confirm(
        d.deleteConfirm
          .replace("{name}", server.name)
          .replace("{ip}", server.ip_address)
      );
      if (!ok) return;

      setDeletingId(server.id);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("servers")
          .delete()
          .eq("id", server.id);

        if (error) throw error;

        setServers((prev) => prev.filter((s) => s.id !== server.id));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : d.deleteFailed;
        window.alert(`${d.deleteFailed}: ${message}`);
      } finally {
        setDeletingId(null);
      }
    },
    [d.deleteConfirm, d.deleteFailed]
  );

  const handleCreated = useCallback(() => {
    // The add dialog navigates straight to setup page after insert,
    // so refreshing the dashboard first only adds a redundant round-trip.
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{d.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={() => setPartnerOpen(true)}>
            {d.getVps}
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            {d.addServer}
          </Button>
          {showApiBuy && (
            <Button variant="ghost" onClick={() => setBuyVpsOpen(true)}>
              {d.demoBuy}
            </Button>
          )}
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ServerIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-muted-foreground">{d.empty}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPartnerOpen(true)}>{d.getVps}</Button>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              {d.addServer}
            </Button>
            {showApiBuy && (
              <Button variant="ghost" onClick={() => setBuyVpsOpen(true)}>
                {d.demoBuy}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{d.name}</TableHead>
                <TableHead>{d.ip}</TableHead>
                <TableHead>{d.status}</TableHead>
                <TableHead>{d.setup}</TableHead>
                <TableHead className="text-right">{d.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serverTree.map(({ server, children }) => (
                <Fragment key={server.id}>
                  <ServerTableRow
                    server={server}
                    depth={0}
                    hasRelayChildren={children.length > 0}
                    d={d}
                    deletingId={deletingId}
                    onEdit={setEditingServer}
                    onDelete={handleDelete}
                  />
                  {children.map((child) => (
                    <ServerTableRow
                      key={child.id}
                      server={child}
                      depth={1}
                      parentName={server.name}
                      d={d}
                      deletingId={deletingId}
                      onEdit={setEditingServer}
                      onDelete={handleDelete}
                    />
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddServerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
      <GetStartedPartnerDialog
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
        onContinueAddServer={() => setDialogOpen(true)}
      />
      <EditServerDialog
        server={editingServer}
        open={Boolean(editingServer)}
        onClose={() => setEditingServer(null)}
        onSaved={(updated) => {
          setServers((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
        }}
      />
      {showApiBuy && (
        <BuyVpsDialog open={buyVpsOpen} onClose={() => setBuyVpsOpen(false)} />
      )}
    </div>
  );
}
