# Gestionale Rosario Furnari — Specifica Tecnica e Funzionale

**Versione:** 1.0  
**Data:** 25 Febbraio 2026  
**Destinatario:** Rosario Davide Furnari  
**Scopo:** Documento di specifica per lo sviluppo di un gestionale personalizzato per attività di fotografo, videomaker e web developer.

---

## 1. Panoramica del Progetto

### 1.1 Obiettivo
Creare un gestionale web privato e sicuro per gestire l'intera attività professionale di Rosario Furnari, che attualmente comprende:

- **Produzioni televisive** — Collaborazioni con programmi come "Bella tra i Fornelli", "Gustare Sicilia", "Vale il Viaggio"
- **Spot pubblicitari** — Video promozionali per attività locali
- **Servizi wedding e privati** — Matrimoni, battesimi, compleanni, eventi
- **Sviluppo web** — Siti web per aziende e privati

Il gestionale sostituisce l'attuale sistema basato su fogli di calcolo Apple Numbers, centralizzando la gestione di lavori, compensi, preventivi, pagamenti e km percorsi.

### 1.2 Requisiti Non Negoziabili

- **Accesso esclusivo**: Solo Rosario può accedere. Nessun altro utente, nessuna registrazione pubblica
- **Hosting su Vercel**: Frontend deployato su Vercel (gratuito)
- **Backend Supabase**: Database PostgreSQL con autenticazione (gratuito)
- **Costo zero**: L'intero stack deve rientrare nei free tier

### 1.3 Stack Tecnologico Raccomandato

| Componente | Tecnologia | Costo |
|---|---|---|
| Frontend | React + TypeScript + Vite | Gratuito |
| UI Components | Shadcn/ui + Shadcn Admin Kit + Tailwind CSS | Gratuito |
| Backend/Database | Supabase (PostgreSQL + Auth + REST API) | Gratuito (free tier) |
| Hosting Frontend | Vercel o GitHub Pages | Gratuito |
| Framework CRM base | **Atomic CRM** (fork personalizzato) | Gratuito (MIT) |
| Grafici Dashboard | Recharts (da aggiungere) | Gratuito |

---

## 2. Progetto Open Source Raccomandato: Atomic CRM

### 2.1 Perché Atomic CRM

Dopo aver analizzato le principali opzioni open source, la scelta migliore è **Atomic CRM** di Marmelab.

**Repository:** https://github.com/marmelab/atomic-crm  
**Demo live:** https://marmelab.com/atomic-crm-demo  
**Documentazione:** https://marmelab.com/atomic-crm/doc/  
**Licenza:** MIT (uso libero, anche commerciale)

### 2.2 Confronto con le Alternative

| Criterio | Atomic CRM ✅ | Twenty CRM ❌ | NextCRM ❌ |
|---|---|---|---|
| **Stack** | React + Vite + Supabase + Shadcn Admin Kit | NestJS + PostgreSQL + Redis | Next.js + MongoDB |
| **Deploy su Vercel** | ✅ SPA statica, deploy ovunque | ❌ Richiede server dedicato (min 2GB RAM) + Docker | Parziale |
| **Costo hosting** | €0 (Supabase free + Vercel/GitHub Pages) | ~€5-15/mese per un VPS | Variabile |
| **Complessità setup** | Bassa — fork, configura Supabase, deploy | Alta — Docker, Redis, PostgreSQL, Nginx | Media |
| **Personalizzazione** | Eccellente — React components modulari | Buona ma codebase enorme (40k+ stars, complessa) | Media |
| **Adatto a singolo utente** | ✅ Perfetto | ❌ Pensato per team/aziende | ✅ |
| **Kanban pipeline** | ✅ Incluso | ✅ Incluso | ✅ Incluso |
| **Gestione contatti** | ✅ Incluso | ✅ Incluso | ✅ Incluso |

### 2.3 Cosa Ha Già Atomic CRM (Pronto all'Uso)

- Gestione contatti (aziende + persone)
- Pipeline vendita con board Kanban drag-and-drop
- Task e reminder
- Note per ogni contatto
- Import/export CSV
- Log attività (storico interazioni)
- Autenticazione (Google, email/password)
- Dashboard con grafici
- API per integrazioni

### 2.4 Cosa Va Aggiunto/Personalizzato

Le funzionalità specifiche per l'attività di Rosario che **non** sono incluse in Atomic CRM e vanno sviluppate:

1. **Registro Lavori/Servizi** (come il file Numbers)
2. **Tracking Compensi** (riprese, montaggio, separati)
3. **Tracking Km e Spese**
4. **Sistema Preventivi con Stati** (inviato → accettato → acconto → saldato)
5. **Tracking Pagamenti** (pagato/non pagato/acconto)
6. **Dashboard finanziaria** personalizzata (guadagni mensili/annuali)
7. **Categorie progetto** (TV, Spot, Wedding, Web)

