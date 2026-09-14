import { useEffect, useId, useRef, useState } from "react";

import type { Discovery } from "./discoveryContent";
import { buildShareCardContent } from "./share/shareCardContent";
import {
  buildShareUrl,
  canShareFiles,
  canUseWebShare,
  copyText,
  downloadBlob,
  shareWithDevice,
} from "./share/shareLink";

type Feedback = { tone: "ok" | "error"; text: string } | null;

function IconLink() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  );
}
function IconShare() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12.5V3m0 0L6.5 6.5M10 3l3.5 3.5M4.5 10v5.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}
function IconImage() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

export function ShareMenu({ discovery }: { discovery: Discovery }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<Promise<{ blob: Blob; filename: string }> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const shareUrl = buildShareUrl(discovery.origin.coordinates);
  const webShare = canUseWebShare();

  const prepareCard = () => {
    cardRef.current ??= import("./share/shareCard").then(async ({ renderShareCard }) => {
      const content = buildShareCardContent(discovery, shareUrl);
      return { blob: await renderShareCard(content), filename: content.filename };
    });
    cardRef.current.catch(() => {
      cardRef.current = null;
    });
    return cardRef.current;
  };

  useEffect(() => {
    cardRef.current = null;
  }, [discovery]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const toggle = () => {
    setFeedback(null);
    setManualLink(null);
    setOpen(!open);
    // Pre-render the card while the menu is open so a later Web Share stays within the user gesture.
    if (!open) void prepareCard().catch(() => undefined);
  };

  const copyLink = async () => {
    const copied = await copyText(shareUrl);
    if (copied) {
      setManualLink(null);
      setFeedback({ tone: "ok", text: "Link copiado" });
    } else {
      setManualLink(shareUrl);
      setFeedback({ tone: "error", text: "Não foi possível copiar automaticamente. Copie o link abaixo." });
    }
  };

  const shareDevice = async () => {
    setBusy(true);
    const text = `${discovery.origin.title} → ${discovery.title}: ${Math.round(discovery.throughEarthKm).toLocaleString("pt-BR")} km através da Terra.`;
    const data: ShareData = { title: "Terra Através", text, url: shareUrl };
    try {
      const card = await prepareCard();
      const file = new File([card.blob], card.filename, { type: "image/png" });
      if (canShareFiles(file)) data.files = [file];
    } catch {
      // The link alone is still worth sharing.
    }
    const outcome = await shareWithDevice(data);
    setBusy(false);
    if (outcome === "shared") setFeedback({ tone: "ok", text: "Descoberta compartilhada" });
    if (outcome === "failed" || outcome === "unavailable") await copyLink();
  };

  const downloadImage = async () => {
    setBusy(true);
    try {
      const card = await prepareCard();
      downloadBlob(card.blob, card.filename);
      setFeedback({ tone: "ok", text: "Imagem gerada" });
    } catch {
      setFeedback({ tone: "error", text: "Não foi possível gerar a imagem. O link continua disponível." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="share-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="discovery-button discovery-button--primary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <IconShare />
        Compartilhar
      </button>
      <div id={panelId} className="share-menu__panel" hidden={!open}>
        <p className="share-menu__title">Compartilhar descoberta</p>
        <button type="button" className="share-menu__option" onClick={() => void copyLink()}>
          <IconLink />
          <span>Copiar link</span>
        </button>
        {webShare && (
          <button type="button" className="share-menu__option" onClick={() => void shareDevice()} disabled={busy}>
            <IconShare />
            <span>Compartilhar pelo dispositivo</span>
          </button>
        )}
        <button type="button" className="share-menu__option" onClick={() => void downloadImage()} disabled={busy}>
          <IconImage />
          <span>Baixar imagem da descoberta</span>
        </button>
        {manualLink && (
          <input
            className="share-menu__manual"
            readOnly
            value={manualLink}
            aria-label="Link da descoberta"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
        <p className={`share-menu__feedback${feedback?.tone === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
          {feedback?.text ?? ""}
        </p>
      </div>
    </div>
  );
}
