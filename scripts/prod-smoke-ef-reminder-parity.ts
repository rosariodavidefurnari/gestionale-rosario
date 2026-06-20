#!/usr/bin/env tsx
// READ-ONLY production smoke for the fiscal reminder Edge Function parity (DOM-5).
// Proves the EF estimate layer produces the SAME 2026 "da versare" the card shows
// (9.005,91 €) by replicating the EF's fetch (loadYearData + loadEstimateReality
// Inputs) against PROD and running the SAME shared builder. No writes — only SELECT.
// Exit 0 = PASS, 1 = FAIL. Run: npm run smoke:ef-reminder-parity
//
// Why a manual gate (not CI): needs the prod service-role key, like
// health:financial. The card value lives in CANTIERE: 9.005,91 = 30/06 6.574,10
// + 30/11 2.431,81. The script uses the exact builder the EF uses, so PASS here
// ⇒ the deployed EF reminder matches the card.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

import {
  buildFiscalReminderComputation,
  type FiscalConfig,
  type FiscalDeclarationInput,
  type PaymentRow,
  type ProjectRow,
} from "../supabase/functions/_shared/fiscalDeadlineCalculation.ts";
import {
  sumInpsContributionsPaidInYear,
  type FiscalObligationComponentRow,
  type FiscalF24PaymentLineCashRow,
} from "../supabase/functions/_shared/inpsContributionsPaid.ts";
import {
  getBusinessYear,
  todayISODate,
} from "../supabase/functions/_shared/dateTimezone.ts";

const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "qvdmzhyzpyaveniirsmo";
const ENV_FILE = process.env.HEALTH_ENV_FILE || ".env.production";
// Card oracle (CANTIERE 2026-06-20): 30/06 6.574,10 + 30/11 2.431,81 = 9.005,91.
const EXPECTED_JUNE = 6574.1;
const EXPECTED_NOV = 2431.81;
const EXPECTED_TOTAL = 9005.91;

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

const main = async () => {
  const todayIso = process.env.TODAY_ISO || todayISODate();
  const currentYear = Number(todayIso.slice(0, 4));
  const basisYear = currentYear - 1;
  const priorBasisYear = currentYear - 2;

  // ── Config (mirror loadFiscalConfig) ───────────────────────────────────────
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
  const fiscalConfig = configRow.config.fiscalConfig as FiscalConfig;

  // ── loadYearData (mirror) ──────────────────────────────────────────────────
  const [paymentsRes, projectsRes, earliestRes] = await Promise.all([
    sb
      .from("payments")
      .select(
        "payment_type, client_id, project_id, payment_date, status, amount",
      )
      .gte("payment_date", `${currentYear - 3}-01-01`)
      .lt("payment_date", `${currentYear + 1}-01-01`),
    sb.from("projects").select("id, category"),
    sb
      .from("payments")
      .select("payment_date")
      .not("payment_date", "is", null)
      .order("payment_date", { ascending: true })
      .limit(1),
  ]);
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const projects = (projectsRes.data ?? []) as ProjectRow[];
  const inferredActivityStartYear =
    earliestRes.data?.[0]?.payment_date != null
      ? getBusinessYear(String(earliestRes.data[0].payment_date))
      : null;

  // ── loadEstimateRealityInputs (mirror) ─────────────────────────────────────
  const [priorDeclRes, basisOblRes] = await Promise.all([
    sb
      .from("fiscal_declarations")
      .select("total_substitute_tax, total_inps, prior_advances_inps")
      .eq("tax_year", priorBasisYear)
      .maybeSingle(),
    sb
      .from("fiscal_obligations")
      .select("id, component")
      .eq("payment_year", basisYear),
  ]);
  const priorBasisDeclaration =
    (priorDeclRes.data as FiscalDeclarationInput | null) ?? null;
  const basisObligations = (basisOblRes.data ??
    []) as FiscalObligationComponentRow[];

  let basisContributiVersatiCassa: number | undefined;
  if (basisObligations.length > 0) {
    const { data: basisLines } = await sb
      .from("fiscal_f24_payment_lines_enriched")
      .select("obligation_id, amount, submission_date")
      .in(
        "obligation_id",
        basisObligations.map((o) => o.id),
      );
    basisContributiVersatiCassa = sumInpsContributionsPaidInYear(
      (basisLines ?? []) as FiscalF24PaymentLineCashRow[],
      basisObligations,
      basisYear,
    );
  }

  // ── Build the schedule (SAME builder the EF uses) ──────────────────────────
  const computation = buildFiscalReminderComputation({
    config: fiscalConfig,
    payments,
    projects,
    paymentYear: currentYear,
    todayIso,
    inferredActivityStartYear,
    basisContributiVersatiCassa,
    priorBasisDeclaration,
  });

  const high = computation.schedule.deadlines.filter(
    (d) => d.priority === "high",
  );
  const june = high.find((d) => d.date.startsWith(`${currentYear}-06`));
  const nov = high.find((d) => d.date.startsWith(`${currentYear}-11`));
  const total =
    Math.round(high.reduce((s, d) => s + d.totalAmount, 0) * 100) / 100;

  console.warn(`\n── EF reminder ${currentYear} (real prod inputs) ──`);
  console.warn(
    `priorBasisDeclaration(${priorBasisYear}): ${
      priorBasisDeclaration ? "present" : "MISSING"
    }`,
  );
  console.warn(
    `basisContributiVersatiCassa(${basisYear}): ${
      basisContributiVersatiCassa ?? "undefined (fallback competence)"
    }`,
  );
  for (const d of high) {
    console.warn(`  ${d.date} ${d.label}: ${d.totalAmount.toFixed(2)} €`);
    for (const it of d.items) {
      console.warn(`      - ${it.component}: ${it.amount.toFixed(2)} €`);
    }
  }
  console.warn(`  TOTAL high-priority ${currentYear}: ${total.toFixed(2)} €\n`);

  const fails: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= 0.01;
  if (currentYear === 2026) {
    if (!june || !near(june.totalAmount, EXPECTED_JUNE)) {
      fails.push(
        `June total ${june?.totalAmount ?? "n/a"} != ${EXPECTED_JUNE}`,
      );
    }
    if (!nov || !near(nov.totalAmount, EXPECTED_NOV)) {
      fails.push(`Nov total ${nov?.totalAmount ?? "n/a"} != ${EXPECTED_NOV}`);
    }
    if (!near(total, EXPECTED_TOTAL)) {
      fails.push(`Total ${total} != ${EXPECTED_TOTAL}`);
    }
  } else {
    console.warn(
      `(year ${currentYear} != 2026: skipping the card-value assert; printout above is the live schedule)`,
    );
  }

  if (fails.length > 0) {
    console.error("FAIL:\n  - " + fails.join("\n  - "));
    process.exit(1);
  }
  console.warn("PASS: EF reminder schedule matches the card (9.005,91 €).");
};

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
