# Gestionale Rosario - Roadmap generale di rifinitura

Data: 2026-06-14

Questo documento e' una roadmap di orientamento, non un ordine di esecuzione
automatica. Serve a ridurre le paure principali sul gestionale con verifiche
deterministiche e interventi progressivi.

## Obiettivo

Portare il gestionale a uno stato in cui:

- i dati finanziari sono affidabili e verificabili;
- la UI racconta la stessa verita' del database;
- desktop e mobile mostrano gli stessi numeri critici;
- l'AI puo' interrogare il sistema senza inventare semantica al volo;
- ogni modifica futura avviene sopra regole esplicite, non sopra intuizioni.

## Principi guida

1. Prima la verita', poi il redesign.
2. Prima sicurezza e dati, poi automazioni.
3. Prima dominio reale, poi test.
4. Nessun over-engineering contabile: regime forfettario, cassa, niente IVA
   attiva, niente partita doppia se non serve.
5. Ogni numero importante deve poter rispondere: "da quali record arrivi?"
6. Ogni parola della UI deve avere un significato unico.
7. Ogni intervento deve chiudersi con una query o una prova visiva.
8. Ogni modifica deve rispettare SOLID in modo pragmatico: responsabilita'
   chiare, contratti stabili, interfacce piccole e dipendenze rivolte verso
   provider/helper/vista/registry di dominio, senza astrazioni inutili.
9. Ogni ciclo non banale segue sempre: spec, review spec, piano, review piano,
   implementazione, review implementazione, verifica finale.
10. Nessuna modifica su DB, fiscalita', dashboard, AI, provider o UX/mobile
    parte direttamente dalla roadmap: la roadmap orienta, spec e piano decidono.
11. Su soldi e fiscalita' si lavora test-first: prima controllo/test RED
    ripetibile, poi implementazione minima, poi review e verifica GREEN.
12. Parola d'ordine: deterministico. Ogni claim critico richiede fonte reale,
    comando/query ripetibile, output atteso e stop condition.
13. Quando una regola critica puo' essere infranta, trasformarla in un
    controllore del repo: test, script, smoke, lint, pre-commit, CI o query
    versionata.
14. La prossima azione non vive nella roadmap: vive in `docs/CANTIERE.md`, che
    va letto e aggiornato a ogni ripartenza o chiusura di lavoro.
15. Le migration devono essere additive e indipendenti: no distruzione dati,
    no dipendenze da stato remoto/manuale, replay da zero sempre possibile.

## Contratto operativo

- Prima si misura, poi si tocca.
- Se ci sono soldi o fiscalita', il test passa davanti a tutti.
- Spec e piano sono il biglietto d'ingresso.
- Ogni review e' un casello: senza passare, non si prosegue.
- Niente "mi pare": o c'e' una fonte reale, o e' una supposizione.
- Niente "poi lo controlliamo": se e' critico, il controllo nasce prima.
- La roadmap indica la direzione; spec, piano, test e review decidono i passi.
- Il Cantiere dice il prossimo passo quando si apre una nuova chat.

## Stato iniziale noto

### Confermato

- Lo schema non e' improvvisato: esistono FK, CHECK, UNIQUE e tipi monetari
  `numeric` / `decimal`.
- La separazione finanziaria piu' corretta e' gia' abbozzata:
  `financial_documents`, `cash_movements`,
  `financial_document_cash_allocations`,
  `financial_document_project_allocations`.
- Il gestionale operativo usa ancora molto `payments` come fonte pratica degli
  incassi.
- `payments.invoice_ref` e' testo libero, non una FK verso
  `financial_documents`.
- Le quattro tabelle fiscali backup `*_backup_20260414` risultano leggibili con
  anon key sul remoto: questo e' un problema reale di sicurezza/RLS.
- Il tema bollo non va corretto alla cieca: negli XML storici il bollo puo'
  essere gia' compreso nel totale/imponibile importato.

### Da riverificare sul DB remoto prima di agire

- Numero attuale di `payments`, `financial_documents`, servizi e progetti.
- Conteggi esatti dei documenti con bollo.
- Stato reale delle tabelle di riconciliazione sul remoto.
- Saldi esatti per Diego/Gustare e altri clienti.
- Differenze tra DB remoto, `supabase/seed_domain_data.sql` e XML in `Fatture/`.

