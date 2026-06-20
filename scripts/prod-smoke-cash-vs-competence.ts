#!/usr/bin/env tsx
// READ-ONLY production smoke for the cash-vs-competence reconciliation layer.
// Proves the PROD oracles the dashboard card relies on are still true:
//   competence 2024 = 9.240,18 (= Fabio's declared 9.240) · competence 2023 = 10.773,26
//   cash 2024 = 13.740,18 (legal, unchanged) · Σ cash == Σ competence == 52.657,02
//   cross-year bridge = EXACTLY 2 (FPR 10/23, FPR 9/25)
// No writes — only SELECT. Exit 0 = PASS, 1 = FAIL. Run: npm run smoke:cash-vs-competence
//
// Manual gate (not CI): needs the prod service-role key, like health:financial.
// This is an INDEPENDENT re-implementation of the reconciliation bucketing (the
// client helper buildCashVsCompetenceReconciliation imports `@/` aliases tsx can't
// resolve). A divergence between this SQL/JS cross-check and the TS helper is a
// real signal — the unit tests guard the helper, this guards prod data + parity.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "qvdmzhyzpyaveniirsmo";
const ENV_FILE = process.env.HEALTH_ENV_FILE || ".env.production";

const EXPECTED = {
  competence2024: 9240.18,
  competence2023: 10773.26,
  cash2024: 13740.18,
  total: 52657.02,
  bridgeDocs: ["FPR 10/23", "FPR 9/25"],
};

const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m![1], m![2].replace(/^["']|["']$/g, "")]),
);

const serviceRoleKey = JSON.parse(
  execFileSync(
    "npx",
    [
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      PROJECT_REF,
      "-o",
      "json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  ),
).find((k: { id: string }) => k.id === "service_role").api_key;

const sb = createClient(env.VITE_SUPABASE_URL, serviceRoleKey);

type PaymentRow = {
  id: string;
  status: string;
  payment_type: string;
  client_id: string | null;
  project_id: string | null;
  payment_date: string | null;
  amount: number | string;
  financial_document_id: string | null;
};
type ProjectRow = { id: string; category: string | null };
type DocRow = {
  id: string;
  issue_date: string | null;
  document_number: string;
};

const yearOf = (dateOnly: string) => Number(dateOnly.slice(0, 4));

const main = async () => {
  const { data: configRow, error: configErr } = await sb
    .from("configuration")
    .select("config")
    .eq("id", 1)
    .single();
  if (configErr || !configRow?.config?.fiscalConfig) {
    throw new Error(
      `Cannot read fiscalConfig: ${configErr?.message ?? "none"}`,
    );
  }
  const taxDefaults = configRow.config.fiscalConfig.taxabilityDefaults ?? {
    nonTaxableCategories: [],
    nonTaxableClientIds: [],
  };

  const [paymentsRes, projectsRes, docsRes] = await Promise.all([
    sb
      .from("payments")
      .select(
        "id, status, payment_type, client_id, project_id, payment_date, amount, financial_document_id",
      ),
    sb.from("projects").select("id, category"),
    sb
      .from("financial_documents")
      .select("id, issue_date, document_number")
      .eq("direction", "outbound"),
  ]);
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const docs = (docsRes.data ?? []) as DocRow[];

  const categoryById = new Map(projects.map((p) => [String(p.id), p.category]));
  const issueDateByDocId = new Map<string, string>();
  const docNumberById = new Map<string, string>();
  for (const d of docs) {
    if (d.issue_date) issueDateByDocId.set(String(d.id), d.issue_date);
    docNumberById.set(String(d.id), d.document_number);
  }

  // SAME rules as the TS helper / buildFiscalYearEstimate:
  const signed = (p: PaymentRow) => {
    const amount = Number(p.amount || 0);
    return p.payment_type === "rimborso" ? -amount : amount;
  };
  const excluded = (p: PaymentRow) => {
    if ((taxDefaults.nonTaxableClientIds ?? []).includes(String(p.client_id))) {
      return true;
    }
    if (!p.project_id) return false;
    const category = categoryById.get(String(p.project_id));
    return (taxDefaults.nonTaxableCategories ?? []).includes(category);
  };

  const cash = new Map<number, number>();
  const comp = new Map<number, number>();
  const bridge: {
    doc: string;
    amount: number;
    cashY: number;
    compY: number;
  }[] = [];
  const add = (m: Map<number, number>, y: number, v: number) =>
    m.set(y, (m.get(y) ?? 0) + v);

  for (const p of payments) {
    if (p.status !== "ricevuto" || !p.payment_date) continue;
    const amount = signed(p);
    if (excluded(p)) continue;
    const cashY = yearOf(p.payment_date);
    const docId = p.financial_document_id;
    const issue =
      docId != null ? issueDateByDocId.get(String(docId)) : undefined;
    const compY = issue != null ? yearOf(issue) : cashY;
    add(cash, cashY, amount);
    add(comp, compY, amount);
    if (issue != null && compY !== cashY) {
      bridge.push({
        doc: docNumberById.get(String(docId)) ?? String(docId),
        amount,
        cashY,
        compY,
      });
    }
  }

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sumCash = r2([...cash.values()].reduce((s, v) => s + v, 0));
  const sumComp = r2([...comp.values()].reduce((s, v) => s + v, 0));

  console.warn("\n── Cash vs Competence (real prod) ──");
  for (const y of [...new Set([...cash.keys(), ...comp.keys()])].sort()) {
    console.warn(
      `  ${y}: cassa ${r2(cash.get(y) ?? 0).toFixed(2)} | competenza ${r2(
        comp.get(y) ?? 0,
      ).toFixed(2)}`,
    );
  }
  console.warn(
    `  Σ cassa ${sumCash.toFixed(2)} | Σ competenza ${sumComp.toFixed(2)}`,
  );
  console.warn(`  bridge (${bridge.length}):`);
  for (const b of bridge) {
    console.warn(
      `      ${b.doc}: ${b.amount.toFixed(2)} incassata ${b.cashY}, emessa ${b.compY}`,
    );
  }
  console.warn("");

  const near = (a: number, b: number) => Math.abs(a - b) <= 0.01;
  const fails: string[] = [];
  if (!near(r2(comp.get(2024) ?? 0), EXPECTED.competence2024))
    fails.push(
      `competence 2024 ${comp.get(2024)} != ${EXPECTED.competence2024}`,
    );
  if (!near(r2(comp.get(2023) ?? 0), EXPECTED.competence2023))
    fails.push(
      `competence 2023 ${comp.get(2023)} != ${EXPECTED.competence2023}`,
    );
  if (!near(r2(cash.get(2024) ?? 0), EXPECTED.cash2024))
    fails.push(`cash 2024 ${cash.get(2024)} != ${EXPECTED.cash2024}`);
  if (!near(sumCash, sumComp))
    fails.push(`conservation Σcash ${sumCash} != Σcomp ${sumComp}`);
  if (!near(sumCash, EXPECTED.total))
    fails.push(`total ${sumCash} != ${EXPECTED.total}`);
  if (bridge.length !== 2) fails.push(`bridge length ${bridge.length} != 2`);
  for (const doc of EXPECTED.bridgeDocs) {
    if (!bridge.some((b) => b.doc === doc)) fails.push(`bridge missing ${doc}`);
  }

  if (fails.length > 0) {
    console.error("FAIL:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  console.warn(
    "PASS: cash-vs-competence prod oracles hold (2024 competenza = 9.240,18 ≈ Fabio; bridge = 2).",
  );
};

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
