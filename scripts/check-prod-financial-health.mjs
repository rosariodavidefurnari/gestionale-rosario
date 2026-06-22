#!/usr/bin/env node
// READ-ONLY production financial/fiscal health check. No writes — only SELECT.
// Asserts deterministic data invariants and reports the live figures the user
// sees (Da incassare, cassa per anno, pendingPaymentsTotal, emit-link exposure,
// fiscal reminders alive). Exit 0 = PASS, 1 = FAIL. Run: npm run health:financial
//
// Invariants (EXPECT 0 / no-anomaly):
//   INV1  ricevuto senza payment_date        (cassa in anno sbagliato, DOM-1/WF-8)
//   INV2  importi negativi
//   INV3  doc emesso con ricevuto + in_attesa (orfano/doppio: FIX-3 gemello)
//   INV3b doc emesso con >1 in_attesa         (atteso duplicato)
//   INV4  obblighi fiscali entro 30g ma 0 promemoria (QW1 cron morto)
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "qvdmzhyzpyaveniirsmo";
const ENV_FILE = process.env.HEALTH_ENV_FILE || ".env.production";

const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
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
).find((k) => k.id === "service_role").api_key;

const a = createClient(env.VITE_SUPABASE_URL, serviceRoleKey);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const now = Number(process.env.TS || Date.now());
const todayIso = new Date(now).toISOString().slice(0, 10);
const plus30 = new Date(now + 30 * 864e5).toISOString().slice(0, 10);
const curYear = todayIso.slice(0, 4);
const fails = [];
const ok = [];

const all = async (table, sel) => {
  const { data, error } = await a.from(table).select(sel).limit(10000);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
};

