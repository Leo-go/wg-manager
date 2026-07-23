"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SNI_DOMAIN,
  DEFAULT_VLESS_PORT,
  resolveSniDomain,
  type SniPresetValue,
} from "@/lib/constants/sni";
import { getPlatformSshPublicKey } from "@/lib/constants/partner";
import { SniDomainField } from "@/components/servers/sni-domain-field";
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
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type AuthMode = "ssh_key" | "password";

interface AddServerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (serverId: string) => void;
}

export default function AddServerDialog({
  open,
  onClose,
  onCreated,
}: AddServerDialogProps) {
  const { t } = useI18n();
  const a = t.addServer;
  const router = useRouter();
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [authMode, setAuthMode] = useState<AuthMode>("ssh_key");
  const [sshPassword, setSshPassword] = useState("");
  const [vlessPort, setVlessPort] = useState(String(DEFAULT_VLESS_PORT));
  const [sniPreset, setSniPreset] = useState<SniPresetValue | string>(
    DEFAULT_SNI_DOMAIN
  );
  const [customSni, setCustomSni] = useState("");
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
    setVlessPort(String(DEFAULT_VLESS_PORT));
    setSniPreset(DEFAULT_SNI_DOMAIN);
    setCustomSni("");
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const sniDomain = resolveSniDomain(sniPreset, customSni);
    const parsedVlessPort =
      Number.parseInt(vlessPort, 10) || DEFAULT_VLESS_PORT;

    try {
      if (authMode === "password" && !sshPassword.trim()) {
        throw new Error(a.errors.passwordRequired);
      }
      if (authMode === "ssh_key" && !platformKeyConfigured) {
        throw new Error(a.errors.platformKeyMissing);
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error(a.errors.notAuthenticated);

      const { data, error: insertError } = await supabase
        .from("servers")
        .insert({
          user_id: userId,
          name,
          ip_address: ipAddress,
          ssh_port: Number.parseInt(sshPort, 10) || 22,
          ssh_username: sshUsername.trim() || "root",
          // Key mode: do not store password. Password mode: store as fallback.
          ssh_password: authMode === "password" ? sshPassword : null,
          sni_domain: sniDomain,
          vless_port: parsedVlessPort,
          status: "inactive",
          installation_status: "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!data?.id) throw new Error(a.errors.missingId);

      const serverId = data.id as string;
      resetForm();
      onClose();
      onCreated?.(serverId);
      router.push(`/dashboard/servers/${serverId}/setup`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : a.failed;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{a.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-name">{a.name}</Label>
            <Input
              id="server-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={a.namePlaceholder}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">{a.ipv4}</Label>
            <Input
              id="ip-address"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="123.45.67.89"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssh-port">{a.sshPort}</Label>
            <Input
              id="ssh-port"
              type="number"
              value={sshPort}
              onChange={(e) => setSshPort(e.target.value)}
              placeholder="22"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssh-username">{a.sshUsername}</Label>
            <Input
              id="ssh-username"
              value={sshUsername}
              onChange={(e) => setSshUsername(e.target.value)}
              placeholder="root"
              required
            />
            <p className="text-xs text-muted-foreground">{a.sshUsernameHint}</p>
          </div>

          <div className="space-y-2">
            <Label>{a.auth}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("ssh_key")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  authMode === "ssh_key"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <span className="font-medium">{a.sshKey}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {a.sshKeyHint}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  authMode === "password"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <span className="font-medium">{a.password}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {a.passwordAlt}
                </span>
              </button>
            </div>
          </div>

          {authMode === "ssh_key" ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
              <p>{a.helpNoPassword}</p>
              <p>{a.helpPrivateKey}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ssh-password">{a.rootPassword}</Label>
              <Input
                id="ssh-password"
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder={a.rootPasswordPlaceholder}
                required={authMode === "password"}
              />
              <p className="text-xs text-amber-400/90">{a.helpPasswordRisk}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vless-port">{a.vlessPort}</Label>
            <Input
              id="vless-port"
              type="number"
              value={vlessPort}
              onChange={(e) => setVlessPort(e.target.value)}
              placeholder={String(DEFAULT_VLESS_PORT)}
              required
            />
            <p className="text-xs text-muted-foreground">{a.vlessPortTip}</p>
          </div>

          <SniDomainField
            preset={sniPreset}
            customValue={customSni}
            onPresetChange={setSniPreset}
            onCustomValueChange={setCustomSni}
            disabled={loading}
          />

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? a.saving : a.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
