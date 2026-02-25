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

- [2026-02-25] **ra-core auto-genera label dai source in inglese** — Quando un input
  (TextInput, SelectInput, DateInput, ecc.) non ha prop `label` esplicita, ra-core
  genera la label dal `source`: `expected_closing_date` → "Expected Closing Date".
  Per l'italiano, OGNI input deve avere `label="..."` esplicita.

- [2026-02-25] **Traduzione in 3 livelli** — La localizzazione completa richiede:
  1) i18nProvider per le stringhe framework ra-core (bottoni, paginazione, validazione)
  2) Stringhe hardcoded nel JSX (titoli, testi, messaggi notify)
  3) Label degli input via prop `label` (altrimenti auto-generati in inglese dal source)
  Il livello 3 è facile da dimenticare perché i campi "funzionano" senza label esplicita.

- [2026-02-25] **MAI dichiarare una fase completata senza audit** — Il progress.md
  diceva "Fase 4 completata" ma un audit reale ha trovato: signup pubblico abilitato
  (critico), keep-alive workflow mancante, 18 file con Prettier rotto, residui i18n,
  commit non pushati. Regola: prima di marcare una fase come completata, eseguire
  SEMPRE una verifica indipendente (typecheck + test + lint + review config + review
  specifica). Non fidarsi mai dello stato scritto senza controllare.

- [2026-02-25] **Edge Functions richiedono SB_SECRET_KEY come secret separato** —
  `supabaseAdmin.ts` usa `Deno.env.get("SB_SECRET_KEY")` che NON è tra le variabili
  auto-iniettate da Supabase (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
  Va impostato manualmente con `npx supabase secrets set SB_SECRET_KEY=<service_role_key>`.
  Senza questo secret, le funzioni crashano con WORKER_ERROR anche sulle OPTIONS requests.

- [2026-02-25] **Utenti creati manualmente da Dashboard non triggano on_auth_user_created** —
  Il trigger `handle_new_user()` crea il record in `sales` solo quando un utente fa signup
  via API. Utenti creati dal Dashboard Supabase bypassano il trigger. Fix: inserire
  manualmente il record in `sales` e aggiornare `raw_user_meta_data` in `auth.users`.

- [2026-02-25] **deploy.yml di Atomic CRM è per GitHub Pages, non Vercel** — Il workflow
  originale deploya su GitHub Pages con `gh-pages`. Con Vercel collegato al repo, il
  deploy è automatico su push. Il workflow va disabilitato o impostato su manual dispatch.