---

## 3. Specifica Funzionale Dettagliata

### 3.1 Modulo: Clienti

Gestione anagrafica dei clienti, con distinzione per tipologia.

**Campi per ogni cliente:**

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| Nome/Ragione sociale | Testo | ✅ | Es: "Diego Caltabiano", "Rosemary's Pub" |
| Tipo cliente | Select | ✅ | Produzione TV / Azienda locale / Privato wedding / Privato evento / Web |
| Telefono | Testo | | |
| Email | Testo | | |
| Indirizzo | Testo | | |
| Partita IVA / CF | Testo | | |
| Fonte acquisizione | Select | | Instagram / Facebook / Passaparola / Google / Altro |
| Note generali | Testo lungo | | |
| Data creazione | Data | Auto | |

**Funzionalità:**
- Lista clienti con filtri per tipo, ricerca per nome
- Scheda cliente con storico completo di tutti i lavori, preventivi e pagamenti
- Possibilità di associare più contatti/referenti a un cliente (es: Diego Caltabiano → programma GS, programma BTF)

### 3.2 Modulo: Progetti / Programmi

Raggruppa i lavori sotto "contenitori" logici.

**Campi:**

| Campo | Tipo | Note |
|---|---|---|
| Nome progetto | Testo | Es: "Gustare Sicilia S2", "Matrimonio Rossi-Bianchi" |
| Cliente associato | Relazione | Link al cliente |
| Categoria | Select | Produzione TV / Spot Pubblicitario / Wedding / Evento Privato / Sviluppo Web |
| Sotto-categoria (TV) | Select | Bella tra i Fornelli / Gustare Sicilia / Vale il Viaggio / Altro |
| Stato | Select | In corso / Completato / In pausa / Cancellato |
| Data inizio | Data | |
| Data fine prevista | Data | |
| Budget concordato | Valuta € | Se applicabile (es: budget totale per una stagione TV) |
| Note | Testo lungo | |

### 3.3 Modulo: Registro Lavori (Servizi Svolti)

Questo è il cuore del gestionale — sostituisce il foglio Numbers. Ogni riga registra un singolo servizio/giornata di lavoro.

**Campi:**

| Campo | Tipo | Obbligatorio | Note |
|---|---|---|---|
| Data | Data | ✅ | Data del servizio |
| Progetto associato | Relazione | ✅ | Link al progetto |
| Cliente | Auto | Auto | Ereditato dal progetto |
| Tipo servizio | Select | ✅ | Riprese / Montaggio / Riprese+Montaggio / Sviluppo Web / Fotografia / Altro |
| Compenso riprese € | Valuta | | Importo per le riprese (tasse incluse) |
| Compenso montaggio € | Valuta | | Importo per il montaggio (tasse incluse) |
| Compenso altro € | Valuta | | Per servizi non standard |
| Totale compenso € | Calcolato | Auto | Somma dei tre campi sopra |
| Km percorsi | Numero | | Distanza A/R |
| Rimborso km € | Calcolato | Auto | Km × tariffa (default €0,19/km, configurabile) |
| Località | Testo | | Es: "Bronte", "Acitrezza" |
| Note | Testo lungo | | Es: "Sconto perchè riprese e montaggio veloci" |
| Rif. Fattura | Testo | | Es: "FPR 1/25 del 01/02/2025" |

**Funzionalità:**
- Vista tabellare filtrabile per progetto, cliente, periodo, categoria
- Possibilità di inserimento rapido di più righe (es: registrare una settimana di riprese)
- Duplicazione di una riga (per lavori ripetitivi con stesso compenso)
- Riga speciale per "Spese accessorie" (es: acquisto hard disk con ricarico 25%)

### 3.4 Modulo: Preventivi e Pipeline Vendita

Per gestire il flusso commerciale, soprattutto per wedding e clienti privati.

**Campi:**

| Campo | Tipo | Note |
|---|---|---|
| Cliente | Relazione | |
| Tipo servizio | Select | Wedding / Battesimo / Compleanno / Evento / Spot / Sito Web |
| Data evento | Data | |
| Descrizione | Testo lungo | Dettaglio di cosa include il preventivo |
| Importo preventivo € | Valuta | |
| Stato | Select/Kanban | Vedi sotto |
| Data invio preventivo | Data | |
| Data risposta | Data | |
| Motivo rifiuto | Testo | Se rifiutato |
| Note | Testo lungo | |

**Stati della pipeline (colonne Kanban):**

```
Primo Contatto → Preventivo Inviato → In Trattativa → Accettato → Acconto Ricevuto → In Lavorazione → Completato → Saldato
                                                     ↘ Rifiutato
                                                     ↘ Perso (no risposta)
```

