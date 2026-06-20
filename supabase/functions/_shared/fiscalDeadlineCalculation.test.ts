import { describe, expect, it } from "vitest";

import {
  buildDeadlineNotificationMessage,
  buildFiscalDeadlineKey,
  buildFiscalReminderComputation,
  buildFiscalYearEstimate,
  buildTaskPayloads,
  resolvePriorAdvanceScheduleInput,
  type FiscalConfig,
  type FiscalDeclarationInput,
  type FiscalEstimateScheduleInput,
  type PaymentRow,
  type ProjectRow,
} from "./fiscalDeadlineCalculation.ts";

const fiscalConfig: FiscalConfig = {
  taxProfiles: [
    {
      atecoCode: "731102",
      description: "Marketing e servizi pubblicitari",
      coefficienteReddititivita: 78,
      linkedCategories: ["produzione_tv"],
    },
    {
      atecoCode: "621000",
      description: "Produzione software e consulenza IT",
      coefficienteReddititivita: 67,
      linkedCategories: ["sviluppo_web"],
    },
  ],
  defaultTaxProfileAtecoCode: "731102",
  aliquotaINPS: 26.07,
  tettoFatturato: 85000,
  annoInizioAttivita: 2023,
  taxabilityDefaults: {
    nonTaxableCategories: [],
    nonTaxableClientIds: [],
  },
};

const makeFiscalConfig = (
  overrides: Partial<FiscalConfig> = {},
): FiscalConfig => ({
  ...fiscalConfig,
  ...overrides,
  taxProfiles: overrides.taxProfiles ?? fiscalConfig.taxProfiles,
  taxabilityDefaults: {
    ...fiscalConfig.taxabilityDefaults,
    ...overrides.taxabilityDefaults,
  },
});

const baseProject = (overrides: Partial<ProjectRow> = {}): ProjectRow => ({
  id: "project-1",
  category: "produzione_tv",
  ...overrides,
});

const basePayment = (overrides: Partial<PaymentRow> = {}): PaymentRow => ({
  amount: 0,
  payment_date: "2026-01-15T00:00:00.000Z",
  status: "ricevuto",
  project_id: "project-1",
  client_id: "client-1",
  payment_type: "saldo",
  ...overrides,
});

