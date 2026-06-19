import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { AuthMiddleware } from "../_shared/authentication.ts";
import { isCronAuthorized } from "../_shared/cronAuth.ts";
import { getBusinessYear, todayISODate } from "../_shared/dateTimezone.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import {
  buildDeadlineNotificationMessage,
  buildFiscalDeadlineKey,
  buildFiscalReminderComputation,
  buildTaskPayloads,
  type FiscalConfig,
  type FiscalDeadline,
  type FiscalWarning,
  type FiscalTaskPayload,
  type PaymentRow,
  type ProjectRow,
} from "../_shared/fiscalDeadlineCalculation.ts";
import {
  sendInternalEmail,
  sendWhatsApp,
} from "../_shared/internalNotifications.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createErrorResponse } from "../_shared/utils.ts";
import {
  buildFiledDeclarationIds,
  buildPaidObligationIds,
  selectCertifiedObligations,
} from "../_shared/selectCertifiedObligations.ts";

const FISCAL_TASK_TYPES = new Set(["f24", "inps", "bollo", "dichiarazione"]);

/** Deadlines within this many days get a task created */
const TASK_REMINDER_DAYS = 30;
/** Deadlines within this many days trigger a notification */
const NOTIFY_DAYS = 7;

type CheckResult = {
  deadlinesFound: number;
  tasksCreated: number;
  notificationSent: boolean;
  details: string;
};

// ── Helpers ───────────────────────────────────────────────────────────

async function loadFiscalConfig(): Promise<FiscalConfig | null> {
  const { data: configRow, error } = await supabaseAdmin
    .from("configuration")
    .select("config")
    .eq("id", 1)
    .single();

  if (error || !configRow?.config) {
    throw new Error(
      `Cannot read configuration: ${error?.message ?? "no config row"}`,
    );
  }

  const appConfig = configRow.config as Record<string, unknown>;
  const fiscalConfig = appConfig.fiscalConfig as FiscalConfig | undefined;
  return fiscalConfig ?? null;
}

async function loadYearData(paymentYear: number) {
  const paymentsRangeStart = `${paymentYear - 3}-01-01`;
  const paymentsRangeEnd = `${paymentYear + 1}-01-01`;

  const [paymentsResult, projectsResult, earliestPaymentResult] =
    await Promise.all([
      supabaseAdmin
        .from("payments")
        .select(
          "payment_type, client_id, project_id, payment_date, status, amount",
        )
        .gte("payment_date", paymentsRangeStart)
        .lt("payment_date", paymentsRangeEnd),
      supabaseAdmin.from("projects").select("id, category"),
      supabaseAdmin
        .from("payments")
        .select("payment_date")
        .not("payment_date", "is", null)
        .order("payment_date", { ascending: true })
        .limit(1),
    ]);

  return {
    payments: (paymentsResult.data ?? []) as PaymentRow[],
    projects: (projectsResult.data ?? []) as ProjectRow[],
    inferredActivityStartYear:
      earliestPaymentResult.data?.[0]?.payment_date != null
        ? getBusinessYear(String(earliestPaymentResult.data[0].payment_date))
        : null,
  };
}

async function createMissingTasks(
  upcomingDeadlines: FiscalDeadline[],
  currentYear: number,
): Promise<{ created: number; needed: number }> {
  const yearStart = `${currentYear}-01-01`;
  const taskYearEnd = `${currentYear + 1}-03-31`;
  const { data: existingTasks } = await supabaseAdmin
    .from("client_tasks")
    .select("text, type, due_date")
    .gte("due_date", yearStart)
    .lte("due_date", taskYearEnd);

  const existingSignatures = new Set(
    (existingTasks ?? [])
      .filter((t: { type: string }) => FISCAL_TASK_TYPES.has(t.type))
      .map(
        (t: { type: string; due_date: string }) =>
          `${t.type}::${t.due_date?.substring(0, 10)}`,
      ),
  );

  const allPayloads: FiscalTaskPayload[] = buildTaskPayloads(upcomingDeadlines);
  const newPayloads = allPayloads.filter(
    (task) =>
      !existingSignatures.has(
        `${task.type}::${task.due_date.substring(0, 10)}`,
      ),
  );

  let created = 0;
  for (const task of newPayloads) {
    const { error } = await supabaseAdmin.from("client_tasks").insert(task);
    if (!error) created++;
    else console.error("fiscal_deadline_check.task_insert_error", error);
  }

  return { created, needed: newPayloads.length };
}

type NotificationChannel = "email" | "whatsapp";

const NOTIFICATION_CHANNELS: NotificationChannel[] = ["email", "whatsapp"];

/**
 * Returns the deadlines that still need a notification on the given channel,
 * i.e. those without an existing (deadline_key, channel) marker row.
 */
