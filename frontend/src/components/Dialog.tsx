import { useEffect, useRef, type ReactNode, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
    if (element.closest("[inert], [hidden]")) return false;
    const details = element.closest("details");
    // Content of a collapsed <details> is not reachable; its <summary> is.
    return !details || details.open || element.closest("summary") !== null;
  });
}

interface DialogProps {
  open: boolean;
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  /** Element that receives focus after closing when the opener no longer exists. */
  fallbackFocus?: () => HTMLElement | null;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

export function Dialog({ open, labelledBy, describedBy, onClose, fallbackFocus, initialFocus, className, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const fallbackFocusRef = useRef(fallbackFocus);
  onCloseRef.current = onClose;
  fallbackFocusRef.current = fallbackFocus;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const active = document.activeElement;
    const opener = active instanceof HTMLElement && active !== document.body ? active : null;
    (initialFocus?.current ?? panel).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableWithin(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const target = opener?.isConnected ? opener : fallbackFocusRef.current?.();
      // Wait for the opener (e.g. "Ver descoberta") to be rendered before restoring focus.
      window.requestAnimationFrame(() => (target?.isConnected ? target : fallbackFocusRef.current?.())?.focus({ preventScroll: true }));
    };
  }, [initialFocus, open]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={className}
      >
        {children}
      </div>
    </div>
  );
}
