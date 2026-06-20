import { describe, expect, it } from "vitest";

import { buildCashVsCompetenceReconciliation } from "./cashVsCompetenceReconciliation";
// T-2: il signing DEVE essere lo STESSO simbolo importato da fiscalModel.ts,
// non una ricodifica inline (anti-drift su rimborso/rimborso_spese).
import { getSignedPaymentAmount } from "./fiscalModel";
import type { FiscalConfig, Payment, Project } from "../types";

// ── Fixture inline (mai fixture condivise di dominio — SYSTEM-FIRST) ──

const makeFiscalConfig = (
  overrides: Partial<FiscalConfig> = {},
): FiscalConfig => ({
  taxProfiles: [
    {
      atecoCode: "731102",
      description: "Marketing e servizi pubblicitari",
      coefficienteReddititivita: 78,
      linkedCategories: ["produzione_tv"],
    },
  ],
  defaultTaxProfileAtecoCode: "731102",
  aliquotaINPS: 26.07,
  tettoFatturato: 85000,
  annoInizioAttivita: 2023,
  ...overrides,
  taxabilityDefaults: {
    nonTaxableCategories: [],
    nonTaxableClientIds: [],
    ...overrides.taxabilityDefaults,
  },
});

const baseProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  client_id: 1,
  name: "Progetto Test",
  category: "produzione_tv",
  status: "in_corso",
  all_day: false,
  created_at: "2023-01-01T00:00:00.000Z",
  updated_at: "2023-01-01T00:00:00.000Z",
  ...overrides,
});

let paymentSeq = 1000;
const basePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: paymentSeq++,
  client_id: 1,
  project_id: 1,
  payment_date: "2024-06-01",
  payment_type: "saldo",
  amount: 0,
  status: "ricevuto",
  created_at: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const projects: Project[] = [
  baseProject({ id: 1, client_id: 1, category: "produzione_tv" }),
  // progetto su categoria esclusa (per i test di tassabilità)
  baseProject({ id: 9, client_id: 9, category: "evento_privato" }),
];

const find = (
  result: ReturnType<typeof buildCashVsCompetenceReconciliation>,
  year: number,
) => result.byYear.find((row) => row.year === year);