async function selectUnnotifiedDeadlines(
  imminent: FiscalDeadline[],
  channel: NotificationChannel,
): Promise<{ deadline: FiscalDeadline; key: string }[]> {
  const keyed = imminent.map((deadline) => ({
    deadline,
    key: buildFiscalDeadlineKey(deadline),
  }));
  const keys = keyed.map((entry) => entry.key);

  const { data: alreadySent, error } = await supabaseAdmin
    .from("fiscal_reminder_notifications")
    .select("deadline_key")
    .eq("channel", channel)
    .in("deadline_key", keys);

  if (error) {
    // Fail closed: if we cannot confirm prior sends, skip to avoid spam.
    console.error("fiscal_deadline_check.notification_lookup_error", {
      channel,
      error,
    });
    return [];
  }

  const sentKeys = new Set(
    (alreadySent ?? []).map(
      (row: { deadline_key: string }) => row.deadline_key,
    ),
  );
  return keyed.filter((entry) => !sentKeys.has(entry.key));
}

async function markNotified(
  deadlineKey: string,
  channel: NotificationChannel,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("fiscal_reminder_notifications")
    .insert({ deadline_key: deadlineKey, channel });
  if (error) {
    console.error("fiscal_deadline_check.notification_mark_error", {
      channel,
      error,
    });
  }
}

/**
 * Send imminent-deadline notifications idempotently.
 *
 * For each channel, only deadlines not yet notified on that channel are sent;
 * the marker row is written ONLY after a successful send, so a transient
 * provider failure simply retries next run instead of silencing the alert.
 * Result: at most one notification per (deadline, channel), never daily spam.
 */
async function notifyImminent(
  upcomingDeadlines: FiscalDeadline[],
  hasRealData: boolean,
): Promise<boolean> {
  const imminent = upcomingDeadlines.filter((d) => d.daysUntil <= NOTIFY_DAYS);
  if (imminent.length === 0) return false;

  const qualifier = hasRealData ? "" : " stimate";
  let anySent = false;

  for (const channel of NOTIFICATION_CHANNELS) {
    const pending = await selectUnnotifiedDeadlines(imminent, channel);
    if (pending.length === 0) continue;

    const deadlines = pending.map((entry) => entry.deadline);
    const message = buildDeadlineNotificationMessage(deadlines);
    const n = deadlines.length;
    const subject = `⏰ ${n} scadenz${n === 1 ? "a" : "e"} fiscal${n === 1 ? "e" : "i"}${qualifier} entro ${NOTIFY_DAYS} giorni`;

    const result =
      channel === "email"
        ? await sendInternalEmail(subject, message)
        : await sendWhatsApp(message);

    console.warn("fiscal_deadline_check.notification", {
      channel,
      deadlines: n,
      ok: result.ok,
      error: result.error,
    });

    if (result.ok) {
      anySent = true;
      for (const entry of pending) {
        await markNotified(entry.key, channel);
      }
    }
  }

  return anySent;
}

const logFiscalWarnings = (warnings: FiscalWarning[]) => {
  for (const warning of warnings) {
    console.warn("fiscal_deadline_check.estimate_warning", {
      code: warning.code,
      taxYear: warning.taxYear,
      amount: warning.amount,
      paymentYear: warning.paymentYear,
      severity: warning.severity,
      message: warning.message,
    });
  }
};

// ── Phase 2: overlay real obligations ─────────────────────────────────

