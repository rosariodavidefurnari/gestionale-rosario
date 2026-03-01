# Design Fase 2 — Progetto Visivo Completo

**Stato del documento:** `historical`
**Scopo:** blueprint iniziale di trasformazione visiva e funzionale dal fork
Atomic CRM.
**Quando NON usarlo da solo:** per descrivere UI e moduli come sono oggi nel
codice. Per lo stato corrente usare `docs/README.md`,
`docs/architecture.md` e la sweep map in
`docs/development-continuity-map.md`.

Esempi di punti ormai superati:

- il dominio referenti oggi esiste davvero tramite `contacts`
- la chat AI unificata e l'import documenti non erano ancora dentro questo
  blueprint iniziale

**Data:** 2026-02-25
**Stato:** Bozza per approvazione

Questo documento descrive come diventerà ogni sezione del gestionale,
basandosi al 100% sulla specifica (`Gestionale_Rosario_Furnari_Specifica.md`)
e sul codice reale di Atomic CRM. Nessuna invenzione.

---

## 1. Navigazione (Header)

**Oggi:**
```
Bacheca | Contatti | Aziende | Trattative
```

**Diventerà:**
```
Bacheca | Clienti | Progetti | Registro Lavori | Preventivi | Pagamenti | Spese
```

Menu utente (dropdown alto a destra):
- Profilo
- Impostazioni
- Toggle tema chiaro/scuro

**Rimossi:**
- "Aziende" — il concetto di azienda e contatto si fonde in "Cliente"
- "Utenti" dal dropdown — single user, non serve

---

## 2. Clienti (adattamento di Contacts)

### Cosa cambia

Il modulo Contacts attuale ha 24 file e gestisce: nome/cognome separati,
genere, titolo lavorativo, azienda collegata, email multiple (JSONB),
telefoni multipli (JSONB), LinkedIn, newsletter, status (freddo/caldo),
tags, responsabile vendita, avatar.

Il modulo Clienti è molto più semplice: un solo campo `name`
(ragione sociale o nome persona), tipo cliente, un telefono, una email,
indirizzo, P.IVA, fonte acquisizione, note.

### Lista Clienti (`/clients`)

**Colonne visibili:**

| # | Colonna | Tipo |
|---|---------|------|
| 1 | Nome / Ragione sociale | Testo, cliccabile -> scheda |
| 2 | Tipo cliente | Badge colorato |
| 3 | Telefono | Testo |
| 4 | Email | Testo |
| 5 | Fonte | Testo piccolo |

**Valori "Tipo cliente":** Produzione TV / Azienda locale / Privato wedding / Privato evento / Web

**Filtri (sidebar sinistra):**
- Ricerca testo libero (cerca nel nome)
- Filtro per tipo cliente (select multiplo)
- Filtro per fonte acquisizione (select multiplo)

**Azioni toolbar:**
- Pulsante "Crea" -> form creazione
- Export CSV

**Cosa sparisce rispetto a oggi:** avatar, genere, titolo, azienda collegata,
LinkedIn, newsletter, status freddo/caldo, tags, responsabile vendita,
merge contacts, vCard export.

### Form Creazione / Modifica Cliente

```
+---------------------------------------------+
|  NUOVO CLIENTE                              |
|                                             |
|  Nome / Ragione sociale *  [____________]   |
|  Tipo cliente *            [v Select    ]   |
|                                             |
|  -- Contatti --                             |
|  Telefono                  [____________]   |
|  Email                     [____________]   |
|  Indirizzo                 [____________]   |
|                                             |
|  -- Dettagli --                             |
|  Partita IVA / CF          [____________]   |
|  Fonte acquisizione        [v Select    ]   |
|  Note generali             [            ]   |
|                            [____________]   |
|                                             |
|             [Annulla]  [Salva]              |
+---------------------------------------------+
```

**Opzioni "Fonte acquisizione":**
Instagram / Facebook / Passaparola / Google / Altro

### Scheda Cliente (`/clients/:id`)

