"use client";

import type { ReactNode } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/provider";

export type YandexCdnNextStepsProps = {
  open: boolean;
  onClose: () => void;
  cdnDomain: string;
  originDomain: string;
  relayDomain: string;
  originIp: string;
  exitIp: string;
};

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value || "…"),
    template
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground">
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {n}
        </span>
        {title}
      </h3>
      <div className="space-y-2 pl-8 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <code className="mt-0.5 block break-all text-xs text-foreground">{value}</code>
    </div>
  );
}

export function YandexCdnNextStepsDialog({
  open,
  onClose,
  cdnDomain,
  originDomain,
  relayDomain,
  originIp,
  exitIp,
}: YandexCdnNextStepsProps) {
  const { t } = useI18n();
  const g = t.cdn.nextSteps;
  const vars = {
    cdnDomain: cdnDomain.trim() || "cdn.example.com",
    originDomain: originDomain.trim() || "origin.example.com",
    relayDomain: relayDomain.trim() || "relay.example.com",
    originIp: originIp.trim() || "ORIGIN_IP",
    exitIp: exitIp.trim() || "EXIT_IP",
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {g.title}
          </DialogTitle>
          <DialogDescription>{g.intro}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{g.yourValuesTitle}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label={g.labelCdn} value={vars.cdnDomain} />
              <Field label={g.labelOrigin} value={vars.originDomain} />
              <Field label={g.labelRelay} value={vars.relayDomain} />
              <Field label={g.labelOriginIp} value={vars.originIp} />
              <Field label={g.labelExitIp} value={vars.exitIp} />
            </div>
          </div>

          <Step n={1} title={g.step1Title}>
            <p>{fill(g.step1Body, vars)}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{fill(g.step1Item1, vars)}</li>
              <li>{fill(g.step1Item2, vars)}</li>
              <li>{g.step1Item3}</li>
            </ul>
            <Button asChild variant="outline" size="sm" className="mt-1">
              <a
                href="https://console.cloud.yandex.ru/"
                target="_blank"
                rel="noreferrer"
              >
                {g.openConsole}
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </Step>

          <Step n={2} title={g.step2Title}>
            <p>{fill(g.step2Body, vars)}</p>
            <div className="grid gap-2">
              <Field label={g.step2Origin} value={vars.originDomain} />
              <Field label={g.step2Protocol} value="HTTPS" />
              <Field label={g.step2Host} value={vars.originDomain} />
              <Field label={g.step2Domain} value={vars.cdnDomain} />
              <Field label={g.step2Cert} value={fill(g.step2CertValue, vars)} />
            </div>
            <p>{g.step2Extra}</p>
          </Step>

          <Step n={3} title={g.step3Title}>
            <ul className="list-disc space-y-1 pl-4">
              <li>{g.step3Item1}</li>
              <li>{g.step3Item2}</li>
              <li>{g.step3Item3}</li>
              <li>{g.step3Item4}</li>
            </ul>
          </Step>

          <Step n={4} title={g.step4Title}>
            <ul className="list-disc space-y-1 pl-4">
              <li>{g.step4Item1}</li>
              <li>{g.step4Item2}</li>
            </ul>
          </Step>

          <Step n={5} title={g.step5Title}>
            <p>{fill(g.step5Body, vars)}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{fill(g.step5Item1, vars)}</li>
              <li>{fill(g.step5Item2, vars)}</li>
              <li>{g.step5Item3}</li>
            </ul>
          </Step>

          <Step n={6} title={g.step6Title}>
            <p>{g.step6Body}</p>
            <code className="block overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
              {fill(g.step6Cmd, vars)}
            </code>
            <p>{g.step6Expect}</p>
          </Step>

          <Step n={7} title={g.step7Title}>
            <p>{g.step7Body}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{g.step7Item1}</li>
              <li>{g.step7Item2}</li>
              <li>{g.step7Item3}</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://github.com/2dust/v2rayNG/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  {g.clientAndroid}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://github.com/2dust/v2rayN/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  {g.clientWindows}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            <p className="text-amber-700 dark:text-amber-400">{g.step7Warning}</p>
          </Step>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{g.tipsTitle}</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>{g.tip1}</li>
              <li>{g.tip2}</li>
              <li>{g.tip3}</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
