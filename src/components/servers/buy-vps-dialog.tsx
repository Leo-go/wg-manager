"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StepId = "create" | "boot" | "vpn" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "create", label: "Creating server in Timeweb…" },
  { id: "boot", label: "Waiting for OS boot (1–2 min)…" },
  { id: "vpn", label: "SSH + install VLESS Reality…" },
  { id: "done", label: "Ready — config created" },
];

type Offer = {
  presetId: number;
  location: string;
  title: string;
  cpu: number | null;
  ramMb: number | null;
  diskMb: number | null;
  priceMonthRub: number | null;
  priceDayEstimateRub: number | null;
  billingNote: string;
};

interface BuyVpsDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatRub(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function BuyVpsDialog({ open, onClose }: BuyVpsDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "running" | "success" | "error">(
    "form"
  );
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [vlessUrl, setVlessUrl] = useState("");
  const [serverId, setServerId] = useState<string | null>(null);
  const [mockNote, setMockNote] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [billingNote, setBillingNote] = useState("");

  const reset = () => {
    setPhase("form");
    setActiveStep(0);
    setError("");
    setVlessUrl("");
    setServerId(null);
    setMockNote(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      setOffersLoading(true);
      setOffersError("");
      try {
        const res = await fetch("/api/vps/offers?location=nl-1");
        const payload = (await res.json()) as {
          mock?: boolean;
          offers?: Offer[];
          billing?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error || "Failed to load offers");
        if (cancelled) return;
        const list = payload.offers ?? [];
        setOffers(list);
        setMockNote(Boolean(payload.mock));
        setBillingNote(payload.billing ?? list[0]?.billingNote ?? "");
        setSelectedPresetId(list[0]?.presetId ?? null);
      } catch (err) {
        if (!cancelled) {
          setOffersError(
            err instanceof Error ? err.message : "Failed to load offers"
          );
        }
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = offers.find((o) => o.presetId === selectedPresetId) ?? null;

  const runPurchase = async () => {
    if (!selected && !mockNote) {
      setError("Select a tariff first");
      return;
    }

    setPhase("running");
    setError("");
    setActiveStep(0);

    try {
      // Creating VPS at the provider
      setActiveStep(0);

      const provisionRes = await fetch("/api/vps/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "nl-1",
          name: "VPN Netherlands",
          presetId:
            selected && selected.presetId > 0 ? selected.presetId : undefined,
          runSetup: true,
        }),
      });

      const provisionPayload = (await provisionRes.json()) as {
        success?: boolean;
        mock?: boolean;
        serverId?: string;
        vlessConfigUrl?: string;
        nextStep?: string;
        error?: string;
        message?: string;
      };

      if (
        !provisionRes.ok ||
        !provisionPayload.success ||
        !provisionPayload.serverId
      ) {
        throw new Error(provisionPayload.error || "Failed to provision VPS");
      }

      setServerId(provisionPayload.serverId);
      setMockNote(Boolean(provisionPayload.mock));

      // Boot / ready from provider response
      setActiveStep(1);

      if (provisionPayload.mock && provisionPayload.vlessConfigUrl) {
        setActiveStep(3);
        setVlessUrl(provisionPayload.vlessConfigUrl);
        setPhase("success");
        router.refresh();
        return;
      }

      // VPN install
      setActiveStep(2);
      const setupRes = await fetch(
        `/api/servers/${provisionPayload.serverId}/setup`,
        { method: "POST" }
      );
      const setupPayload = (await setupRes.json()) as {
        success?: boolean;
        vlessConfigUrl?: string;
        error?: string;
      };

      if (
        !setupRes.ok ||
        !setupPayload.success ||
        !setupPayload.vlessConfigUrl
      ) {
        throw new Error(
          setupPayload.error ||
            "VPS created, but VPN setup failed. Open the server and retry setup."
        );
      }

      setActiveStep(3);
      setVlessUrl(setupPayload.vlessConfigUrl);
      setPhase("success");
      router.refresh();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Purchase failed");
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buy &amp; configure VPS (Timeweb)</DialogTitle>
          <DialogDescription>
            Prices come from Timeweb Cloud API. Cloud billing is usually hourly —
            use the day estimate for planning, then delete the VPS after a test.
          </DialogDescription>
        </DialogHeader>

        {phase === "form" && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">Netherlands, Amsterdam (nl-1)</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">OS</span>
                <span className="font-medium">Ubuntu (from Timeweb catalog)</span>
              </div>
            </div>

            {offersLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tariffs from Timeweb…
              </div>
            )}

            {offersError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                {offersError}
              </div>
            )}

            {!offersLoading && !offersError && offers.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Tariff (Timeweb prices)</p>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {offers.slice(0, 8).map((offer) => {
                    const active = offer.presetId === selectedPresetId;
                    return (
                      <button
                        key={offer.presetId}
                        type="button"
                        onClick={() => setSelectedPresetId(offer.presetId)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{offer.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                offer.cpu != null ? `${offer.cpu} CPU` : null,
                                offer.ramMb != null
                                  ? `${Math.round(offer.ramMb / 1024)} GB RAM`
                                  : null,
                                offer.diskMb != null
                                  ? `${Math.round(offer.diskMb / 1024)} GB disk`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-medium">
                              ~{formatRub(offer.priceDayEstimateRub)}/day
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRub(offer.priceMonthRub)}/mo
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {billingNote && (
              <p className="text-xs text-muted-foreground">{billingNote}</p>
            )}
            {mockNote && (
              <p className="text-xs text-amber-400">
                MOCK mode — no Timeweb token, no real charge.
              </p>
            )}
          </div>
        )}

        {(phase === "running" || phase === "success" || phase === "error") && (
          <ol className="space-y-3">
            {STEPS.map((step, index) => {
              const done =
                phase === "success" ||
                (phase === "running" && index < activeStep) ||
                (phase === "error" && index < activeStep);
              const current = phase === "running" && index === activeStep;

              return (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                      done &&
                        "border-green-500/40 bg-green-500/15 text-green-400",
                      current && "border-primary bg-primary/10 text-primary",
                      !done &&
                        !current &&
                        "border-border text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      current && "font-medium",
                      !done && !current && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {phase === "error" && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-wrap">
            {error}
            {serverId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Server row may already exist — open it from the dashboard and
                retry setup. Also delete the VPS in Timeweb panel if charged.
              </p>
            )}
          </div>
        )}

        {phase === "success" && (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            {mockNote && (
              <p className="text-amber-400 text-xs">
                MOCK mode — no real Timeweb server was billed.
              </p>
            )}
            <p className="text-muted-foreground">VLESS URL</p>
            <code className="block break-all text-xs">{vlessUrl}</code>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {phase === "form" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void runPurchase()}
                disabled={offersLoading || (!selected && !mockNote)}
              >
                <Server className="mr-2 h-4 w-4" />
                Confirm (~{formatRub(selected?.priceDayEstimateRub ?? null)}
                /day est.)
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button type="button" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Working…
            </Button>
          )}
          {(phase === "success" || phase === "error") && (
            <>
              {serverId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleOpenChange(false);
                    router.push(`/dashboard/servers/${serverId}/setup`);
                  }}
                >
                  Open server
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                  router.refresh();
                }}
              >
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
