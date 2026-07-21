"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Server as ServerIcon, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Server } from "@/lib/supabase/types";
import AddServerDialog from "@/components/AddServerDialog";
import { BuyVpsDialog } from "@/components/servers/buy-vps-dialog";
import { EditServerDialog } from "@/components/servers/edit-server-dialog";
import { GetStartedPartnerDialog } from "@/components/servers/get-started-partner-dialog";
import { Button } from "@/components/ui/button";
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

function installationLabel(status: InstallationStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "Ready";
    case "installing":
      return "Installing";
    case "error":
      return "Failed";
    case "pending":
    default:
      return "Pending";
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

function actionLabel(status: InstallationStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "View config";
    case "error":
      return "Retry setup";
    case "installing":
      return "View progress";
    default:
      return "Setup VPN";
  }
}

export function DashboardPageClient({
  initialServers,
}: {
  initialServers: Server[];
}) {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [buyVpsOpen, setBuyVpsOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const showApiBuy = isTimewebApiBuyEnabled();

  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  const handleDelete = useCallback(async (server: Server) => {
    const ok = window.confirm(
      `Delete server "${server.name}" (${server.ip_address})?\n\nThis removes it from WG Manager only — Xray on the VPS is not uninstalled.`
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
      const message = err instanceof Error ? err.message : "Could not delete server";
      window.alert(`Could not delete server: ${message}`);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleCreated = useCallback(() => {
    // After creation we navigate away, but in case user comes back, refresh the list.
    router.refresh();
  }, [router]);

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">My Servers</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={() => setPartnerOpen(true)}>
            Get VPS via Timeweb
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Add Server
          </Button>
          {showApiBuy && (
            <Button variant="ghost" onClick={() => setBuyVpsOpen(true)}>
              Demo: API buy
            </Button>
          )}
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ServerIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-muted-foreground">
            No servers yet. Add your first VPS to get started.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setPartnerOpen(true)}>
              Get VPS via Timeweb
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Add Server
            </Button>
            {showApiBuy && (
              <Button variant="ghost" onClick={() => setBuyVpsOpen(true)}>
                Demo: API buy
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.name}</TableCell>
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
                      {installationLabel(server.installation_status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/servers/${server.id}/setup`}>
                          {actionLabel(server.installation_status)}
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingServer(server)}
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
                        onClick={() => void handleDelete(server)}
                        aria-label={`Delete ${server.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
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
          router.refresh();
        }}
      />
      {showApiBuy && (
        <BuyVpsDialog open={buyVpsOpen} onClose={() => setBuyVpsOpen(false)} />
      )}
    </div>
  );
}

