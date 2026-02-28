// @vitest-environment jsdom

import "@/setupTests";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useIsMobile = vi.fn();

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobile(),
}));

import { UnifiedAiLauncher } from "./UnifiedAiLauncher";

describe("UnifiedAiLauncher", () => {
  beforeEach(() => {
    useIsMobile.mockReset();
    useIsMobile.mockReturnValue(false);
  });

  it("renders a floating launcher button and opens the unified AI shell", () => {
    render(<UnifiedAiLauncher />);

    const launcherButton = screen.getByRole("button", {
      name: "Apri chat AI unificata",
    });

    expect(launcherButton).toHaveClass("bottom-6");

    fireEvent.click(launcherButton);

    expect(screen.getByText("Chat AI unificata")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Shell globale pronta. Il prossimo milestone aggiungera' modello configurabile, upload documenti e conferma utente prima di ogni scrittura nel CRM.",
      ),
    ).toBeInTheDocument();
  });

  it("uses a higher bottom offset on mobile to avoid the bottom navigation", () => {
    useIsMobile.mockReturnValue(true);

    render(<UnifiedAiLauncher />);

    expect(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    ).toHaveClass("bottom-20");
  });
});
