import { useEffect, useState } from "react";

import { MAP_READINESS_MESSAGES, type MapReadinessStatus } from "../map/mapReadiness";
import { BrandGlyph } from "./BrandMark";

export const LOADING_FADE_MS = 500;

function messageFor(status: MapReadinessStatus): string {
  if (status === "ready" || status === "failed") return MAP_READINESS_MESSAGES.preparing;
  return MAP_READINESS_MESSAGES[status];
}

/**
 * Mirrors the static markup in index.html so the hand-off from HTML to React is seamless.
 * It leaves only when the map reports ready (or failed), fading out over ~500 ms.
 */
export function LoadingScreen({ status }: { status: MapReadinessStatus }) {
  const leaving = status === "ready" || status === "failed";
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!leaving) return;
    const timeoutId = window.setTimeout(() => setMounted(false), LOADING_FADE_MS + 80);
    return () => window.clearTimeout(timeoutId);
  }, [leaving]);

  if (!mounted) return null;

  return (
    <div
      className={`boot-screen${leaving ? " boot-screen--leaving" : ""}`}
      data-testid="loading-screen"
      data-status={status}
      aria-hidden={leaving}
    >
      <div className="boot-screen__content">
        <BrandGlyph className="boot-screen__glyph" />
        <p className="boot-screen__title">Terra Através</p>
        <p className="boot-screen__status" role="status" aria-live="polite">
          {messageFor(status)}
        </p>
      </div>
    </div>
  );
}
