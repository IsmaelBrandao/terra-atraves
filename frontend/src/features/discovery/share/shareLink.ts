import type { GeoPoint } from "../../../map/initialView";

function compactCoordinate(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Shareable URL built from the ORIGIN, so the recipient can decide to dig again. */
export function buildShareUrl(origin: GeoPoint, base: string = window.location.href): string {
  const url = new URL(base);
  url.hash = "";
  url.search = "";
  url.searchParams.set("lat", compactCoordinate(origin.latitude));
  url.searchParams.set("lon", compactCoordinate(origin.longitude));
  return url.toString();
}

/** Removes `lat`/`lon` from the address bar without adding a history entry. */
export function clearSharedOriginFromAddressBar(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("lat") && !url.searchParams.has("lon")) return;
  url.searchParams.delete("lat");
  url.searchParams.delete("lon");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: fall through to the legacy path.
  }
  return legacyCopy(text);
}

export function canUseWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function canShareFiles(file: File): boolean {
  try {
    return canUseWebShare() && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export type ShareOutcome = "shared" | "cancelled" | "unavailable" | "failed";

export async function shareWithDevice(data: ShareData): Promise<ShareOutcome> {
  if (!canUseWebShare()) return "unavailable";
  try {
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
