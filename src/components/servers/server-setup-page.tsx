"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Server as ServerIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Server } from "@/lib/supabase/types";
import {
  DEFAULT_SNI_DOMAIN,
  displaySniDomain,
  displayVlessPort,
  getSniPresetFromDomain,
  resolveSniDomain,
  type SniPresetValue,
} from "@/lib/constants/sni";
import { isRuRelayEnabled } from "@/lib/constants/features";
import { AddRuRelayDialog } from "@/components/servers/add-ru-relay-dialog";
import { DiagnosticsPanel } from "@/components/servers/diagnostics-panel";
import { SniDomainField } from "@/components/servers/sni-domain-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n/types";

function formatSetupError(
  message: string,
  errors: Dictionary["setup"]["errors"]
): string {
  const portInUse = message.match(/Port\s+(\d+)\s+is already in use/i);
  if (portInUse) {
    return errors.portInUse.replace("{port}", portInUse[1]);
  }
  if (/address already in use/i.test(message)) {
    return errors.portInUseGeneric;
  }
  if (/SSH connection failed|ssh:\s*connect|ETIMEDOUT|Connection timed out/i.test(message)) {
    return message;
  }
  if (/missing ssh_password|ssh_password is required/i.test(message)) {
    return errors.missingPassword;
  }
  if (/missing ip_address|ip_address cannot be empty/i.test(message)) {
    return errors.missingIp;
  }
  if (/Server not found/i.test(message)) {
    return errors.serverNotFound;
  }
  if (/could not parse VLESS/i.test(message)) {
    return errors.parseVless;
  }
  return message;
}

function setupErrorStorageKey(serverId: string) {
  return `wg-setup-error:${serverId}`;
}

function setupDiagStorageKey(serverId: string) {
  return `wg-setup-diag:${serverId}`;
}

function rememberSetupFailure(
  serverId: string,
  message: string,
  diagnostics: string
) {
  try {
    sessionStorage.setItem(setupErrorStorageKey(serverId), message);
    sessionStorage.setItem(setupDiagStorageKey(serverId), diagnostics);
  } catch {
    // ignore quota / private mode
  }
}

function readRememberedSetupFailure(serverId: string): {
  message: string;
  diagnostics: string;
} {
  try {
    return {
      message: sessionStorage.getItem(setupErrorStorageKey(serverId)) ?? "",
      diagnostics: sessionStorage.getItem(setupDiagStorageKey(serverId)) ?? "",
    };
  } catch {
    return { message: "", diagnostics: "" };
  }
}

function clearRememberedSetupFailure(serverId: string) {
  try {
    sessionStorage.removeItem(setupErrorStorageKey(serverId));
    sessionStorage.removeItem(setupDiagStorageKey(serverId));
  } catch {
    // ignore
  }
}

type UiPhase = "idle" | "running" | "success" | "error";

