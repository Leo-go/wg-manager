"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Server as ServerIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InstallationStatus, Profile, Server } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/analytics/events";
import {
  DEFAULT_SNI_DOMAIN,
  displayRelaySniDomain,
  displaySniDomain,
  displayVlessPort,
  getSniPresetFromDomain,
  resolveSniDomain,
  type SniPresetValue,
} from "@/lib/constants/sni";
import {
  TIMEWEB_DOMAINS_PARTNER_URL,
  TIMEWEB_PARTNER_URL,
} from "@/lib/constants/partner";
import {
  isRuRelayEnabled,
  isYandexCdnEnabled,
} from "@/lib/constants/features";
import { AddRuRelayDialog } from "@/components/servers/add-ru-relay-dialog";
import { YandexCdnSetupDialog } from "@/components/servers/yandex-cdn-setup-dialog";
import { YandexCdnNextStepsDialog } from "@/components/servers/yandex-cdn-next-steps-dialog";
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
import { parseSetupStreamLine, SETUP_STEP_COUNT } from "@/lib/setup/progress";

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
  if (/missing ssh_password|ssh_password is required|No SSH credentials/i.test(message)) {
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

async function generateQrDataUrl(url: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(url, {
    width: 280,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
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
  const [vlessTcpUrl, setVlessTcpUrl] = useState("");
  const [tcpQrDataUrl, setTcpQrDataUrl] = useState("");
  const [relayViaUrl, setRelayViaUrl] = useState("");
  const [relayViaQrDataUrl, setRelayViaQrDataUrl] = useState("");
  const [relayViaTcpUrl, setRelayViaTcpUrl] = useState("");
  const [relayViaTcpQrDataUrl, setRelayViaTcpQrDataUrl] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [sniPreset, setSniPreset] = useState<SniPresetValue | string>(
    DEFAULT_SNI_DOMAIN
  );
  const [customSni, setCustomSni] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedTcp, setCopiedTcp] = useState(false);
  const [copiedRelayVia, setCopiedRelayVia] = useState(false);
  const [copiedRelayViaTcp, setCopiedRelayViaTcp] = useState(false);
  const [stuckInstalling, setStuckInstalling] = useState(false);
  const [relayDialogOpen, setRelayDialogOpen] = useState(false);
  const [relayChildId, setRelayChildId] = useState<string | null>(null);
  const [relayChildStatus, setRelayChildStatus] =
    useState<InstallationStatus | null>(null);
  const [cdnDialogOpen, setCdnDialogOpen] = useState(false);
  const [cdnNextStepsOpen, setCdnNextStepsOpen] = useState(false);
  const [cdnUrl, setCdnUrl] = useState("");
  const [cdnQrDataUrl, setCdnQrDataUrl] = useState("");
  const [cdnStatus, setCdnStatus] = useState<string | null>(null);
  const [cdnDomain, setCdnDomain] = useState("");
  const [cdnOriginDomain, setCdnOriginDomain] = useState("");
  const [cdnRelayDomain, setCdnRelayDomain] = useState("");
  const [cdnOriginIp, setCdnOriginIp] = useState("");
  const [cdnFeatureAllowed, setCdnFeatureAllowed] = useState(false);
  const [copiedCdn, setCopiedCdn] = useState(false);
  const trackedEventsRef = useRef<Record<string, boolean>>({});
  const [exitServer, setExitServer] = useState<{
    id: string;
    name: string;
    ip_address: string;
  } | null>(null);

  const generateQr = useCallback(async (url: string) => {
    const dataUrl = await generateQrDataUrl(url);
    setQrDataUrl(dataUrl);
    return dataUrl;
  }, []);

  const generateRelayViaQr = useCallback(async (url: string) => {
    const dataUrl = await generateQrDataUrl(url);
    setRelayViaQrDataUrl(dataUrl);
    return dataUrl;
  }, []);

  const generateTcpQr = useCallback(async (url: string) => {
    const dataUrl = await generateQrDataUrl(url);
    setTcpQrDataUrl(dataUrl);
    return dataUrl;
  }, []);

  const generateRelayViaTcpQr = useCallback(async (url: string) => {
    const dataUrl = await generateQrDataUrl(url);
    setRelayViaTcpQrDataUrl(dataUrl);
    return dataUrl;
  }, []);

  const generateCdnQr = useCallback(async (url: string) => {
    const dataUrl = await generateQrDataUrl(url);
    setCdnQrDataUrl(dataUrl);
    return dataUrl;
  }, []);

  const loadServer = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("servers")
      .select(
        "id, user_id, name, ip_address, ssh_port, ssh_username, status, installation_status, created_at, updated_at, sni_domain, vless_port, vless_config_url, vless_tcp_config_url, role, exit_server_id, relay_vless_config_url, relay_status, cdn_status, cdn_vless_config_url, cdn_domain, cdn_origin_domain, cdn_relay_domain, cdn_origin_ip"
      )
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
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("enable_yandex_cdn")
      .eq("id", nextServer.user_id)
      .maybeSingle();
    setCdnFeatureAllowed((profileRow as Profile | null)?.enable_yandex_cdn === true);

    const sniState = getSniPresetFromDomain(nextServer.sni_domain);
    setSniPreset(sniState.preset);
    setCustomSni(sniState.customValue);

    const nextCdnUrl = nextServer.cdn_vless_config_url?.trim() || "";
    setCdnUrl(nextCdnUrl);
    setCdnStatus(nextServer.cdn_status?.trim() || null);
    setCdnDomain(nextServer.cdn_domain?.trim() || "");
    setCdnOriginDomain(nextServer.cdn_origin_domain?.trim() || "");
    setCdnRelayDomain(nextServer.cdn_relay_domain?.trim() || "");
    setCdnOriginIp(nextServer.cdn_origin_ip?.trim() || "");
    if (nextCdnUrl) {
      void generateCdnQr(nextCdnUrl);
    } else {
      setCdnQrDataUrl("");
    }

    if (nextServer.vless_config_url) {
      clearRememberedSetupFailure(serverId);
      setStuckInstalling(false);
      setVlessUrl(nextServer.vless_config_url);
      setPhase("success");
      setActiveStep(SETUP_STEP_COUNT);
      void generateQr(nextServer.vless_config_url);
      const tcpUrl = nextServer.vless_tcp_config_url?.trim() || "";
      setVlessTcpUrl(tcpUrl);
      if (tcpUrl) {
        void generateTcpQr(tcpUrl);
      } else {
        setTcpQrDataUrl("");
      }
      const viaUrl = nextServer.relay_vless_config_url?.trim() || "";
      setRelayViaUrl(viaUrl);
      if (viaUrl) {
        void generateRelayViaQr(viaUrl);
      } else {
        setRelayViaQrDataUrl("");
      }
    } else if (nextServer.installation_status === "error") {
      setStuckInstalling(false);
      setVlessTcpUrl("");
      setTcpQrDataUrl("");
      setRelayViaUrl("");
      setRelayViaQrDataUrl("");
      setRelayViaTcpUrl("");
      setRelayViaTcpQrDataUrl("");
      setPhase("error");
      const remembered = readRememberedSetupFailure(serverId);
      setError((prev) => {
        if (prev && prev !== s.previousFailed) return prev;
        return remembered.message || s.previousFailed;
      });
      if (remembered.diagnostics) {
        setDiagnostics((prev) => prev || remembered.diagnostics);
      }
    } else if (nextServer.installation_status === "installing") {
      setStuckInstalling(true);
      setVlessTcpUrl("");
      setTcpQrDataUrl("");
      setRelayViaUrl("");
      setRelayViaQrDataUrl("");
      setRelayViaTcpUrl("");
      setRelayViaTcpQrDataUrl("");
      setPhase("idle");
    } else {
      setStuckInstalling(false);
      setVlessTcpUrl("");
      setTcpQrDataUrl("");
      setRelayViaUrl("");
      setRelayViaQrDataUrl("");
      setRelayViaTcpUrl("");
      setRelayViaTcpQrDataUrl("");
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
      setRelayChildStatus(null);
      setRelayViaTcpUrl("");
      setRelayViaTcpQrDataUrl("");
    } else if (isRuRelayEnabled() && nextServer.role !== "relay") {
      const { data: child } = await supabase
        .from("servers")
        .select("id, installation_status, vless_config_url, vless_tcp_config_url")
        .eq("exit_server_id", nextServer.id)
        .eq("role", "relay")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const viaUrl = child?.vless_config_url?.trim() || "";
      setRelayViaUrl(viaUrl);
      if (viaUrl) {
        void generateRelayViaQr(viaUrl);
      } else {
        setRelayViaQrDataUrl("");
      }
      const viaTcp = child?.vless_tcp_config_url?.trim() || "";
      setRelayViaTcpUrl(viaTcp);
      if (viaTcp) {
        void generateRelayViaTcpQr(viaTcp);
      } else {
        setRelayViaTcpQrDataUrl("");
      }
      setRelayChildId(child?.id ?? null);
      setRelayChildStatus(
        (child?.installation_status as InstallationStatus | null) ?? null
      );
      setExitServer(null);
    } else {
      setRelayViaUrl("");
      setRelayViaQrDataUrl("");
      setRelayViaTcpUrl("");
      setRelayViaTcpQrDataUrl("");
      setRelayChildId(null);
      setRelayChildStatus(null);
      setExitServer(null);
    }

    setLoading(false);
  }, [
    generateCdnQr,
    generateQr,
    generateRelayViaQr,
    generateRelayViaTcpQr,
    generateTcpQr,
    s.previousFailed,
    s.serverNotFound,
    serverId,
  ]);

  useEffect(() => {
    void loadServer();
  }, [loadServer]);

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
    setActiveStep(0);
    setCopied(false);
    setCopiedTcp(false);
    setCopiedRelayVia(false);
    setCopiedRelayViaTcp(false);
    setStuckInstalling(false);
    setDiagnostics("");
    clearRememberedSetupFailure(serverId);

    let latestDiagnostics = "";
    let latestApiError = "";

    try {
      if (!isRelay) {
        await saveSniDomain();
      }

      const endpoint = isRelay
        ? `/api/servers/${serverId}/relay/install?stream=1`
        : `/api/servers/${serverId}/setup?stream=1`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/x-ndjson" },
      });

      const contentType = response.headers.get("content-type") ?? "";

      // Early JSON errors (auth/validation) before the stream starts
      if (!contentType.includes("application/x-ndjson")) {
        const payload = (await response.json()) as {
          success?: boolean;
          vlessConfigUrl?: string;
          vlessTcpConfigUrl?: string;
          diagnostics?: string;
          error?: string;
        };
        if (payload.diagnostics) {
          latestDiagnostics = payload.diagnostics;
          setDiagnostics(payload.diagnostics);
        }
        if (payload.error) latestApiError = payload.error;
        if (!response.ok || !payload.success || !payload.vlessConfigUrl) {
          throw new Error(
            formatSetupError(payload.error || s.setupFailed, s.errors)
          );
        }
        clearRememberedSetupFailure(serverId);
        setActiveStep(SETUP_STEP_COUNT);
        setVlessUrl(payload.vlessConfigUrl);
        await generateQr(payload.vlessConfigUrl);
        const tcpFromJson = payload.vlessTcpConfigUrl?.trim() || "";
        setVlessTcpUrl(tcpFromJson);
        if (tcpFromJson) {
          await generateTcpQr(tcpFromJson);
        } else {
          setTcpQrDataUrl("");
        }
        setPhase("success");
        await loadServer();
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(formatSetupError(s.setupFailed, s.errors));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedUrl = "";
      let completedTcpUrl = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseSetupStreamLine(line);
          if (!event) continue;

          if (event.type === "step") {
            setActiveStep((prev) => Math.max(prev, event.step));
          } else if (event.type === "done") {
            completedUrl = event.vlessConfigUrl;
            completedTcpUrl = event.vlessTcpConfigUrl?.trim() || "";
            if (event.diagnostics) {
              latestDiagnostics = event.diagnostics;
              setDiagnostics(event.diagnostics);
            }
          } else if (event.type === "error") {
            latestApiError = event.error;
            if (event.diagnostics) {
              latestDiagnostics = event.diagnostics;
              setDiagnostics(event.diagnostics);
            }
            throw new Error(formatSetupError(event.error, s.errors));
          }
        }
      }

      if (buffer.trim()) {
        const event = parseSetupStreamLine(buffer);
        if (event?.type === "done") {
          completedUrl = event.vlessConfigUrl;
          completedTcpUrl = event.vlessTcpConfigUrl?.trim() || "";
          if (event.diagnostics) {
            latestDiagnostics = event.diagnostics;
            setDiagnostics(event.diagnostics);
          }
        } else if (event?.type === "error") {
          latestApiError = event.error;
          if (event.diagnostics) {
            latestDiagnostics = event.diagnostics;
            setDiagnostics(event.diagnostics);
          }
          throw new Error(formatSetupError(event.error, s.errors));
        } else if (event?.type === "step") {
          setActiveStep((prev) => Math.max(prev, event.step));
        }
      }

      if (!completedUrl) {
        throw new Error(
          formatSetupError(latestApiError || s.setupFailed, s.errors)
        );
      }

      clearRememberedSetupFailure(serverId);
      setActiveStep(SETUP_STEP_COUNT);
      setVlessUrl(completedUrl);
      await generateQr(completedUrl);
      setVlessTcpUrl(completedTcpUrl);
      if (completedTcpUrl) {
        await generateTcpQr(completedTcpUrl);
      } else {
        setTcpQrDataUrl("");
      }
      setPhase("success");
      await loadServer();
    } catch (err) {
      setPhase("error");
      const message = formatSetupError(
        err instanceof Error ? err.message : s.setupFailed,
        s.errors
      );
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
    generateQr,
    generateTcpQr,
    loadServer,
    s.errors,
    s.setupFailed,
    saveSniDomain,
    server,
    serverId,
  ]);

  const handleCopy = async () => {
    if (!vlessUrl) return;
    await navigator.clipboard.writeText(vlessUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTcp = async () => {
    if (!vlessTcpUrl) return;
    await navigator.clipboard.writeText(vlessTcpUrl);
    setCopiedTcp(true);
    setTimeout(() => setCopiedTcp(false), 2000);
  };

  const handleCopyRelayVia = async () => {
    if (!relayViaUrl) return;
    await navigator.clipboard.writeText(relayViaUrl);
    setCopiedRelayVia(true);
    setTimeout(() => setCopiedRelayVia(false), 2000);
  };

  const handleCopyRelayViaTcp = async () => {
    if (!relayViaTcpUrl) return;
    await navigator.clipboard.writeText(relayViaTcpUrl);
    setCopiedRelayViaTcp(true);
    setTimeout(() => setCopiedRelayViaTcp(false), 2000);
  };

  const handleCopyCdn = async () => {
    if (!cdnUrl) return;
    await navigator.clipboard.writeText(cdnUrl);
    setCopiedCdn(true);
    setTimeout(() => setCopiedCdn(false), 2000);
  };

  const isRelayServer = server?.role === "relay";
  const canAddRelay =
    isRuRelayEnabled() &&
    Boolean(server) &&
    !isRelayServer &&
    phase === "success" &&
    Boolean(vlessUrl);

  const canAddCdn =
    isYandexCdnEnabled() &&
    cdnFeatureAllowed &&
    Boolean(server) &&
    !isRelayServer &&
    phase === "success" &&
    Boolean(vlessUrl);

  useEffect(() => {
    if (!server || isRelayServer || phase !== "success" || !vlessUrl) return;
    const key = `direct-ready:${server.id}`;
    if (trackedEventsRef.current[key]) return;
    trackedEventsRef.current[key] = true;
    trackEvent("direct_setup_ready", { serverId: server.id });
  }, [isRelayServer, phase, server, vlessUrl]);

  useEffect(() => {
    if (!relayChildId) return;
    const key = `relay-visible:${relayChildId}`;
    if (trackedEventsRef.current[key]) return;
    trackedEventsRef.current[key] = true;
    trackEvent("relay_progress_visible", {
      relayId: relayChildId,
      status: relayChildStatus ?? "unknown",
    });
  }, [relayChildId, relayChildStatus]);

  useEffect(() => {
    if (!server || !canAddCdn) return;
    const key = `cdn-visible:${server.id}`;
    if (trackedEventsRef.current[key]) return;
    trackedEventsRef.current[key] = true;
    trackEvent("cdn_access_visible", {
      serverId: server.id,
      cdnStatus: cdnStatus ?? "none",
    });
  }, [canAddCdn, cdnStatus, server]);

  useEffect(() => {
    if (!server || cdnStatus !== "ready" || !cdnUrl) return;
    const key = `cdn-ready:${server.id}`;
    if (trackedEventsRef.current[key]) return;
    trackedEventsRef.current[key] = true;
    trackEvent("cdn_install_ready", { serverId: server.id });
  }, [cdnStatus, cdnUrl, server]);

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
              {isRelayServer
                ? displayRelaySniDomain(server.sni_domain)
                : displaySniDomain(server.sni_domain)}
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
            <div className="space-y-3">
              {stuckInstalling && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {s.installingStuck}
                </p>
              )}
              <Button onClick={() => void runSetup()} className="w-full sm:w-auto">
                {isRelayServer ? s.setupRelay : s.setupVpn}
              </Button>
            </div>
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
              {isRelayServer ? s.readyTitleRelay : s.readyTitle}
            </CardTitle>
            <CardDescription>
              {isRelayServer ? s.readyHintRelay : s.readyHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRelayServer && (
              <p className="text-sm text-muted-foreground">
                {s.relayTransportHint}
              </p>
            )}

            {qrDataUrl && (
              <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={isRelayServer ? s.relayQrAlt : s.qrAlt}
                  width={280}
                  height={280}
                  className="h-[280px] w-[280px]"
                />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {(isRelayServer ? s.relaySniTip : s.sniTip).replace(
                "{sni}",
                isRelayServer
                  ? displayRelaySniDomain(server.sni_domain)
                  : displaySniDomain(server.sni_domain)
              )}
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isRelayServer ? s.relayUrlXhttp : s.directUrl}
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

            {isRelayServer && vlessTcpUrl && (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{s.relayUrlTcp}</p>
                {tcpQrDataUrl && (
                  <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tcpQrDataUrl}
                      alt={s.relayQrAlt}
                      width={280}
                      height={280}
                      className="h-[280px] w-[280px]"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">
                    {vlessTcpUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyTcp()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedTcp ? t.common.copied : t.common.copy}
                  </Button>
                </div>
              </div>
            )}

            {!isRelayServer && relayViaUrl && (
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{s.viaRelay}</p>
                <p className="text-xs text-muted-foreground">
                  {s.relayTransportHint}
                </p>
                {relayViaQrDataUrl && (
                  <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={relayViaQrDataUrl}
                      alt={s.relayQrAlt}
                      width={280}
                      height={280}
                      className="h-[280px] w-[280px]"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">
                    {relayViaUrl}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyRelayVia()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedRelayVia ? t.common.copied : t.common.copy}
                  </Button>
                </div>
                {relayViaTcpUrl && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-medium">{s.viaRelayTcp}</p>
                    {relayViaTcpQrDataUrl && (
                      <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={relayViaTcpQrDataUrl}
                          alt={s.relayQrAlt}
                          width={280}
                          height={280}
                          className="h-[280px] w-[280px]"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">
                        {relayViaTcpUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleCopyRelayViaTcp()}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedRelayViaTcp ? t.common.copied : t.common.copy}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/dashboard/servers/${relayChildId}/setup`}>
                      {relayChildStatus === "completed"
                        ? s.openRelay
                        : s.openRelaySetup}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRelayDialogOpen(true)}
                  >
                    {s.replaceRelay}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.replaceRelayHint}
                </p>
              </div>
            ) : (
              <Button onClick={() => setRelayDialogOpen(true)}>
                {s.addRelay}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {canAddCdn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.cdn.cardTitle}</CardTitle>
            <CardDescription>{t.cdn.cardHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{t.cdn.shopTitle}</p>
              <ul className="list-disc space-y-1.5 pl-4">
                <li>
                  {t.cdn.shopDomain}{" "}
                  <a
                    className="text-foreground underline underline-offset-2"
                    href="https://www.reg.ru/"
                    target="_blank"
                    rel="noopener"
                  >
                    REG.RU
                  </a>
                  {" · "}
                  <a
                    className="text-foreground underline underline-offset-2"
                    href={TIMEWEB_DOMAINS_PARTNER_URL}
                    target="_blank"
                    rel="noopener"
                  >
                    Timeweb Domains
                  </a>
                </li>
                <li>{t.cdn.shopExit}</li>
                <li>
                  {t.cdn.shopOrigin}{" "}
                  <a
                    className="text-foreground underline underline-offset-2"
                    href={TIMEWEB_PARTNER_URL}
                    target="_blank"
                    rel="noopener"
                  >
                    Timeweb Cloud
                  </a>
                </li>
                <li>
                  {t.cdn.shopYandex}{" "}
                  <a
                    className="text-foreground underline underline-offset-2"
                    href="https://console.cloud.yandex.ru/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    console.cloud.yandex.ru
                  </a>
                </li>
                <li>{t.cdn.shopDns}</li>
              </ul>
            </div>

            {cdnUrl && cdnStatus === "ready" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-green-400">
                    {t.cdn.readyTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.cdn.readyHint}
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => setCdnNextStepsOpen(true)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t.cdn.whatNext}
                </Button>

                {cdnQrDataUrl && (
                  <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cdnQrDataUrl}
                      alt={t.cdn.clientUrl}
                      width={280}
                      height={280}
                      className="h-[280px] w-[280px]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t.cdn.clientUrl}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">
                      {cdnUrl}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCopyCdn()}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copiedCdn ? t.common.copied : t.common.copy}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {t.cdn.checklistTitle}
                  </p>
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>{t.cdn.checklistDns}</li>
                    <li>{t.cdn.checklistCert}</li>
                    <li>{t.cdn.checklistCdn}</li>
                    <li>{t.cdn.checklistCname}</li>
                    <li>{t.cdn.checklistTest}</li>
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href="https://yandex.cloud/ru/docs/certificate-manager/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.cdn.docsCert}
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href="https://yandex.cloud/ru/docs/cdn/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.cdn.docsCdn}
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href="https://yandex.cloud/ru/docs/cdn/operations/resources/create-resource"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.cdn.docsCreate}
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCdnNextStepsOpen(true)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t.cdn.whatNext}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCdnDialogOpen(true)}
                  >
                    {t.cdn.replaceSetup}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  trackEvent("cdn_setup_opened", { source: "server_setup_card" });
                  setCdnDialogOpen(true);
                }}
              >
                {t.cdn.openSetup}
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

      {isYandexCdnEnabled() && cdnFeatureAllowed && !isRelayServer && (
        <YandexCdnSetupDialog
          open={cdnDialogOpen}
          exitServerId={server.id}
          exitServerIp={server.ip_address}
          onClose={() => setCdnDialogOpen(false)}
          onInstalled={(result) => {
            setCdnUrl(result.vlessConfigUrl);
            setCdnStatus("ready");
            setCdnDomain(result.cdnDomain);
            setCdnOriginDomain(result.originDomain);
            setCdnRelayDomain(result.relayDomain);
            setCdnOriginIp(result.originIp);
            void generateCdnQr(result.vlessConfigUrl);
            setCdnNextStepsOpen(true);
          }}
        />
      )}

      {isYandexCdnEnabled() && cdnFeatureAllowed && !isRelayServer && (
        <YandexCdnNextStepsDialog
          open={cdnNextStepsOpen}
          onClose={() => setCdnNextStepsOpen(false)}
          cdnDomain={cdnDomain}
          originDomain={cdnOriginDomain}
          relayDomain={cdnRelayDomain}
          originIp={cdnOriginIp}
          exitIp={server.ip_address}
        />
      )}
    </div>
  );
}