La scheda mostra un riepilogo completo di tutta l'attivita con quel cliente:

```
+--------------------------------------------------------------+
|  DIEGO CALTABIANO                        [Modifica] [Elimina]|
|  Produzione TV - Passaparola                                 |
|  tel 333-1234567 - diego@email.it                            |
|--------------------------------------------------------------|
|                                                              |
|  -- Progetti associati --                                    |
|  | Gustare Sicilia S2    | In corso  | Produzione TV |       |
|  | Bella tra i Fornelli  | In corso  | Produzione TV |       |
|  | Spot Rosemary's Pub   | Completato| Spot          |       |
|                                                              |
|  -- Ultimi lavori --                                         |
|  | 15/02/2026 | Riprese      | EUR 187,00  | Bronte      |  |
|  | 12/02/2026 | Montaggio    | EUR 249,00  |             |  |
|  | 10/02/2026 | Riprese      | EUR 187,00  | Acitrezza   |  |
|                                                              |
|  -- Riepilogo finanziario --                                 |
|  Totale compensi:    EUR 3.245,00                            |
|  Totale pagato:      EUR 2.000,00                            |
|  Saldo residuo:      EUR 1.245,00  (!)                       |
|                                                              |
|  -- Note --                                                  |
|  Cliente storico, sempre puntuale nei pagamenti.             |
+--------------------------------------------------------------+
```

Dati derivati dalle relazioni: `projects.client_id`, `services` via project,
`payments.client_id`, e dalla view `project_financials`.

---

## 3. Progetti (`/projects`) — Modulo nuovo

### Lista Progetti

**Colonne:**

| # | Colonna | Tipo |
|---|---------|------|
| 1 | Nome progetto | Testo, cliccabile |
| 2 | Cliente | Reference -> clients.name |
| 3 | Categoria | Badge: Produzione TV / Spot / Wedding / Evento Privato / Sviluppo Web |
| 4 | Sotto-categoria TV | Solo se categoria = Produzione TV (BTF / GS / VIV / Altro) |
| 5 | Stato | Badge colorato: In corso / Completato / In pausa / Cancellato |
| 6 | Data inizio | Data |

**Filtri:**
- Ricerca testo (nome progetto)
- Filtro per cliente (autocomplete)
- Filtro per categoria
- Filtro per stato

### Form Creazione / Modifica Progetto

```
+---------------------------------------------------------+
|  NUOVO PROGETTO                                         |
|                                                         |
|  Nome progetto *        [________________________]      |
|  Cliente *              [v Autocomplete         ]      |
|                                                         |
|  -- Classificazione --                                  |
|  Categoria *            [v Produzione TV        ]      |
|  Programma TV           [v Gustare Sicilia      ]      |
|  (visibile solo se Categoria = Produzione TV)           |
|                                                         |
|  -- Date e budget --                                    |
|  Stato                  [v In corso             ]      |
|  Data inizio            [gg/mm/aaaa             ]      |
|  Data fine prevista     [gg/mm/aaaa             ]      |
|  Budget concordato EUR  [________,__]                   |
|                                                         |
|  Note                   [                       ]      |
|                         [_______________________]      |
|                                                         |
|              [Annulla]  [Salva]                         |
+---------------------------------------------------------+
```

Il campo "Programma TV" compare solo quando si seleziona "Produzione TV"
come categoria (conditional rendering).

**Opzioni "Programma TV":**
Bella tra i Fornelli / Gustare Sicilia / Vale il Viaggio / Altro

### Scheda Progetto (`/projects/:id`)