describe("buildCashVsCompetenceReconciliation — reassignment cash → issue-date", () => {
  // Mappa FK doc -> issue_date (ciò che il card costruisce da financial_documents_summary)
  const issueDateByDocId = new Map<string, string>([
    ["docA", "2023-12-29"], // FPR 10/23-like
    ["docB", "2025-12-29"], // FPR 9/25-like
    ["docC", "2024-05-01"], // same-year
  ]);

  // T-1: la fixture DEVE contenere le 2 fatture cross-year, altrimenti la
  // mutazione bucket=payment_date non falsifica.
  const payments: Payment[] = [
    // cross-year #1: incassata 2024, emessa 2023
    basePayment({
      id: "pA",
      amount: 4500,
      payment_date: "2024-01-29",
      financial_document_id: "docA",
    }),
    // cross-year #2: incassata 2026, emessa 2025
    basePayment({
      id: "pB",
      amount: 1746,
      payment_date: "2026-01-30",
      financial_document_id: "docB",
    }),
    // same-year linked
    basePayment({
      id: "pC",
      amount: 1000,
      payment_date: "2024-05-17",
      financial_document_id: "docC",
    }),
    // same-year unlinked → fallback cassa
    basePayment({ id: "pD", amount: 500, payment_date: "2024-03-01" }),
    // rimborso linked stesso anno del doc → segno negato (T-6 rimborso)
    basePayment({
      id: "pR",
      amount: 300,
      payment_type: "rimborso",
      payment_date: "2024-07-01",
      financial_document_id: "docC",
    }),
    // escluso da tassabilità (categoria esclusa) → fuori da ENTRAMBE le basi
    basePayment({
      id: "pX",
      amount: 999,
      client_id: 9,
      project_id: 9,
      payment_date: "2024-06-01",
    }),
    // payment NON ricevuto → ignorato del tutto
    basePayment({
      id: "pPending",
      amount: 5000,
      status: "in_attesa",
      payment_date: "2024-08-01",
    }),
  ];

  const fiscalConfig = makeFiscalConfig({
    taxabilityDefaults: { nonTaxableCategories: ["evento_privato"] },
  });

  const result = buildCashVsCompetenceReconciliation({
    payments,
    projects,
    issueDateByDocId,
    fiscalConfig,
  });

  it("reassigns the cross-year invoice to its issue-date year (T-1)", () => {
    // 2023: solo la cross-year FPR10/23 migra IN (cassa 0 nel 2023)
    expect(find(result, 2023)?.competenceTaxable).toBeCloseTo(4500, 2);
    expect(find(result, 2023)?.cashTaxable ?? 0).toBeCloseTo(0, 2);
    // 2024 cassa: 4500 + 1000 + 500 - 300 (rimborso) = 5700 (escluso pX fuori)
    expect(find(result, 2024)?.cashTaxable).toBeCloseTo(5700, 2);
    // 2024 competenza: 1000 + 500 - 300 = 1200 (la 4500 è migrata a 2023)
    expect(find(result, 2024)?.competenceTaxable).toBeCloseTo(1200, 2);
    // 2025: la FPR9/25 migra IN
    expect(find(result, 2025)?.competenceTaxable).toBeCloseTo(1746, 2);
    // 2026 cassa: la FPR9/25 incassata
    expect(find(result, 2026)?.cashTaxable).toBeCloseTo(1746, 2);
    expect(find(result, 2026)?.competenceTaxable ?? 0).toBeCloseTo(0, 2);
  });

  it("ANTI-REGRESSIONE: con bucket=payment_date competenza[2024]==cassa[2024] (mutazione falsificante T-1)", () => {
    // Questo è ciò che DEVE rompersi se qualcuno usa payment_date come bucket
    // competenza: oggi 1200 != 5700.
    expect(find(result, 2024)?.competenceTaxable).not.toBeCloseTo(
      find(result, 2024)?.cashTaxable ?? 0,
      2,
    );
  });

  it("emits exactly the 2 cross-year bridge rows", () => {
    expect(result.bridge).toHaveLength(2);
    const a = result.bridge.find((b) => String(b.paymentId) === "pA");
    expect(a).toMatchObject({
      amount: 4500,
      cashYear: 2024,
      competenceYear: 2023,
    });
    const b = result.bridge.find((b) => String(b.paymentId) === "pB");
    expect(b).toMatchObject({
      amount: 1746,
      cashYear: 2026,
      competenceYear: 2025,
    });
    // same-year (pC, pR) e unlinked (pD) NON sono nel ponte
    expect(
      result.bridge.some((b) =>
        ["pC", "pR", "pD"].includes(String(b.paymentId)),
      ),
    ).toBe(false);
  });

  it("excludes non-taxable payments from BOTH bases (T-6 esclusione)", () => {
    // pX (999, categoria esclusa) non deve comparire in nessuna base
    const sumCash = result.byYear.reduce((s, r) => s + r.cashTaxable, 0);
    const sumComp = result.byYear.reduce((s, r) => s + r.competenceTaxable, 0);
    // totale taxable atteso = 4500 + 1000 + 500 - 300 + 1746 = 7446 (999 escluso)
    expect(sumCash).toBeCloseTo(7446, 2);
    expect(sumComp).toBeCloseTo(7446, 2);
  });

  it("ignores non-received payments (status != ricevuto)", () => {
    // pPending (5000, in_attesa) non deve gonfiare nessun anno
    expect(find(result, 2024)?.cashTaxable).toBeCloseTo(5700, 2);
  });

  it("reports per-year coverage on the cash axis (T-6 unlinked fallback + F-db-2)", () => {
    const y2024 = find(result, 2024);
    // taxable cash 2024: pA(linked) pC(linked) pD(unlinked) pR(linked) — pX escluso
    expect(y2024?.totalCount).toBe(4);
    expect(y2024?.linkedCount).toBe(3);
    // amount: linked 4500+1000-300=5200 ; total 5700
    expect(y2024?.linkedAmount).toBeCloseTo(5200, 2);
    expect(y2024?.totalAmount).toBeCloseTo(5700, 2);
    expect(y2024?.coverageRatio).toBeCloseTo(5200 / 5700, 6);
  });
});

