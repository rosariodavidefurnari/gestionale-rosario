# Learnings — Gestionale Rosario Furnari

Questo file cresce organicamente sessione dopo sessione.
Claude aggiunge qui le scoperte, gli errori corretti, e i pattern emersi.
Quando supera ~30 voci — consolidare (vedi .claude/rules/session-workflow.md).

## Format per ogni voce

- [DATA] **Nome pattern** — Descrizione. Contesto: cosa stava succedendo.

## Learnings

- [2026-02-25] **Atomic CRM ha già .claude/skills/** — Il repo originale include
  skill per frontend-dev e backend-dev con convenzioni precise (componenti admin,
  ra-core hooks, Edge Functions Deno). Non sovrascrivere mai questi file.

- [2026-02-25] **AGENTS.md è documentazione essenziale** — Contiene comandi make,
  struttura directory, pattern architetturali, gestione database. Va letto prima
  di qualsiasi modifica al progetto.

- [2026-02-25] **i18n: Atomic CRM NON usa useTranslate() nei componenti** — Le stringhe
  UI sono hardcoded in inglese direttamente nel JSX. L'i18nProvider gestisce solo
  le stringhe framework di ra-core (bottoni, messaggi validazione, ecc.). Per tradurre
  l'interfaccia servono modifiche dirette ai ~40 file con stringhe hardcoded.

- [2026-02-25] **Pacchetto @christianascone/ra-language-italian non funziona** — Ha
  dependency conflicts con ra-core@5.14.2. Soluzione: traduzioni italiane inline
  direttamente in i18nProvider.tsx (copiate e adattate dal pacchetto).

- [2026-02-25] **react-router v6/v7 conflict** — ra-core dipende da react-router-dom@6
  che installa react-router@6 come nested dep. Il progetto usa react-router@7. Routes
  da v7 rifiuta Route da v6. Fix: alias Vite `"react-router-dom" → "react-router"` in
  entrambi i config (vite.config.ts + vite.demo.config.ts).

- [2026-02-25] **CoreAdminRoutes.js necessita flatten** — React Router v7 è più strict
  con i children di Routes. Le custom routes di ra-core sono nested arrays. Fix:
  `.flat(Infinity)` via patch-package (patches/ra-core+5.14.2.patch).

- [2026-02-25] **Variabili env usano prefisso VITE_** — Non NEXT_PUBLIC_ come
  in Next.js. Il file è `.env.development` (non `.env.local`). La chiave
  Supabase si chiama `VITE_SB_PUBLISHABLE_KEY`.

- [2026-02-25] **CRM configurabile via props** — Il componente `<CRM>` in App.tsx
  accetta props per sectors, stages, categories, logo, title. La configurazione
  viene anche caricata dal DB (tabella `configuration`).

- [2026-02-25] **Supabase CLI non ha `db execute`** — Per eseguire SQL sul DB remoto
  usare il Dashboard SQL Editor o psql diretto. Il CLI supporta solo: diff, dump,
  lint, pull, push, reset, start.

- [2026-02-25] **DB remoto allineato** — Tutte le 17 migration applicate (16 Atomic CRM
  + 1 custom). 8 tabelle custom con RLS attivo, 2 views, dati iniziali inseriti.
  Progetto ref: qvdmzhyzpyaveniirsmo.

- [2026-02-25] **personalInfoTypes: separare id da label** — I tipi email/telefono
  (Work/Home/Other) devono mantenere id in inglese (valore salvato nel DB) ma mostrare
  label in italiano. Aggiunto campo `name` agli oggetti choices e usato `optionText="name"`.

- [2026-02-25] **Valute e locale: aggiornare ovunque** — Le formattazioni
  `toLocaleString("en-US", { currency: "USD" })` vanno cambiate in
  `toLocaleString("it-IT", { currency: "EUR" })` in DealShow.tsx e CompanyShow.tsx.

- [2026-02-25] **date-fns locale per date relative** — `formatDistance()` richiede
  `{ locale: it }` come terzo parametro per output in italiano. Import:
  `import { it } from "date-fns/locale"`.

- [2026-02-25] **sed con JSX: usare python3 -c** — I comandi `sed` falliscono con
  delimitatori `<` e `>` nel JSX. Meglio usare `python3 -c` con `str.replace()` per
  sostituzioni massive nei file .tsx.
