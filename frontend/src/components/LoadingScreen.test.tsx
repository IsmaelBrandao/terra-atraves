import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LOADING_FADE_MS, LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("announces real loading stages without fake percentages", () => {
    const { rerender } = render(<LoadingScreen status="initializing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Inicializando globo…");
    rerender(<LoadingScreen status="loading-cartography" />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando cartografia…");
    rerender(<LoadingScreen status="preparing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Preparando exploração…");
    expect(screen.getByTestId("loading-screen").textContent).not.toMatch(/%/);
  });

  it("fades out and unmounts once the map is ready", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LoadingScreen status="preparing" />);
    rerender(<LoadingScreen status="ready" />);
    const screenElement = screen.getByTestId("loading-screen");
    expect(screenElement).toHaveClass("boot-screen--leaving");
    expect(screenElement).toHaveAttribute("aria-hidden", "true");
    act(() => {
      vi.advanceTimersByTime(LOADING_FADE_MS + 100);
    });
    expect(screen.queryByTestId("loading-screen")).toBeNull();
    vi.useRealTimers();
  });
});