**Funzionalità:**
- Board Kanban drag-and-drop per spostare le trattative tra gli stati
- Vista lista alternativa con filtri
- Al passaggio a "Accettato" → possibilità di registrare acconto
- Al passaggio a "Saldato" → conferma importo finale e registrazione pagamento

### 3.5 Modulo: Pagamenti

Tracking di tutti i flussi di denaro.

**Campi:**

| Campo | Tipo | Note |
|---|---|---|
| Data pagamento | Data | |
| Cliente | Relazione | |
| Progetto/Preventivo | Relazione | Collegato al progetto o al preventivo |
| Tipo | Select | Acconto / Saldo / Pagamento parziale / Rimborso spese |
| Importo € | Valuta | |
| Metodo pagamento | Select | Bonifico / Contanti / PayPal / Altro |
| Rif. Fattura | Testo | Numero fattura associata |
| Stato | Select | Ricevuto / In attesa / Scaduto |
| Note | Testo | |

**Funzionalità:**
- Per ogni cliente/progetto: riepilogo "Totale dovuto" vs "Totale ricevuto" vs "Saldo residuo"
- Alert visivi per pagamenti in attesa da più di X giorni
- Collegamento diretto tra riga di lavoro e pagamento ricevuto

### 3.6 Modulo: Spese e Km

Tracking delle spese operative.

**Campi:**

| Campo | Tipo | Note |
|---|---|---|
| Data | Data | |
| Tipo | Select | Spostamento Km / Acquisto materiale / Noleggio attrezzatura / Altro |
| Progetto/Cliente | Relazione | A chi addebitare |
| Km percorsi | Numero | Per spostamenti |
| Tariffa km € | Valuta | Default €0,19/km |
| Importo spesa € | Valuta | Per acquisti/noleggi |
| Ricarico % | Numero | Es: 25% sull'hard disk |
| Totale € | Calcolato | Km × tariffa, oppure importo + ricarico |
| Descrizione | Testo | Es: "Seagate IronWolf Pro 8TB" |
| Rif. Fattura | Testo | |

### 3.7 Modulo: Dashboard

La dashboard è la prima schermata che vedi quando apri il gestionale.

**Sezione 1 — Cards riepilogative (in alto):**

- **Fatturato del mese corrente** (somma compensi del mese) con variazione % vs mese precedente
- **Fatturato dell'anno** (somma compensi dell'anno)
- **Pagamenti in attesa** (importo totale non ancora ricevuto)
- **Preventivi aperti** (numero + valore totale delle trattative in corso)
- **Km totali del mese** (e relativo rimborso in €)

**Sezione 2 — Grafici:**

- **Andamento fatturato mensile** — Line chart ultimi 12 mesi
- **Fatturato per categoria** — Bar chart (TV / Spot / Wedding / Web)
- **Pipeline overview** — Bar chart orizzontale con numero trattative per stato
- **Top 5 clienti** — Per fatturato nell'anno corrente

**Sezione 3 — Scadenze e alert:**

- Prossimi eventi/lavori in agenda
- Pagamenti in scadenza o scaduti
- Preventivi senza risposta da più di 7 giorni

---

## 4. Modello Dati (Schema Database Supabase)

### 4.1 Tabelle Principali

