---
name: backend-dev
description: Coding practices for backend work in Gestionale Rosario Furnari. Use when evaluating migrations, views, RLS, Edge Functions, server-side AI flows, or custom dataProvider methods backed by Supabase.
---

There is no custom backend server. Backend logic lives in Supabase:

- PostgreSQL schema, constraints, indexes, views
- RLS and policies
- Storage
- Edge Functions
- custom dataProvider methods that expose stable frontend entry points

## Decide First: frontend, DB, or Edge?

Prefer the smallest correct layer:

- **frontend/provider only**
  - deterministic UI glue
  - local prefill/linking logic
  - read composition that does not need secrets or transactions
- **database migration / view**
  - schema changes
  - constraints and invariants
  - read aggregation or semantic projections
- **Edge Function**
  - multi-step writes
  - secret-backed integrations
  - AI extraction/answer flows
  - transactional or auditable confirmation paths

## Repo Conventions

- prefer custom `dataProvider` methods over ad hoc fetch calls
- when a new backend capability appears, expose one stable provider entry point
- if a view is added, wire its PK handling in the provider when needed
- if a resource is exposed in production, review FakeRest parity too

## Views

Use a new migration with `CREATE OR REPLACE VIEW` for read optimization and
semantic aggregation.

Current examples in this repo include:

- `project_financials`
- `monthly_revenue`
- `analytics_*`

When base columns or semantics change, update the affected views in the same
slice.

## Edge Functions

Shared helpers live in `supabase/functions/_shared/`.

Follow the usual chain:

1. CORS / preflight
2. `authenticate()`
3. validated handler

Typical frontend integration:

- add a dedicated provider method
- call the function from the provider
- keep UI and AI consumers on that same stable entry point

## Mandatory Backend Sweep

If backend work changes real product behavior, also review:

- `src/components/atomic-crm/types.ts`
- `src/components/atomic-crm/providers/supabase/dataProvider.ts`
- `src/components/atomic-crm/providers/fakerest/**` when relevant
- the affected module UI and linking helpers
- semantic/capability registry if AI reads or uses the feature
- continuity docs in `docs/`

## Continuity Rule

Do not leave backend knowledge trapped in code only.

When a backend change alters business meaning, update the matching canonical
doc:

- `docs/architecture.md`
- `docs/development-continuity-map.md`
- domain-specific docs when relevant