describe("buildFiscalYearEstimate", () => {
  it("mappedTaxable_basic", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 1000,
          payment_date: "2026-02-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      fiscalConfig,
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: 1000,
      fatturatoTotaleYtd: 1000,
      fatturatoNonTassabileYtd: 0,
      unmappedCashRevenue: 0,
      redditoLordoForfettario: 780,
      stimaInpsAnnuale: 203.35,
      stimaImpostaAnnuale: 28.83,
    });
    expect(estimate.warnings).toEqual([]);
  });

  it("nonTaxable_excluded", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 1000,
          client_id: "client-1",
          payment_date: "2026-02-01T00:00:00.000Z",
        }),
        basePayment({
          amount: 500,
          client_id: "client-2",
          project_id: "project-2",
          payment_date: "2026-02-15T00:00:00.000Z",
        }),
      ],
      projects: [
        baseProject({ id: "project-1" }),
        baseProject({ id: "project-2" }),
      ],
      fiscalConfig: makeFiscalConfig({
        taxabilityDefaults: {
          nonTaxableCategories: [],
          nonTaxableClientIds: ["client-2"],
        },
      }),
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: 1000,
      fatturatoTotaleYtd: 1500,
      fatturatoNonTassabileYtd: 500,
      unmappedCashRevenue: 0,
    });
  });

  it("fallback profile success", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 800,
          project_id: "project-1",
          payment_date: "2026-01-20T00:00:00.000Z",
        }),
      ],
      projects: [baseProject({ id: "project-1", category: "wedding" })],
      fiscalConfig: makeFiscalConfig({
        defaultTaxProfileAtecoCode: "621000",
      }),
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: 800,
      unmappedCashRevenue: 0,
      redditoLordoForfettario: 536,
    });
    expect(estimate.warnings).toEqual([]);
  });

  it("unmapped_missingFallback", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 450,
          project_id: null,
          payment_date: "2026-05-01T00:00:00.000Z",
        }),
      ],
      projects: [],
      fiscalConfig: makeFiscalConfig({
        defaultTaxProfileAtecoCode: "",
      }),
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: 0,
      unmappedCashRevenue: 450,
    });
    expect(estimate.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNMAPPED_TAX_PROFILE",
          amount: 450,
          taxYear: 2026,
        }),
      ]),
    );
  });

  it("invalidFallbackConfig_unmappedWarning", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 700,
          project_id: null,
          payment_date: "2026-04-01T00:00:00.000Z",
        }),
      ],
      projects: [],
      fiscalConfig: makeFiscalConfig({
        defaultTaxProfileAtecoCode: "999999",
      }),
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: 0,
      unmappedCashRevenue: 700,
    });
    expect(estimate.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNMAPPED_TAX_PROFILE",
          amount: 700,
          taxYear: 2026,
        }),
      ]),
    );
  });

  it("refundHeavy_negativeRawCash", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 100,
          payment_type: "saldo",
          payment_date: "2026-01-10T00:00:00.000Z",
        }),
        basePayment({
          amount: 300,
          payment_type: "rimborso",
          payment_date: "2026-01-20T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      fiscalConfig,
      taxYear: 2026,
    });

    expect(estimate.fiscalKpis).toMatchObject({
      fatturatoLordoYtd: -200,
      fatturatoTotaleYtd: -200,
      redditoLordoForfettario: 0,
      stimaInpsAnnuale: 0,
      stimaImpostaAnnuale: 0,
    });
  });

  it("classifies payment year in Europe/Rome at UTC year boundary", () => {
    const estimate = buildFiscalYearEstimate({
      payments: [
        basePayment({
          amount: 1000,
          payment_date: "2026-12-31T23:30:00.000Z",
        }),
      ],
      projects: [baseProject()],
      fiscalConfig,
      taxYear: 2027,
    });

    expect(estimate.fiscalKpis.stimaInpsAnnuale).toBe(203.35);
    expect(estimate.fiscalKpis.stimaImpostaAnnuale).toBe(28.83);
  });
});

describe("buildFiscalReminderComputation", () => {
  it("schedule_firstYear", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [],
      projects: [],
      paymentYear: 2023,
      todayIso: "2023-01-15",
    });

    expect(computation.schedule.isFirstYear).toBe(true);
    expect(
      computation.schedule.deadlines.filter(
        (deadline) => deadline.priority === "high",
      ),
    ).toHaveLength(0);
    expect(computation.schedule.supportingTaxYears).toEqual([2022, 2023]);
  });

  it("schedule_secondYear_singleAdvance", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 2000,
          payment_date: "2023-02-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2024,
      todayIso: "2024-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2024-07-01",
    );
    const novemberDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2024-12-02",
    );

    expect(computation.schedule.isFirstYear).toBe(false);
    // Aliquota INPS Gestione Separata 2023 = 26,23% (reale, verificata sulla
    // dichiarazione). forfettario 1560 -> INPS 409,19 -> imposta 57,54.
    expect(juneDeadline?.items).toEqual([
      expect.objectContaining({
        component: "imposta_saldo",
        amount: 57.54,
        competenceYear: 2023,
      }),
      expect.objectContaining({
        component: "inps_saldo",
        amount: 409.19,
        competenceYear: 2023,
      }),
      expect.objectContaining({
        component: "inps_acconto_1",
        amount: 163.68,
        competenceYear: 2024,
      }),
    ]);
    expect(novemberDeadline?.items).toEqual([
      expect.objectContaining({
        component: "imposta_acconto_unico",
        amount: 57.54,
        competenceYear: 2024,
      }),
      expect.objectContaining({
        component: "inps_acconto_2",
        amount: 163.68,
        competenceYear: 2024,
      }),
    ]);
  });

  it("schedule_doubleAdvance", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 10000,
          payment_date: "2025-03-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2026-06-30",
    );
    const novemberDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2026-11-30",
    );

    expect(juneDeadline?.items.map((item) => item.component)).toEqual([
      "imposta_saldo",
      "inps_saldo",
      "imposta_acconto_1",
      "inps_acconto_1",
    ]);
    expect(novemberDeadline?.items.map((item) => item.component)).toEqual([
      "imposta_acconto_2",
      "inps_acconto_2",
    ]);
  });

  it("shifts weekend-only fiscal deadlines to the next business day", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [],
      projects: [],
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });

    expect(
      computation.schedule.deadlines.find(
        (deadline) => deadline.label === "Bollo Q1 (gen-mar)",
      )?.date,
    ).toBe("2026-06-01");
  });

  it("zero-clamps residual saldo when prior advances exceed the annual estimate", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 20000,
          payment_date: "2024-02-01T00:00:00.000Z",
        }),
        basePayment({
          amount: 2000,
          payment_date: "2025-02-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2026-06-30",
    );

    expect(juneDeadline?.items.map((item) => item.component)).toEqual([
      "inps_acconto_1",
    ]);
  });

  it("includes structured warnings with paymentYear for degraded estimates", () => {
    const computation = buildFiscalReminderComputation({
      config: makeFiscalConfig({
        defaultTaxProfileAtecoCode: "",
      }),
      payments: [
        basePayment({
          amount: 450,
          project_id: null,
          payment_date: "2026-05-01T00:00:00.000Z",
        }),
      ],
      projects: [],
      paymentYear: 2027,
      todayIso: "2027-01-15",
    });

    expect(computation.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNMAPPED_TAX_PROFILE",
          taxYear: 2026,
          amount: 450,
          paymentYear: 2027,
        }),
      ]),
    );
  });
});