describe("T-2: signing è lo STESSO simbolo di fiscalModel (no copia inline)", () => {
  const issueDateByDocId = new Map<string, string>([["d", "2025-03-01"]]);
  const projects = [baseProject({ id: 1, client_id: 1 })];

  it("rimborso negato e rimborso_spese NON negato, identici a getSignedPaymentAmount", () => {
    const rimborso = basePayment({
      id: "r",
      amount: 300,
      payment_type: "rimborso",
      payment_date: "2025-03-02",
      financial_document_id: "d",
    });
    const rimborsoSpese = basePayment({
      id: "rs",
      amount: 200,
      payment_type: "rimborso_spese",
      payment_date: "2025-03-03",
      financial_document_id: "d",
    });
    const result = buildCashVsCompetenceReconciliation({
      payments: [rimborso, rimborsoSpese],
      projects,
      issueDateByDocId,
      fiscalConfig: makeFiscalConfig(),
    });
    // competenza 2025 = signed(rimborso) + signed(rimborso_spese)
    const expected =
      getSignedPaymentAmount(rimborso) + getSignedPaymentAmount(rimborsoSpese);
    // valore IDENTICO (non solo stesso segno): una copia inline divergente romperebbe
    expect(find(result, 2025)?.competenceTaxable).toBe(expected);
    // sanity: rimborso negato, rimborso_spese positivo
    expect(getSignedPaymentAmount(rimborso)).toBe(-300);
    expect(getSignedPaymentAmount(rimborsoSpese)).toBe(200);
    expect(find(result, 2025)?.competenceTaxable).toBeCloseTo(-100, 2);
  });
});

describe("T-3: invariante di conservazione (Σ cassa == Σ competenza) — property test seeded", () => {
  // Generatore deterministico inline (no fast-check dep).
  const mulberry32 = (seed: number) => () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it("conserva il totale su N dataset random (con esclusi e rimborsi)", () => {
    const projects = [
      baseProject({ id: 1, client_id: 1, category: "produzione_tv" }),
      baseProject({ id: 9, client_id: 9, category: "evento_privato" }),
    ];
    const fiscalConfig = makeFiscalConfig({
      taxabilityDefaults: { nonTaxableCategories: ["evento_privato"] },
    });

    for (let run = 0; run < 40; run++) {
      const rnd = mulberry32(run * 7919 + 1);
      const docs = new Map<string, string>();
      for (let d = 0; d < 6; d++) {
        const year = 2022 + Math.floor(rnd() * 6);
        const month = 1 + Math.floor(rnd() * 12);
        docs.set(
          `doc${run}_${d}`,
          `${year}-${String(month).padStart(2, "0")}-15`,
        );
      }
      const docIds = [...docs.keys()];
      const payments: Payment[] = [];
      let taxableTotal = 0;
      const n = 5 + Math.floor(rnd() * 30);
      for (let i = 0; i < n; i++) {
        const excluded = rnd() < 0.2;
        const linked = rnd() < 0.6;
        const isRimborso = rnd() < 0.15;
        const amount = Math.round((rnd() * 5000 - 200) * 100) / 100;
        const year = 2022 + Math.floor(rnd() * 6);
        const month = 1 + Math.floor(rnd() * 12);
        const p = basePayment({
          id: `p${run}_${i}`,
          amount,
          payment_type: isRimborso ? "rimborso" : "saldo",
          payment_date: `${year}-${String(month).padStart(2, "0")}-10`,
          client_id: excluded ? 9 : 1,
          project_id: excluded ? 9 : 1,
          financial_document_id: linked
            ? docIds[Math.floor(rnd() * docIds.length)]
            : undefined,
        });
        payments.push(p);
        if (!excluded) {
          taxableTotal += getSignedPaymentAmount(p);
        }
      }

      const result = buildCashVsCompetenceReconciliation({
        payments,
        projects,
        issueDateByDocId: docs,
        fiscalConfig,
      });
      const sumCash = result.byYear.reduce((s, r) => s + r.cashTaxable, 0);
      const sumComp = result.byYear.reduce(
        (s, r) => s + r.competenceTaxable,
        0,
      );
      // conservazione su GREZZI (T-5): tolleranza float minima
      expect(Math.abs(sumCash - sumComp)).toBeLessThan(1e-6);
      expect(Math.abs(sumCash - taxableTotal)).toBeLessThan(1e-6);
      // ogni payment taxable contato una sola volta sull'asse cassa (T-7.2)
      const totalCount = result.byYear.reduce((s, r) => s + r.totalCount, 0);
      const taxableReceived = payments.filter(
        (p) => p.status === "ricevuto" && p.client_id !== 9,
      ).length;
      expect(totalCount).toBe(taxableReceived);
    }
  });
});