```
+--------------------------------------------------------------+
|  GUSTARE SICILIA S2                      [Modifica] [Elimina]|
|  Diego Caltabiano - Produzione TV - In corso                 |
|  01/10/2025 -> 30/06/2026 - Budget: EUR 12.000,00           |
|--------------------------------------------------------------|
|                                                              |
|  -- Registro lavori --                                       |
|  | Data       | Tipo         | Riprese | Montaggio| Km  |   |
|  | 15/02/2026 | Riprese      | 187     | --       | 120 |   |
|  | 12/02/2026 | Montaggio    | --      | 249      | 0   |   |
|  | 10/02/2026 | Riprese+Mont.| 187     | 249      | 80  |   |
|                                                              |
|  -- Riepilogo finanziario (da view project_financials) --    |
|  Totale compensi:       EUR 4.560,00                         |
|  Totale km:             1.240 km (EUR 235,60)                |
|  Totale pagato:         EUR 3.000,00                         |
|  Saldo residuo:         EUR 1.795,60                         |
|                                                              |
|  -- Pagamenti ricevuti --                                    |
|  | 01/12/2025 | Acconto  | 2.000 | Bonifico | Ricevuto |   |
|  | 01/02/2026 | Parziale | 1.000 | Bonifico | Ricevuto |   |
|                                                              |
|  -- Note --                                                  |
|  Stagione 2, 24 puntate. Tariffa fissa per puntata.         |
+--------------------------------------------------------------+
```

---

## 4. Registro Lavori (`/services`) — Modulo nuovo, il cuore

Sostituto diretto del foglio Numbers. Ogni riga = una giornata/servizio.

### Lista Registro Lavori

Vista tabellare (la piu densa di tutto il gestionale):

| Data | Progetto | Cliente | Tipo | Riprese EUR | Montaggio EUR | Altro EUR | Totale EUR | Km | Rimb. Km EUR | Localita | Rif. Fattura |
|------|----------|---------|------|-------------|---------------|-----------|------------|-----|--------------|----------|-------------|
| 15/02 | Gustare Sicilia S2 | D. Caltabiano | Riprese | 187,00 | -- | -- | 187,00 | 120 | 22,80 | Bronte | |
| 12/02 | Gustare Sicilia S2 | D. Caltabiano | Montaggio | -- | 249,00 | -- | 249,00 | 0 | -- | | FPR 3/26 |
| 10/02 | Spot Rosemary's | D. Caltabiano | Riprese+Mont. | 187,00 | 250,00 | -- | 437,00 | 45 | 8,55 | Catania | |

**Note:**
- "Cliente" non e un campo del DB `services` — viene ereditato dalla relazione
  `services.project_id -> projects.client_id -> clients.name`.
  Il frontend lo mostra tramite un join (o una view dedicata).
- "Totale EUR" = fee_shooting + fee_editing + fee_other - discount (calcolato)
- "Rimb. Km EUR" = km_distance x km_rate (calcolato)
- Campo `discount` opzionale per sconti occasionali (es: "riprese e montaggio veloci")

**Filtri:**
- Per progetto (autocomplete)
- Per cliente (autocomplete, filtro indiretto via progetto)
- Per periodo (date range: data inizio / data fine)
- Per tipo servizio (select)
- Per categoria progetto (Produzione TV / Spot / Wedding / ecc.)

**Azioni toolbar:**
- Crea nuovo servizio
- Export CSV (per commercialista)

**Riga di totale in fondo (somma colonne filtrate):**
```
TOTALE: | | | | 2.431,00 | 3.241,00 | 500,00 | 6.172,00 | 890 | 169,10 | |
```

### Form Creazione / Modifica Servizio

```
+---------------------------------------------------------+
|  NUOVO SERVIZIO                                         |
|                                                         |
|  Data servizio *        [15/02/2026             ]      |
|  Progetto *             [v Gustare Sicilia S2   ]      |
|  Cliente                [Diego Caltabiano] (auto)       |
|  Tipo servizio *        [v Riprese              ]      |
|                                                         |
|  -- Compensi --                                         |
|  Compenso riprese EUR   [   233,00]                     |
|  Compenso montaggio EUR [        ]                      |
|  Compenso altro EUR     [        ]                      |
|  Sconto EUR             [        ] (opzionale)          |
|  TOTALE                  EUR 233,00   (calcolato)       |
|                                                         |
|  -- Spostamento --                                      |
|  Km percorsi            [   120]                        |
|  Tariffa km EUR         [  0,19] (da settings)          |
|  Rimborso km             EUR 22,80   (calcolato)        |
|                                                         |
|  Localita               [Bronte________________]       |
|  Rif. Fattura           [______________________]       |
|  Note                   [                       ]      |
|                         [_______________________]      |
|                                                         |
|              [Annulla]  [Salva]                         |
+---------------------------------------------------------+
```

