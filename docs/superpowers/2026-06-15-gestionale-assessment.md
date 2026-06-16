# Gestionale — Assessment esaustivo prioritizzato

Data: 2026-06-15
Origine: workflow multi-superficie (6 assessor: DB, fiscale, UX, dashboard,
riconciliazione, AI/tech), ognuno con RAG DeepWiki + dati reali di produzione
(Supabase `qvdmzhyzpyaveniirsmo`, read-only) + verifica sul sorgente.
Stato: da usare come backlog prioritizzato. Ogni intervento parte comunque da
spec+piano+review come da `AGENTS.md`. I claim vanno ri-verificati sul sorgente
reale al momento dell'implementazione.

---

Quadro: i dati sono puliti (0 orfani, 0 importi negativi, fiscale 2023/2024
riconciliato al centesimo). Ci sono 3 buchi che toccano i soldi da chiudere per
primi; il resto e' usabilita' o pulizia tecnica.

## TOP 3 QUICK WIN (alto impatto, sforzo S/M)

### QW1 — Far ripartire i promemoria fiscali (oggi morti)
- `fiscal_deadline_check` gira ma risponde 401 e crea 0 promemoria.
- Impatto: il 30/06/2026 sono dovuti 8.224,50 EUR (~15 giorni) e il sistema non
  ha mai avvisato. Sforzo: S. Pattern noto BE-2 (config.toml verify_jwt).

### QW2 — Correggere la card "Da incassare" (sottostima 6.037 EUR)
- Dashboard dice 375 EUR, il non incassato reale e' 6.412 EUR (Gustare 6.037 +
  Comune Aidone 375). La card guarda i pagamenti "previsti" che spesso non
  esistono; va agganciata a `project_financials.balance_due`. Sforzo: M (test).

### QW3 — Scadenzario + cassa 30gg anche su mobile
- Su mobile mancano 2 card gia' presenti su desktop (scadenzario, previsione
  cassa). Dati gia' calcolati, manca il wiring. Sforzo: S/M. Regola UI-7.

## TOP 3 BIG ROCKS (alto impatto, sforzo L/XL)

### BR1 — Schermata "Fatture" (27 fatture ~41.000 EUR invisibili nell'app)
- Esistono in DB ma non c'e' pagina Fatture; l'AI le ignora. Sforzo: L. Fase 4/8.

### BR2 — Collegare incassi e fatture ("pagata? quanto resta?")
- Legame solo testuale; 6/32 incassi puntano a fatture non in DB (FPR 1/23,
  6/23, 1/24, 1/26, 2/26, 3/26). Importare le 6 + FK `payments.financial_document_id`
  + vista saldo per fattura. Sforzo: L (test-first). Fase 4 Opzione A (NON B).

### BR3 — Chiudere il cerchio bozza -> fattura emessa
- Manca "Segna come emessa"; il registro e' fermo da marzo 2026. Sforzo: M/L.

## Tabella completa (30 finding deduplicati, impatto desc / sforzo asc)