```sql
-- CLIENTI
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('produzione_tv', 'azienda_locale', 'privato_wedding', 'privato_evento', 'web')),
  phone TEXT,
  email TEXT,
  address TEXT,
  tax_id TEXT,
  source TEXT CHECK (source IN ('instagram', 'facebook', 'passaparola', 'google', 'altro')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROGETTI / PROGRAMMI
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('produzione_tv', 'spot', 'wedding', 'evento_privato', 'sviluppo_web')),
  tv_show TEXT CHECK (tv_show IN ('bella_tra_i_fornelli', 'gustare_sicilia', 'vale_il_viaggio', 'altro')),
  status TEXT DEFAULT 'in_corso' CHECK (status IN ('in_corso', 'completato', 'in_pausa', 'cancellato')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REGISTRO LAVORI (Servizi svolti)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('riprese', 'montaggio', 'riprese_montaggio', 'fotografia', 'sviluppo_web', 'altro')),
  fee_shooting DECIMAL(10,2) DEFAULT 0,
  fee_editing DECIMAL(10,2) DEFAULT 0,
  fee_other DECIMAL(10,2) DEFAULT 0,
  km_distance INTEGER DEFAULT 0,
  km_rate DECIMAL(4,2) DEFAULT 0.19,
  location TEXT,
  invoice_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PREVENTIVI / PIPELINE
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  event_date DATE,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'primo_contatto' CHECK (status IN (
    'primo_contatto', 'preventivo_inviato', 'in_trattativa',
    'accettato', 'acconto_ricevuto', 'in_lavorazione',
    'completato', 'saldato', 'rifiutato', 'perso'
  )),
  sent_date DATE,
  response_date DATE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAGAMENTI
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  quote_id UUID REFERENCES quotes(id),
  payment_date DATE,
  payment_type TEXT CHECK (payment_type IN ('acconto', 'saldo', 'parziale', 'rimborso_spese')),
  amount DECIMAL(10,2) NOT NULL,
  method TEXT CHECK (method IN ('bonifico', 'contanti', 'paypal', 'altro')),
  invoice_ref TEXT,
  status TEXT DEFAULT 'in_attesa' CHECK (status IN ('ricevuto', 'in_attesa', 'scaduto')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPESE
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  client_id UUID REFERENCES clients(id),
  expense_date DATE NOT NULL,
  expense_type TEXT CHECK (expense_type IN ('spostamento_km', 'acquisto_materiale', 'noleggio', 'altro')),
  km_distance INTEGER,
  km_rate DECIMAL(4,2) DEFAULT 0.19,
  amount DECIMAL(10,2),
  markup_percent DECIMAL(5,2) DEFAULT 0,
  description TEXT,
  invoice_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMPOSTAZIONI (tariffa km default, ecc.)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valori iniziali
INSERT INTO settings (key, value) VALUES
  ('default_km_rate', '0.19'),
  ('default_fee_shooting', '187'),
  ('default_fee_editing_standard', '249'),
  ('default_fee_editing_spot', '250'),
  ('default_fee_editing_short', '125'),
  ('currency', 'EUR');
```

### 4.2 Viste Utili (Views)

```sql
-- Riepilogo finanziario per progetto
CREATE VIEW project_financials AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  c.name AS client_name,
  p.category,
  COUNT(s.id) AS total_services,
  COALESCE(SUM(s.fee_shooting + s.fee_editing + s.fee_other), 0) AS total_fees,
  COALESCE(SUM(s.km_distance), 0) AS total_km,
  COALESCE(SUM(s.km_distance * s.km_rate), 0) AS total_km_cost,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'ricevuto'), 0) AS total_paid,
  COALESCE(SUM(s.fee_shooting + s.fee_editing + s.fee_other), 0) -
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'ricevuto'), 0) AS balance_due
FROM projects p
JOIN clients c ON p.client_id = c.id
LEFT JOIN services s ON s.project_id = p.id
LEFT JOIN payments pay ON pay.project_id = p.id
GROUP BY p.id, p.name, c.name, p.category;

-- Riepilogo mensile
CREATE VIEW monthly_revenue AS
SELECT
  DATE_TRUNC('month', s.service_date) AS month,
  p.category,
  SUM(s.fee_shooting + s.fee_editing + s.fee_other) AS revenue,
  SUM(s.km_distance) AS total_km,
  SUM(s.km_distance * s.km_rate) AS km_cost
FROM services s
JOIN projects p ON s.project_id = p.id
GROUP BY DATE_TRUNC('month', s.service_date), p.category
ORDER BY month DESC;
```

### 4.3 Row Level Security (RLS)

Vedi sezione 5.3 per la configurazione completa delle policy RLS.

---

## 5. Sicurezza e Accesso

### 5.1 Nuovo Sistema API Keys di Supabase (Aggiornamento 2025/2026)

**ATTENZIONE:** Supabase ha cambiato il sistema di chiavi API. I nuovi progetti (da novembre 2025) usano il nuovo formato. Ecco il mapping:

| Vecchio sistema (legacy) | Nuovo sistema (attuale) |
|---|---|
| `anon` key (JWT) | **`sb_publishable_...`** key |
| `service_role` key (JWT) | **`sb_secret_...`** key |
| JWT shared secret (HS256) | **Asymmetric JWT signing keys** (RSA/EC) |

**Variabili d'ambiente da usare nel progetto:**

```env
# NUOVO FORMATO (da usare)
VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx

# NON PIÙ DISPONIBILE nei nuovi progetti
# SUPABASE_ANON_KEY=eyJ...  (DEPRECATO)
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  (DEPRECATO)
```

**Impatto su Atomic CRM:** Il fork di Atomic CRM potrebbe ancora referenziare le vecchie chiavi (`VITE_SUPABASE_ANON_KEY`). Bisogna aggiornare tutte le occorrenze per usare `VITE_SUPABASE_PUBLISHABLE_KEY` con il nuovo formato `sb_publishable_...`. Le librerie client Supabase accettano il nuovo formato senza modifiche al codice — basta sostituire il valore della chiave.

**Impatto sui JWT signing keys:** I nuovi progetti usano chiavi asimmetriche (firmate con chiave privata, verificate con chiave pubblica). Supabase espone un endpoint JWKS per la verifica:
```
https://tuoprogetto.supabase.co/auth/v1/.well-known/jwks.json
```