**Comportamenti speciali:**

- Quando selezioni un progetto, "Cliente" si auto-compila (readonly, derivato dal progetto)
- "Tariffa km" si pre-compila con il valore da `settings.default_km_rate` (EUR 0,19) ma e modificabile
- I compensi si pre-compilano con i default da settings se il tipo servizio lo prevede
- "Totale" e "Rimborso km" si aggiornano in tempo reale
- "Sconto" opzionale — il totale diventa: riprese + montaggio + altro - sconto

---

## 5. Preventivi / Pipeline (`/quotes`) — Adattamento di Deals

### Cosa cambia

Il modulo Deals attuale ha: name, company_id, contact_ids[], category,
stage (6 stadi), amount, expected_closing_date, index (posizione Kanban),
archived_at.

I Preventivi avranno: client_id (non company), service_type, event_date,
description, amount, status (10 stadi), sent_date, response_date,
rejection_reason, notes.

### Board Kanban (`/quotes`)

Le colonne della pipeline passano da 6 a 10 stati:

```
| PRIMO    |PREVENTIVO|   IN     |ACCETTATO |ACCONTO   |   IN     |COMPLETATO| SALDATO  |RIFIUTATO |  PERSO   |
| CONTATTO | INVIATO  |TRATTATIVA|          |RICEVUTO  |LAVORAZ.  |          |          |          |(no risp.)|
|          |          |          |          |          |          |          |          |          |          |
| +------+ |          | +------+ |          |          |          |          |          |          |          |
| |Matr. | |          | |Spot  | |          |          |          |          |          |          |          |
| |Rossi | |          | |Bar X | |          |          |          |          |          |          |          |
| |E2500 | |          | |E800  | |          |          |          |          |          |          |          |
| +------+ |          | +------+ |          |          |          |          |          |          |          |
|          |          |          |          |          |          |          |          |          |          |
|  E2.500  |   E0     |  E800    |   E0     |   E0     |   E0     |   E0     |   E0     |   E0     |   E0     |
```

**Card preventivo (dentro la colonna Kanban):**
```
+----------------------+
| Matrimonio Rossi     |
| Mario Rossi          |  <- client name
| Wedding - 15/06/2026 |  <- service_type + event_date
| EUR 2.500,00         |
+----------------------+
```

Drag-and-drop: stessa libreria `@hello-pangea/dnd`, stessa meccanica.
Trascini la card da una colonna all'altra per aggiornare lo stato.

**Nota UX:** 10 colonne sono tante. Soluzione: scroll orizzontale
(come gia funziona oggi). In alternativa, gli stati finali
(Saldato, Rifiutato, Perso) possono essere nascosti dalla pipeline
attiva e visibili come "archivio" — esattamente come oggi i deals "won"
sono nascosti con `dealPipelineStatuses`.

### Form Creazione / Modifica Preventivo

```
+---------------------------------------------------------+
|  NUOVO PREVENTIVO                                       |
|                                                         |
|  Cliente *              [v Autocomplete         ]      |
|  Tipo servizio *        [v Wedding              ]      |
|  Data evento            [15/06/2026             ]      |
|                                                         |
|  Descrizione            [Servizio foto+video completo]  |
|                         [2 operatori, drone, album   ]  |
|                                                         |
|  Importo preventivo * EUR [  2.500,00]                  |
|  Stato                  [v Primo contatto       ]      |
|                                                         |
|  -- Date pipeline --                                    |
|  Data invio preventivo  [                       ]      |
|  Data risposta          [                       ]      |
|                                                         |
|  Motivo rifiuto         [______________________]       |
|  (visibile solo se Stato = Rifiutato)                   |
|                                                         |
|  Note                   [                       ]      |
|                         [_______________________]      |
|                                                         |
|              [Annulla]  [Salva]                         |
+---------------------------------------------------------+
```

