"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPlatformSshPublicKey } from "@/lib/constants/partner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type AuthMode = "ssh_key" | "password";

type AddRuRelayDialogProps = {
  open: boolean;
  exitServerId: string;
  exitServerName: string;
  onClose: () => void;
};

export function AddRuRelayDialog({
  open,
  exitServerId,
  exitServerName,
  onClose,
}: AddRuRelayDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const r = t.relay;
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [authMode, setAuthMode] = useState<AuthMode>("ssh_key");
  const [sshPassword, setSshPassword] = useState("");
  const [relaySni, setRelaySni] = useState("www.gosuslugi.ru");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const platformKeyConfigured = Boolean(getPlatformSshPublicKey());

  const resetForm = () => {
    setName("");
    setIpAddress("");
    setSshPort("22");
    setSshUsername("root");
    setAuthMode("ssh_key");
    setSshPassword("");
    setRelaySni("www.gosuslugi.ru");
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/servers/${exitServerId}/relay/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || r.namePlaceholder.replace("{name}", exitServerName),
            ip_address: ipAddress.trim(),
            ssh_port: Number.parseInt(sshPort, 10) || 22,
            ssh_username: sshUsername.trim() || "root",
            auth_mode: authMode,
            ssh_password: authMode === "password" ? sshPassword : undefined,
            relay_sni: relaySni.trim() || "www.gosuslugi.ru",
          }),
        }
      );

      const payload = (await response.json()) as {
        success?: boolean;
        relayServerId?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.relayServerId) {
        throw new Error(payload.error || r.failed);
      }

      resetForm();
      onClose();
      router.push(`/dashboard/servers/${payload.relayServerId}/setup`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : r.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{r.title}</DialogTitle>
          <DialogDescription>
            {r.description.replace("{name}", exitServerName)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="relay-name">{r.name}</Label>
            <Input
              id="relay-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={r.namePlaceholder.replace("{name}", exitServerName)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relay-ip">{r.ipv4}</Label>
            <Input
              id="relay-ip"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="185.x.x.x"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relay-ssh-port">{r.sshPort}</Label>
            <Input
              id="relay-ssh-port"
              value={sshPort}
              onChange={(e) => setSshPort(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relay-ssh-user">{r.sshUsername}</Label>
            <Input
              id="relay-ssh-user"
              value={sshUsername}
              onChange={(e) => setSshUsername(e.target.value)}
              placeholder="root"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{r.sshUsernameHint}</p>
          </div>

          <div className="space-y-2">
            <Label>{r.auth}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={authMode === "ssh_key" ? "default" : "outline"}
                disabled={loading || !platformKeyConfigured}
                onClick={() => setAuthMode("ssh_key")}
              >
                {r.sshKey}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={authMode === "password" ? "default" : "outline"}
                disabled={loading}
                onClick={() => setAuthMode("password")}
              >
                {r.password}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{r.authHint}</p>
            {authMode === "ssh_key" && (
              <p className="text-xs text-muted-foreground">
                {t.addServer.helpNoPassword}
              </p>
            )}
            {authMode === "password" && (
              <Input
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder={t.addServer.rootPassword}
                required
                disabled={loading}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="relay-sni">{r.relaySni}</Label>
            <Input
              id="relay-sni"
              value={relaySni}
              onChange={(e) => setRelaySni(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{r.relaySniHint}</p>
          </div>

          {error && (
            <p
              className={cn(
                "rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap"
              )}
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {r.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {r.installing}
                </>
              ) : (
                r.continue
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
