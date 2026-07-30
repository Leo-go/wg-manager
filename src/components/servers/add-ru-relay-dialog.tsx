"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { getPlatformSshPublicKey } from "@/lib/constants/partner";
import {
  DEFAULT_RELAY_SNI_DOMAIN,
  resolveSniDomain,
} from "@/lib/constants/sni";
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
import { RelaySniDomainField } from "@/components/servers/relay-sni-domain-field";
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
  const a = t.addServer;
  const platformKey = getPlatformSshPublicKey();
  const platformKeyConfigured = Boolean(platformKey);

  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [authMode, setAuthMode] = useState<AuthMode>(
    platformKeyConfigured ? "ssh_key" : "password"
  );
  const [sshPassword, setSshPassword] = useState("");
  const [relaySniPreset, setRelaySniPreset] = useState(DEFAULT_RELAY_SNI_DOMAIN);
  const [customRelaySni, setCustomRelaySni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAuthMode(platformKeyConfigured ? "ssh_key" : "password");
  }, [open, platformKeyConfigured]);

  const resetForm = () => {
    setName("");
    setIpAddress("");
    setSshPort("22");
    setSshUsername("root");
    setAuthMode(platformKeyConfigured ? "ssh_key" : "password");
    setSshPassword("");
    setRelaySniPreset(DEFAULT_RELAY_SNI_DOMAIN);
    setCustomRelaySni("");
    setError("");
    setCopiedKey(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      resetForm();
      onClose();
    }
  };

  const handleCopyKey = async () => {
    if (!platformKey) return;
    await navigator.clipboard.writeText(platformKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (authMode === "password" && !sshPassword.trim()) {
        throw new Error(a.errors.passwordRequired);
      }
      if (authMode === "ssh_key" && !platformKeyConfigured) {
        throw new Error(a.errors.platformKeyMissing);
      }

      const relaySni = resolveSniDomain(
        relaySniPreset,
        customRelaySni,
        DEFAULT_RELAY_SNI_DOMAIN
      );

      const response = await fetch(
        `/api/servers/${exitServerId}/relay/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:
              name.trim() ||
              r.namePlaceholder.replace("{name}", exitServerName),
            ip_address: ipAddress.trim(),
            ssh_port: Number.parseInt(sshPort, 10) || 22,
            ssh_username: sshUsername.trim() || "root",
            auth_mode: authMode,
            ssh_password: authMode === "password" ? sshPassword : undefined,
            relay_sni: relaySni,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{r.title}</DialogTitle>
          <DialogDescription>
            {r.description.replace("{name}", exitServerName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{r.howItWorksTitle}</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>{r.howItWorksStep1}</li>
            <li>{r.howItWorksStep2}</li>
            <li>{r.howItWorksStep3}</li>
            <li>{r.howItWorksStep4}</li>
          </ol>
          <p>{r.howItWorksNote}</p>
        </div>

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
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>{a.helpNoPassword}</p>
                {platformKey && (
                  <div className="space-y-2">
                    <code className="block max-h-20 overflow-auto whitespace-pre-wrap break-all rounded border border-border bg-background p-2 text-[11px] text-foreground">
                      {platformKey}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopyKey()}
                      disabled={loading}
                    >
                      {copiedKey ? (
                        <>
                          <Check className="mr-2 h-3.5 w-3.5" />
                          {t.common.copied}
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          {t.common.copy}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {authMode === "password" && (
              <Input
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder={a.rootPassword}
                required
                disabled={loading}
              />
            )}
          </div>

          <RelaySniDomainField
            preset={relaySniPreset}
            customValue={customRelaySni}
            onPresetChange={setRelaySniPreset}
            onCustomValueChange={setCustomRelaySni}
            disabled={loading}
          />

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