**Opzioni "Tipo servizio":**
Wedding / Battesimo / Compleanno / Evento / Spot / Sito Web

---

## 6. Pagamenti (`/payments`) — Modulo nuovo

### Lista Pagamenti

| Data | Cliente | Progetto/Preventivo | Tipo | Importo EUR | Metodo | Rif. Fattura | Stato |
|------|---------|---------------------|------|-------------|--------|-------------|-------|
| 01/02/2026 | D. Caltabiano | Gustare Sicilia S2 | Acconto | 2.000,00 | Bonifico | FPR 2/26 | Ricevuto |
| 15/01/2026 | Mario Rossi | Matrimonio Rossi | Saldo | 1.500,00 | Bonifico | FPR 1/26 | Ricevuto |
| 01/03/2026 | Bar XYZ | Spot Bar XYZ | Saldo | 800,00 | -- | -- | In attesa |

**Filtri:**
- Per cliente
- Per progetto
- Per stato (Ricevuto / In attesa / Scaduto)
- Per periodo
- Per metodo pagamento

**Badge stato con colori:**
- Ricevuto -> verde
- In attesa -> giallo
- Scaduto -> rosso

### Form Creazione Pagamento

```
+---------------------------------------------------------+
|  NUOVO PAGAMENTO                                        |
|                                                         |
|  Data pagamento         [01/02/2026             ]      |
|  Cliente *              [v Autocomplete         ]      |
|  Progetto               [v Autocomplete         ]      |
|  Preventivo             [v Autocomplete         ]      |
|                                                         |
|  Tipo *                 [v Acconto              ]      |
|  Importo EUR *          [  2.000,00]                    |
|  Metodo pagamento       [v Bonifico            ]      |
|  Rif. Fattura           [FPR 2/26______________]       |
|  Stato                  [v Ricevuto            ]      |
|                                                         |
|  Note                   [_______________________]      |
|                                                         |
|              [Annulla]  [Salva]                         |
+---------------------------------------------------------+
```

---

## 7. Spese (`/expenses`) — Modulo nuovo

### Lista Spese

| Data | Tipo | Progetto | Km | Tariffa | Importo EUR | Ricarico | Totale EUR | Descrizione |
|------|------|----------|-----|---------|-------------|----------|----------|-------------|
| 15/02 | Spostamento Km | Gustare Sicilia | 120 | 0,19 | -- | -- | 22,80 | A/R Bronte |
| 10/02 | Acquisto materiale | Spot Bar XYZ | -- | -- | 180,00 | 25% | 225,00 | Seagate 8TB |
| 05/02 | Noleggio | Matrimonio Rossi | -- | -- | 150,00 | 0% | 150,00 | Drone DJI |

**"Totale EUR" calcolato:**
- Se tipo = Spostamento Km -> `km_distance x km_rate`
- Se tipo = Acquisto/Noleggio -> `amount x (1 + markup_percent / 100)`

**Filtri:** Per progetto, per tipo, per periodo.

### Form Creazione Spesa

```
+---------------------------------------------------------+
|  NUOVA SPESA                                            |
|                                                         |
|  Data *                 [15/02/2026             ]      |
|  Tipo *                 [v Spostamento Km       ]      |
|  Progetto               [v Autocomplete         ]      |
|  Cliente                [v Autocomplete         ]      |
|                                                         |
|  -- Se Spostamento Km --                                |
|  Km percorsi            [   120]                        |
|  Tariffa km EUR         [  0,19]                        |
|  Totale                  EUR 22,80  (calcolato)         |
|                                                         |
|  -- Se Acquisto / Noleggio / Altro --                   |
|  Importo spesa EUR      [   180,00]                     |
|  Ricarico %             [    25]                        |
|  Totale                  EUR 225,00  (calcolato)        |
|                                                         |
|  Descrizione            [Seagate IronWolf Pro 8TB]     |
|  Rif. Fattura           [______________________]       |
|                                                         |
|              [Annulla]  [Salva]                         |
+---------------------------------------------------------+
```