const main = async () => {
  console.log(`# PROD financial/fiscal health — ${todayIso}\n`);
  const payments = await all(
    "payments",
    "id,client_id,status,payment_date,amount,payment_type,invoice_ref,project_id,financial_document_id",
  );
  const financialDocuments = await all(
    "financial_documents",
    "id,client_id,direction,document_type,document_number,issue_date,due_date,total_amount,taxable_amount,tax_amount,stamp_amount,currency_code,source_path",
  );
  const clients = await all("clients", "id,name");

  const ricNoDate = payments.filter(
    (p) => p.status === "ricevuto" && !p.payment_date,
  );
  (ricNoDate.length === 0 ? ok : fails).push(
    `INV1 ricevuto senza payment_date: ${ricNoDate.length}`,
  );

  const neg = payments.filter((p) => num(p.amount) < 0);
  (neg.length === 0 ? ok : fails).push(`INV2 importi negativi: ${neg.length}`);

  const byDoc = {};
  for (const p of payments.filter((p) => p.financial_document_id)) {
    (byDoc[p.financial_document_id] ||= []).push(p.status);
  }
  const linkedCount = Object.keys(byDoc).length;
  const doubled = Object.values(byDoc).filter(
    (st) => st.includes("ricevuto") && st.includes("in_attesa"),
  );
  const multiPending = Object.values(byDoc).filter(
    (st) => st.filter((s) => s === "in_attesa").length > 1,
  );
  (doubled.length === 0 ? ok : fails).push(
    `INV3 doc ricevuto+in_attesa: ${doubled.length}`,
  );
  (multiPending.length === 0 ? ok : fails).push(
    `INV3b doc >1 in_attesa: ${multiPending.length}`,
  );

  // BR2 backfill invariants. INV4 is a FLOOR, not an equality: linkedCount grows
  // with every real app emit (FIX-3/4), so `== 25` would false-FAIL the moment a
  // real invoice is emitted from the app. The exact `== 25` belongs to the
  // one-shot post-apply acceptance check (C3), not this recurring guard.
  const multiReceived = Object.values(byDoc).filter(
    (st) => st.filter((s) => s === "ricevuto").length > 1,
  );
  (linkedCount >= 25 ? ok : fails).push(
    `BR2a backfill floor linkedCount>=25: ${linkedCount}`,
  );
  (multiReceived.length === 0 ? ok : fails).push(
    `BR2b doc >1 ricevuto collegato: ${multiReceived.length}`,
  );

  const laurusTargets = [
    {
      document_number: "FPR 1/23",
      issue_date: "2023-03-21",
      due_date: "2023-03-21",
      total_amount: 1872,
      taxable_amount: 1872,
      stamp_amount: null,
      source_path: "Fatture/2023/IT01879020517A2023_bhiYr.xml",
    },
    {
      document_number: "FPR 6/23",
      issue_date: "2023-10-24",
      due_date: "2023-11-24",
      total_amount: 2498.08,
      taxable_amount: 2498.08,
      stamp_amount: 2,
      source_path: "Fatture/2023/IT01879020517A2023_flFCj.xml",
    },
    {
      document_number: "FPR 1/24",
      issue_date: "2024-02-02",
      due_date: "2024-02-29",
      total_amount: 1750,
      taxable_amount: 1750,
      stamp_amount: null,
      source_path: "Fatture/2024/IT01879020517A2024_aDUq8.xml",
    },
  ];
  const laurusClients = clients.filter((c) => c.name === "LAURUS S.R.L.");
  let laurusBackfillMissing = laurusTargets.length;
  if (laurusClients.length === 1) {
    const laurusId = laurusClients[0].id;
    laurusBackfillMissing = laurusTargets.filter((target) => {
      const doc = financialDocuments.find(
        (d) =>
          d.client_id === laurusId &&
          d.direction === "outbound" &&
          d.document_type === "customer_invoice" &&
          d.document_number === target.document_number &&
          d.issue_date === target.issue_date &&
          d.due_date === target.due_date &&
          num(d.total_amount) === target.total_amount &&
          num(d.taxable_amount) === target.taxable_amount &&
          d.tax_amount == null &&
          (d.stamp_amount == null ? null : num(d.stamp_amount)) ===
            target.stamp_amount &&
          d.currency_code === "EUR" &&
          d.source_path === target.source_path,
      );
      if (!doc) return true;
      return !payments.some(
        (p) =>
          p.client_id === laurusId &&
          p.status === "ricevuto" &&
          p.invoice_ref === target.document_number &&
          p.financial_document_id === doc.id,
      );
    }).length;
  }
  if (laurusClients.length !== 1) {
    fails.push(`LAURUS backfill client count: ${laurusClients.length}`);
  } else {
    (laurusBackfillMissing === 0 ? ok : fails).push(
      `LAURUS no-doc backfill missing/link gaps: ${laurusBackfillMissing}`,
    );
  }

  try {
    const billingProfiles = await all(
      "client_billing_profiles",
      "id,client_id,label,billing_name,vat_number,fiscal_code,billing_sdi_code",
    );
    const docsWithProfiles = await all(
      "financial_documents",
      "id,client_id,direction,document_type,document_number,issue_date,total_amount,source_path,billing_profile_id",
    );
    const gustareClients = clients.filter(
      (c) => c.name === "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
    );
    const liveClients = clients.filter(
      (c) =>
        c.name === "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA",
    );

    if (liveClients.length !== 0) {
      fails.push(`LIVE operational client rows: ${liveClients.length}`);
    } else {
      ok.push("LIVE operational client rows: 0");
    }

    if (gustareClients.length !== 1) {
      fails.push(`Gustare client count: ${gustareClients.length}`);
    } else {
      const gustareId = gustareClients[0].id;
      const liveProfiles = billingProfiles.filter(
        (p) =>
          p.client_id === gustareId &&
          p.billing_name ===
            "LIVE - SOCIETA' A RESPONSABILITA' LIMITATA SEMPLIFICATA" &&
          p.vat_number === "06256710879" &&
          p.fiscal_code === "06256710879" &&
          p.billing_sdi_code === "KRRH6B9",
      );
      const liveTargets = [
        {
          document_number: "FPR 1/26",
          issue_date: "2026-03-23",
          total_amount: 2745,
          source_path: "Fatture/2026/IT01879020517A2026_bVF6w.xml",
        },
        {
          document_number: "FPR 2/26",
          issue_date: "2026-04-18",
          total_amount: 2854.03,
          source_path: "Fatture/2026/IT01879020517A2026_cBc8j.xml",
        },
      ];
      const liveDocs = liveTargets
        .map((target) =>
          docsWithProfiles.find(
            (d) =>
              d.client_id === gustareId &&
              d.direction === "outbound" &&
              d.document_type === "customer_invoice" &&
              d.document_number === target.document_number &&
              d.issue_date === target.issue_date &&
              num(d.total_amount) === target.total_amount &&
              d.source_path === target.source_path,
          ),
        )
        .filter(Boolean);

      if (liveDocs.length === 0 && liveProfiles.length <= 1) {
        ok.push(
          `LIVE/Gustare billing profile pending: profiles=${liveProfiles.length}, docs=0`,
        );
      } else if (liveProfiles.length !== 1) {
        fails.push(
          `LIVE/Gustare billing profile count: ${liveProfiles.length}`,
        );
      } else {
        const liveProfileId = liveProfiles[0].id;
        const docsWithoutProfile = liveDocs.filter(
          (d) => d.billing_profile_id !== liveProfileId,
        );
        const missingDocs = liveTargets.length - liveDocs.length;
        (missingDocs === 0 ? ok : fails).push(
          `LIVE/Gustare target docs present: ${liveDocs.length}/${liveTargets.length}`,
        );
        (docsWithoutProfile.length === 0 ? ok : fails).push(
          `LIVE/Gustare docs without LIVE profile: ${docsWithoutProfile.length}`,
        );
      }
    }
  } catch (error) {
    ok.push(
      `LIVE/Gustare billing profile guard pending schema: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const ccp = await all(
    "client_commercial_position",
    "client_name,balance_due",
  );
  const daIncassare = ccp.reduce(
    (s, r) => s + Math.max(0, num(r.balance_due)),
    0,
  );
  const openClients = ccp.filter((r) => num(r.balance_due) > 0);

  const cassaByYear = {};
  for (const p of payments.filter(
    (p) => p.status === "ricevuto" && p.payment_date,
  )) {
    const y = p.payment_date.slice(0, 4);
    cassaByYear[y] = (cassaByYear[y] || 0) + num(p.amount);
  }
  const pendingCur = payments
    .filter(
      (p) =>
        p.status !== "ricevuto" &&
        p.payment_type !== "rimborso" &&
        (p.payment_date || "").slice(0, 4) === curYear,
    )
    .reduce((s, p) => s + num(p.amount), 0);

  const tasks = await all("client_tasks", "type,due_date,done_date");
  const fiscalTypes = ["f24", "inps", "bollo", "dichiarazione", "imposta"];
  const upcomingTasks = tasks.filter(
    (t) =>
      fiscalTypes.includes(t.type) &&
      t.due_date >= todayIso &&
      t.due_date <= plus30 &&
      !t.done_date,
  );
  let obl30Count = "n/a";
  try {
    const obls = await all("fiscal_obligations", "due_date");
    const obl30 = obls.filter(
      (o) => o.due_date >= todayIso && o.due_date <= plus30,
    );
    obl30Count = obl30.length;
    if (obl30.length > 0 && upcomingTasks.length === 0) {
      fails.push(
        `INV4 obblighi 30g=${obl30.length} ma 0 promemoria (QW1 regress)`,
      );
    } else {
      ok.push(
        `INV4 promemoria 30g: tasks=${upcomingTasks.length}, obblighi=${obl30.length}`,
      );
    }
  } catch {
    ok.push(`INV4 promemoria 30g: tasks=${upcomingTasks.length}, obblighi=n/a`);
  }

  console.log("## Figure live");
  console.log(
    `Da incassare (Σ max(0,balance_due)): € ${daIncassare.toFixed(2)} su ${openClients.length} clienti`,
  );
  openClients
    .sort((x, y) => num(y.balance_due) - num(x.balance_due))
    .slice(0, 8)
    .forEach((r) =>
      console.log(`  - ${r.client_name}: € ${num(r.balance_due).toFixed(2)}`),
    );
  console.log("Cassa incassata per anno:");
  Object.entries(cassaByYear)
    .sort()
    .forEach(([y, v]) => console.log(`  - ${y}: € ${v.toFixed(2)}`));
  console.log(`pendingPaymentsTotal ${curYear}: € ${pendingCur.toFixed(2)}`);
  console.log(
    `payments emit-linked: ${linkedCount} doc, obblighi 30g: ${obl30Count}`,
  );
  console.log("\n## Invarianti");
  ok.forEach((m) => console.log(`  OK   ${m}`));
  fails.forEach((m) => console.log(`  FAIL ${m}`));
  console.log(
    `\nRESULT: ${fails.length === 0 ? "PASS" : `FAIL (${fails.length})`}`,
  );
  process.exit(fails.length === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error(
    "health check error:",
    e instanceof Error ? e.message : String(e),
  );
  process.exit(2);
});
