// @vitest-environment jsdom

import "@/setupTests";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const estimateTravelRoute = vi.fn();
const suggestTravelLocations = vi.fn();
const notify = vi.fn();
const dataProvider = {
  estimateTravelRoute,
  suggestTravelLocations,
};

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => dataProvider,
    useNotify: () => notify,
  };
});

import { TravelRouteCalculatorDialog } from "./TravelRouteCalculatorDialog";

describe("TravelRouteCalculatorDialog", () => {
  beforeEach(() => {
    estimateTravelRoute.mockReset();
    suggestTravelLocations.mockReset();
    notify.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suggests locations while typing and lets the user pick one", async () => {
    vi.useFakeTimers();

    suggestTravelLocations.mockResolvedValue([
      {
        label: "Valguarnera Caropepe, EN, Italia",
        longitude: 14.3901,
        latitude: 37.4952,
      },
    ]);

    render(
      <TravelRouteCalculatorDialog
        defaultKmRate={0.19}
        currentKmRate={0.19}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Apri calcolatore tratta km" }),
    );

    fireEvent.focus(screen.getByLabelText("Luogo di partenza"));
    fireEvent.change(screen.getByLabelText("Luogo di partenza"), {
      target: { value: "Valg" },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      await Promise.resolve();
    });

    expect(suggestTravelLocations).toHaveBeenCalledWith({
      query: "Valg",
    });

    fireEvent.click(
      screen.getByRole("option", {
        name: "Valguarnera Caropepe, EN, Italia",
      }),
    );

    expect(screen.getByLabelText("Luogo di partenza")).toHaveValue(
      "Valguarnera Caropepe, EN, Italia",
    );
    expect(
      screen.queryByRole("option", {
        name: "Valguarnera Caropepe, EN, Italia",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps the dialog body scrollable on mobile layouts", () => {
    render(
      <TravelRouteCalculatorDialog
        defaultKmRate={0.19}
        currentKmRate={0.19}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Apri calcolatore tratta km" }),
    );

    expect(screen.getByTestId("travel-route-dialog-body")).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
    );
  });

  it("calculates a route and applies km plus rate back to the host UI", async () => {
    const onApply = vi.fn();

    suggestTravelLocations.mockResolvedValue([]);
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
      generatedDescription: "Spostamento — Valguarnera Caropepe - Catania A/R",
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

    expect(
      await screen.findByText(/Valguarnera Caropepe, EN, Italia/),
    ).toBeInTheDocument();
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
