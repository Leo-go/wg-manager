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
  const router = useRouter();
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
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
        throw new Error("Root password is required in password mode");
      }
      if (authMode === "ssh_key" && !platformKeyConfigured) {
        throw new Error(
          "Platform SSH key is not configured. Use password mode, or ask the operator to set NEXT_PUBLIC_WG_SSH_PUBLIC_KEY / WG_SSH_PRIVATE_KEY."
        );
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data, error: insertError } = await supabase
        .from("servers")
        .insert({
          user_id: userId,
          name,
          ip_address: ipAddress,
          ssh_port: Number.parseInt(sshPort, 10) || 22,
          // Key mode: do not store root password. Password mode: store as fallback.
          ssh_password: authMode === "password" ? sshPassword : null,
          sni_domain: sniDomain,
          vless_port: parsedVlessPort,
          status: "inactive",
          installation_status: "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!data?.id) throw new Error("Server was created but ID is missing");

      const serverId = data.id as string;
      resetForm();
      onClose();
      onCreated?.(serverId);
      router.push(`/dashboard/servers/${serverId}/setup`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add server";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Server</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My VPN Server"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">IPv4 Address</Label>
            <Input
              id="ip-address"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="123.45.67.89"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ssh-port">SSH Port</Label>
            <Input
              id="ssh-port"
              type="number"
              value={sshPort}
              onChange={(e) => setSshPort(e.target.value)}
              placeholder="22"
            />
          </div>

          <div className="space-y-2">
            <Label>SSH authentication</Label>
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
                <span className="font-medium">SSH key</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Recommended — safer
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
                <span className="font-medium">Root password</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Alternative
                </span>
              </button>
            </div>
          </div>

          {authMode === "ssh_key" ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
              <p>
                Safer: we do <strong className="text-foreground">not</strong>{" "}
                store your root password. Add the WG Manager public key in
                Timeweb when creating the VPS, then connect with IP only.
              </p>
              <p>
                Setup uses the platform private key on the server (
                <code className="text-[10px]">WG_SSH_PRIVATE_KEY</code>).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ssh-password">Root Password</Label>
              <Input
                id="ssh-password"
                type="password"
                value={sshPassword}
                onChange={(e) => setSshPassword(e.target.value)}
                placeholder="Enter root password"
                required={authMode === "password"}
              />
              <p className="text-xs text-amber-400/90">
                Less safe: the password is stored in the database so setup can
                SSH. Prefer SSH key when possible.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vless-port">VLESS Port</Label>
            <Input
              id="vless-port"
              type="number"
              value={vlessPort}
              onChange={(e) => setVlessPort(e.target.value)}
              placeholder={String(DEFAULT_VLESS_PORT)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Default 443 — best for Reality in RU; installer probes SNI
              reachability.
            </p>
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