## Roadmap

### Fase 0 - Congelamento e perimetro

Scopo: evitare modifiche impulsive.

Attivita':

- non modificare schema, dati o UI durante l'audit;
- definire le superfici incluse:
  - database remoto;
  - seed locale;
  - XML storici;
  - dashboard;
  - pagamenti;
  - fatture/documenti;
  - servizi;
  - spese;
  - mobile;
  - AI.

Output:

- elenco delle superfici da verificare;
- lista delle decisioni che richiedono conferma di Rosario.

Gate di uscita:

- sappiamo cosa stiamo auditando e cosa resta fuori.

### Fase 1 - Sicurezza immediata

Scopo: chiudere il rischio piu' concreto prima del lavoro di rifinitura.

Stato: completata il 2026-06-14 per le quattro backup tables fiscali.

Attivita':

- verificare sul remoto lo stato RLS di:
  - `fiscal_declarations_backup_20260414`;
  - `fiscal_obligations_backup_20260414`;
  - `fiscal_f24_submissions_backup_20260414`;
  - `fiscal_f24_payment_lines_backup_20260414`;
- decidere se:
  - abilitarle con policy corrette;
  - renderle accessibili solo via service role;
  - eliminarle dopo backup;
- documentare la decisione.

Output:

- backup fiscali non piu' esposti alla anon key: completato;
- controllori aggiunti:
  - `npm run security:check:fiscal-backups`
  - `npm run security:check:fiscal-backups:rest`
- note aggiornate in:
  - `docs/architecture.md`
  - `docs/development-continuity-map.md`

Gate di uscita:

- una richiesta REST anon non deve poter leggere righe da quelle tabelle:
  completato, REST anon ritorna `401` per tutte e quattro.

### Fase 2 - Verita' dati: remoto vs locale vs XML

Scopo: capire qual e' la fonte attendibile per ogni dato.

Attivita':

- confrontare conteggi e totali tra:
  - Supabase remoto;
  - `supabase/seed_domain_data.sql`;
  - XML in `Fatture/`;
- produrre una tabella per:
  - clients;
  - projects;
  - services;
  - payments;
  - expenses;
  - financial_documents;
  - cash_movements;
  - allocation tables;
- separare:
  - dati operativi correnti;
  - dati storici importati;
  - dati tecnici/test;
  - backup manuali.

Output:

- matrice "fonte di verita'" per ogni area;
- elenco drift tra remoto e repo.

Gate di uscita:

- prima di correggere un dato sappiamo se il dato vive nel remoto, nel seed, in
  XML o in piu' posti.

### Fase 3 - Audit finanziario deterministico

Scopo: misurare se il sistema sta in piedi finanziariamente.

Attivita':

- verificare FK e orfani;
- verificare CHECK e domini chiusi;
- verificare importi negativi;
- verificare importi con piu' di 2 decimali;
- verificare pagamenti senza `invoice_ref`;
- verificare `invoice_ref` non matchabili con documenti;
- verificare documenti senza pagamento;
- verificare pagamenti senza documento;
- verificare fatture cliente con IVA;
- verificare note di credito;
- verificare saldi per cliente e progetto;
- verificare differenza tra:
  - lavoro svolto;
  - fatturato;
  - incassato;
  - da incassare.

Output:

- scoreboard `OK / rischio / decisione richiesta`;
- query salvate per ripetere l'audit.

Gate di uscita:

- ogni rischio finanziario ha una prova e una priorita'.

### Fase 4 - Riconciliazione fattura-incasso

Scopo: rendere deterministica la domanda "questa fattura e' pagata?"

Decisione da prendere:

- Opzione A: mantenere `payments` e aggiungere collegamento FK verso
  `financial_documents`.
- Opzione B: usare davvero `cash_movements` e le due tabelle di allocazione.

Raccomandazione iniziale:

- partire da Opzione A evolutiva, salvo bisogno reale di incassi multi-fattura
  o multi-progetto.

Attivita':

- mappare `payments.invoice_ref` contro `financial_documents.document_number`;
- individuare match ambigui o mancanti;
- decidere come trattare pagamenti storici;
- creare una vista di saldo documento/cliente/progetto;
- aggiornare UI e AI a leggere la vista, non a ricostruire ogni volta.

