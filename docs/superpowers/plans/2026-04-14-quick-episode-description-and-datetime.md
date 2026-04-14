# Quick Episode Description + Datetime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `description` field and an all-day toggle + start/end datetime inputs to the Quick Episode (Puntata) dialog, so users can register timed episodes with a short title without falling back to the full ServiceCreate page.

**Architecture:** Mirror the temporal fields from `ServiceInputs` inside the stateful form `QuickEpisodeForm` (no react-admin form — it's a plain controlled form with `useState`). The `all_day` toggle swaps the input type between `date` and `datetime-local`. The persistence helper `buildQuickEpisodeServiceCreateData` is updated to forward the three new fields, with a tiny `toServicePersistenceDate` helper that normalizes datetime-local strings to ISO-with-offset while leaving date-only strings untouched. The `expense_date` built for extra expenses is coerced back to date-only via `toBusinessISODate` because `expenses.expense_date` is a `date` column (not timestamptz).

**Tech Stack:** React + TypeScript, plain `@/components/ui/*` primitives, Vitest for unit tests, Supabase Postgres (`services.service_date` = timestamptz, `expenses.expense_date` = date).

---

## File Structure

Files touched by this plan:

| File | Responsibility | Action |
|---|---|---|
| `src/components/atomic-crm/projects/QuickEpisodeForm.tsx` | Form state, new fields in `EpisodeFormData`/`EpisodeFormDefaults`, new UI (switch + date/datetime inputs + description input) | Modify |
| `src/components/atomic-crm/projects/QuickEpisodeDialog.tsx` | Defaults memo — inject new default values | Modify |
| `src/components/atomic-crm/projects/quickEpisodePersistence.ts` | `toServicePersistenceDate` helper + updated `buildQuickEpisodeServiceCreateData` + updated `buildQuickEpisodeExpenseCreateData` (uses `toBusinessISODate` for `expense_date`) | Modify |
| `src/components/atomic-crm/projects/quickEpisodePersistence.test.ts` | Update existing expectation + new test cases (description, timed mode, expense_date coercion) | Modify |
| `docs/architecture.md` | Changelog entry | Modify |
| `docs/development-continuity-map.md` | Quick Episode entry update | Modify |

No migration, no Edge Function change, no new RLS policy.

---

## Task 1: Extend types and test fixtures for the new fields

**Files:**
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.test.ts:17-45`

- [ ] **Step 1: Update the shared `data` fixture to include the new fields with "empty" defaults**

Replace the `const data = { ... }` block (currently lines 17–45) with:

```ts
  const data = {
    service_date: "2026-02-22",
    service_end: "",
    all_day: true,
    description: "",
    service_type: "riprese_montaggio" as const,
    fee_shooting: 233,
    fee_editing: 156,
    fee_other: 0,
    km_distance: 144.24,
    km_rate: 0.19,
    location: "Acireale",
    notes: "Intervista a Roberto Lipari",
    extra_expenses: [
      {
        expense_type: "altro" as const,
        amount: 12.5,
        markup_percent: 0,
        description: "Casello autostradale",
      },
      {
        expense_type: "altro" as const,
        amount: 18,
        markup_percent: 10,
        description: "Pranzo troupe",
      },
      {
        expense_type: "noleggio" as const,
        amount: 0,
        markup_percent: 0,
        description: "",
      },
    ],
  };
```

- [ ] **Step 2: Run the test suite to confirm this step breaks compilation (it will, because `EpisodeFormData` does not yet have `all_day`/`service_end`/`description`)**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: FAIL with TypeScript error "Object literal may only specify known properties, and 'service_end' does not exist in type 'EpisodeFormData'"

- [ ] **Step 3: Do NOT commit yet** — the next task extends the type and unblocks compilation.

---

## Task 2: Extend `EpisodeFormData` and `EpisodeFormDefaults` with the three new fields

**Files:**
- Modify: `src/components/atomic-crm/projects/QuickEpisodeForm.tsx:17-22` (defaults interface)
- Modify: `src/components/atomic-crm/projects/QuickEpisodeForm.tsx:58-69` (form data interface)

- [ ] **Step 1: Extend `EpisodeFormDefaults` (currently L17–L22)**

Replace the interface with:

```ts
export interface EpisodeFormDefaults extends FeeDefaults {
  service_date: string;
  service_end: string;
  all_day: boolean;
  description: string;
  km_distance: number;
  location: string;
  notes: string;
}
```

- [ ] **Step 2: Extend `EpisodeFormData` (currently L58–L69)**

Replace the interface with:

```ts
export interface EpisodeFormData {
  service_date: string;
  service_end: string;
  all_day: boolean;
  description: string;
  service_type: string;
  fee_shooting: number;
  fee_editing: number;
  fee_other: number;
  km_distance: number;
  km_rate: number;
  location: string;
  notes: string;
  extra_expenses: EpisodeExtraExpenseFormData[];
}
```

- [ ] **Step 3: Run typecheck on the test file to confirm compilation is unblocked for fields — but still fails on missing submit output**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: tests run but the first `buildQuickEpisodeServiceCreateData` test FAILS because the builder still returns `all_day: true` hardcoded while the fixture now has `all_day: true` in input — that specific test actually still passes. The real failing check comes in Task 3 when we add new test cases. For now, confirm NO TypeScript errors on the fixture.

- [ ] **Step 4: Do NOT commit yet** — Task 3 adds the persistence helper and re-runs red.

---

## Task 3: Add `toServicePersistenceDate` helper and extend `buildQuickEpisodeServiceCreateData`

**Files:**
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.ts:1-15` (imports + helpers)
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.ts:37-61` (builder)

- [ ] **Step 1: Write the new failing test cases**

Append inside the existing top-level `describe("quickEpisodePersistence", () => { ... })` block, right AFTER the existing `it("builds the service payload ...")` test (currently L47–L70), these four new cases:

```ts
  it("forwards description when provided and trims it", () => {
    const payload = buildQuickEpisodeServiceCreateData({
      record,
      data: {
        ...data,
        description: "  Savoca — Bar Vitelli  ",
      },
    });
    expect(payload.description).toBe("Savoca — Bar Vitelli");
  });

  it("omits description when blank or whitespace-only", () => {
    const payload = buildQuickEpisodeServiceCreateData({
      record,
      data: { ...data, description: "   " },
    });
    expect(payload).not.toHaveProperty("description");
  });

  it("persists a timed episode as an ISO timestamp range with all_day=false", () => {
    const payload = buildQuickEpisodeServiceCreateData({
      record,
      data: {
        ...data,
        all_day: false,
        service_date: "2026-04-11T08:30",
        service_end: "2026-04-11T14:30",
      },
    });
    expect(payload.all_day).toBe(false);
    // datetime-local is naive local; browser-local for our single user is
    // Europe/Rome so we just assert both become parseable ISO strings with
    // end > start.
    expect(payload.service_date).toMatch(/^2026-04-11T/);
    expect(payload.service_end).toMatch(/^2026-04-11T/);
    expect(
      new Date(payload.service_end!).getTime(),
    ).toBeGreaterThan(new Date(payload.service_date).getTime());
  });

  it("omits service_end when blank in the input (degenerate but valid)", () => {
    const payload = buildQuickEpisodeServiceCreateData({
      record,
      data: {
        ...data,
        all_day: false,
        service_date: "2026-04-11T08:30",
        service_end: "",
      },
    });
    expect(payload.all_day).toBe(false);
    expect(payload.service_date).toMatch(/^2026-04-11T/);
    expect(payload).not.toHaveProperty("service_end");
  });
```

Also update the existing first test (L47–L70) so the expected payload includes `all_day: true` explicitly (unchanged) and has no `description` / `service_end` keys when the fixture leaves them empty. The existing `.toEqual({...})` assertion already does NOT mention `description` or `service_end`, so it will FAIL if the builder always emits them. Leave the existing `.toEqual` intact.

- [ ] **Step 2: Run the tests — confirm 4 new tests FAIL and the original passes**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: the 4 new tests FAIL because the builder still hardcodes `all_day: true` and does not emit `description` / `service_end`. The original `builds the service payload ...` test still passes (fixture leaves `all_day: true`, empty `description`, empty `service_end`).

- [ ] **Step 3: Add the `toServicePersistenceDate` helper next to the existing `trimOptionalText` helper (L13)**

Insert AFTER the `trimOptionalText` function (before `getDefaultExtraExpenseDescription`):

```ts
/**
 * Normalize a form date value into the shape Postgres expects for the
 * services.service_date / services.service_end columns (timestamptz).
 *
 * - Blank input -> null (omit from payload upstream)
 * - all_day=true -> return as-is (date-only "YYYY-MM-DD")
 * - all_day=false -> parse the browser-local datetime-local string via
 *   `new Date(value)` and serialize to ISO-with-offset. This is the one
 *   place where `new Date("YYYY-MM-DDTHH:mm")` is intentional: the input
 *   is a `<input type="datetime-local">` value whose semantics are
 *   explicitly browser-local, not a date-only business string covered by
 *   rule WF-8.
 */
const toServicePersistenceDate = (
  value: string | null | undefined,
  allDay: boolean,
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (allDay) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};
```

- [ ] **Step 4: Rewrite `buildQuickEpisodeServiceCreateData`**

Replace the current implementation (L37–L61) with:

```ts
export const buildQuickEpisodeServiceCreateData = ({
  record,
  data,
}: {
  record: QuickEpisodeRecord;
  data: EpisodeFormData;
}): Omit<Service, "id" | "created_at"> => {
  const persistedStart = toServicePersistenceDate(
    data.service_date,
    data.all_day,
  );
  if (!persistedStart) {
    throw new Error("service_date is required");
  }
  const persistedEnd = toServicePersistenceDate(data.service_end, data.all_day);
  const description = trimOptionalText(data.description);

  return {
    project_id: record.id,
    // Project.client_id is non-null by schema: always inherit it so the
    // service is never orphaned from its client (orphans break client
    // filters, fiscal reporting and the Quick Episode dedup guard).
    client_id: record.client_id,
    service_date: persistedStart,
    ...(persistedEnd ? { service_end: persistedEnd } : {}),
    all_day: data.all_day,
    is_taxable: true,
    service_type: data.service_type,
    ...(description ? { description } : {}),
    fee_shooting: Number(data.fee_shooting),
    fee_editing: Number(data.fee_editing),
    fee_other: Number(data.fee_other),
    discount: 0,
    km_distance: Number(data.km_distance),
    km_rate: Number(data.km_rate),
    location: trimOptionalText(data.location),
    notes: trimOptionalText(data.notes),
  };
};
```

- [ ] **Step 5: Run the tests — confirm all cases pass**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: all tests PASS — original `builds the service payload ...` still passes because the fixture sets `all_day: true`, `service_date: "2026-02-22"` (date-only), empty `service_end`, empty `description`, so the output is identical to the pre-existing expectation.

- [ ] **Step 6: Do NOT commit yet** — Task 4 updates the expense builder so `expense_date` stays `date`-typed.

---

## Task 4: Coerce `expense_date` to a business date when `service_date` is a timestamp

**Files:**
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.ts:1-8` (imports)
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.ts:128-159` (expense builder)
- Modify: `src/components/atomic-crm/projects/quickEpisodePersistence.test.ts` (extend expense test)

- [ ] **Step 1: Write failing test — timed episode produces a date-only `expense_date`**

Append AFTER the existing `it("builds only extra (non-km) expense payloads ...")` test:

```ts
  it("coerces expense_date to YYYY-MM-DD even when service_date is a full timestamp", () => {
    const payloads = buildQuickEpisodeExpenseCreateData({
      record,
      data: {
        ...data,
        all_day: false,
        service_date: "2026-04-11T08:30",
        service_end: "2026-04-11T14:30",
        extra_expenses: [
          {
            expense_type: "altro" as const,
            amount: 10,
            markup_percent: 0,
            description: "Casello",
          },
        ],
      },
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].expense_date).toBe("2026-04-11");
  });
```

- [ ] **Step 2: Run the tests — confirm new expense test FAILS**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: the new expense test FAILS because `expense_date` is currently `"2026-04-11T08:30"` instead of `"2026-04-11"`.

- [ ] **Step 3: Extend the imports at the top of `quickEpisodePersistence.ts`**

Current (L1):

```ts
import type { DataProvider } from "ra-core";
```

Add below, merging with any other existing imports from `@/lib/dateTimezone`:

```ts
import { toBusinessISODate } from "@/lib/dateTimezone";
```

- [ ] **Step 4: Rewrite `buildQuickEpisodeExpenseCreateData` — use `toBusinessISODate` for `expense_date`**

Replace the `data.extra_expenses.filter(...).forEach(...)` block inside the builder so that `expense_date` goes through the helper:

```ts
  const expenseBusinessDate =
    toBusinessISODate(data.service_date) ?? data.service_date;

  data.extra_expenses
    .filter((expense) => Number(expense.amount) > 0)
    .forEach((expense) => {
      const description =
        trimOptionalText(expense.description) ??
        getDefaultExtraExpenseDescription(expense.expense_type);

      payloads.push({
        project_id: record.id,
        client_id: record.client_id,
        expense_date: expenseBusinessDate,
        expense_type: expense.expense_type,
        amount: Number(expense.amount),
        markup_percent: Number(expense.markup_percent),
        description,
      });
    });
```

- [ ] **Step 5: Run the tests — confirm all pass, including the original all-day case**

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: all tests PASS. The original all-day test still gets `expense_date: "2026-02-22"` because `toBusinessISODate("2026-02-22")` returns `"2026-02-22"`.

- [ ] **Step 6: Do NOT commit yet** — Task 5 adds the UI and wires the defaults.

---

## Task 5: Update `QuickEpisodeDialog.tsx` defaults to include the new fields

**Files:**
- Modify: `src/components/atomic-crm/projects/QuickEpisodeDialog.tsx:69-89` (defaults memo)

- [ ] **Step 1: Update the `applyServiceTypeToDefaults` / defaults memo to include the new fields**

Inside the `defaults = useMemo(...)` body (currently L69–L89), replace the `applyServiceTypeToDefaults({ ... })` argument with:

```ts
    return applyServiceTypeToDefaults({
      ...baseDefaults,
      service_type: launcherDefaults?.serviceType ?? baseDefaults.service_type,
      service_date: launcherDefaults?.serviceDate ?? "",
      service_end: "",
      all_day: true,
      description: "",
      km_distance: launcherDefaults?.kmDistance ?? 0,
      km_rate: launcherDefaults?.kmRate ?? baseDefaults.km_rate,
      location: launcherDefaults?.location ?? "",
      notes: launcherDefaults?.notes ?? "",
    });
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all types align because `EpisodeFormDefaults` now has the three new fields and the defaults memo supplies them.

- [ ] **Step 3: Do NOT commit yet** — Task 6 wires the UI.

---

## Task 6: Add the UI — `all_day` switch, `service_date` / `service_end` inputs, `description` input

**Files:**
- Modify: `src/components/atomic-crm/projects/QuickEpisodeForm.tsx:96-165` (state, handleSubmit)
- Modify: `src/components/atomic-crm/projects/QuickEpisodeForm.tsx:167-200` (form JSX — date section)
- Modify: `src/components/atomic-crm/projects/QuickEpisodeForm.tsx:253-265` (location + notes + NEW description block)

- [ ] **Step 1: Add state hooks for the three new fields**

In `QuickEpisodeForm` (the `export const QuickEpisodeForm = ({...}) =>` body, currently starting L96), inside the block of `useState` calls, ADD after the existing `const [serviceDate, setServiceDate] = useState(defaults.service_date);`:

```ts
  const [serviceEnd, setServiceEnd] = useState(defaults.service_end);
  const [allDay, setAllDay] = useState(defaults.all_day);
  const [description, setDescription] = useState(defaults.description);
```

- [ ] **Step 2: Pass the new state through `handleSubmit`**

Replace the `onSubmit({ ... })` call inside `handleSubmit` (currently L151–L163) with:

```ts
    onSubmit({
      service_date: serviceDate,
      service_end: serviceEnd,
      all_day: allDay,
      description,
      service_type: defaults.service_type,
      fee_shooting: feeShooting,
      fee_editing: feeEditing,
      fee_other: feeOther,
      km_distance: kmDistance,
      km_rate: kmRate,
      location,
      notes,
      extra_expenses: extraExpenses,
    });
```

- [ ] **Step 3: Add a client-side guard so the user cannot submit a range with end < start**

Right above the `onSubmit({ ... })` call, add:

```ts
    if (serviceEnd && serviceEnd < serviceDate) {
      alert("La data fine non può essere prima della data inizio");
      return;
    }
```

The `alert()` is intentional — the dialog is short-lived and a form-native error region would be overkill for a single validation rule that almost never fires. This mirrors the tone of existing quick-create dialogs in the repo.

- [ ] **Step 4: Replace the "Data" input block with the new switch + start + end**

Find the existing `<div className="sm:col-span-2"> ... <Label htmlFor="ep-date">Data *</Label> ...` block (currently L170–L180) and REPLACE the entire wrapping `<div className="sm:col-span-2">...</div>` with this single-column block:

```tsx
        <div className="sm:col-span-2 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => {
                setAllDay(e.target.checked);
                // If we switch mode, wipe the end so the user re-picks it
                // in the right format rather than seeing a stale datetime.
                setServiceEnd("");
              }}
              className="size-4"
            />
            Tutto il giorno
          </label>
          <div>
            <Label htmlFor="ep-date">Data inizio *</Label>
            <Input
              id="ep-date"
              type={allDay ? "date" : "datetime-local"}
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="ep-date-end">Data fine</Label>
            <Input
              id="ep-date-end"
              type={allDay ? "date" : "datetime-local"}
              value={serviceEnd}
              onChange={(e) => setServiceEnd(e.target.value)}
            />
          </div>
        </div>
```

- [ ] **Step 5: Add the `description` input between `location` and `notes`**

Find the existing `<div className="sm:col-span-2"> <Label htmlFor="ep-location">Località</Label> ... </div>` block and the `<div className="sm:col-span-2"> <Label htmlFor="ep-notes">Note</Label> ... </div>` block. INSERT a new block between them:

```tsx
        <div className="sm:col-span-2">
          <Label htmlFor="ep-description">Descrizione</Label>
          <Input
            id="ep-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="es. Savoca — Bar Vitelli"
          />
        </div>
```

- [ ] **Step 6: Run typecheck and tests**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx vitest run src/components/atomic-crm/projects/quickEpisodePersistence.test.ts`
Expected: all PASS.

- [ ] **Step 7: Do NOT commit yet** — Task 7 runs the full validation gauntlet.

---

## Task 7: Full validation — typecheck, lint, unit tests, build

**Files:** none modified.

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run the whole unit test suite (not just the persistence file)**

Run: `npm test`
Expected: all green. If anything fails, fix the root cause — do NOT adapt tests (rule `WF-5`).

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Do NOT commit yet** — Task 8 handles docs.

---

## Task 8: Update docs and commit

**Files:**
- Modify: `docs/architecture.md` (append a changelog entry)
- Modify: `docs/development-continuity-map.md` (append an entry under Quick Episode)

- [ ] **Step 1: Append a changelog entry to `docs/architecture.md`**

Find the most recent changelog / update section at the top of the file (or wherever recent entries live — look for today's date `2026-04-14` or the most recent entry and add BELOW the newest one, keeping reverse-chronological order if that is the file's convention). Add:

```markdown
### 2026-04-14 — Quick Episode description + timed events

`QuickEpisodeDialog` (the Puntata shortcut on `ProjectShow`) now exposes the
same temporal fields as the full `ServiceCreate` form:

- "Tutto il giorno" toggle (default on, same as before)
- `service_date` / `service_end` inputs that switch between `type="date"` and
  `type="datetime-local"` based on the toggle
- new `description` input, persisted on `services.description` (previously
  always NULL for Puntata-created rows)

`buildQuickEpisodeServiceCreateData` no longer hardcodes `all_day: true` and
now forwards `description`, `service_date`, `service_end` through a tiny
`toServicePersistenceDate` helper. `buildQuickEpisodeExpenseCreateData` uses
`toBusinessISODate` to keep `expenses.expense_date` as a `date` even when
`service_date` is a full timestamp.

Combined with the Google Calendar sync fix from commit `e7e8bded` (rule BE-9),
a timed Puntata now syncs to Google Calendar with the actual hours.
```

- [ ] **Step 2: Append a short entry in `docs/development-continuity-map.md`**

Under whatever "Recent changes" / "Update log" / Quick Episode section exists, add:

```markdown
- 2026-04-14 — Quick Episode (`QuickEpisodeDialog`) now supports timed
  episodes, start/end range and a dedicated `description` field. See commit
  `feat(quick-episode): add description, datetime range and all-day toggle`
  and design doc
  `docs/superpowers/specs/2026-04-14-quick-episode-description-and-datetime-design.md`.
```

If the exact section name differs, add it to the Quick Episode area — do NOT create a new top-level section.

- [ ] **Step 3: Pre-commit sanity check**

Run: `git status` and verify the staged files are:

```
modified:   docs/architecture.md
modified:   docs/development-continuity-map.md
modified:   docs/superpowers/plans/2026-04-14-quick-episode-description-and-datetime.md
new file:   docs/superpowers/specs/2026-04-14-quick-episode-description-and-datetime-design.md
modified:   src/components/atomic-crm/projects/QuickEpisodeDialog.tsx
modified:   src/components/atomic-crm/projects/QuickEpisodeForm.tsx
modified:   src/components/atomic-crm/projects/quickEpisodePersistence.test.ts
modified:   src/components/atomic-crm/projects/quickEpisodePersistence.ts
```

Nothing else should be in the staging area. If there is, investigate before committing.

- [ ] **Step 4: Commit everything as a single atomic commit**

Run:

```bash
git add docs/architecture.md docs/development-continuity-map.md \
        docs/superpowers/plans/2026-04-14-quick-episode-description-and-datetime.md \
        docs/superpowers/specs/2026-04-14-quick-episode-description-and-datetime-design.md \
        src/components/atomic-crm/projects/QuickEpisodeDialog.tsx \
        src/components/atomic-crm/projects/QuickEpisodeForm.tsx \
        src/components/atomic-crm/projects/quickEpisodePersistence.test.ts \
        src/components/atomic-crm/projects/quickEpisodePersistence.ts

git commit -m "$(cat <<'EOF'
feat(quick-episode): add description, datetime range and all-day toggle

QuickEpisodeDialog (the "Puntata" shortcut on ProjectShow) now mirrors the
temporal fields of ServiceCreate, so users can register a timed episode with
a proper start/end and a dedicated short title without falling back to the
full service form.

Changes:
- EpisodeFormData / EpisodeFormDefaults gain all_day, service_end,
  description.
- QuickEpisodeForm.tsx renders a "Tutto il giorno" switch + Data inizio +
  Data fine, swapping between <input type="date"> and
  <input type="datetime-local"> based on the toggle. A Descrizione input is
  added between Localita' and Note.
- buildQuickEpisodeServiceCreateData no longer hardcodes all_day=true and
  forwards description / service_date / service_end through a new
  toServicePersistenceDate helper. The helper keeps date-only strings as-is
  and normalizes datetime-local strings to ISO-with-offset via
  new Date(...).toISOString() — the one place where new Date("YYYY-MM-DDTHH:mm")
  is intentional, since datetime-local is explicitly browser-local semantic
  and not a business date-only string covered by rule WF-8.
- buildQuickEpisodeExpenseCreateData uses toBusinessISODate to keep
  expenses.expense_date as a YYYY-MM-DD date even when service_date carries
  a time component.

Combined with the Google Calendar sync fix e7e8bded (rule BE-9), a timed
Puntata now syncs to Google Calendar with the actual start/end hours.

Unit tests in quickEpisodePersistence.test.ts cover description trimming,
timed range persistence, service_end omission and expense_date coercion.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Verify the commit went through and the pre-commit hook passed**

Run: `git status`
Expected: working tree clean, one new commit ahead of origin/main.

---

## Task 9: Push and autonomous CI monitoring

**Files:** none.

- [ ] **Step 1: Push to `main`**

Run: `git push origin main`
Expected: push accepted.

- [ ] **Step 2: Check CI per rule WF-7**

Run:

```bash
gh run list --branch main --limit 1 --json databaseId,status,conclusion,name
```

Expected: most recent run for `main` listed. Capture `databaseId`.

- [ ] **Step 3: If CI is still running, poll via ScheduleWakeup with a 60s delay until it finishes**

Do NOT block synchronously. Use ScheduleWakeup with `delaySeconds: 60` up to a few times, then check again.

- [ ] **Step 4: If CI fails, run `gh run view <id> --log-failed` and fix the root cause**

Do NOT re-push without understanding the failure.

- [ ] **Step 5: If CI passes, report to the user**

Report the commit SHA, the CI run URL, and a 2-line summary of what shipped. Done.

---

## Task 10: Post-merge production verification

**Files:** none.

- [ ] **Step 1: Wait for Vercel auto-deploy**

Vercel auto-deploys from `main`. Typically done within a few minutes. Poll
if needed via the project's Vercel dashboard, or just proceed — the next
step is a manual verification that the user will do.

- [ ] **Step 2: Instruct the user to manually smoke the new flow**

Tell the user:

> Apri `gestionale-rosario.vercel.app/#/projects/<id qualsiasi produzione TV>/show`,
> clicca "Puntata", prova sia la modalità "Tutto il giorno" sia una puntata
> timed (es. 08:30–14:30). Conferma che la descrizione venga salvata e che
> gli orari si vedano in ServiceList. Mandami screenshot o ID del record se
> qualcosa sembra sbagliato.

- [ ] **Step 3: Verify the most recent service row in production via Supabase MCP**

Run the equivalent of:

```sql
SELECT id, project_id, client_id, service_date, service_end, description,
       all_day, created_at
FROM services
ORDER BY created_at DESC
LIMIT 3;
```

Expected: the most recent row has non-null `client_id`, non-null
`project_id`, a non-null `description` if the user typed one, and
`service_end > service_date` if they used timed mode.

- [ ] **Step 4: Done.**

---

## Self-Review Notes

Reviewed against the spec:

- **Spec coverage**: description, all_day, service_date/service_end range,
  persistence helper, expense_date coercion, docs, commit, CI — all mapped
  to tasks 1–10. ✓
- **Placeholder scan**: no TBD/TODO. Every code block is complete. ✓
- **Type consistency**: `EpisodeFormData` has the same shape everywhere it
  appears (fixture, interface, builder, handleSubmit). `toServicePersistenceDate`
  signature is stable across tasks. ✓
- **WF-8 compliance**: `new Date("YYYY-MM-DDTHH:mm")` is explicitly ring-fenced
  in Task 3 Step 3 as the ONE intentional use — the doc comment on
  `toServicePersistenceDate` explains why. For date-only values we keep the
  string untouched. ✓
- **DB-6 compliance**: `client_id` inheritance is preserved in Task 3 Step 4
  (the existing fix from 21f7e935 is NOT regressed). ✓
- **WF-6 compliance**: docs are in the SAME commit as code (Task 8). ✓
- **WF-7 compliance**: autonomous CI check is Task 9. ✓
