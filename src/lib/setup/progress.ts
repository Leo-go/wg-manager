/**
 * Real install progress for VPN / RU Relay setup UI.
 * Scripts emit `WG_STEP=N` (0–5). API may also emit synthetic steps for SSH.
 */

export const SETUP_STEP_COUNT = 6;

/** 0=connect … 5=finalize — matches UI checklist order */
export type SetupStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type SetupStreamEvent =
  | { type: "step"; step: SetupStepIndex }
  | {
      type: "done";
      vlessConfigUrl: string;
      /** Classic TCP Reality fallback (RU relay dual inbound) */
      vlessTcpConfigUrl?: string;
      diagnostics: string;
      message?: string;
    }
  | { type: "error"; error: string; diagnostics?: string };

/** Map legacy `[n/6]` script lines → checklist index (fallback if WG_STEP missing). */
export function stepFromBracketMarker(n: number): SetupStepIndex | null {
  // Script: [0/6] time, [1/6] apt, [2/6] deps, [3/6] xray, [4/6] uuid, [5/6] keys, [6/6] config
  if (n <= 0) return 1; // upload / script running
  if (n <= 2) return 2; // packages
  if (n === 3) return 3; // install xray
  if (n <= 5) return 4; // keys / configure
  return 5; // write config / finalize
}

export function parseProgressFromChunk(
  chunk: string,
  onStep: (step: SetupStepIndex) => void
): void {
  const wgMatches = chunk.matchAll(/WG_STEP=(\d+)/g);
  for (const m of wgMatches) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n >= 0 && n <= 5) {
      onStep(n as SetupStepIndex);
    }
  }

  const bracketMatches = chunk.matchAll(/\[(\d)\/6\]/g);
  for (const m of bracketMatches) {
    const mapped = stepFromBracketMarker(Number(m[1]));
    if (mapped !== null) onStep(mapped);
  }

  if (/VLESS_CONFIG_URL=vless:\/\//i.test(chunk) || /RELAY_READY=1/.test(chunk)) {
    onStep(5);
  }
}

export function encodeSetupStreamEvent(event: SetupStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseSetupStreamLine(line: string): SetupStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as SetupStreamEvent;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.type === "step" ||
        parsed.type === "done" ||
        parsed.type === "error")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