**Comportamento condizionale:** la sezione Km e la sezione Importo
si alternano in base al tipo selezionato.

---

## 8. Dashboard (`/`) — Redesign completo

La dashboard attuale mostra: contatti caldi, grafico deals ultimi 6 mesi
(Nivo bar), activity log, tasks.

La nuova dashboard diventa una dashboard finanziaria:

```
+---------------------------------------------------------------------------+
|                                                                           |
|  +--------------+ +--------------+ +--------------+ +--------------+     |
|  | Fatturato    | | Fatturato    | | Pagamenti    | | Preventivi   |     |
|  | mese         | | anno         | | in attesa    | | aperti       |     |
|  |              | |              | |              | |              |     |
|  |  EUR 4.320   | |  EUR 28.450  | |  EUR 3.200   | | 4 (EUR 8500) |     |
|  |  +12% vs feb | |  2026        | |  (!)         | |              |     |
|  +--------------+ +--------------+ +--------------+ +--------------+     |
|                                                                           |
|  +------------------------------+ +----------------------------------+   |
|  | Andamento fatturato mensile  | | Fatturato per categoria          |   |
|  | (Line chart - 12 mesi)      | | (Bar chart)                      |   |
|  |                              | |                                  |   |
|  |   E6k +      /\             | |  Prod. TV  ============ E18.200  |   |
|  |   E4k +  /--/  \--\        | |  Spot      =====  E4.800         |   |
|  |   E2k +--/        \--      | |  Wedding   ====  E3.600          |   |
|  |     0 +                     | |  Web       ==  E1.850            |   |
|  |       mar apr mag giu ...   | |                                  |   |
|  +------------------------------+ +----------------------------------+   |
|                                                                           |
|  +------------------------------+ +----------------------------------+   |
|  | Pipeline overview            | | Scadenze e alert                 |   |
|  | (bar orizzontale)            | |                                  |   |
|  |                              | | (!) Pagamento scaduto:           |   |
|  | Primo contatto    == 2       | |   Bar XYZ - E800 (da 15 gg)     |   |
|  | Prev. inviato     === 3     | |                                  |   |
|  | In trattativa     = 1       | | Prossimi lavori:                 |   |
|  | Accettato         == 2      | |   18/02 Riprese GS - Bronte      |   |
|  | ...                          | |   20/02 Montaggio BTF            |   |
|  |                              | |                                  |   |
|  | Top 5 clienti:              | | Preventivi senza risposta:       |   |
|  | 1. D. Caltabiano  E18.200   | |   Matr. Rossi (10 gg fa)        |   |
|  | 2. M. Rossi       E3.600    | |   Spot Palestra (8 gg fa)       |   |
|  | 3. Bar XYZ        E2.400    | |                                  |   |
|  +------------------------------+ +----------------------------------+   |
|                                                                           |
+---------------------------------------------------------------------------+
```

**Fonti dati (tutte dalle tabelle/views gia esistenti nel DB):**
- Fatturato mese/anno -> view `monthly_revenue`
- Pagamenti in attesa -> tabella `payments` WHERE status = 'in_attesa'
- Preventivi aperti -> tabella `quotes` WHERE status NOT IN ('saldato','rifiutato','perso','completato')
- Grafico mensile -> view `monthly_revenue`
- Grafico per categoria -> view `monthly_revenue` raggruppata per category
- Pipeline -> tabella `quotes` GROUP BY status
- Top clienti -> view `project_financials` raggruppata per client_name
- Alert -> queries su payments (scaduti), quotes (senza risposta da 7+ gg)

**Libreria grafici:** Recharts (da installare, sostituisce Nivo usato oggi).

---

## 9. Impostazioni (`/settings`) — Adattamento