### 5.2 Autenticazione

- **Supabase Auth** con email/password
- Un solo account creato manualmente: `rosariodavide.furnari@gmail.com`
- **Disabilitare la registrazione pubblica** in Supabase Dashboard → Authentication → Settings → disabilitare il signup per nuovi utenti
- Opzionale: aggiungere anche login con Google per comodità

### 5.3 Row Level Security (RLS)

**Nota:** Nelle nuove versioni di Supabase, le tabelle create dalla dashboard hanno RLS abilitato di default.

```sql
-- RLS è già abilitato di default sui nuovi progetti
-- Basta creare le policy

-- Policy: solo l'utente autenticato può fare tutto
CREATE POLICY "Solo proprietario" ON clients
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON projects
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON services
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON quotes
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON payments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON expenses
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo proprietario" ON settings
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 5.4 Protezione Aggiuntiva

- Frontend: redirect automatico a pagina login se non autenticato
- Nessuna pagina pubblica — tutto dietro autenticazione
- HTTPS automatico (fornito da Vercel)
- La `sb_secret_...` key NON va mai esposta nel frontend — usarla solo lato server se necessario

---

## 6. Localizzazione in Italiano

Atomic CRM è in inglese di default, ma l'interfaccia va tradotta completamente in italiano.

### 6.1 Traduzione Interfaccia Base (react-admin)

Atomic CRM è costruito su **Shadcn Admin Kit**, che a sua volta si basa su **ra-core** (il cuore headless di react-admin). Il sistema i18n è lo stesso di react-admin e usa le stesse chiavi di traduzione con prefisso `ra.`.

**Installazione:**
```bash
npm install @christianascone/ra-language-italian
```

**Configurazione in `App.tsx`:**
```javascript
import italianMessages from '@christianascone/ra-language-italian';
import polyglotI18nProvider from 'ra-i18n-polyglot';

const i18nProvider = polyglotI18nProvider(() => italianMessages, 'it');
```

**NOTA IMPORTANTE:** Il pacchetto originale `ra-language-italian` (di stefsava) è vecchio di 5 anni e **incompatibile** con le versioni attuali di react-admin/Shadcn Admin Kit. Usare esclusivamente `@christianascone/ra-language-italian` (v4.16.0+).

### 6.2 Traduzione Parti Personalizzate

Per i moduli custom (Registro Lavori, Preventivi, Pagamenti, ecc.), tutte le label e i testi vanno scritti direttamente in italiano nel codice. Essendo un gestionale mono-utente, non serve un sistema multilingua: le stringhe possono essere hardcoded in italiano.

**Esempi di label personalizzate:**

| Inglese (default Atomic CRM) | Italiano |
|---|---|
| Contacts | Clienti |
| Companies | Aziende |
| Deals | Preventivi |
| Tasks | Attività |
| Notes | Note |
| Dashboard | Pannello di controllo |
| Pipeline | Pipeline vendita |
| Settings | Impostazioni |

**Label nuovi moduli (già in italiano):**

- Registro Lavori
- Compenso Riprese / Compenso Montaggio
- Km Percorsi / Rimborso Km
- Rif. Fattura
- Acconto / Saldo
- Pagamento Ricevuto / In Attesa / Scaduto

### 6.3 Traduzione Messaggi Custom

Se servono messaggi personalizzati, si possono sovrascrivere i messaggi di react-admin con un merge:

```javascript
import italianMessages from '@christianascone/ra-language-italian';

const customItalianMessages = {
  ...italianMessages,
  resources: {
    clients: { name: 'Cliente |||| Clienti', fields: { name: 'Nome', client_type: 'Tipo cliente', phone: 'Telefono', email: 'Email' } },
    projects: { name: 'Progetto |||| Progetti', fields: { name: 'Nome progetto', category: 'Categoria', status: 'Stato' } },
    services: { name: 'Servizio |||| Registro Lavori', fields: { service_date: 'Data', fee_shooting: 'Compenso riprese €', fee_editing: 'Compenso montaggio €', km_distance: 'Km percorsi', location: 'Località' } },
    quotes: { name: 'Preventivo |||| Preventivi', fields: { amount: 'Importo €', status: 'Stato', event_date: 'Data evento' } },
    payments: { name: 'Pagamento |||| Pagamenti', fields: { amount: 'Importo €', payment_date: 'Data pagamento', method: 'Metodo', status: 'Stato' } },
  }
};

const i18nProvider = polyglotI18nProvider(() => customItalianMessages, 'it');
```

---

## 7. Guida all'Implementazione

### 6.1 Fase 1 — Setup Base (1-2 giorni)

1. Fork di Atomic CRM: `https://github.com/marmelab/atomic-crm`
2. Creare progetto Supabase (free tier)
3. Configurare autenticazione (solo email di Rosario)
4. Sostituire lo schema database di Atomic CRM con quello di questa specifica
5. Deploy del frontend su Vercel
6. Verificare login e accesso

