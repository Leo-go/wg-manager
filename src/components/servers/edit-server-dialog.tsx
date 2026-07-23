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
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
  const e = t.editServer;
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!server || !open) return;
    setName(server.name);
    setIpAddress(server.ip_address);
    setSshPort(String(server.ssh_port || 22));
    setSshUsername(server.ssh_username || "root");
    setError("");
  }, [server, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!server) return;

    setError("");
    setLoading(true);

    const trimmedName = name.trim();
    const trimmedIp = ipAddress.trim();
    const port = Number.parseInt(sshPort, 10) || 22;
    const username = sshUsername.trim() || "root";

    if (!trimmedName) {
      setError(e.errors.nameRequired);
      setLoading(false);
      return;
    }
    if (!trimmedIp) {
      setError(e.errors.ipRequired);
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      setError(e.errors.usernameInvalid);
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
          ssh_username: username,
        })
        .eq("id", server.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      if (!data) throw new Error(e.errors.failed);

      onSaved(data as Server);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : e.errors.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{e.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{e.name}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ip">{e.ipv4}</Label>
            <Input
              id="edit-ip"
              value={ipAddress}
              onChange={(ev) => setIpAddress(ev.target.value)}
              placeholder="123.45.67.89"
              required
            />
            <p className="text-xs text-muted-foreground">{e.ipv4Tip}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ssh-port">{e.sshPort}</Label>
            <Input
              id="edit-ssh-port"
              type="number"
              value={sshPort}
              onChange={(ev) => setSshPort(ev.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ssh-user">{e.sshUsername}</Label>
            <Input
              id="edit-ssh-user"
              value={sshUsername}
              onChange={(ev) => setSshUsername(ev.target.value)}
              placeholder="root"
              required
            />
            <p className="text-xs text-muted-foreground">{e.sshUsernameHint}</p>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !server}>
              {loading ? e.saving : e.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