La pagina settings attuale configura: logo, settori azienda, stadi deal,
categorie deal, stati note, tipi attivita.

Diventa:

```
+---------------------------------------------+
|  IMPOSTAZIONI                               |
|                                             |
|  -- Tariffe default (aggiornate 2025/2026) --|
|  Tariffa km                [  0,19] EUR/km  |
|  Compenso riprese          [233,00] EUR     |
|  Montaggio GS (standard)   [311,00] EUR     |
|  SPOT completo (rip.+mont.)[312,00] EUR     |
|  Montaggio VIV/BTF (short) [156,00] EUR     |
|  Valuta                    [EUR   ]         |
|                                             |
|  -- Pipeline preventivi --                  |
|  (configurazione stadi Kanban)              |
|                                             |
|  -- Categorie servizio --                   |
|  (Wedding, Battesimo, Spot, ecc.)           |
|                                             |
|            [Annulla modifiche]  [Salva]      |
+---------------------------------------------+
```

I valori default vengono dalla tabella `settings` nel DB
(gia popolata con i dati iniziali dalla migration).

---

## 10. Riepilogo Trasformazioni

| Da (Atomic CRM) | A (Gestionale) | Tipo intervento |
|---|---|---|
| Contacts (24 file, schema complesso) | **Clienti** (schema semplificato) | Adattamento pesante |
| Companies | **Rimosso** | Eliminazione |
| Deals (16 file, Kanban 6 stadi) | **Preventivi** (Kanban 10 stadi) | Adattamento medio |
| Dashboard (12 file, Nivo) | **Dashboard finanziaria** (Recharts) | Riscrittura quasi totale |
| Settings | **Impostazioni** (tariffe + pipeline) | Adattamento |
| -- | **Progetti** (nuovo) | Creazione da zero |
| -- | **Registro Lavori** (nuovo) | Creazione da zero |
| -- | **Pagamenti** (nuovo) | Creazione da zero |
| -- | **Spese** (nuovo) | Creazione da zero |
| Tasks, Notes, Activity, Tags, Sales | Da valutare | Potrebbero essere rimossi/semplificati |

---

## 11. Moduli Atomic CRM da valutare

Questi moduli esistono in Atomic CRM ma non sono nella specifica del gestionale.
Decisione da prendere prima di implementare:

| Modulo | Attuale | Proposta | Motivazione |
|--------|---------|----------|-------------|
| **Tasks** | Attivita associate a contatti con scadenze | Rimuovere o semplificare | Le "scadenze" nel gestionale sono i pagamenti e gli eventi, non task generici |
| **Notes** (contact_notes, deal_notes) | Note testuali con allegati | Mantenere come "note" sui clienti | Utile per appunti su clienti/progetti, ma semplificato |
| **Activity Log** | Log automatico di tutte le azioni | Valutare | Potrebbe non servire per single user |
| **Tags** | Etichette colorate su contatti | Probabilmente rimuovere | Il tipo cliente e la categoria progetto coprono il caso d'uso |
| **Sales** | Team vendite, responsabili | Semplificare drasticamente | Single user, serve solo come record per l'auth trigger |

---

## 12. Ordine di implementazione suggerito

Basato sulle dipendenze tra moduli:

1. **Clienti** — Prima di tutto, e la base di tutto il resto
2. **Progetti** — Dipende da Clienti (FK client_id)
3. **Registro Lavori** — Dipende da Progetti (FK project_id), il cuore
4. **Preventivi** — Dipende da Clienti (FK client_id)
5. **Pagamenti** — Dipende da Clienti, Progetti, Preventivi
6. **Spese** — Dipende da Progetti, Clienti
7. **Dashboard** — Dipende da tutti i moduli sopra (legge i dati)
8. **Impostazioni** — Adattamento, puo essere fatto in parallelo
9. **Pulizia** — Rimuovere moduli non necessari (Companies, Tasks, ecc.)

La navigazione (Header) va aggiornata progressivamente man mano
che i moduli vengono completati.