async function applyRealObligations(
  deadlines: FiscalDeadline[],
  paymentYear: number,
): Promise<{ patched: FiscalDeadline[]; hasRealData: boolean }> {
  // 1. Load obligations for payment year
  const { data: rawObligations } = await supabaseAdmin
    .from("fiscal_obligations")
    .select("*")
    .eq("payment_year", paymentYear);

  if (!rawObligations || rawObligations.length === 0) {
    return { patched: deadlines, hasRealData: false };
  }

  // 2. Load payment lines for those obligations
  const obligationIds = rawObligations.map((o: any) => o.id);
  const { data: paymentLines } = await supabaseAdmin
    .from("fiscal_f24_payment_lines_enriched")
    .select("*")
    .in("obligation_id", obligationIds);

  // 3. Keep ONLY certified obligations: a stale hand-entered PROJECTION
  // (declaration_id null, or backed by an unfiled/zero-totals declaration, with
  // no F24 payment) must never patch the estimate nor trigger a reminder. Same
  // rule as the client deadline card (selectCertifiedObligations).
  const { data: declarations } = await supabaseAdmin
    .from("fiscal_declarations")
    .select("id, total_substitute_tax, total_inps");

  const obligations = selectCertifiedObligations(
    rawObligations as Array<{ id: string; declaration_id: string | null }>,
    buildFiledDeclarationIds(declarations ?? []),
    buildPaidObligationIds(paymentLines ?? []),
  ) as typeof rawObligations;

  if (obligations.length === 0) {
    return { patched: deadlines, hasRealData: false };
  }

  // 4. Build paid amounts map by obligation_id
  const paidByObligation = new Map<string, number>();
  for (const line of paymentLines ?? []) {
    const current = paidByObligation.get(line.obligation_id) ?? 0;
    paidByObligation.set(line.obligation_id, current + Number(line.amount));
  }

  // 5. Build merge map: key → remaining amount
  const realAmounts = new Map<string, number>();
  for (const obl of obligations) {
    const key = `${obl.component}::${obl.competence_year}::${obl.due_date}`;
    const paid = paidByObligation.get(obl.id) ?? 0;
    const remaining = Math.max(0, Number(obl.amount) - paid);
    realAmounts.set(key, remaining);
  }

  // 5. Patch deadlines with real remaining amounts
  const patched = deadlines.map((deadline) => {
    const patchedItems = deadline.items.map((item) => {
      if (item.competenceYear == null) return item;
      const key = `${item.component}::${item.competenceYear}::${deadline.date}`;
      const realRemaining = realAmounts.get(key);
      if (realRemaining != null) {
        return { ...item, amount: realRemaining };
      }
      return item;
    });
    const totalAmount = patchedItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const roundedTotal = Math.round((totalAmount + Number.EPSILON) * 100) / 100;
    return { ...deadline, items: patchedItems, totalAmount: roundedTotal };
  });

  return { patched, hasRealData: true };
}

// ── Orchestrator ──────────────────────────────────────────────────────

async function runFiscalDeadlineCheck(): Promise<CheckResult> {
  const todayStr = todayISODate();
  const currentYear = Number(todayStr.slice(0, 4));

  const fiscalConfig = await loadFiscalConfig();
  if (!fiscalConfig) {
    return {
      deadlinesFound: 0,
      tasksCreated: 0,
      notificationSent: false,
      details: "No fiscal configuration found — skipping",
    };
  }

  const { payments, projects, inferredActivityStartYear } =
    await loadYearData(currentYear);
  const computation = buildFiscalReminderComputation({
    config: fiscalConfig,
    payments,
    projects,
    paymentYear: currentYear,
    todayIso: todayStr,
    inferredActivityStartYear,
  });
  const deadlines = computation.schedule.deadlines;
  logFiscalWarnings(computation.warnings);

  // Phase 2: overlay real obligations on estimated deadlines
  const { patched: realityAwareDeadlines, hasRealData } =
    await applyRealObligations(deadlines, currentYear);

  // Exclude fully-paid deadlines (totalAmount === 0 with real data)
  const upcoming = realityAwareDeadlines.filter(
    (d) => !d.isPast && d.daysUntil <= TASK_REMINDER_DAYS && d.totalAmount > 0,
  );
  if (upcoming.length === 0) {
    return {
      deadlinesFound: deadlines.length,
      tasksCreated: 0,
      notificationSent: false,
      details: `${deadlines.length} deadlines found, none within ${TASK_REMINDER_DAYS} days${hasRealData ? " (real obligations applied)" : ""}${computation.warnings.length > 0 ? `, ${computation.warnings.length} warning(s)` : ""}`,
    };
  }

  const { created, needed } = await createMissingTasks(upcoming, currentYear);
  const notificationSent = await notifyImminent(upcoming, hasRealData);

  return {
    deadlinesFound: deadlines.length,
    tasksCreated: created,
    notificationSent,
    details: `${upcoming.length} upcoming, ${needed} new tasks needed, ${created} created${hasRealData ? " (real obligations applied)" : ""}${notificationSent ? ", notification sent" : ""}${computation.warnings.length > 0 ? `, ${computation.warnings.length} warning(s)` : ""}`,
  };
}

// ── HTTP handler ──────────────────────────────────────────────────────

async function handleFiscalDeadlineCheck(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return createErrorResponse(405, "Method Not Allowed");
  }

  try {
    const result = await runFiscalDeadlineCheck();

    console.warn("fiscal_deadline_check.completed", result);

    return new Response(JSON.stringify({ data: result }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("fiscal_deadline_check.error", error);
    return createErrorResponse(
      500,
      `Fiscal deadline check failed: ${String(error)}`,
    );
  }
}

Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async (req) => {
    // Server-to-server (pg_cron) path: exact shared secret, runs with admin
    // context. Otherwise fall back to the standard user JWT (RS256) middleware.
    // AuthMiddleware is left untouched for other consumers; anon / wrong / empty
    // tokens still get 401.
    if (isCronAuthorized(req)) {
      return handleFiscalDeadlineCheck(req);
    }

    return AuthMiddleware(req, handleFiscalDeadlineCheck);
  }),
);