describe("reminder outputs", () => {
  it("creates due_date at start of Europe/Rome business day", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 2000,
          payment_date: "2023-02-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2024,
      todayIso: "2024-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2024-07-01",
    );
    const payloads = buildTaskPayloads(juneDeadline ? [juneDeadline] : []);

    expect(payloads[0]?.due_date).toBe("2024-06-30T22:00:00.000Z");
    expect(payloads[0]?.type).toBe("f24");
    expect(payloads[0]?.text).toContain("(stimato)");
  });

  it("formats notification dates without runtime timezone drift", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 2000,
          payment_date: "2023-02-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2024,
      todayIso: "2024-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2024-07-01",
    );
    const message = buildDeadlineNotificationMessage(
      juneDeadline ? [juneDeadline] : [],
    );

    expect(message).toContain("Scadenze fiscali stimate in arrivo:");
    expect(message).toContain("1 luglio 2024");
    expect(message).toContain("Saldo + 1° Acconto");
  });

  it("builds stable deadline keys from invariant schedule data", () => {
    const computation = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments: [
        basePayment({
          amount: 10000,
          payment_date: "2025-03-01T00:00:00.000Z",
        }),
      ],
      projects: [baseProject()],
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });

    const juneDeadline = computation.schedule.deadlines.find(
      (deadline) => deadline.date === "2026-06-30",
    );
    const reorderedDeadline =
      juneDeadline == null
        ? null
        : {
            ...juneDeadline,
            items: [...juneDeadline.items].reverse(),
          };

    expect(juneDeadline).not.toBeNull();
    expect(reorderedDeadline).not.toBeNull();
    expect(buildFiscalDeadlineKey(juneDeadline!)).toBe(
      buildFiscalDeadlineKey(reorderedDeadline!),
    );
  });
});

// ── DOM-5 / DB-12: prior advances from the REAL closed declaration ──────────

