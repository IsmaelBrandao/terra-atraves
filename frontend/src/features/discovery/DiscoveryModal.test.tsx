import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fortalezaReverse, landJob, oceanJob, sparseOceanJob } from "../../test/fixtures";
import { describeLocation } from "../location/formatLocation";
import { buildDiscovery, type Discovery } from "./discoveryContent";
import { REOPEN_DISCOVERY_ID } from "./discoveryIds";
import { DiscoveryModal } from "./DiscoveryModal";
import type { DiscoveryImage, DiscoveryImageProvider } from "./images/imageProvider";

const photo: DiscoveryImage = {
  src: "https://upload.wikimedia.org/biak.jpg",
  width: 1280,
  height: 853,
  subject: "Biak",
  author: "Nomad",
  license: "CC BY 2.5",
  licenseUrl: "https://creativecommons.org/licenses/by/2.5",
  sourceName: "Wikimedia Commons",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Biak.jpg",
};

function provider(result: DiscoveryImage | null): DiscoveryImageProvider & { findImage: ReturnType<typeof vi.fn> } {
  return { name: `test-${Math.random()}`, findImage: vi.fn().mockResolvedValue(result) };
}

function Harness({ discovery, imageProvider, onRepeat = vi.fn(), onChooseAnother = vi.fn() }: {
  discovery: Discovery;
  imageProvider: DiscoveryImageProvider;
  onRepeat?: () => void;
  onChooseAnother?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id={REOPEN_DISCOVERY_ID} onClick={() => setOpen(true)}>
        Ver descoberta
      </button>
      <DiscoveryModal
        open={open}
        discovery={discovery}
        onClose={() => setOpen(false)}
        onRepeat={onRepeat}
        onChooseAnother={onChooseAnother}
        imageProvider={imageProvider}
      />
    </>
  );
}

function renderModal(discovery: Discovery, imageProvider = provider(null), handlers: { onRepeat?: () => void; onChooseAnother?: () => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <Harness discovery={discovery} imageProvider={imageProvider} {...handlers} />
    </QueryClientProvider>,
  );
  const opener = screen.getByRole("button", { name: "Ver descoberta" });
  opener.focus();
  fireEvent.click(opener);
  return { ...utils, opener, imageProvider };
}

async function flushFocus() {
  await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
}

const ocean = buildDiscovery(oceanJob, describeLocation(fortalezaReverse))!;
const land = buildDiscovery(landJob, null)!;

afterEach(() => vi.restoreAllMocks());

