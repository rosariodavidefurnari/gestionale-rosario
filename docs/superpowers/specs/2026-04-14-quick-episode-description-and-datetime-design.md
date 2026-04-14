# Quick Episode — Description + Datetime Inputs

- **Status**: approved (2026-04-14)
- **Scope**: `QuickEpisodeDialog` parity with `ServiceCreate` for core temporal
  fields and description.
- **Related**: commit `21f7e935` (orphan client_id fix), learning `BE-9`
  (calendar timed events), `DB-6` (inherit client_id in child builders).

## Problem

`QuickEpisodeDialog` (the "Puntata" shortcut launched from `ProjectShow`) is
missing three fields that the standard `ServiceCreate` form has:

1. **`description`** — free-text label for the episode. Today the Puntata
   dialog only persists `location` and `notes`, leaving `description` NULL on
   every record created through the shortcut. Users distinguish episodes by a
   short title ("Savoca — Bar Vitelli", "Saline di Trapani"), which has to be
   stuffed into `location` or `notes`.
2. **`all_day` toggle** — the dialog hardcodes `all_day: true`. Users cannot
   register a timed episode (e.g. `08:30 — 14:30`) without falling back to the
   full `ServiceCreate` page and losing the fee auto-fill from `tv_show`.
3. **`service_date` / `service_end` as datetime** — the dialog only exposes a
   single `<input type="date">` for `service_date`, never an end and never a
   time of day.

## Non-goals

- Kept OUT of this change: dedup guard rewrite, Google Calendar sync wiring
  (already fixed in `BE-9`), launcher handoff payload (continues to accept
  date-only).
- Not touching the fees / km / extra-expenses sections of the form.

## Target behavior

### Form fields (new + changed)

```
Servizio
├── Tutto il giorno   [Switch, default ON]
├── Data inizio *     [<input type="date"> if all_day else <input type="datetime-local">]
├── Data fine         [same component as Data inizio, optional, end>=start validation]
├── Tipo servizio     (unchanged, read-only from defaults)
...
Dettagli
├── Descrizione       [NEW — <Input>, optional, placeholder "es. Savoca — Bar Vitelli"]
├── Località          (unchanged)
├── Note              (unchanged)
```

Layout is **single column** (stacked) on all breakpoints. No `sm:grid-cols-2`
for date inputs — coherent with the rest of the dialog body.

### Data model changes

`EpisodeFormData` (in `QuickEpisodeForm.tsx`) gains:

```ts
all_day: boolean;
service_end: string;   // "" when empty; YYYY-MM-DD or YYYY-MM-DDTHH:mm otherwise
description: string;   // "" when empty
```

`EpisodeFormDefaults` gains the same three fields with defaults
`{ all_day: true, service_end: "", description: "" }`.

### Persistence changes

`buildQuickEpisodeServiceCreateData` in `quickEpisodePersistence.ts`:

| Field          | Before                 | After                                               |
|----------------|------------------------|-----------------------------------------------------|
| `all_day`      | hardcoded `true`       | `data.all_day`                                      |
| `service_date` | `data.service_date`    | `toServicePersistenceDate(data.service_date, data.all_day)` |
| `service_end`  | absent                 | `toServicePersistenceDate(data.service_end, data.all_day) ?? undefined` |
| `description`  | absent                 | `trimOptionalText(data.description) ?? undefined`   |

A new tiny helper `toServicePersistenceDate(value, allDay)` lives next to the
other helpers in `quickEpisodePersistence.ts`:

- if `!value`: returns `null`
- if `allDay`: trims and returns as-is (it is already `YYYY-MM-DD`)
- if `!allDay`: converts the `datetime-local` string (browser-local naive,
  Europe/Rome for our single user) to an ISO-with-offset via
  `new Date(value).toISOString()`. We accept the `new Date(...)` here because
  `datetime-local` is explicitly browser-local semantic — it is NOT a
  date-only business string that would hit rule `WF-8`.

### Dedup guard

`findExistingQuickEpisodeServices` already normalizes the `service_date` via
`startOfBusinessDayISOString` / `endOfBusinessDayISOString`, which handle both
`YYYY-MM-DD` and full ISO timestamps transparently. No change required.

### Google Calendar sync

Already fixed in `BE-9` — the EF uses the real `service_date` / `service_end`
timestamps. A timed Puntata will sync to Google Calendar with the correct
hours automatically.

## Files touched

1. `src/components/atomic-crm/projects/QuickEpisodeForm.tsx` — types + UI
2. `src/components/atomic-crm/projects/QuickEpisodeDialog.tsx` — defaults memo
3. `src/components/atomic-crm/projects/quickEpisodePersistence.ts` — builder +
   helper
4. `src/components/atomic-crm/projects/quickEpisodePersistence.test.ts` —
   expand existing builder test
5. `docs/architecture.md` — Quick Episode changelog entry
6. `docs/development-continuity-map.md` — Quick Episode entry update

No DB migration, no new Edge Function, no new RLS policy.

## Test plan

- **Unit** — update `quickEpisodePersistence.test.ts` with 4 cases for
  `buildQuickEpisodeServiceCreateData`:
  1. `all_day=true`, no `service_end`, no `description` — payload has
     `all_day=true`, `service_date="2026-04-14"`, no `service_end`,
     no `description`.
  2. `all_day=true`, with `description` — payload has
     `description="Savoca — Bar Vitelli"`.
  3. `all_day=false`, `service_date` and `service_end` are local datetime
     strings — payload has `all_day=false`, both fields converted to ISO
     with offset, `service_end > service_date`.
  4. `all_day=false`, `service_end=""` — payload has `service_date` converted
     and `service_end` absent (undefined) — degenerate but valid.
- **E2E** — existing `services` smoke already covers ServiceCreate; do NOT
  add a separate Puntata E2E as part of this slice. Instead, dev verification
  = manual check in localhost: open a project with `category=produzione_tv`,
  launch Puntata dialog, test both modes (all-day + timed), confirm DB row
  has all three new fields correct.
- **Verify builder parity** — `buildQuickEpisodeExpenseCreateData` already
  receives `data.service_date` as `expense_date`. When `all_day=false`, the
  expense still needs a date-only string for the `expense_date` column
  (confirm: expenses schema stores `date`, not `timestamptz`). Extract the
  date portion with a business-safe helper.

## Open question resolved

Q: How to get a date-only string for `expense_date` when `service_date` is a
full timestamp?
A: Use `toBusinessISODate(data.service_date)` from `dateTimezone` — it
returns `YYYY-MM-DD` in Europe/Rome and is already the canonical helper
for business date-only coercion.

## Rollout

Single atomic commit:
```
feat(quick-episode): add description, datetime range and all-day toggle
```
Followed by an explicit remote EF deploy step only if any Edge Function is
modified — which it is not, so `git push` is sufficient (Vercel auto-deploys
frontend; no Supabase function change).

## Post-merge check

- Verify in production DB (project `qvdmzhyzpyaveniirsmo`) that the first
  Puntata created after merge has non-null `description` (when provided),
  non-hardcoded `all_day`, and correct `service_end` relative to
  `service_date`.
- CI run autonomous triage per rule `WF-7`.