describe("resolvePriorAdvanceScheduleInput (Deno mirror)", () => {
  // The drift-prone FORMULA estimate the old reminder used (2024 over-estimated).
  const formulaEstimate2024: FiscalEstimateScheduleInput = {
    taxYear: 2024,
    annualInpsEstimate: 2793.97,
    annualSubstituteTaxEstimate: 396.17,
  };

  // The REAL 2024 declaration (AdE, prod): total_inps 3667.40 = cycle
  // (acconti 1788.40 + saldo 1879); competence = 3667.40 − 1788.40 = 1879.
  const realDeclaration2024: FiscalDeclarationInput = {
    total_substitute_tax: 233,
    total_inps: 3667.4,
    prior_advances_inps: 1788.4,
  };

  it("derives the advance basis from the CLOSED real declaration (competence)", () => {
    const resolved = resolvePriorAdvanceScheduleInput(
      formulaEstimate2024,
      realDeclaration2024,
    );
    expect(resolved.annualInpsEstimate).toBe(1879);
    expect(resolved.annualSubstituteTaxEstimate).toBe(233);
    expect(resolved.taxYear).toBe(2024);
    expect(resolved.annualInpsEstimate).not.toBe(2793.97);
  });

  it("falls back to the formula estimate when there is no prior declaration", () => {
    expect(resolvePriorAdvanceScheduleInput(formulaEstimate2024, null)).toEqual(
      formulaEstimate2024,
    );
    expect(
      resolvePriorAdvanceScheduleInput(formulaEstimate2024, undefined),
    ).toEqual(formulaEstimate2024);
  });

  it("falls back when the declaration is UNFILED (zero totals, e.g. 2025)", () => {
    const unfiled: FiscalDeclarationInput = {
      total_substitute_tax: 0,
      total_inps: 0,
      prior_advances_inps: 0,
    };
    expect(
      resolvePriorAdvanceScheduleInput(formulaEstimate2024, unfiled),
    ).toEqual(formulaEstimate2024);
  });
});

describe("buildFiscalReminderComputation — real prior advances + cash imposta", () => {
  // Revenue: 2024 high (drives a high FORMULA prior-advance), 2025 substantial
  // (the basis year). paymentYear 2026, start 2023 → not first/second year.
  const payments: PaymentRow[] = [
    basePayment({ amount: 20000, payment_date: "2024-02-01T00:00:00.000Z" }),
    basePayment({ amount: 30000, payment_date: "2025-02-01T00:00:00.000Z" }),
  ];
  const projects = [baseProject()];

  const inpsSaldo = (
    computation: ReturnType<typeof buildFiscalReminderComputation>,
  ) =>
    computation.schedule.deadlines
      .find((d) => d.date === "2026-06-30")
      ?.items.find((i) => i.component === "inps_saldo")?.amount ?? null;

  const impostaSaldo = (
    computation: ReturnType<typeof buildFiscalReminderComputation>,
  ) =>
    computation.schedule.deadlines
      .find((d) => d.date === "2026-06-30")
      ?.items.find((i) => i.component === "imposta_saldo")?.amount ?? null;

  it("subtracts the REAL (lower) closed-declaration advances → higher INPS saldo", () => {
    const baseline = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });
    // Closed 2024 declaration with competence MUCH lower than the formula estimate
    // → real advances small → residual INPS saldo larger than the baseline.
    const withReal = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
      priorBasisDeclaration: {
        total_substitute_tax: 100,
        total_inps: 1000,
        prior_advances_inps: 0,
      },
    });

    const baselineSaldo = inpsSaldo(baseline);
    const realSaldo = inpsSaldo(withReal);
    expect(baselineSaldo).not.toBeNull();
    expect(realSaldo).not.toBeNull();
    // Falsifiable: if priorBasisDeclaration is ignored the two are equal.
    expect(realSaldo!).toBeGreaterThan(baselineSaldo!);
  });

  it("deducts the imposta on CASH (LM035) when basisContributiVersatiCassa < competence → higher imposta saldo", () => {
    const baseline = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });
    // INPS paid-in-cash in 2025 LOWER than the competence INPS → larger imposta base
    // → larger imposta saldo than deducting on competence.
    const withCash = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
      basisContributiVersatiCassa: 1000,
    });

    const baselineImposta = impostaSaldo(baseline);
    const cashImposta = impostaSaldo(withCash);
    expect(baselineImposta).not.toBeNull();
    expect(cashImposta).not.toBeNull();
    expect(cashImposta!).toBeGreaterThan(baselineImposta!);
  });

  it("leaves the schedule unchanged when both new inputs are absent (back-compat)", () => {
    const without = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
    });
    const withUndefined = buildFiscalReminderComputation({
      config: fiscalConfig,
      payments,
      projects,
      paymentYear: 2026,
      todayIso: "2026-01-15",
      basisContributiVersatiCassa: undefined,
      priorBasisDeclaration: null,
    });
    expect(withUndefined.schedule).toEqual(without.schedule);
  });
});
