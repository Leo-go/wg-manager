"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
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

type YandexCdnSetupDialogProps = {
  open: boolean;
  exitServerId: string;
  exitServerIp: string;
  onClose: () => void;
  onInstalled: (result: {
    vlessConfigUrl: string;
    cdnDomain: string;
    originDomain: string;
    relayDomain: string;
    originIp: string;
  }) => void;
};

function FieldHint({ children }: { children: string }) {
  return <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>;
}

export function YandexCdnSetupDialog({
  open,
  exitServerId,
  exitServerIp,
  onClose,
  onInstalled,
}: YandexCdnSetupDialogProps) {
  const { t } = useI18n();
  const c = t.cdn;

  const [cdnDomain, setCdnDomain] = useState("");
  const [originDomain, setOriginDomain] = useState("");
  const [relayDomain, setRelayDomain] = useState("");
  const [email, setEmail] = useState("");
  const [path, setPath] = useState("/api-test");
  const [paddingKey, setPaddingKey] = useState("dc");
  const [originIp, setOriginIp] = useState("");
  const [originSshPort, setOriginSshPort] = useState("22");
  const [originSshUser, setOriginSshUser] = useState("root");
  const [originSshPassword, setOriginSshPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setError("");
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !loading) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const setupRes = await fetch(`/api/servers/${exitServerId}/cdn/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cdn_domain: cdnDomain.trim(),
          cdn_origin_domain: originDomain.trim(),
          cdn_relay_domain: relayDomain.trim(),
          cdn_email: email.trim(),
          cdn_path: path.trim() || "/api-test",
          cdn_padding_key: paddingKey.trim() || "dc",
          cdn_origin_ip: originIp.trim(),
          cdn_origin_ssh_port: Number.parseInt(originSshPort, 10) || 22,
          cdn_origin_ssh_username: originSshUser.trim() || "root",
          cdn_origin_ssh_password: originSshPassword,
        }),
      });
      const setupPayload = (await setupRes.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!setupRes.ok || !setupPayload.success) {
        throw new Error(setupPayload.error || c.failed);
      }

      const installRes = await fetch(
        `/api/servers/${exitServerId}/cdn/install`,
        { method: "POST" }
      );
      const installPayload = (await installRes.json()) as {
        success?: boolean;
        vlessConfigUrl?: string;
        error?: string;
      };
      if (
        !installRes.ok ||
        !installPayload.success ||
        !installPayload.vlessConfigUrl
      ) {
        throw new Error(installPayload.error || c.failed);
      }

      onInstalled({
        vlessConfigUrl: installPayload.vlessConfigUrl,
        cdnDomain: cdnDomain.trim(),
        originDomain: originDomain.trim(),
        relayDomain: relayDomain.trim(),
        originIp: originIp.trim(),
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setLoading(false);
    }
  };

  const relayDnsHint = c.relayDomainDnsHint.replace(
    "{exitIp}",
    exitServerIp || "…"
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{c.dnsBeforeInstallTitle}</p>
          <p>{c.dnsBeforeInstallBody}</p>
          <p className="text-amber-700 dark:text-amber-400">{c.originRoleWarning}</p>
        </div>

        <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cdn-domain">{c.cdnDomain}</Label>
            <Input
              id="cdn-domain"
              placeholder="www.example.com"
              value={cdnDomain}
              onChange={(e) => setCdnDomain(e.target.value)}
              required
              disabled={loading}
            />
            <FieldHint>{c.cdnDomainDnsHint}</FieldHint>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin-domain">{c.originDomain}</Label>
            <Input
              id="origin-domain"
              placeholder="origin.example.com"
              value={originDomain}
              onChange={(e) => setOriginDomain(e.target.value)}
              required
              disabled={loading}
            />
            <FieldHint>{c.originDomainDnsHint}</FieldHint>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relay-domain">{c.relayDomain}</Label>
            <Input
              id="relay-domain"
              placeholder="relay.example.com"
              value={relayDomain}
              onChange={(e) => setRelayDomain(e.target.value)}
              required
              disabled={loading}
            />
            <FieldHint>{relayDnsHint}</FieldHint>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdn-email">{c.email}</Label>
            <Input
              id="cdn-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cdn-path">{c.path}</Label>
              <Input
                id="cdn-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cdn-pad">{c.paddingKey}</Label>
              <Input
                id="cdn-pad"
                value={paddingKey}
                onChange={(e) => setPaddingKey(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin-ip">{c.originIp}</Label>
            <Input
              id="origin-ip"
              placeholder="185.247.185.3"
              value={originIp}
              onChange={(e) => setOriginIp(e.target.value)}
              required
              disabled={loading}
            />
            <FieldHint>{c.originIpDnsHint}</FieldHint>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="origin-ssh-port">{c.originSshPort}</Label>
              <Input
                id="origin-ssh-port"
                value={originSshPort}
                onChange={(e) => setOriginSshPort(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin-ssh-user">{c.originSshUser}</Label>
              <Input
                id="origin-ssh-user"
                value={originSshUser}
                onChange={(e) => setOriginSshUser(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin-ssh-pass">{c.originSshPassword}</Label>
            <Input
              id="origin-ssh-pass"
              type="password"
              value={originSshPassword}
              onChange={(e) => setOriginSshPassword(e.target.value)}
              required
              disabled={loading}
            />
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
              disabled={loading}
              onClick={() => handleOpenChange(false)}
            >
              {c.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {c.installing}
                </>
              ) : (
                c.saveAndInstall
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
