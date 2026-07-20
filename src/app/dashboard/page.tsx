"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Server as ServerIcon, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Server } from "@/lib/supabase/types";
import AddServerDialog from "@/components/AddServerDialog";
import { Button } from "@/components/ui/button";
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

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setServers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("servers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load servers:", error.message);
      setServers([]);
    } else {
      setServers((data as Server[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  const handleDelete = async (server: Server) => {
    const ok = window.confirm(
      `Delete server "${server.name}" (${server.ip_address})?\n\nThis removes it from WG Manager only — Xray on the VPS is not uninstalled.`
    );
    if (!ok) return;

    setDeletingId(server.id);
    const supabase = createClient();
    const { error } = await supabase.from("servers").delete().eq("id", server.id);

    if (error) {
      console.error("Failed to delete server:", error.message);
      window.alert(`Could not delete server: ${error.message}`);
      setDeletingId(null);
      return;
    }

    setServers((prev) => prev.filter((s) => s.id !== server.id));
    setDeletingId(null);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Servers</h1>
        <Button onClick={() => setDialogOpen(true)}>Add Server</Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ServerIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-muted-foreground">
            No servers yet. Add your first VPS to get started.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            Add Server
          </Button>
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
        onCreated={() => void loadServers()}
      />
    </div>
  );
}
