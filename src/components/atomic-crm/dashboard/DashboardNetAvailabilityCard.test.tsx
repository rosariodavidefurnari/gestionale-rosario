// @vitest-environment jsdom

// Controllore: "Quanto ti resta in tasca" non deve azzerare la riserva tasse
// quando non ci sono obbligazioni reali. Prima del fix la card mostrava
// "Riserva tasse 0" (contraddicendo "Netto stimato"), perche' il call site
// passava 0 invece di undefined. Falsifiabile: rompi il fallback alla stima
// -> il primo test fallisce.

import "@/setupTests";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardNetAvailabilityCard } from "./DashboardNetAvailabilityCard";
import type { DashboardKpis, DashboardMeta } from "./dashboardModel";
import type { FiscalKpis } from "./fiscalModel";

const kpis = {
  cashReceivedNet: 3200,
  ownExpenses: 0,
  clientExpenses: 0,
} as unknown as DashboardKpis;

const fiscalKpis = {
  stimaInpsAnnuale: 650.71,
  stimaImpostaAnnuale: 92.26,
} as unknown as FiscalKpis;

const meta = {} as DashboardMeta;

const renderCard = (totalOpenObligations?: number) =>
  render(
    <MemoryRouter>
      <DashboardNetAvailabilityCard
        kpis={kpis}
        fiscalKpis={fiscalKpis}
        meta={meta}
        totalOpenObligations={totalOpenObligations}
      />
    </MemoryRouter>,
  );

describe("DashboardNetAvailabilityCard — riserva tasse", () => {
  it("usa la STIMA quando non ci sono obblighi reali (undefined), non 0", () => {
    renderCard(undefined);
    // riserva = 650,71 + 92,26 = 742,97 -> netto 3200 - 742,97 = 2457
    expect(screen.getByText(/742,97/)).toBeInTheDocument();
    expect(screen.getByText(/Ti restano/)).toBeInTheDocument();
    expect(screen.getByText(/2\.?457/)).toBeInTheDocument();
  });

  it("usa gli obblighi REALI quando presenti (0 = tutto pagato), NON la stima", () => {
    renderCard(0);
    // con obbligo reale 0, la stima 742,97 NON deve comparire (riserva = 0 reale)
    expect(screen.queryByText(/742,97/)).not.toBeInTheDocument();
  });
});
