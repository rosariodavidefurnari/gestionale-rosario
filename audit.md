# Audit Robustezza — Gestionale Rosario Furnari

Data: 2026-02-27 | Sessione 14

---

## Legenda priorità

- **P0 — Critico**: Può corrompere dati o causare errori silenti
- **P1 — Importante**: UX confusa o mancanza di protezioni base
- **P2 — Miglioramento**: Nice-to-have, può aspettare

---

## A. Validazione Form (Frontend)

### A1. Nessun controllo duplicati (P0)

Nessun modulo verifica l'esistenza di record duplicati prima della creazione.

| Modulo | Rischio duplicato |
|--------|-------------------|
| Clienti | Stesso nome cliente inserito 2 volte |
| Progetti | Stesso nome progetto per lo stesso cliente |
| Servizi | Stesso (progetto, data, tipo) inserito 2 volte |
| Pagamenti | Stesso (progetto, data, importo) inserito 2 volte |
| Spese | Stessa (data, tipo, progetto) inserita 2 volte |

**File coinvolti**: tutti i `*Create.tsx`
**Fix**: Aggiungere check pre-save e/o UNIQUE constraint a DB

### A2. Importi negativi accettati (P0)

Nessun campo numerico ha validazione `min >= 0`:

| Modulo | Campi senza min | File |
|--------|-----------------|------|
| Servizi | fee_shooting, fee_editing, fee_other, discount, km_distance, km_rate | ServiceInputs.tsx |
| Pagamenti | amount | PaymentInputs.tsx |
| Spese | amount, km_distance, km_rate, markup_percent | ExpenseInputs.tsx |
| Preventivi | amount (accetta 0 con `required()`) | QuoteInputs.tsx |

**Fix**: Aggiungere `validate={[required(), minValue(0)]}` o `min={0}` su tutti i campi numerici

### A3. Data pagamento non obbligatoria (P1)

`payment_date` è opzionale in PaymentInputs.tsx (riga 36-39).
Un pagamento senza data corrompe i report temporali.

**Fix**: Aggiungere `validate={required()}`

### A4. Motivo rifiuto preventivo non obbligatorio (P1)

Quando `status = "rifiutato"`, il campo `rejection_reason` appare ma non è required (QuoteInputs.tsx riga 80-88).

**Fix**: Aggiungere `validate={required()}` al campo condizionale

### A5. Date incoerenti accettate (P1)

| Modulo | Problema | File |
|--------|----------|------|
| Progetti | `end_date` può essere prima di `start_date` | ProjectInputs.tsx |
| Preventivi | `response_date` può essere prima di `sent_date` | QuoteInputs.tsx |

**Fix**: Validatore custom che confronta le due date

### A6. Date invio/risposta preventivo non condizionali (P2)

Se status = "preventivo_inviato", `sent_date` dovrebbe essere obbligatoria.
Se status = "accettato/rifiutato", `response_date` dovrebbe essere obbligatoria.
Attualmente entrambe sono sempre opzionali.

**Fix**: Validazione condizionale basata su status

### A7. Nome tag può essere vuoto (P2)

In TagDialog.tsx il campo nome non ha validazione — si possono creare tag senza nome.

**Fix**: Validare che `newTagName.trim().length > 0` prima del submit

---

## B. Vincoli Database (Backend)

### B1. Nessun UNIQUE constraint su clients.name (P0)

La tabella `clients` non ha constraint UNIQUE su `name`.
Due record con lo stesso nome sono possibili a livello DB.

**Fix**: `ALTER TABLE clients ADD CONSTRAINT clients_name_unique UNIQUE (name);`

### B2. Nessun CHECK >= 0 su importi numerici (P0)

Nessuna tabella ha CHECK constraint per impedire valori negativi:

| Tabella | Colonne senza CHECK |
|---------|---------------------|
| services | fee_shooting, fee_editing, fee_other, discount, km_distance |
| payments | amount |
| expenses | amount, km_distance, markup_percent |
| quotes | amount |

**Fix**: Migration con `ALTER TABLE ... ADD CONSTRAINT ... CHECK (column >= 0)`

### B3. payments.payment_date nullable (P0)

A livello DB la colonna `payment_date` accetta NULL.

**Fix**: `ALTER TABLE payments ALTER COLUMN payment_date SET NOT NULL;`
(prima: verificare che tutti i record esistenti abbiano una data)

### B4. Manca updated_at su 3 tabelle (P1)

| Tabella | created_at | updated_at |
|---------|------------|------------|
| services | ✅ | ❌ |
| payments | ✅ | ❌ |
| expenses | ✅ | ❌ |

**Fix**: `ALTER TABLE ... ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();` + trigger