### 6.2 Fase 2 — Moduli Core (1-2 settimane)

1. Adattare il modulo Contatti di Atomic CRM → modulo Clienti
2. Adattare il modulo Deals di Atomic CRM → modulo Preventivi/Pipeline
3. Creare il modulo Progetti (nuovo)
4. Creare il modulo Registro Lavori (nuovo — il più importante)

### 6.3 Fase 3 — Finanza e Tracking (1 settimana)

1. Creare modulo Pagamenti
2. Creare modulo Spese/Km
3. Collegare pagamenti a progetti e preventivi
4. Implementare i calcoli automatici (totale compenso, rimborso km, saldo)

### 6.4 Fase 4 — Dashboard (3-5 giorni)

1. Cards riepilogative con dati reali
2. Grafici con libreria Recharts (da installare separatamente — `npm install recharts` — non inclusa in Atomic CRM)
3. Sezione alert/scadenze

### 6.5 Fase 5 — Migrazione Dati e Rifinitura (2-3 giorni)

1. Script di importazione dati dal file Numbers (CSV export → import)
2. Test con dati reali
3. Rifinitura UX/UI
4. Configurazione tariffe default nelle impostazioni

---

## 8. Importazione Dati Esistenti

Il file Numbers di Diego Caltabiano contiene dati dal 27/10/2024 al 07/04/2025+. Per importarli:

1. Esportare da Numbers in CSV
2. Creare uno script di importazione che:
   - Crea il cliente "ASSOCIAZIONE CULTURALE GUSTARE SICILIA"
   - Salva Diego Caltabiano come referente operativo, non come intestatario cliente
   - Crea i progetti ("Gustare Sicilia", "Bella tra i Fornelli", ecc.)
   - Importa ogni riga come servizio nel registro lavori
   - Associa i riferimenti fattura
   - Calcola i totali e verifica corrispondenza

### 8.1 Mapping dei Campi (Numbers → Gestionale)

| Campo Numbers | Campo Gestionale |
|---|---|
| Data | services.service_date |
| BELLA TRA I FORNELLI | projects.tv_show = 'bella_tra_i_fornelli' |
| GUSTARE SICILIA | projects.tv_show = 'gustare_sicilia' |
| SPOT | projects.category = 'spot' |
| COMPENSO RIPRESE € | services.fee_shooting |
| COMPENSO MONTAGGIO € | services.fee_editing |
| DISTANZA PERCORSA (KM) | services.km_distance |
| NOTE | services.notes |
| Rif. Fattura | services.invoice_ref |

---

## 9. Evoluzione Futura (Non Prioritarie)

Funzionalità da considerare in futuro, non incluse nella prima versione:

- **Generazione PDF preventivi** — Creare preventivi professionali da inviare ai clienti
- **Integrazione Google Calendar** — Sincronizzare date lavori e eventi
- **Notifiche email** — Reminder per pagamenti in scadenza (tramite Resend, gratuito)
- **App mobile PWA** — Rendere il gestionale installabile come app sul telefono
- **Automazioni WhatsApp** — Link wa.me precompilati per follow-up
- **Report per commercialista** — Export periodico di fatturato, spese, km per la dichiarazione
- **Multi-anno** — Confronto finanziario anno su anno
- **Backup automatico** — Export periodico del database

---

## 10. Riepilogo Costi

| Voce | Costo |
|---|---|
| Supabase (free tier: 500MB storage, 50K MAU, 1GB file storage) | €0 |
| Vercel (free tier: deploy illimitati) | €0 |
| Atomic CRM (licenza MIT) | €0 |
| Dominio personalizzato (opzionale, es: gestionale.rosariofurnari.it) | ~€10/anno |
| **Totale** | **€0 - €10/anno** |

**⚠️ ATTENZIONE — Limitazione critica del free tier Supabase:**
I progetti sul piano gratuito vengono **automaticamente sospesi dopo 7 giorni di inattività** (nessuna richiesta API). Questo significa che se non usi il gestionale per una settimana, il database va offline e devi riavviarlo manualmente dalla dashboard Supabase. Inoltre, dopo **90 giorni** di sospensione, il progetto potrebbe essere **eliminato definitivamente** e non più recuperabile.

### Soluzione: Keep-Alive Automatico (costo €0)

Ci sono 3 metodi verificati dalla community per mantenere attivo il progetto. Tutti richiedono che il "ping" esegua effettivamente una query sul database con successo — una richiesta HTTP generica o una query bloccata da RLS **non viene contata** come attività da Supabase.

