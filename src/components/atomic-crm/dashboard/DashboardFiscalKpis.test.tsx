// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardFiscalKpis } from "./DashboardFiscalKpis";
import type { FiscalKpis } from "./fiscalModelTypes";

const baseKpis: FiscalKpis = {
  taxYear: 2024,
  fatturatoLordoYtd: 13740,
  fatturatoTotaleYtd: 13740,
  fatturatoNonTassabileYtd: 0,
  unmappedCashRevenue: 0,
  redditoLordoForfettario: 10717.2,
  stimaInpsAnnuale: 1879,
  redditoImponibile: 8838,
  stimaImpostaAnnuale: 233,
  redditoNettoStimato: 11628,
  percentualeNetto: 84,
  accantonamentoMensile: 176,
  distanzaDalTetto: 71260,
  percentualeUtilizzoTetto: 16,
  aliquotaSostitutiva: 5,
  monthsOfData: 12,
  isDefinitive: false,
};

describe("DashboardFiscalKpis — label stima/definitivo (D3, INV-6)", () => {
  it("anno chiuso (isDefinitive): pill 'Definitivo' + titolo 'Tasse' + numeri reali", () => {
    render(
      <DashboardFiscalKpis
        fiscalKpis={{ ...baseKpis, isDefinitive: true }}
        warnings={[]}
        isCurrentYear={false}
      />,
    );
    expect(screen.getByText("Definitivo")).toBeTruthy();
    expect(screen.queryByText("Stima")).toBeNull();
    expect(screen.getByText("Tasse")).toBeTruthy();
    // numeri reali del commercialista (separator-agnostico, WF-20)
    expect(screen.getByText(/1\.?879,00/)).toBeTruthy();
    expect(screen.getByText(/233,00/)).toBeTruthy();
    expect(screen.getByText("Su dichiarazione reale")).toBeTruthy();
  });

  it("anno corrente (stima): pill 'Stima' + titolo 'Tasse stimate'", () => {
    render(
      <DashboardFiscalKpis
        fiscalKpis={{ ...baseKpis, isDefinitive: false }}
        warnings={[]}
        isCurrentYear={true}
      />,
    );
    expect(screen.getByText("Stima")).toBeTruthy();
    expect(screen.queryByText("Definitivo")).toBeNull();
    expect(screen.getByText("Tasse stimate")).toBeTruthy();
  });
});
