# AGENTS.md

## DEPLOYMENT RULES - NON DIMENTICARE

- `git push` su `main` aggiorna automaticamente il frontend su `Vercel`
- quindi, se il lavoro tocca solo UI/frontend, **NON** serve parlare di un
  deploy frontend manuale separato
- `git push` **NON** deploya le Supabase Edge Functions remote
- quindi, se il lavoro tocca `supabase/functions/**`, serve valutare e spesso
  fare anche `npx supabase functions deploy ...` sul progetto remoto
- regola pratica:
  - modifiche frontend -> commit/push e Vercel fa auto-deploy
  - modifiche Edge Functions -> commit/push + deploy Supabase separato
  - modifiche miste -> entrambe le cose

## Project Overview

Gestionale Rosario Furnari is a heavily customized fork of Atomic CRM built with
React, shadcn-admin-kit, and Supabase.

The active product surface includes:

- clients and billing profiles
- contacts as referents linked to clients and projects
- projects
- services / work log
- quotes
- payments
- expenses
- reminders
- annual and historical dashboards
- unified AI chat and document import

## Development Commands

### Setup
```bash
make install          # Install dependencies (frontend, backend, local Supabase)
make start            # Start full stack with real API (Supabase + Vite dev server)
make stop             # Stop the stack
make start-demo       # Start full-stack with FakeRest data provider
```

### Testing and Code Quality

```bash
make test             # Run unit tests (vitest)
make typecheck        # Run TypeScript type checking
make lint             # Run ESLint and Prettier checks
```

### Building

```bash
make build            # Build production bundle (runs tsc + vite build)
```

### Database Management

```bash
npx supabase migration new <name>  # Create new migration
npx supabase migration up          # Apply migrations locally
npx supabase db push               # Push migrations to remote
npx supabase db reset              # Reset local database (destructive)
```

### Registry (Shadcn Components)

```bash
make registry-gen     # Generate registry.json (runs automatically on pre-commit)
make registry-build   # Build Shadcn registry
```

## Architecture

### Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Data Fetching**: React Query (TanStack Query)
- **Forms**: React Hook Form
- **Application Logic**: shadcn-admin-kit + ra-core (react-admin headless)
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + REST API + Auth + Storage + Edge Functions)
- **Testing**: Vitest

### Directory Structure

```
src/
├── components/
│   ├── admin/              # Shadcn Admin Kit components (mutable dependency)
│   ├── atomic-crm/         # Main CRM application code
│   │   ├── ai/             # Unified AI launcher, snapshot, import flows
│   │   ├── clients/        # Client management + billing profile
│   │   ├── contacts/       # Referents linked to clients/projects
│   │   ├── dashboard/      # Annual and historical dashboards
│   │   ├── expenses/       # Expenses and km flows
│   │   ├── layout/         # App layout components
│   │   ├── login/          # Authentication pages
│   │   ├── payments/       # Payment tracking
│   │   ├── providers/      # Data providers (Supabase + FakeRest)
│   │   ├── projects/       # Projects
│   │   ├── quotes/         # Quotes and commercial flow
│   │   ├── root/           # Root CRM component
│   │   ├── services/       # Work log / service records
│   │   ├── settings/       # Settings page
│   │   ├── tags/           # Tag management
│   │   ├── tasks/          # Reminders
│   │   └── travel/         # Travel and km helpers
│   ├── supabase/           # Supabase-specific auth components
│   └── ui/                 # Shadcn UI components (mutable dependency)
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── App.tsx                 # Application entry point

supabase/
├── functions/              # Edge functions (AI, import, email, backend flows)
└── migrations/             # Database migrations
```

### Key Architecture Patterns

For repo-specific continuity, read first:

1. `docs/README.md`
2. `docs/development-continuity-map.md`
3. `docs/historical-analytics-handoff.md`
4. `docs/architecture.md`

#### Mutable Dependencies

The codebase includes mutable dependencies that should be modified directly if needed:
- `src/components/admin/`: Shadcn Admin Kit framework code
- `src/components/ui/`: Shadcn UI components

#### Configuration via `<CRM>` Component

The `src/App.tsx` file renders the `<CRM>` component, which accepts props for domain-specific configuration:
- `title`: Branding
- `logo`: Branding
- `taskTypes`: Reminder types
- `lightTheme`, `darkTheme`: Theme customization
- `disableTelemetry`: Opt-out of anonymous usage tracking

#### Database Views

Complex queries are handled via database views to simplify frontend code and reduce HTTP overhead. Current important views include `project_financials`, `monthly_revenue`, and the `analytics_*` views used by dashboards and AI contexts.

#### Database Triggers

User data syncs between Supabase's `auth.users` table and the CRM's `sales` table via triggers (see `supabase/migrations/20240730075425_init_triggers.sql`).

#### Edge Functions

Located in `supabase/functions/`:
- AI answer/extraction flows
- document import confirmation
- email send flows and other multi-step backend actions

#### Data Providers

Two data providers are available:
1. **Supabase** (default): Production backend using PostgreSQL
2. **FakeRest**: In-browser fake API for development/demos, resets on page reload

When using FakeRest, database views are emulated in the frontend. Test data generators are in `src/components/atomic-crm/providers/fakerest/dataGenerator/`.

#### Filter Syntax

List filters follow the `ra-data-postgrest` convention with operator concatenation: `field_name@operator` (e.g., `first_name@eq`). The FakeRest adapter maps these to FakeRest syntax at runtime.

## Development Workflows

### Path Aliases

The project uses TypeScript path aliases configured in `tsconfig.json` and `components.json`:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/components/ui` → `src/components/ui`

### Adding Custom Fields

When modifying active CRM data structures:
1. Create a migration: `npx supabase migration new <name>`
2. Update `src/components/atomic-crm/types.ts`
3. Update Supabase and FakeRest providers if the resource is exposed
4. Update affected views or Edge Functions
5. Update affected UI surfaces: list/create/edit/show, filters, dialogs, linking helpers
6. Update continuity docs in `docs/`
7. Update `Settings` too if the change is config-driven

### Running with Test Data

Prefer the real Supabase-backed workflow or the existing FakeRest generators.
The old upstream sample data/docs are not the source of truth for this repo.

### Git Hooks

- Pre-commit: Automatically runs `make registry-gen` to update `registry.json`

### Accessing Local Services During Development

- Frontend: http://localhost:5173/
- Supabase Dashboard: http://localhost:54323/
- REST API: http://127.0.0.1:54321
- Storage (attachments): http://localhost:54323/project/default/storage/buckets/attachments
- Inbucket (email testing): http://localhost:54324/

## Important Notes

- The codebase is intentionally customized beyond upstream Atomic CRM
- Modify files in `src/components/admin` and `src/components/ui` directly - they are meant to be customized
- Unit tests can be added in the `src/` directory (test files are named `*.test.ts` or `*.test.tsx`)
- User deletion is not supported to avoid data loss; use account disabling instead
- Filter operators must be supported by the `supabaseAdapter` when using FakeRest
- `progress.md` and `learnings.md` are legacy archives, not the primary entry point for new sessions
