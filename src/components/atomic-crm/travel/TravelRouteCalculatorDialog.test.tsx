// @vitest-environment jsdom

import "@/setupTests";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const estimateTravelRoute = vi.fn();
const notify = vi.fn();

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => ({
      estimateTravelRoute,
    }),
    useNotify: () => notify,
  };
});

import { TravelRouteCalculatorDialog } from "./TravelRouteCalculatorDialog";

describe("TravelRouteCalculatorDialog", () => {
  beforeEach(() => {
    estimateTravelRoute.mockReset();
    notify.mockReset();
  });

  it("calculates a route and applies km plus rate back to the host UI", async () => {
    const onApply = vi.fn();

    estimateTravelRoute.mockResolvedValue({
      originQuery: "Valguarnera Caropepe",
      destinationQuery: "Catania",
      originLabel: "Valguarnera Caropepe, EN, Italia",
      destinationLabel: "Catania, CT, Italia",
      tripMode: "round_trip",
      oneWayDistanceKm: 80.49,
      totalDistanceKm: 160.98,
      oneWayDurationMinutes: 73,
      totalDurationMinutes: 146,
      kmRate: 0.25,
      reimbursementAmount: 40.25,
      generatedDescription:
        "Spostamento — Valguarnera Caropepe - Catania A/R",
      generatedLocation: "Catania",
    });

    render(
      <TravelRouteCalculatorDialog
        defaultKmRate={0.19}
        currentKmRate={0.19}
        onApply={onApply}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Apri calcolatore tratta km" }),
    );

    fireEvent.change(screen.getByLabelText("Luogo di partenza"), {
      target: { value: "Valguarnera Caropepe" },
    });
    fireEvent.change(screen.getByLabelText("Luogo di arrivo"), {
      target: { value: "Catania" },
    });
    fireEvent.click(screen.getByLabelText("Andata e ritorno"));
    fireEvent.change(screen.getByLabelText("Tariffa EUR/km"), {
      target: { value: "0.25" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Calcola" }));

    await waitFor(() =>
      expect(estimateTravelRoute).toHaveBeenCalledWith({
        origin: "Valguarnera Caropepe",
        destination: "Catania",
        tripMode: "round_trip",
        kmRate: 0.25,
      }),
    );

    expect(await screen.findByText(/Valguarnera Caropepe, EN, Italia/)).toBeInTheDocument();
    expect(screen.getByText(/160,98 km/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Applica" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        totalDistanceKm: 160.98,
        kmRate: 0.25,
        reimbursementAmount: 40.25,
        generatedDescription:
          "Spostamento — Valguarnera Caropepe - Catania A/R",
        generatedLocation: "Catania",
      }),
    );
  });
});
