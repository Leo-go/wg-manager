type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

export function trackEvent(eventName: string, props?: EventProps) {
  if (typeof window === "undefined") return;

  const safeProps = Object.fromEntries(
    Object.entries(props ?? {}).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;

  if (typeof window.plausible === "function") {
    window.plausible(eventName, Object.keys(safeProps).length ? { props: safeProps } : undefined);
  }

  window.dispatchEvent(
    new CustomEvent("wg:analytics", {
      detail: { eventName, props: safeProps },
    })
  );
}