function statusLabel(
  status: InstallationStatus | null | undefined,
  s: Dictionary["setup"]
) {
  switch (status) {
    case "completed":
      return s.statusReady;
    case "installing":
      return s.statusInstalling;
    case "error":
      return s.statusFailed;
    case "pending":
    default:
      return s.statusPending;
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
  const { t } = useI18n();
  const s = t.setup;
  const SETUP_STEPS = useMemo(
    () =>
      [
        { id: "connect", label: s.stepConnect },
        { id: "upload", label: s.stepUpload },
        { id: "update", label: s.stepUpdate },
        { id: "install", label: s.stepInstall },
        { id: "configure", label: s.stepConfigure },
        { id: "finalize", label: s.stepFinalize },
      ] as const,
    [t]
  );
  const params = useParams<{ id: string }>();
  const serverId = params.id;

  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<UiPhase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [vlessUrl, setVlessUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [sniPreset, setSniPreset] = useState<SniPresetValue | string>(
    DEFAULT_SNI_DOMAIN
  );
  const [customSni, setCustomSni] = useState("");
  const [copied, setCopied] = useState(false);
  const [relayDialogOpen, setRelayDialogOpen] = useState(false);
  const [relayChildId, setRelayChildId] = useState<string | null>(null);
  const [exitServer, setExitServer] = useState<{
    id: string;
    name: string;
    ip_address: string;
  } | null>(null);
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
      setError(fetchError?.message ?? s.serverNotFound);
      setServer(null);
      setLoading(false);
      return;
    }

    const nextServer = data as Server;
    setServer(nextServer);

    const sniState = getSniPresetFromDomain(nextServer.sni_domain);
    setSniPreset(sniState.preset);
    setCustomSni(sniState.customValue);

    if (nextServer.vless_config_url) {
      clearRememberedSetupFailure(serverId);
      setVlessUrl(nextServer.vless_config_url);
      setPhase("success");
      setActiveStep(SETUP_STEPS.length);
      void generateQr(nextServer.vless_config_url);
    } else if (nextServer.installation_status === "error") {
      setPhase("error");
      const remembered = readRememberedSetupFailure(serverId);
      // Keep a more specific live error if already set; otherwise restore last failure.
      setError((prev) => {
        if (prev && prev !== s.previousFailed) return prev;
        return remembered.message || s.previousFailed;
      });
      if (remembered.diagnostics) {
        setDiagnostics((prev) => prev || remembered.diagnostics);
      }
    } else if (nextServer.installation_status === "installing") {
      setPhase("running");
      setActiveStep(2);
    } else {
      setPhase("idle");
    }

    if (nextServer.role === "relay" && nextServer.exit_server_id) {
      const { data: exitRow } = await supabase
        .from("servers")
        .select("id, name, ip_address")
        .eq("id", nextServer.exit_server_id)
        .maybeSingle();
      setExitServer(exitRow ?? null);
      setRelayChildId(null);
    } else if (isRuRelayEnabled() && nextServer.role !== "relay") {
      const { data: child } = await supabase
        .from("servers")
        .select("id")
        .eq("exit_server_id", nextServer.id)
        .eq("role", "relay")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRelayChildId(child?.id ?? null);
      setExitServer(null);
    } else {
      setRelayChildId(null);
      setExitServer(null);
    }

    setLoading(false);
  }, [SETUP_STEPS.length, generateQr, s.previousFailed, s.serverNotFound, serverId]);

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

  const saveSniDomain = useCallback(async () => {
    if (!server) throw new Error("Server not loaded");
    const sniDomain = resolveSniDomain(sniPreset, customSni);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("servers")
      .update({ sni_domain: sniDomain })
      .eq("id", server.id);
    if (updateError) throw updateError;
    setServer({ ...server, sni_domain: sniDomain });
    return sniDomain;
  }, [customSni, server, sniPreset]);

  const runSetup = useCallback(async () => {
    if (!server) return;
    const isRelay = server.role === "relay";

    setError("");
    setPhase("running");
    setCopied(false);
    setDiagnostics("");
    clearRememberedSetupFailure(serverId);
    startProgressAnimation();

    let latestDiagnostics = "";
    let latestApiError = "";

    try {
      if (!isRelay) {
        await saveSniDomain();
      }

      const endpoint = isRelay
        ? `/api/servers/${serverId}/relay/install`
        : `/api/servers/${serverId}/setup`;

      const response = await fetch(endpoint, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        vlessConfigUrl?: string;
        diagnostics?: string;
        error?: string;
        message?: string;
      };

      clearStepTimer();

      if (payload.diagnostics) {
        latestDiagnostics = payload.diagnostics;
        setDiagnostics(payload.diagnostics);
      }
      if (payload.error) {
        latestApiError = payload.error;
      }

      if (!response.ok || !payload.success || !payload.vlessConfigUrl) {
        throw new Error(
          formatSetupError(payload.error || s.setupFailed, s.errors)
        );
      }

      clearRememberedSetupFailure(serverId);
      setActiveStep(SETUP_STEPS.length);
      setVlessUrl(payload.vlessConfigUrl);
      await generateQr(payload.vlessConfigUrl);
      setPhase("success");
      await loadServer();
    } catch (err) {
      clearStepTimer();
      setPhase("error");
      const message = formatSetupError(
        err instanceof Error ? err.message : s.setupFailed,
        s.errors
      );
      // Prefer API diagnostics; if empty (early SSH fail), keep the error text visible in logs.
      const diagForUi =
        latestDiagnostics ||
        latestApiError ||
        (err instanceof Error ? err.message : "") ||
        message;
      setError(message);
      setDiagnostics(diagForUi);
      rememberSetupFailure(serverId, message, diagForUi);
      await loadServer();
    }
  }, [
    SETUP_STEPS.length,
    clearStepTimer,
    generateQr,
    loadServer,
    s.errors,
    s.setupFailed,
    saveSniDomain,
    server,
    serverId,
    startProgressAnimation,
  ]);

  const handleCopy = async () => {
    if (!vlessUrl) return;
    await navigator.clipboard.writeText(vlessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRelayServer = server?.role === "relay";
  const canAddRelay =
    isRuRelayEnabled() &&
    Boolean(server) &&
    !isRelayServer &&
    phase === "success" &&
    Boolean(vlessUrl);

  const canStart = useMemo(() => {
    if (!server) return false;
    if (phase === "running") return false;
    return (
      server.installation_status !== "completed" ||
      phase === "error" ||
      !vlessUrl
    );
  }, [phase, server, vlessUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  if (!server) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-destructive">{error || s.serverNotFound}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">{s.backServers}</Link>
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
            {s.back}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRelayServer ? s.relayTitle : s.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isRelayServer ? s.relaySubtitle : s.subtitle}
          </p>
          {isRelayServer && exitServer && (
            <p className="mt-2 text-sm text-muted-foreground">
              {s.linkedExit
                .replace("{name}", exitServer.name)
                .replace("{ip}", exitServer.ip_address)}
            </p>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            statusClass(server.installation_status)
          )}
        >
          {statusLabel(server.installation_status, s)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerIcon className="h-5 w-5" />
            {server.name}
          </CardTitle>
          <CardDescription>{s.details}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{s.ip}</p>
            <p className="font-medium">{server.ip_address}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{s.sshPort}</p>
            <p className="font-medium">{server.ssh_port}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{s.sshUsername}</p>
            <p className="font-medium">{server.ssh_username || "root"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{s.sni}</p>
            <p className="font-medium">
              {displaySniDomain(server.sni_domain)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{s.vlessPort}</p>
            <p className="font-medium">{displayVlessPort(server.vless_port)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{s.installation}</CardTitle>
          <CardDescription>{s.installationHint}</CardDescription>
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

          {(phase === "idle" || phase === "error") && !isRelayServer && (
            <SniDomainField
              preset={sniPreset}
              customValue={customSni}
              onPresetChange={setSniPreset}
              onCustomValueChange={setCustomSni}
              disabled={false}
            />
          )}

          {phase === "idle" && (
            <Button onClick={() => void runSetup()} className="w-full sm:w-auto">
              {s.setupVpn}
            </Button>
          )}

          {phase === "running" && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {s.installing}
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <DiagnosticsPanel
                output={diagnostics}
                error={error || s.statusFailed}
                failed
              />
              <Button
                variant="outline"
                onClick={() => void runSetup()}
                disabled={!canStart}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {s.retry}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {phase === "success" && vlessUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-400">
              {s.readyTitle}
            </CardTitle>
            <CardDescription>{s.readyHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrDataUrl && (
              <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={s.qrAlt}
                  width={280}
                  height={280}
                  className="h-[280px] w-[280px]"
                />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {s.sniTip.replace("{sni}", displaySniDomain(server.sni_domain))}
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isRelayServer ? s.relayUrl : s.directUrl}
              </p>
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
                  {copied ? t.common.copied : t.common.copy}
                </Button>
              </div>
            </div>

            <DiagnosticsPanel output={diagnostics} error={error} />

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard">{s.backServers}</Link>
              </Button>
              <Button variant="outline" onClick={() => void runSetup()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {s.reRun}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canAddRelay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{s.relayCardTitle}</CardTitle>
            <CardDescription>{s.relayCardHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relayChildId ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/dashboard/servers/${relayChildId}/setup`}>
                    {s.openRelay}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRelayDialogOpen(true)}
                >
                  {s.replaceRelay}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setRelayDialogOpen(true)}>
                {s.addRelay}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isRuRelayEnabled() && !isRelayServer && (
        <AddRuRelayDialog
          open={relayDialogOpen}
          exitServerId={server.id}
          exitServerName={server.name}
          onClose={() => setRelayDialogOpen(false)}
        />
      )}
    </div>
  );
}