#### PREREQUISITO: Creare la tabella `keep_alive` in Supabase

Prima di tutto, nella Dashboard Supabase → SQL Editor, eseguire:

```sql
-- Tabella dedicata al keep-alive
CREATE TABLE public.keep_alive (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT DEFAULT '',
  pinged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci un record iniziale
INSERT INTO public.keep_alive (name) VALUES ('heartbeat');

-- IMPORTANTE: Policy RLS che permette all'anon key di leggere
-- Senza questa policy, la query via API restituisce errore
-- e Supabase NON conta l'attività!
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consenti lettura keep_alive" ON public.keep_alive
  FOR SELECT USING (true);
```

**⚠️ NOTA CRITICA SULLA RLS:** Un utente su DEV.to ha segnalato (marzo 2025) che i suoi cron job funzionavano perfettamente (status "success") ma Supabase sospendeva ugualmente il progetto. La causa probabile: la query usava la `anon` key su una tabella con RLS attiva senza policy di SELECT per il ruolo `anon`. Il risultato era un errore (o un set vuoto) che Supabase non contava come attività reale sul database. La policy sopra risolve questo problema.

---

#### METODO 1: GitHub Actions (RACCOMANDATO — il più affidabile)

Fonte: guide di Natt Nguyen (2024), Jack Pritom Soren (DEV.to, marzo 2025), Shadhujan (Medium, dicembre 2025).

**Come funziona:** Un workflow GitHub schedulato esegue una query SELECT sulla tabella `keep_alive` 2 volte a settimana (lunedì e giovedì). Costa 0€ — il piano gratuito GitHub offre 2.000 minuti/mese di Actions, e questo workflow ne usa circa 4,35 al mese (0,22%).

**Setup passo per passo:**

1. Nel repository del tuo fork di Atomic CRM su GitHub, vai a **Settings → Secrets and variables → Actions**
2. Aggiungi 2 secrets:
   - `SUPABASE_URL` → il tuo Project URL (es: `https://tuoprogetto.supabase.co`)
   - `SUPABASE_KEY` → la tua publishable key (`sb_publishable_...`) — NON la secret key
3. Crea il file `.github/workflows/keep-alive.yml` nel repository:

```yaml
name: Supabase Keep Alive

on:
  schedule:
    # Esegue ogni lunedì e giovedì alle 8:00 UTC (09:00 ora italiana)
    - cron: '0 8 * * 1,4'
  workflow_dispatch:  # Permette esecuzione manuale dal tab Actions

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: |
          # Query diretta via REST API di Supabase (PostgREST)
          # Non serve installare nulla — basta curl
          HTTP_STATUS=$(curl -s -o /tmp/response.json -w "%{http_code}" \
            "$SUPABASE_URL/rest/v1/keep_alive?select=id,name,pinged_at&limit=1" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY")

          echo "HTTP Status: $HTTP_STATUS"
          echo "Response:"
          cat /tmp/response.json

          if [ "$HTTP_STATUS" -eq 200 ]; then
            echo "✅ Supabase ping riuscito — progetto attivo"
          else
            echo "❌ ERRORE: Supabase ha risposto con status $HTTP_STATUS"
            echo "Controlla: 1) URL e KEY corretti 2) Tabella keep_alive esiste 3) Policy RLS attiva"
            exit 1
          fi
```

4. Fai commit e push. Vai nel tab **Actions** di GitHub per verificare che il workflow compaia.
5. Clicca **Run workflow** manualmente per testare che funzioni. Deve restituire status 200.

**Consumo risorse GitHub Actions:**
- Ogni esecuzione dura ~2 secondi, ma viene fatturata come 1 minuto
- 2 esecuzioni/settimana × 4,35 settimane/mese = ~8,7 minuti/mese
- Il piano gratuito GitHub ne offre 2.000 → utilizzo dello 0,44%

---

#### METODO 2: Supabase Edge Function + cron-job.org (alternativa)

Fonte: Shadhujan Jeyachandran (Medium, dicembre 2025) — testato e funzionante a gennaio 2026.

**Come funziona:** Crei una Edge Function dentro Supabase che fa la query, poi la chiami periodicamente con il servizio gratuito cron-job.org (attivo dal 2011, 15+ anni di attività, sito verificato funzionante a febbraio 2026).

**Setup:**

1. Nella Dashboard Supabase → **Edge Functions** → **Deploy a new function**
2. Nome funzione: `keep-alive`
3. Incolla questo codice:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("keep_alive")
      .select("id, name, pinged_at")
      .limit(1);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: "alive",
        timestamp: new Date().toISOString(),
        data
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

