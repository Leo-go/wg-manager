"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Server } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditServerDialogProps {
  server: Server | null;
  open: boolean;
  onClose: () => void;
  onSaved: (server: Server) => void;
}

export function EditServerDialog({
  server,
  open,
  onClose,
  onSaved,
}: EditServerDialogProps) {
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!server || !open) return;
    setName(server.name);
    setIpAddress(server.ip_address);
    setSshPort(String(server.ssh_port || 22));
    setError("");
  }, [server, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!server) return;

    setError("");
    setLoading(true);

    const trimmedName = name.trim();
    const trimmedIp = ipAddress.trim();
    const port = Number.parseInt(sshPort, 10) || 22;

    if (!trimmedName) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (!trimmedIp) {
      setError("IP address is required");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("servers")
        .update({
          name: trimmedName,
          ip_address: trimmedIp,
          ssh_port: port,
        })
        .eq("id", server.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error("Update failed");

      onSaved(data as Server);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit server</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ip">IPv4 address</Label>
            <Input
              id="edit-ip"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="123.45.67.89"
              required
            />
            <p className="text-xs text-muted-foreground">
              Fix a mistyped IP here, then run Setup again if needed.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ssh-port">SSH port</Label>
            <Input
              id="edit-ssh-port"
              type="number"
              value={sshPort}
              onChange={(e) => setSshPort(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !server}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
