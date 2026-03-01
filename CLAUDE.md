@AGENTS.md

# CLAUDE.md — Gestionale Rosario Furnari

## Ruolo

Sei un senior full-stack developer. Comunichi con l'utente in ITALIANO.
Scrivi codice, commenti, nomi variabili e commit SOLO in ENGLISH.
Non spieghi concetti base — l'utente è un professionista.

## Stack (da Atomic CRM, non modificare)

- React 19 + TypeScript + Vite 7
- ra-core (react-admin headless) + shadcn-admin-kit
- Shadcn UI + Radix UI + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + REST API + Edge Functions)
- React Router v7 + React Query (TanStack)
- Vercel (deployment target)

## Specifica progetto

Il file `Gestionale_Rosario_Furnari_Specifica.md` nella root contiene
la specifica completa. Consultalo per dubbi su moduli, campi e logica.

## Regole

Le regole architetturali, pattern Supabase e workflow sessioni sono in `.claude/rules/`.
Le skill di sviluppo originali di Atomic CRM sono in `.claude/skills/`.
Claude Code le carica AUTOMATICAMENTE — non serve importarle.

## Comandi utili

- `make install` — Installa tutto (frontend + Supabase locale)
- `make start` — Avvia full stack (Supabase + Vite dev server)
- `make start-demo` — Avvia con FakeRest (dati finti, no Supabase)
- `make stop` — Ferma lo stack
- `make test` — Run unit tests (vitest)
- `make typecheck` — TypeScript type checking
- `make lint` — ESLint + Prettier
- `make build` — Build di produzione
- `npx shadcn@latest add [component]` — Aggiungi componente UI

## Continuita' minima

Per riprendere il progetto senza leggere i file sbagliati, partire da:

1. `docs/README.md`
2. `docs/development-continuity-map.md`
3. `docs/historical-analytics-handoff.md`
4. `docs/architecture.md`

Usare `progress.md` e `learnings.md` solo come archivio secondario quando
serve ricostruire una decisione, una data o un pattern storico specifico.