4. **Importante**: In Edge Functions → impostazioni della funzione → disabilita **"Enforce JWT"** (altrimenti cron-job.org non può chiamarla senza token). In alternativa, lascia JWT attivo e in cron-job.org aggiungi l'header `Authorization: Bearer TUA_ANON_KEY`.
5. Clicca **Deploy function**
6. Testa l'URL: `https://tuoprogetto.supabase.co/functions/v1/keep-alive` — deve restituire `{"status":"alive",...}`
7. Vai su **https://cron-job.org** → registrati gratuitamente → crea un nuovo cron job:
   - **URL**: `https://tuoprogetto.supabase.co/functions/v1/keep-alive`
   - **Schedule**: ogni 3 giorni (o 2 volte a settimana)
   - **Request method**: GET

**Limiti cron-job.org (piano gratuito):**
- Timeout massimo per richiesta: 30 secondi (più che sufficiente)
- Frequenza: fino a 60 volte/ora (noi ne usiamo 2/settimana)
- Nessun limite al numero di cron job per account
- Notifiche email in caso di errore

---

#### METODO 3: Script Python con GitHub Actions (per progetti multipli)

Fonte: Travis VN — repository **supabase-inactive-fix** (GitHub, 147+ stelle, MIT).

Questo metodo è più robusto perché non fa solo SELECT ma INSERT + DELETE, generando attività di scrittura sul database che Supabase conta sicuramente.

**Repository:** https://github.com/travisvn/supabase-inactive-fix

Il workflow GitHub Actions incluso nel repo fa:
1. Inserisce un record con stringa random nella tabella `keep_alive`
2. Verifica il numero di record nella tabella
3. Se ci sono troppi record (>10), cancella quelli vecchi
4. Genera un report dettagliato dei risultati

**Per il nostro caso** (un solo progetto Supabase), il Metodo 1 è sufficiente. Il Metodo 3 conviene se in futuro gestisci più progetti Supabase contemporaneamente.

---

#### Confronto metodi

| Criterio | Metodo 1: GitHub Actions | Metodo 2: Edge Function | Metodo 3: Python multi-DB |
|---|---|---|---|
| **Complessità setup** | ⭐ Facile | ⭐⭐ Media | ⭐⭐⭐ Avanzata |
| **Dipendenze esterne** | GitHub (già usato) | cron-job.org | GitHub (già usato) |
| **Tipo di query** | SELECT (lettura) | SELECT (lettura) | INSERT + DELETE (scrittura) |
| **Robustezza** | ✅ Buona | ✅ Buona | ✅✅ Ottima |
| **Costo** | €0 | €0 | €0 |
| **Progetti multipli** | ❌ Un workflow per progetto | ❌ Un cron per progetto | ✅ Gestisce N progetti |
| **Raccomandato per noi** | ✅ **SÌ** | Alternativa | Solo se servono più progetti |

#### Raccomandazione finale

**Usare il Metodo 1 (GitHub Actions)** perché:
- Il repository del gestionale è già su GitHub (fork di Atomic CRM)
- Non introduce dipendenze esterne aggiuntive
- Il file `.yml` si aggiunge in 2 minuti
- Si può verificare lo stato nel tab Actions di GitHub
- Se un giorno smette di funzionare, GitHub manda notifica email

Come fallback di sicurezza, si può **anche** configurare il Metodo 2 (cron-job.org) in parallelo — avere due sistemi indipendenti che pingano il database riduce a zero il rischio di sospensione accidentale.

---

## 11. Link e Risorse

- **Atomic CRM Repository:** https://github.com/marmelab/atomic-crm
- **Atomic CRM Demo:** https://marmelab.com/atomic-crm-demo
- **Atomic CRM Docs:** https://marmelab.com/atomic-crm/doc/
- **Atomic CRM Deploy Docs:** https://marmelab.com/atomic-crm/doc/developers/deploy/
- **Shadcn Admin Kit (usato da Atomic CRM):** https://marmelab.com/shadcn-admin-kit/
- **Shadcn Admin Kit i18n Docs:** https://marmelab.com/shadcn-admin-kit/docs/translation/
- **Pacchetto italiano i18n:** https://www.npmjs.com/package/@christianascone/ra-language-italian
- **Supabase:** https://supabase.com
- **Supabase Docs API Keys:** https://supabase.com/docs/guides/api/api-keys
- **Supabase Docs JWT Signing Keys:** https://supabase.com/docs/guides/auth/signing-keys
- **Vercel:** https://vercel.com
- **Shadcn/ui:** https://ui.shadcn.com
- **Recharts (grafici):** https://recharts.org
- **Supabase Keep-Alive — supabase-inactive-fix (repo GitHub, 147+ ⭐):** https://github.com/travisvn/supabase-inactive-fix
- **Supabase Keep-Alive — supabase-pause-prevention (repo GitHub):** https://github.com/travisvn/supabase-pause-prevention
- **cron-job.org (servizio cron gratuito):** https://cron-job.org
