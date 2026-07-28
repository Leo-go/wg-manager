"use client";

import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface DiagnosticsPanelProps {
  output: string;
  error?: string;
}

type DiagnosticsKind =
  | "healthy"
  | "ssh-auth"
  | "ssh-network"
  | "ssh-key"
  | "port-in-use"
  | "relay-dependency"
  | "parse-config"
  | "install-script"
  | "unknown";

function buildDiagnostics(kindSource: string) {
  const text = kindSource.toLowerCase();
  const hasExplicitError =
    /setup failed|installation failed|script execution failed|ssh connection failed|unauthorized|server not found|invalid credentials|timed out|connection refused|address already in use|could not parse vless|exit vpn must be ready|relay server not found|not linked to an exit/.test(
      text
    );

  const signals: string[] = [];

  const pushSignal = (label: string, condition: boolean) => {
    if (condition) signals.push(label);
  };

  pushSignal("invalid credentials", /invalid credentials/.test(text));
  pushSignal("connection timed out", /connection timed out|timed out/.test(text));
  pushSignal("connection refused", /connection refused|econnrefused/.test(text));
  pushSignal("host not found", /host not found|enotfound|getaddrinfo/.test(text));
  pushSignal(
    "authorized_keys / platform key",
    /authorized_keys|platform public key|ssh key mode|wg_ssh_private_key|wg_ssh_private_key_passphrase/.test(
      text
    )
  );
  pushSignal(
    "private key / passphrase",
    /cannot parse privatekey|encrypted private openssh key|passphrase|invalid private key/.test(
      text
    )
  );
  pushSignal("port already in use", /port .*already in use|address already in use/.test(text));
  pushSignal("parse vless", /parse vless|could not parse vless/.test(text));
  pushSignal("exit vpn must be ready", /exit vpn must be ready|exit server not found|linked to an exit/.test(text));

  let kind: DiagnosticsKind = "unknown";

  if (!text.trim()) {
    kind = "healthy";
  } else if (!hasExplicitError) {
    kind = "healthy";
  } else if (/could not parse vless|parse vless/.test(text)) {
    kind = "parse-config";
  } else if (/port .*already in use|address already in use/.test(text)) {
    kind = "port-in-use";
  } else if (
    /authorized_keys|platform public key|ssh key mode|wg_ssh_private_key|wg_ssh_private_key_passphrase|cannot parse privatekey|encrypted private openssh key|invalid private key|passphrase/.test(
      text
    )
  ) {
    kind = "ssh-key";
  } else if (/invalid credentials/.test(text)) {
    kind = "ssh-auth";
  } else if (
    /connection timed out|timed out|connection refused|econnrefused|host not found|enotfound|getaddrinfo/.test(
      text
    )
  ) {
    kind = "ssh-network";
  } else if (
    /exit vpn must be ready|exit server not found|linked to an exit/.test(text)
  ) {
    kind = "relay-dependency";
  } else if (/script execution failed|install failed|setup failed|xray failed/.test(text)) {
    kind = "install-script";
  }

  return { kind, signals };
}

export function DiagnosticsPanel({ output, error = "" }: DiagnosticsPanelProps) {
  const { t } = useI18n();
  const source = [error, output].filter(Boolean).join("\n");
  if (!source) return null;

  const { kind, signals } = buildDiagnostics(source);

  const issueTitle =
    kind === "healthy"
      ? t.setup.diagnosticsHealthy
      : kind === "ssh-auth"
        ? t.setup.diagIssueSshAuth
        : kind === "ssh-network"
          ? t.setup.diagIssueSshNetwork
          : kind === "ssh-key"
            ? t.setup.diagIssueSshKey
            : kind === "port-in-use"
              ? t.setup.diagIssuePortInUse
              : kind === "relay-dependency"
                ? t.setup.diagIssueRelayDependency
                : kind === "parse-config"
                  ? t.setup.diagIssueParseConfig
                  : kind === "install-script"
                    ? t.setup.diagIssueInstallScript
                    : t.setup.diagIssueUnknown;

  const nextSteps = (() => {
    switch (kind) {
      case "ssh-auth":
        return [t.setup.diagStepCheckCredentials, t.setup.diagStepRetrySetup];
      case "ssh-network":
        return [t.setup.diagStepCheckIpPort, t.setup.diagStepRetrySetup];
      case "ssh-key":
        return [
          t.setup.diagStepCheckPublicKey,
          t.setup.diagStepCheckCredentials,
          t.setup.diagStepRetrySetup,
        ];
      case "port-in-use":
        return [t.setup.diagStepCheckPortConflict, t.setup.diagStepRetrySetup];
      case "relay-dependency":
        return [t.setup.diagStepCheckExitReady, t.setup.diagStepRetrySetup];
      case "parse-config":
        return [t.setup.diagStepReviewRawOutput, t.setup.diagStepRetrySetup];
      case "install-script":
        return [
          t.setup.diagStepReviewRawOutput,
          t.setup.diagStepTryAnotherSni,
          t.setup.diagStepRetrySetup,
        ];
      case "healthy":
        return [t.setup.diagStepTryAnotherSni];
      case "unknown":
      default:
        return [t.setup.diagStepReviewRawOutput, t.setup.diagStepRetrySetup];
    }
  })();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t.setup.diagnosticsTitle}</p>

      <div
        className={cn(
          "rounded-md border p-3",
          kind === "healthy"
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{t.setup.diagnosticsDetectedIssue}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              kind === "healthy"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            )}
          >
            {kind === "healthy"
              ? t.setup.diagnosticsHealthy
              : t.setup.diagnosticsNeedsAttention}
          </span>
        </div>
        <p className="text-sm">{issueTitle}</p>
      </div>

      {nextSteps.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.setup.diagnosticsNextSteps}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {signals.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.setup.diagnosticsSignals}</p>
          <div className="flex flex-wrap gap-2">
            {signals.map((signal) => (
              <span
                key={signal}
                className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="rounded-md border border-border bg-muted/40 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t.setup.diagnosticsRawOutput}
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
          {output}
        </pre>
      </details>
    </div>
  );
}