describe("DiscoveryModal", () => {
  it("is an accessible modal dialog titled by the destination", () => {
    renderModal(ocean);
    const dialog = screen.getByRole("dialog", { name: "Oceano Pacífico" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("Você chegou ao outro lado da Terra")).toBeVisible();
    expect(within(dialog).getAllByText("≈ 12.742 km").length).toBeGreaterThan(0);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("shows the ocean sections: direct destination, nearest land and settlement", () => {
    renderModal(ocean);
    const dialog = screen.getByRole("dialog");
    const facts = within(dialog.querySelector<HTMLElement>(".discovery-facts")!);
    expect(facts.getByText("Destino direto")).toBeVisible();
    expect(facts.getByText("Terra firme mais próxima")).toBeVisible();
    expect(facts.getByText("Localidade habitada próxima")).toBeVisible();
    expect(facts.getByText("480 km do antípoda")).toBeVisible();
    expect(facts.getByText("52 km da costa mais próxima")).toBeVisible();
    expect(dialog.textContent).not.toMatch(/null|undefined/);
  });

  it("adapts to land results without a nearest-land section", () => {
    renderModal(land);
    const dialog = screen.getByRole("dialog", { name: "Fortaleza" });
    expect(within(dialog).getByText("País")).toBeVisible();
    expect(within(dialog).getByText("Estado / província")).toBeVisible();
    expect(within(dialog).queryByText("Terra firme mais próxima")).toBeNull();
    expect(within(dialog).queryByText("Destino direto")).toBeNull();
  });

  it("writes missing fields in human language", () => {
    renderModal(buildDiscovery(sparseOceanJob, null)!);
    const dialog = screen.getByRole("dialog", { name: "Oceano" });
    expect(within(dialog).getByText("Não identificada nesta consulta")).toBeVisible();
    expect(dialog.textContent).not.toMatch(/null|undefined|NaN/);
  });

  it("closes with Escape and returns focus to the opener", async () => {
    const { opener } = renderModal(ocean);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await flushFocus();
    expect(opener).toHaveFocus();
  });

  it("closes with the X button, the backdrop and 'Ver no globo', and can reopen", () => {
    renderModal(ocean);
    fireEvent.click(screen.getByRole("button", { name: "Fechar descoberta" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver descoberta" }));
    fireEvent.mouseDown(document.querySelector(".dialog-backdrop")!);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ver descoberta" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver no globo" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traps keyboard focus inside the dialog", () => {
    renderModal(ocean);
    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Fechar descoberta" });
    const last = within(dialog).getByRole("button", { name: "Ver no globo" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("runs the result actions", () => {
    const onRepeat = vi.fn();
    const onChooseAnother = vi.fn();
    renderModal(ocean, provider(null), { onRepeat, onChooseAnother });
    fireEvent.click(screen.getByRole("button", { name: "Repetir perfuração" }));
    fireEvent.click(screen.getByRole("button", { name: "Escolher outro local" }));
    expect(onRepeat).toHaveBeenCalledOnce();
    expect(onChooseAnother).toHaveBeenCalledOnce();
  });

  it("expands the calculation walkthrough", () => {
    renderModal(ocean);
    const details = screen.getByText("Como calculamos?").closest("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(screen.getByText("Como calculamos?"));
    details.open = true;
    expect(within(details).getByText("Latitude invertida")).toBeInTheDocument();
    expect(within(details).getByText("Longitude deslocada em 180°")).toBeInTheDocument();
    expect(details.textContent).toContain("−38,5267° + 180° = 141,4733°");
    expect(details.textContent).not.toMatch(/SELECT|ST_/);
  });

  it("shows a credited, lazy photo when the provider finds one", async () => {
    const imageProvider = provider(photo);
    renderModal(ocean, imageProvider);
    const image = await screen.findByAltText(/Fotografia de Biak/);
    expect(image).toHaveAttribute("loading", "lazy");
    fireEvent.load(image);
    expect(await screen.findByText("Foto: Nomad")).toBeVisible();
    expect(screen.getByRole("link", { name: "CC BY 2.5" })).toHaveAttribute("href", photo.licenseUrl);
    expect(screen.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute("href", photo.sourceUrl);
    expect(imageProvider.findImage).toHaveBeenCalledOnce();
  });

  it("keeps an elegant fallback when there is no image or it fails to load", async () => {
    const empty = provider(null);
    const { unmount } = renderModal(ocean, empty);
    await waitFor(() => expect(document.querySelector(".destination-media")).toHaveAttribute("data-state", "fallback"));
    expect(document.querySelector(".destination-art svg")).not.toBeNull();
    expect(screen.queryByRole("img", { name: /Fotografia/ })).toBeNull();
    unmount();

    renderModal(ocean, provider(photo));
    const image = await screen.findByAltText(/Fotografia de Biak/);
    fireEvent.error(image);
    await waitFor(() => expect(screen.queryByAltText(/Fotografia de Biak/)).toBeNull());
    expect(screen.getByRole("dialog", { name: "Oceano Pacífico" })).toBeVisible();
  });

  it("does not request an image before the discovery is shown", () => {
    const imageProvider = provider(photo);
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <DiscoveryModal open={false} discovery={ocean} onClose={vi.fn()} onRepeat={vi.fn()} onChooseAnother={vi.fn()} imageProvider={imageProvider} />
      </QueryClientProvider>,
    );
    expect(imageProvider.findImage).not.toHaveBeenCalled();
  });
});

describe("ShareMenu", () => {
  // jsdom has no 2D canvas; the share card simply fails to render and the link options remain.
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("copies the origin link and hides device sharing when unsupported", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText }, share: undefined });
    renderModal(ocean);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(screen.getByRole("button", { name: "Compartilhar" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "Compartilhar pelo dispositivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Baixar imagem da descoberta" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(await screen.findByText("Link copiado")).toBeVisible();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\?lat=-3\.7319&lon=-38\.5267$/));
    vi.unstubAllGlobals();
  });

  it("offers device sharing when available and falls back to copying on failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText }, share, canShare: () => false });
    renderModal(ocean);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar pelo dispositivo" }));
    expect(await screen.findByText("Link copiado")).toBeVisible();
    const shared = share.mock.calls[0]?.[0] as ShareData | undefined;
    expect(shared?.title).toBe("Terra Através");
    expect(shared?.url).toContain("lat=-3.7319");
    vi.unstubAllGlobals();
  });

  it("shows the link for manual copy when the clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined, share: undefined });
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(false), configurable: true });
    renderModal(ocean);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    const input = await screen.findByRole<HTMLInputElement>("textbox", { name: "Link da descoberta" });
    expect(input.value).toMatch(/\?lat=-3\.7319&lon=-38\.5267$/);
    vi.unstubAllGlobals();
  });
});