Output:

- query certa per:
  - fattura pagata;
  - residuo fattura;
  - saldo cliente;
  - saldo progetto.

Gate di uscita:

- nessun pagamento puo' puntare a una fattura inesistente quando il link e'
  dichiarato.

### Fase 5 - Chiarimento bollo e importi documento

Scopo: evitare una correzione sbagliata sui dati storici.

Problema:

- `stamp_amount` e `taxable_amount` non sono semanticamente abbastanza chiari;
- negli XML storici il bollo puo' essere sia dichiarato in `DatiBollo` sia
  incluso nelle righe e nel totale;
- il codice nuovo genera XML con bollo fuori dalle righe e dentro il totale.

Attivita':

- campionare tutte le fatture con `stamp_amount = 2`;
- leggere per ciascuna:
  - `ImportoTotaleDocumento`;
  - `ImportoPagamento`;
  - `ImponibileImporto`;
  - presenza di riga "Bollo";
  - `DatiBollo`;
- decidere cosa devono significare nel DB:
  - `total_amount`;
  - `taxable_amount`;
  - `tax_amount`;
  - `stamp_amount`;
- documentare una regola unica.

Output:

- regola bollo scritta;
- query corretta di coerenza documenti;
- eventuale migration solo se la regola dimostra dati incoerenti.

Gate di uscita:

- nessuno legge lo scarto di 2 euro come errore se e' una differenza di
  modellazione.

### Fase 6 - Arrotondamenti e rimborsi km

Scopo: eliminare mezzi centesimi e drift nei totali.

Attivita':

- identificare tutti i punti che usano `km_distance * km_rate`;
- decidere una sola regola:
  - calcolo sempre arrotondato a 2 decimali;
  - helper unico;
  - eventuale colonna generata solo se serve davvero;
- aggiornare viste, dashboard, fatture e AI a usare la stessa regola.

Output:

- zero differenze aggregate dovute a mezzi centesimi;
- test unitari sulla funzione di calcolo.

Gate di uscita:

- lo stesso servizio produce lo stesso rimborso ovunque.

### Fase 7 - Protezione storico e cancellazioni

Scopo: impedire perdita silenziosa di storia finanziaria/fiscale.

Attivita':

- auditare `ON DELETE CASCADE` sulle tabelle finanziarie;
- classificare ogni cascade:
  - accettabile;
  - rischioso;
  - da sostituire;
- decidere tra:
  - `ON DELETE RESTRICT`;
  - soft delete `deleted_at`;
  - archiviazione;
- proteggere documenti, pagamenti, servizi fatturati e dati fiscali.

Output:

- regola di cancellazione per ogni entita' critica;
- UI con conferme piu' esplicite dove serve.

Gate di uscita:

- cancellare un progetto non distrugge senza traccia la sua storia finanziaria.

### Fase 8 - Audit UX anti-drift

Scopo: verificare se la UI racconta la stessa verita' del dominio.

Attivita':

- mappare i task reali:
  - quanto mi deve Diego;
  - registro una puntata;
  - creo bozza fattura;
  - registro incasso;
  - controllo tasse;
  - trovo una fattura;
  - verifico un progetto saldato;
- auditare ogni task su:
  - dashboard;
  - liste;
  - create/edit/show;
  - mobile;
  - AI;
- costruire dizionario UI:
  - Lavorato;
  - Fatturato;
  - Incassato;
  - Da incassare;
  - Scaduto;
  - Rimborso;
  - Spesa;
  - Bollo;
  - Tasse;
  - Disponibile netto.

Output:

- tabella task -> schermate -> rischio UX;
- elenco parole ambigue;
- elenco numeri opachi.

Gate di uscita:

- ogni label critica ha un significato unico e verificabile.

### Fase 9 - Dashboard e mobile

Scopo: rendere i numeri principali leggibili in 2 secondi.

Attivita':

- auditare ogni card con il test bambino:
  - cosa dice?
  - qual e' il numero principale?
  - da dove arriva?
  - e' cassa o competenza?
  - e' uguale su desktop e mobile?