### B5. ON DELETE implicito (RESTRICT) su payments e expenses (P1)

Le FK di payments e expenses verso clients/projects/quotes non specificano ON DELETE.
Il default PostgreSQL è RESTRICT: impedisce la cancellazione del parent.

**Comportamento attuale**:
- Non puoi eliminare un cliente che ha pagamenti o spese (errore DB silente)
- Non puoi eliminare un progetto che ha pagamenti o spese

**Decisione necessaria**: CASCADE (elimina tutto) o SET NULL (mantieni orfani)?
Raccomandazione: **CASCADE** per payments/expenses legati a progetti, **RESTRICT** per sicurezza su clients.

### B6. Nessun UNIQUE (client_id, name) su projects (P1)

Due progetti con lo stesso nome per lo stesso cliente sono possibili.

**Fix**: `ALTER TABLE projects ADD CONSTRAINT projects_client_name_unique UNIQUE (client_id, name);`

### B7. Tag senza integrità referenziale (P2)

`clients.tags` è un `BIGINT[]` senza FK verso la tabella `tags`.
Se un tag viene eliminato, gli ID orfani restano nell'array.

**Fix**: Non facilmente risolvibile con array — valutare tabella ponte `client_tags(client_id, tag_id)` oppure pulizia periodica.

### B8. Nessun CHECK su range date (P2)

| Tabella | Vincolo mancante |
|---------|-----------------|
| projects | `end_date >= start_date` |
| quotes | `response_date >= sent_date` |

**Fix**: `ALTER TABLE ... ADD CONSTRAINT ... CHECK (end_date >= start_date);`

---

## C. Gestione Errori UX

### C1. Liste non mostrano errori di caricamento (P0)

Nessun `ListContent` controlla `error` da `useListContext`.
Se la query fallisce, la lista mostra il nulla — nessun messaggio all'utente.

| File | Riga |
|------|------|
| ClientListContent.tsx | 17-20 |
| ServiceListContent.tsx | 19-22 |
| ExpenseListContent.tsx | 26-29 |
| PaymentListContent.tsx | 20-23 |

**Fix**: Aggiungere check `if (error) return <ErrorMessage />` prima del render

### C2. Pagine Show non gestiscono errori (P0)

Tutte le Show pages controllano solo `isPending || !record` → `return null`.
Se il record non esiste (404) o la query fallisce, l'utente vede niente.

| File | Riga |
|------|------|
| ClientShow.tsx | 22-24 |
| ProjectShow.tsx | 22-23 |
| ServiceShow.tsx | 22-23 |
| ExpenseShow.tsx | 29-30 |
| PaymentShow.tsx | 23-24 |
| QuoteShow.tsx | 36-44 |

**Fix**: Aggiungere gestione `error` da `useShowContext` con messaggio user-friendly

### C3. Nessuna conferma prima dell'eliminazione (P1)

Il DeleteButton usa `useDeleteWithUndoController` (undo notification).
Non c'è un dialog "Sei sicuro?" prima della cancellazione.
L'undo è poco visibile su mobile.

**Fix**: Aggiungere `AlertDialog` di shadcn prima del delete

### C4. FK nelle righe tabella senza feedback di caricamento (P2)

Le righe di ServiceListContent, ExpenseListContent, PaymentListContent usano `useGetOne` per risolvere nomi cliente/progetto.
Mentre carica, il nome è vuoto `""` — nessun skeleton o placeholder.

**Fix**: Mostrare "..." o uno skeleton inline durante il caricamento

---

## Riepilogo per priorità

### P0 — Critici (7 problemi)
1. A1 — Nessun controllo duplicati
2. A2 — Importi negativi accettati
3. B1 — Nessun UNIQUE su clients.name
4. B2 — Nessun CHECK >= 0 su importi
5. B3 — payments.payment_date nullable
6. C1 — Liste non mostrano errori
7. C2 — Pagine Show non gestiscono errori

### P1 — Importanti (6 problemi)
8. A3 — Data pagamento non obbligatoria (form)
9. A4 — Motivo rifiuto non obbligatorio
10. A5 — Date incoerenti accettate
11. B4 — Manca updated_at su 3 tabelle
12. B5 — ON DELETE implicito su payments/expenses
13. B6 — Nessun UNIQUE (client_id, name) su projects
14. C3 — Nessuna conferma prima dell'eliminazione

### P2 — Miglioramenti (4 problemi)
15. A6 — Date preventivo non condizionali
16. A7 — Nome tag vuoto
17. B7 — Tag senza integrità referenziale
18. B8 — CHECK range date
19. C4 — FK senza feedback caricamento
