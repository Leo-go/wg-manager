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
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
  const p = t.partner;
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
          <DialogTitle>{p.title}</DialogTitle>
          <DialogDescription>{p.description}</DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li className="space-y-2">
            <p className="font-medium">{p.step1Title}</p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a
                href={TIMEWEB_PARTNER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {p.step1Link}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">{p.step1Body}</p>
            <p className="text-xs text-muted-foreground">{p.osTip}</p>
          </li>

          <li className="space-y-2">
            <p className="font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {p.step2Title}
            </p>
            <p className="text-xs text-muted-foreground">{p.step2Body}</p>
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
                  {copied ? t.common.copied : p.copyKey}
                </Button>
              </div>
            ) : (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
                {p.keyMissing}
              </p>
            )}
          </li>

          <li className="space-y-1">
            <p className="font-medium">{p.step3Title}</p>
            <p className="text-xs text-muted-foreground">{p.step3Body}</p>
          </li>

          <li className="space-y-1">
            <p className="font-medium">{p.step4Title}</p>
            <p className="text-xs text-muted-foreground">{p.step4Body}</p>
          </li>
        </ol>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onContinueAddServer();
            }}
          >
            {p.haveIp}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