- verificare parita' props tra `DashboardAnnual` e `MobileDashboard`;
- ridurre contenuti secondari su mobile con pattern `compact`;
- evitare badge o footnote per spiegare concetti essenziali.

Output:

- lista card `ok / ambigua / pericolosa`;
- correzioni prioritarie desktop/mobile.

Gate di uscita:

- desktop e mobile non possono mostrare interpretazioni finanziarie diverse.

### Fase 10 - AI come vista controllata, non fonte autonoma

Scopo: far usare l'AI sopra semantiche stabili.

Attivita':

- definire quali viste/query l'AI puo' usare;
- evitare SQL libero per domande finanziarie critiche;
- ogni risposta AI importante deve includere:
  - fonte dati;
  - periodo;
  - record inclusi;
  - eventuali assunzioni;
- distinguere risposte:
  - operative;
  - fiscali;
  - analitiche;
  - ipotetiche.

Output:

- contratto AI dati finanziari;
- prompt/registry allineati alle viste canoniche.

Gate di uscita:

- l'AI non deve inventare il significato di "quanto devo incassare".

### Fase 11 - Benchmark settore e visual polish

Scopo: capire se la UI e' allineata a CRM/ERP/invoicing moderni.

Attivita':

- confrontare pattern con:
  - CRM leggero;
  - ERP personale;
  - invoicing app;
  - dashboard finanziarie;
  - mobile admin tools;
- classificare differenze:
  - allineata;
  - diversa ma giustificata;
  - antiintuitiva;
- solo dopo intervenire su visual design:
  - gerarchia;
  - spaziature;
  - density;
  - icone;
  - stati;
  - microcopy.

Output:

- lista miglioramenti visuali non bloccanti;
- eventuale design system refinement.

Gate di uscita:

- il progetto non sembra un CRM generico adattato male, ma un gestionale
  personale coerente con il lavoro reale.

## Priorita' complessiva

| Priorita' | Area | Perche' |
| --- | --- | --- |
| P0 | RLS backup fiscali | Completato il 2026-06-14; resta solo riconciliazione migration history |
| P0 | Verita' remoto/locale/XML | Senza fonte certa si corregge al buio |
| P1 | Riconciliazione fattura-incasso | Base della fiducia finanziaria |
| P1 | Semantica bollo/importi | Rischio di correzioni sbagliate |
| P1 | Dashboard/mobile financial parity | Numeri finanziari sbagliati sono critici |
| P2 | Arrotondamenti km | Drift piccolo ma fastidioso |
| P2 | Cancellazioni/storico | Rischio alto ma meno urgente se non si cancella |
| P2 | UX task audit | Serve prima del redesign |
| P3 | AI conversazionale interna | Potente solo dopo viste canoniche |
| P3 | Visual polish | Va fatto dopo semantica e flussi |

## Criteri di successo

La rifinitura e' riuscita quando:

- una query anon non legge backup fiscali;
- remoto, seed e XML hanno ruoli espliciti;
- una fattura puo' essere collegata a un incasso in modo deterministico;
- la UI distingue chiaramente lavorato, fatturato e incassato;
- ogni dashboard card critica ha fonte e significato chiari;
- desktop e mobile mostrano gli stessi dati finanziari;
- il bollo non produce falsi allarmi;
- i rimborsi km sono arrotondati uguale ovunque;
- l'AI cita fonti e assunzioni quando parla di soldi;
- nessuna modifica richiede "ricordarsi a mente" come funziona il dominio.

## Non-obiettivi

- Non introdurre partita doppia.
- Non introdurre IVA attiva per il forfettario.
- Non migrare via da Supabase.
- Non sostituire il gestionale con Directus/Odoo/ERPNext.
- Non fare redesign estetico prima dell'audit semantico.
- Non correggere dati storici senza confronto con XML e DB remoto.

## Ordine consigliato per una sessione futura

1. Chiudere RLS backup fiscali.
2. Produrre audit remoto/seed/XML.
3. Decidere modello di riconciliazione.
4. Formalizzare semantica bollo.
5. Auditare dashboard e mobile.
6. Correggere rimborsi km.
7. Proteggere storico/cancellazioni.
8. Allineare AI a viste canoniche.
9. Fare benchmark UX e visual polish.
