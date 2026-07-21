"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, KeyRound } from "lucide-react";
import {
  getPlatformSshPublicKey,
  TIMEWEB_PARTNER_URL,
} from "@/lib/constants/partner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GetStartedPartnerDialogProps {
  open: boolean;
  onClose: () => void;
  onContinueAddServer: () => void;
}

export function GetStartedPartnerDialog({
  open,
  onClose,
  onContinueAddServer,
}: GetStartedPartnerDialogProps) {
  const publicKey = getPlatformSshPublicKey();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Get a VPS via Timeweb (partner link)</DialogTitle>
          <DialogDescription>
            You buy the server at Timeweb. We only set up VLESS Reality — no root
            password needed if you add our SSH public key.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li className="space-y-2">
            <p className="font-medium">1. Open Timeweb with the partner link</p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a
                href={TIMEWEB_PARTNER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                timeweb.cloud (referral)
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Register / sign in and create a cloud server (pick any suitable
              plan). Hosting is billed by Timeweb.
            </p>
          </li>

          <li className="space-y-2">
            <p className="font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              2. Add our SSH public key (recommended)
            </p>
            <p className="text-xs text-muted-foreground">
              When creating the VPS in Timeweb: open SSH keys → add a new key →
              paste the public key below → select it for the new server. Then you
              never need to save the root password in WG Manager.
            </p>
            {publicKey ? (
              <div className="space-y-2">
                <pre className="max-h-28 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-[11px] break-all whitespace-pre-wrap">
                  {publicKey}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleCopy()}
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy public key"}
                </Button>
              </div>
            ) : (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
                Platform public key is not configured yet (
                <code className="text-[10px]">NEXT_PUBLIC_WG_SSH_PUBLIC_KEY</code>
                ). Ask the operator to set it, or use root password as a fallback
                when adding the server.
              </p>
            )}
          </li>

          <li className="space-y-1">
            <p className="font-medium">3. Wait until the server is online</p>
            <p className="text-xs text-muted-foreground">
              Copy the <strong>IPv4</strong> address from the Timeweb panel
              (IPv6-only is not enough for most clients).
            </p>
          </li>

          <li className="space-y-1">
            <p className="font-medium">4. Add the server here → Setup VPN</p>
            <p className="text-xs text-muted-foreground">
              Choose “SSH key (recommended)” so we do not store your root
              password. Password auth remains available as an alternative.
            </p>
          </li>
        </ol>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onContinueAddServer();
            }}
          >
            I have an IP — add server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
