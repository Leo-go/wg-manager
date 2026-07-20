"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Server as ServerIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Server } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SETUP_STEPS = [
  { id: "connect", label: "Connect via SSH" },
  { id: "upload", label: "Upload installer script" },
  { id: "update", label: "Update system packages" },
  { id: "install", label: "Install Xray / VLESS Reality" },
  { id: "configure", label: "Generate keys & config" },
  { id: "finalize", label: "Save VLESS URL" },
] as const;

type UiPhase = "idle" | "running" | "success" | "error";

function statusLabel(status: InstallationStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "Ready";
    case "installing":
      return "Installing";
    case "error":
      return "Failed";
    case "pending":
    default:
      return "Pending setup";
  }
}

function statusClass(status: InstallationStatus | null | undefined) {
  switch (status) {
    case "completed":
      return "bg-green-500/15 text-green-400";
    case "installing":
      return "bg-amber-500/15 text-amber-400";
    case "error":
      return "bg-red-500/15 text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ServerSetupPage() {
  const params = useParams<{ id: string }>();
  const serverId = params.id;

  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [vlessUrl, setVlessUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepTimer = useCallback(() => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const generateQr = useCallback(async (url: string) => {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    setQrDataUrl(dataUrl);
  }, []);

  const loadServer = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", serverId)
      .single();

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Server not found");
      setServer(null);
      setLoading(false);
      return;
    }

    const nextServer = data as Server;
    setServer(nextServer);

    if (nextServer.vless_config_url) {
      setVlessUrl(nextServer.vless_config_url);
      setPhase("success");
      setActiveStep(SETUP_STEPS.length);
      void generateQr(nextServer.vless_config_url);
    } else if (nextServer.installation_status === "error") {
      setPhase("error");
      setError("Previous setup failed. You can retry installation.");
    } else if (nextServer.installation_status === "installing") {
      setPhase("running");
      setActiveStep(2);
    } else {
      setPhase("idle");
    }

    setLoading(false);
  }, [generateQr, serverId]);

  useEffect(() => {
    void loadServer();
    return () => clearStepTimer();
  }, [clearStepTimer, loadServer]);

  const startProgressAnimation = useCallback(() => {
    clearStepTimer();
    setActiveStep(0);
    stepTimerRef.current = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= SETUP_STEPS.length - 2) return prev;
        return prev + 1;
      });
    }, 4500);
  }, [clearStepTimer]);

  const runSetup = useCallback(async () => {
    setError("");
    setPhase("running");
    setCopied(false);
    startProgressAnimation();

    try {
      const response = await fetch(`/api/servers/${serverId}/setup`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        vlessConfigUrl?: string;
        error?: string;
        message?: string;
      };

      clearStepTimer();

      if (!response.ok || !payload.success || !payload.vlessConfigUrl) {
        throw new Error(payload.error || "Setup failed");
      }

      setActiveStep(SETUP_STEPS.length);
      setVlessUrl(payload.vlessConfigUrl);
      await generateQr(payload.vlessConfigUrl);
      setPhase("success");
      await loadServer();
    } catch (err) {
      clearStepTimer();
      setPhase("error");
      setError(err instanceof Error ? err.message : "Setup failed");
      await loadServer();
    }
  }, [
    clearStepTimer,
    generateQr,
    loadServer,
    serverId,
    startProgressAnimation,
  ]);

  const handleCopy = async () => {
    if (!vlessUrl) return;
    await navigator.clipboard.writeText(vlessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = useMemo(() => {
    if (!server) return false;
    if (phase === "running") return false;
    return (
      server.installation_status !== "completed" || phase === "error" || !vlessUrl
    );
  }, [phase, server, vlessUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading server...
      </div>
    );
  }

  if (!server) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-destructive">{error || "Server not found"}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Setup VPN</h1>
          <p className="mt-1 text-muted-foreground">
            Install VLESS Reality on this VPS over SSH
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            statusClass(server.installation_status)
          )}
        >
          {statusLabel(server.installation_status)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerIcon className="h-5 w-5" />
            {server.name}
          </CardTitle>
          <CardDescription>Server connection details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">IP Address</p>
            <p className="font-medium">{server.ip_address}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SSH Port</p>
            <p className="font-medium">{server.ssh_port}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SNI Domain</p>
            <p className="font-medium">
              {server.sni_domain || "www.microsoft.com"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">VLESS Port</p>
            <p className="font-medium">{server.vless_port || 443}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Installation</CardTitle>
          <CardDescription>
            This usually takes a few minutes. Keep this page open.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="space-y-3">
            {SETUP_STEPS.map((step, index) => {
              const done =
                phase === "success" ||
                (phase === "running" && index < activeStep);
              const current = phase === "running" && index === activeStep;

              return (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                      done && "border-green-500/40 bg-green-500/15 text-green-400",
                      current && "border-primary bg-primary/10 text-primary",
                      !done && !current && "border-border text-muted-foreground"
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
                      current && "font-medium text-foreground",
                      done && "text-muted-foreground",
                      !done && !current && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {phase === "idle" && (
            <Button onClick={() => void runSetup()} className="w-full sm:w-auto">
              Setup VPN
            </Button>
          )}

          {phase === "running" && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Installing on the remote server...
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error || "Installation failed"}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => void runSetup()}
                disabled={!canStart}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {phase === "success" && vlessUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-400">
              VPN is ready
            </CardTitle>
            <CardDescription>
              Scan the QR code or copy the VLESS URL into your client app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrDataUrl && (
              <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="VLESS QR code"
                  width={280}
                  height={280}
                  className="h-[280px] w-[280px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">VLESS config URL</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">
                  {vlessUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopy()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard">Back to servers</Link>
              </Button>
              <Button variant="outline" onClick={() => void runSetup()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-run setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