| # | Titolo | Severita' | Sforzo | Impatto |
|---|--------|-----------|--------|---------|
| 1 | Promemoria fiscali morti (EF 401, 0 task) | critical | S | Niente avviso su scadenze da 8.224 EUR |
| 2 | Card "Da incassare" sottostima 6.037 EUR | critical | M | Credi 375, sono 6.412 |
| 3 | Imposta sostitutiva deduce INPS stimato non versato | high | M | Imposta dashboard sbagliata (+70% 2024) |
| 4 | Stima INPS troppo bassa vs reale (+31%) | high | M | Accantoni troppo poco (~1.587 EUR buco 2025) |
| 5 | Fatture emesse invisibili + AI le ignora | high | L | Non vedi le 27 fatture |
| 6 | Incasso<->fattura solo testo, 6 ref rotti | high | L | "Pagata?" senza risposta certa |
| 7 | Manca "Segna come emessa": registro congelato | high | M | Sistema resta indietro |
| 8 | Manca "saldo per fattura" (3 tabelle vuote) | high | M/S | Ogni fattura risulta non pagata |
| 9 | Doppia contabilita' divergente per cliente | high | M | Numeri incoerenti (Gustare/LAURUS) |
| 10 | Storico sotto-conta compensi (INNER JOIN) | high | M | 2026 mostra 11.310 invece di 11.595 |
| 11 | Mobile senza scadenzario | high | M | Scaduti/promemoria invisibili da telefono |
| 12 | Mobile senza previsione cassa 30gg | high | S | Niente allerta liquidita' |
| 13 | Logica fiscale duplicata client+EF (drift) | medium | L | Dashboard e promemoria possono divergere |
| 14 | Bollo 2 EUR fuori dal totale su 13 fatture | medium | M | Totali sotto-rappresentati, falsi scarti |
| 15 | Bollo addebitato non risulta incassato | medium | S | Perdi 26 EUR o 26 EUR reddito non contato |
| 16 | "Spese" nel netto: euristica fragile | medium | M | Spesa non rimborsata gonfia il "ti resta" |
| 17 | RLS USING(true) su 6-8 tabelle legacy | medium | S/M | Tabelle morte scrivibili da loggati |
| 18 | fiscal_deadline_check ignora obblighi senza stima | medium | M | Scadenza atipica senza promemoria |
| 19 | Lista clienti senza "chi mi deve soldi?" | medium | S | Apri ogni cliente per i residui |
| 20 | Pagamenti senza stati intermedi | medium | M | Ciclo incasso non tracciabile |
| 21 | 4 funzioni SECURITY DEFINER da anonimi | medium/low | S | Superficie d'attacco inutile |
| 22 | Nota di credito (200 EUR) ignorata | low | M | Sovrastima dovuto/pagato cliente |
| 23 | Pagamento scaduto 2,5 anni invisibile | low | S | Dimentichi un credito di 375 EUR |
| 24 | Stati payment incoerenti | low | S | I badge di stato mentono |
| 25 | service_type senza CHECK | low/medium | S | Import puo' scrivere tipo senza label |
| 26 | 6 FK senza indice | low | S | Debito tecnico, impatto nullo oggi |
| 27 | leaked-password off + bucket attachments aperto | low | S | Password compromesse, file listabili |
| 28 | architecture.md stale (dual-path attivo) | low | S | Doc/AI decidono su modello inesistente |
| 29 | Layer cash_movements vuoto (doppia verita') | low | S | Se ci finisce un dato, numeri cambiano |
| 30 | Match per importo inaffidabile | low | S | Vietato matchare per importo |

## Ordine consigliato

- Ciclo 1 (allarmi rossi, basso sforzo): QW1 (#1), QW2 (#2), QW3 (#11,#12).
- Ciclo 2 (calcolo fiscale, test-first): #3, #4, #18, #13.
- Ciclo 3 (Fatture visibili): BR1 (#5), colonna "Da saldare" lista clienti (#19).
- Ciclo 4 (riconciliazione, test-first): audit RED (#9), import 6 fatture + FK +
  vista saldo (#6,#8), BR3 (#7), stati payment (#24).
- Ciclo 5 (bollo/note credito, dopo confronto XML reali): #14,#15,#22.
- Ciclo 6 (igiene/sicurezza additiva): #17,#21,#27,#10,#16,#26,#28,#29.

## Cosa NON fare (over-engineering per single-user)

- NON adottare il modello doppia partita `cash_movements` + allocazioni
  (Opzione B roadmap): infrastruttura morta (0 righe), sovradimensionata per
  forfettario 1:1. La verita' incassi resta `payments`. Congelarlo o rimuoverlo,
  non popolarlo. (NB: rivedere la scelta utente precedente "Opzione B".)
- NON correggere alla cieca dati storici (bollo/totali/incassi): prima confronto
  con XML reali in `Fatture/`.
- NON aggiungere CHECK rigidi a campi config-driven (`service_type`).
- NON matchare fattura<->incasso per importo: solo numero fattura esatto.
- NON costruire sui moduli inutilizzati; semmai declassarli in navigazione.
- NON spendere tempo sugli indici FK ora (impatto nullo a questo volume).

In una riga: prima fai suonare l'allarme fiscale e raddrizzi i due numeri
sbagliati che vedi ogni giorno (Cicli 1-2), poi rendi visibili e collegate le
fatture (Cicli 3-4); il resto e' pulizia.
