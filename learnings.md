# Learnings — Gestionale Rosario Furnari

Questo file cresce organicamente sessione dopo sessione.
Claude aggiunge qui le scoperte, gli errori corretti, e i pattern emersi.
Quando supera ~30 voci — consolidare (vedi .claude/rules/session-workflow.md).

## Format per ogni voce

- [DATA] **Nome pattern** — Descrizione. Contesto: cosa stava succedendo.

## Learnings

- [2026-03-01] **Se una shell AI unificata ospita piu capability, la chat deve
  essere la vista primaria e le altre funzioni devono stare dietro navigazione
  esplicita** — Nel launcher unificato impilare snapshot CRM, Q&A e import
  fatture nello stesso scroll rende tutto piu pesante da usare. Il pattern
  corretto e' aprire sempre su `Chat AI`, tenere la chat montata per preservare
  stato e spostare le funzioni secondarie dietro un menu/selector di viste.

- [2026-03-01] **Se un suggerimento automatico condivide il campo con un edit
  manuale, dopo il primo tocco l'automatismo deve farsi da parte** — Nel
  percorso `payments/create` non basta evitare l'override di un valore gia
  positivo: anche gli stati intermedi mentre l'utente svuota e ridigita il
  campo fanno parte dell'edit manuale. Il pattern corretto e' bloccare il
  ricalcolo automatico appena il campo diventa `dirty` e lasciare il
  suggerimento solo come CTA esplicita.

- [2026-03-01] **Quando il contesto di un draft AI decade, la UI deve
  esplicitarlo e non solo cambiare comportamento sotto il cofano** — Nel
  percorso `launcher -> payments/create` non basta smettere di applicare la
  bozza quando cambia `quote_id`: serve anche un messaggio che dica che la
  bozza iniziale apparteneva a un altro preventivo e che da quel punto vale
  solo la semantica locale del form.

- [2026-03-01] **Se il form finale cambia record chiave, il draft importato dal
  launcher smette di essere semanticamente valido** — Nel caso `payments/create`
  il draft amount portato dalla chat ha senso solo sullo stesso `quote_id` che
  l'ha generato. Se l'utente cambia preventivo sulla superficie finale, quel
  valore non va piu preservato come se fosse ancora il draft attivo: bisogna
  tornare subito al comportamento locale del nuovo record.

- [2026-03-01] **Se un write-draft attraversa launcher e form finale, la
  superficie di arrivo deve preservare gli edit espliciti fatti dall'utente nel
  launcher** — Nel caso della bozza pagamento non basta portare `amount` nei
  search params: se il form finale ha anche un suggerimento locale
  deterministico, quel suggerimento non puo sovrascrivere al primo render un
  valore che l'utente ha gia corretto nella chat. Il pattern corretto e'
  mostrare entrambi i livelli e lasciare l'override solo a una scelta
  esplicita dell'utente.

- [2026-03-01] **Se il launcher apre il primo write-draft generale, il draft va
  restituito come payload strutturato separato dal markdown** — Per la prima
  bozza pagamento della chat unificata il pattern corretto non e' chiedere al
  modello di serializzare JSON o campi nel testo libero, ma far produrre alla
  function un `paymentDraft` tipizzato che la UI puo rendere, modificare e
  trasportare verso `payments/create`. Cosi' il testo resta leggibile, il draft
  resta auditabile e non si apre per sbaglio una write autonoma dal launcher.

- [2026-03-01] **Se una superficie commerciale di arrivo ha gia i dati giusti,
  il suggerimento importo va calcolato li e non passato dall'AI** — Sul ramo
  `quote_create_payment` il pattern corretto non e' mettere l'importo stimato
  dentro l'handoff AI, ma far leggere al form il preventivo collegato e i
  pagamenti gia linkati per derivare il residuo ancora non collegato. Cosi'
  il suggerimento resta auditabile, modificabile e coerente con lo stato reale
  al momento dell'apertura del form.

- [2026-03-01] **Se un handoff AI atterra su una superficie CRM gia approvata,
  conviene portare solo search params che quella superficie supporta gia** —
  Il pattern corretto non e' inventare un nuovo payload di navigazione, ma
  riusare i parametri che la UI sa gia consumare davvero, per esempio
  `quote_id/client_id/project_id/payment_type` su `payments/create` o
  `open_dialog=quick_payment` su `ProjectShow`. Cosi' l'atterraggio migliora
  senza introdurre nuove scritture o stati fantasma.

- [2026-03-01] **Se il launcher propone piu handoff commerciali, la
  recommendation primaria deve essere unica e costruita dal sistema** — Non
  basta ordinare le `suggestedActions`: quando l'intent della domanda e la
  snapshot puntano chiaramente a un'azione approvata, conviene marcare una
  sola azione come `recommended` e spiegare il motivo con
  `recommendationReason`. La scelta deve nascere da intent + stato record +
  entry point approvati, non dal testo libero del modello.

- [2026-03-01] **Quando il launcher passa dal semplice salto di route al
  handoff commerciale, conviene preferire entry point approvati e
  deterministicamente costruiti** — Se la domanda utente è già orientata a un
  incasso o a un seguito commerciale, il pattern corretto non è aggiungere una
  route generica in più ma usare l'entry point giusto già approvato, per
  esempio `payments/create?...` precompilato dal `quoteId/clientId/projectId`
  o il `project show` che ospita il quick payment. Così il launcher resta
  utile, auditabile e senza inventare workflow nuovi.

- [2026-03-01] **Se un test reale su fatture storiche trova un cliente che non
  esiste nel CRM, non conviene improvvisare subito la creazione cliente dentro
  l'import** — Prima serve chiudere il percorso prioritario della chat
  unificata e, quando tocchera' quel pezzo, definire esplicitamente i campi
  anagrafici di fatturazione che oggi mancano. Solo dopo ha senso aggiungere
  creazione cliente assistita e sempre con conferma esplicita.

- [2026-03-01] **Se una risposta AI deve portare l'utente a una route reale del
  CRM, i link non vanno lasciati inventare al modello** — Nel launcher
  unificato il pattern corretto e' fare rispondere il modello solo sui dati e
  costruire poi gli handoff in modo deterministico con:
  1) `routePrefix`
  2) record id presenti nello snapshot
  3) superfici gia approvate nel CRM
  Cosi' eviti URL hallucinated e tieni allineati answer flow, capability
  registry e navigazione reale.

- [2026-03-01] **Se il launcher mostra gia una snapshot condivisa, il primo
  answer flow deve usare proprio quella snapshot e non ricostruirne un'altra
  lato function** — Nel launcher unificato il pattern corretto e' passare la
  stessa `getUnifiedCrmReadContext()` gia visibile in UI dentro
  `askUnifiedCrmQuestion(question, context)`. Cosi' l'utente legge e l'AI
  risponde sullo stesso identico perimetro, senza drift tra risposta e
  schermata.

- [2026-03-01] **Prima di dare write power generale alla chat, la policy va
  resa esplicita in docs, registry e prompt** — Dire solo "poi arriveremo alle
  scritture" non basta. Serve scrivere chiaramente che:
  1) il CRM chat generale e' `read-only` adesso
  2) l'unico write AI gia spedito resta quello fatture con conferma
  3) le future scritture generali potranno essere solo assistite e confermate
  4) la scrittura autonoma libera non e' approvata
  Altrimenti il perimetro si sfalda gia al milestone successivo.

- [2026-02-28] **Se il launcher unificato deve iniziare a leggere tutto il CRM,
  il passo corretto non e' una domanda AI in piu ma un provider entry point
  read-only condiviso** — Prima di far rispondere l’AI su clienti, preventivi,
  progetti, pagamenti e spese, conviene costruire una sola snapshot coerente
  (`getUnifiedCrmReadContext`) che includa anche semantic registry e
  capability registry. Cosi' UI attuale e answer flow futuro leggono lo stesso
  perimetro e non ricostruiscono contesti diversi dentro i componenti.

- [2026-02-28] **Se la chat AI propone record con cliente e progetto
  correggibili, la coerenza tra i due va protetta nel draft prima della
  conferma** — Nel launcher fatture non basta filtrare i progetti nel select:
  bisogna anche bloccare i mismatch `clientId/projectId`, azzerare il progetto
  quando il cliente cambia e riallineare il cliente quando l’utente sceglie un
  progetto specifico. Altrimenti la bozza sembra valida ma può scrivere link
  incoerenti nel CRM.

- [2026-02-28] **Quando aggiungi un nuovo campo nested dentro `aiConfig`,
  serve un merge esplicito dei default o i config persistiti vecchi lo
  perdono** — La merge superficiale `...defaultConfiguration, ...config` non
  basta: se nel DB esiste un `aiConfig` vecchio con solo
  `historicalAnalysisModel`, l'oggetto intero sostituisce i default e il nuovo
  campo scompare. Il pattern corretto e':
  1) aggiungere il nuovo default
  2) fare merge nested di `aiConfig`
  3) testare la retrocompatibilita' con config gia salvati.

- [2026-02-28] **Se l'obiettivo prodotto e' una chat AI unificata, il primo
  ponte corretto non e' una nuova route ma un launcher globale nel layout
  condiviso** — Per evitare di moltiplicare pagine AI temporanee, la shell
  iniziale va resa disponibile da tutto il sito con un bottone flottante e un
  contenitore unico (`Sheet`). Cosi' il prossimo use case reale entra gia nella
  superficie giusta invece di dover migrare in seguito da una route dedicata.

- [2026-02-28] **Quando una nuova Edge Function UI-invoked sembra deployata ma
  risponde ancora “SMTP non configurato”, prima di dubitare del codice conviene
  verificare subito i secret remoti con `supabase secrets list` e poi rifare
  l’invoke autenticato** — Sul send Gmail il primo `invoke` remoto falliva con
  `SMTP Gmail non configurato nelle Edge Functions` anche dopo un primo
  `secrets set`. La chiusura corretta e' stata:
  1) riallineare `SMTP_*`
  2) verificare che i digest compaiano davvero nel progetto remoto
  3) rifare l’invoke autenticato
  4) considerare il trasporto validato solo quando arriva `accepted` con
     risposta SMTP reale (`250 OK`).

- [2026-02-28] **Per una mail cliente su stato preventivo, il “residuo” va
  calcolato solo sui pagamenti collegati gia `ricevuto`, non su quelli solo
  registrati** — Nel dettaglio preventivo esiste anche il riepilogo interno dei
  pagamenti aperti, ma quello serve a capire cosa è gia collegato nel CRM.
  Nel testo verso il cliente, invece, `amountDue` deve significare ancora da
  incassare davvero. Quindi la formula corretta è:
  `quote.amount - somma pagamenti collegati con status = ricevuto`.

- [2026-02-28] **Quando una comunicazione cliente dipende da più moduli, il
  page component non deve ricostruire da solo il contesto** — Per le mail stato
  preventivo servono quote, client, project, payments, services e config.
  Il punto giusto è un provider entry point condiviso
  (`getQuoteStatusEmailContext`) che assembla il contesto una volta sola, così
  UI attuale e AI futura non duplicano filtri e formule.

- [2026-02-28] **Se una feature deve vivere bene nella futura chat AI
  unificata, la chiusura corretta non è solo codice + test: serve anche una
  checklist di integrazione scritta nei documenti di continuità** — Ogni nuova
  capacità importante va legata nello stesso passaggio a:
  1) semantic registry
  2) capability registry
  3) communication layer se manda messaggi
  4) provider entry point se deve essere leggibile/usabile dall'AI
  5) docs di handoff/progress/backlog/learnings.
  Altrimenti la prossima chat o il prossimo sviluppo rompono il filo.

- [2026-02-28] **Quando sai già qual è il prossimo Pareto step, scrivilo nei
  file di continuità prima di cambiare chat** — Lasciare solo una lista di cose
  fatte non basta. Serve dichiarare anche:
  1) obiettivo finale
  2) vincoli non negoziabili
  3) primo prossimo passo ad alto valore.
  In questo stato del repo il prossimo step giusto è il send manuale via
  `Gmail` delle mail cliente sui cambi stato preventivo, non nuove superfici AI
  sparse.

- [2026-02-28] **Se il CRM deve diventare AI-driven, i significati di tipi,
  stati, categorie, date e formule non devono vivere sparsi nei form** —
  La mossa giusta è creare un registry semantico condiviso con:
  1) dizionari leggibili
  2) descrizioni d'uso
  3) regole di calcolo riusabili
  4) un entry point unico dal data provider.
  Così UI, fiscale e AI leggono la stessa definizione.

- [2026-02-28] **Se in futuro la chat AI dovrà usare tutto il sito, non basta
  sapere i campi: deve esistere anche un catalogo esplicito di pagine, modali,
  azioni e route** — Il layer giusto non è un prompt lungo ma un capability
  registry versionato nel repo. Ogni feature nuova va aggiunta lì, altrimenti
  la chat unificata non saprà davvero cosa può fare.

- [2026-02-28] **Le mail cliente sui cambi stato non vanno scritte dentro le
  pagine o nei click handler** — Serve un layer di template condivisi con:
  1) policy di invio per stato
  2) blocchi comuni
  3) parti dinamiche
  4) controllo dei dati mancanti prima dell'invio.
  Solo dopo ha senso agganciare il provider reale, in questo caso `Gmail`.

- [2026-02-28] **Quando un ramo comunicativo è fuori direzione prodotto, va
  rimosso dal repo fino in fondo** — Se `Postmark` non è più il canale scelto,
  non basta smettere di usarlo: bisogna togliere function, config Supabase, env
  e UI relative, altrimenti l’AI futura continuerà a considerarlo una capacità
  valida del sistema.

- [2026-02-28] **Separare sempre canali cliente e canali interni** — In questo
  progetto:
  1) `Gmail` = mail cliente outbound
  2) `CallMeBot` = notifiche interne ad alta priorità
  Mischiare i due canali crea automazioni sbagliate e semantica debole.

- [2026-02-28] **`is_taxable = false` non è solo una regola fiscale: è anche
  una guardia sugli automatismi comunicativi** — Se un flusso coinvolge servizi
  non tassabili, nessuna mail automatica deve partire. Il blocco va messo nel
  layer template/capability, non ricordato a mano quando si implementa il send.

- [2026-02-28] **Il flag `is_taxable` sui servizi deve cambiare solo la base
  fiscale, non i KPI operativi** — Il valore del lavoro resta
  `fee_shooting + fee_editing + fee_other - discount`; il flag tassabile decide
  solo se quel valore entra in `fatturatoLordoYtd` e nel resto del modello
  fiscale. Se lo usi anche per i KPI business, falsi margini e concentrazione
  clienti.

- [2026-02-28] **Se l'obiettivo finale è unificare l'AI, le card AI sparse
  nelle pagine vanno trattate come superfici transitorie** — Quando una feature
  AI è utile oggi ma l'obiettivo di prodotto è una UX unica, la scelta giusta
  è:
  1) consolidare prima semantic layer e casi d'uso validi
  2) evitare di aggiungere nuove entry point AI senza forte motivo
  3) progettare i consumer attuali come ponti verso l'unificazione, non come
     architettura finale

- [2026-02-28] **Se una fase comincia a sembrare infinita, va scritta una
  stop line esplicita nei documenti di continuità** — Non basta dire
  "facciamo slice piccoli": senza un punto di arrivo si continua ad aprire
  lavoro nuovo per inerzia. Pattern corretto:
  1) dichiarare cosa è già abbastanza
  2) dichiarare cosa manca davvero
  3) dichiarare che tutto il resto è `v2`, non continuazione obbligatoria

- [2026-02-28] **Gli smoke autenticati del progetto remoto vanno fatti con uno
  script dedicato, non ricostruendo ogni volta il flusso a mano** — La
  procedura stabile ora è:
  1) `node scripts/auth-smoke-user.mjs create`
  2) usare le credenziali restituite nello smoke browser o REST
  3) `node scripts/auth-smoke-user.mjs cleanup --user-id <id>`
  Lo script risolve da solo la `service_role` via Supabase CLI, crea un utente
  confermato, aspetta la riga `sales`, verifica il login password e fa cleanup
  nell'ordine corretto `sales -> auth.users`.

- [2026-02-28] **Negli smoke browser locali di questo CRM bisogna usare sempre
  le route con `#`** — Questa app gira in hash routing sul runtime locale.
  Quindi dopo il login i percorsi da aprire nei click-test devono essere in
  forma `http://127.0.0.1:4173/#/...`, non `http://127.0.0.1:4173/...`.
  Esempio corretto:
  `http://127.0.0.1:4173/#/quotes/<id>/show`.
  Esempio sbagliato:
  `http://127.0.0.1:4173/quotes/<id>/show`.

- [2026-02-28] **Negli smoke browser locali conviene lasciare stabilizzare la
  dashboard subito dopo il login prima di saltare a una route profonda** —
  Se si naviga troppo presto, alcune richieste Supabase (`/auth/v1/user` o
  asset storage) possono risultare `ERR_ABORTED` e sporcare la console senza
  essere un bug reale della feature testata. Pattern pratico:
  1) login
  2) attendere l'atterraggio su `#/`
  3) aspettare ancora pochi secondi
  4) solo dopo aprire `/#/...`

- [2026-02-28] **Per chiudere il caso semplice `cliente -> pagamento`, la
  mossa giusta è spesso riusare il form esistente con query param, non creare
  un altro dialog** — Quando il dato minimo davvero necessario è solo
  `client_id`, il quick path migliore è un bottone che porta a
  `/payments/create?client_id=...`. Così il caso wedding o cliente semplice
  diventa veloce senza duplicare validazioni, campi o logica del modulo
  pagamenti.

- [2026-02-28] **Prima di inventare un nuovo flow commerciale, conviene spesso
  rendere leggibile sul record sorgente il legame che esiste gia** — Nel
  backbone `quote -> payment`, il prossimo passo giusto non era creare subito
  automazioni o moduli nuovi, ma far vedere nel preventivo cosa è gia
  collegato: ricevuto, aperto, differenza residua e lista pagamenti. Questo
  migliora il controllo reale senza forzare un processo più pesante.

- [2026-02-28] **Quando apri una seconda base semantica nel dashboard, il
  primo consumer non-AI deve riusare lo stesso context builder dell'AI e
  vivere in una card separata** — Sullo storico `incassi`, la mossa giusta non
  era toccare KPI o grafici basati su `compensi`, ma aggiungere una card
  dedicata alimentata da `getHistoricalCashInflowContext()`. Così resta una
  sola fonte di verità e si evitano widget ibridi con etichette ambigue tipo
  `fatturato`.

- [2026-02-28] **Quando aggiungi una nuova Edge Function usata dal frontend,
  non basta deployare il file: va aggiunta anche in `supabase/config.toml` se
  il progetto usa `verify_jwt = false` sulle function UI-invoked** — Il primo
  deploy di `historical_cash_inflow_summary` e `historical_cash_inflow_answer`
  rispondeva nel browser con `401 Invalid JWT` prima ancora di entrare nel
  codice applicativo. La causa era semplice: le nuove function non avevano la
  loro entry in `supabase/config.toml`, mentre quelle già attive sì. Pattern:
  1) aggiungere `[functions.<slug>]`
  2) impostare `verify_jwt = false` se il resto delle function UI usa già quel
     modello
  3) redeployare

- [2026-02-28] **Per una view storica con `generate_series` e limiti derivati
  dai dati, separare prima i bounds in un CTE dedicato** — La prima versione di
  `analytics_yearly_cash_inflow` usava `generate_series(min(payment_rows.year),
  clock.current_year, 1)` nello stesso CTE dell'aggregazione e il push remoto
  falliva con errore SQL su `GROUP BY`. Il pattern sicuro è:
  1) calcolare `min(...)` in `bounds`
  2) fare `generate_series(bounds.first_year..., clock.current_year, 1)` nel
     CTE successivo

- [2026-02-28] **Per provare che una nuova view Supabase serva davvero il
  frontend, la verifica importante non è solo `service_role` ma anche una
  lettura con utente autenticato** — Con `service_role` si conferma che schema e
  dati esistono, ma il provider client userà publishable key + sessione utente.
  Sul layer storico `incassi`, la chiusura corretta è stata:
  1) query REST con `service_role`
  2) creazione utente temporaneo
  3) login password grant
  4) query REST alla stessa view con token utente

- [2026-02-28] **Su questa macchina, per i click-test browser del CRM conviene
  usare Playwright via `npx` con il Chrome già installato** — Il pilotaggio
  CDP raw era abbastanza forte per leggere il DOM, ma fragile sulle interazioni
  più ricche nella parte bassa della pagina. Lo smoke di `Annuale` è diventato
  stabile appena il browser test è passato a Playwright contro il Chrome locale
  già presente.

- [2026-02-28] **Quando aggiungi un payload semantico nuovo per l'AI ma non
  cambi la UI, uno smoke remoto autenticato può chiudere il dubbio più in
  fretta di un browser test completo** — Per il drill-down Annuale su
  `pagamenti da ricevere` / `preventivi aperti`, la parte critica non era la
  card ma capire se la function AI usasse davvero il nuovo contesto. Un
  one-off script con utente temporaneo, context reale e invoke della function
  ha confermato subito il comportamento senza introdurre tooling nuovo.

- [2026-02-28] **Se vuoi che l'AI parli bene di pagamenti e preventivi, non
  bastano i totali: serve un drill-down semantico nel context layer** — In
  `Annuale`, i KPI `pagamenti da ricevere` e `preventivi aperti` erano corretti
  ma troppo poveri per risposte davvero utili. Il punto giusto dove aggiungere
  dettaglio non è la card UI e nemmeno la Edge Function, ma il model/context
  condiviso (`annual_operations`), così il browser, l'AI e i test leggono la
  stessa struttura.

- [2026-02-28] **Per dare struttura ai preventivi senza aprire subito un
  builder pesante, `quote_items` embedded in `quotes` sono una foundation
  abbastanza forte** — In questo repo il compromesso migliore non era creare un
  nuovo modulo CRUD o riscrivere tutto il flusso PDF, ma aggiungere voci
  opzionali direttamente al preventivo e fare derivare da lì l'importo totale.
  Così il percorso semplice resta leggero, mentre i casi che servono all'AI o
  al commerciale ottengono dati più strutturati senza burocrazia finta.

- [2026-02-28] **Sui resource Supabase reali il fallback generico `q` non è una
  strategia affidabile per gli autocomplete business-critical** — Nel form
  preventivi il lookup clienti falliva nel browser reale con
  `column clients.q does not exist`. Quando il lookup deve trovare davvero
  record per nome o descrizione, conviene dichiarare sempre il filtro esplicito
  giusto (`name@ilike`, `description@ilike`) invece di sperare che ogni
  resource supporti `q`.

- [2026-02-28] **In un backbone commerciale che vuole diventare `AI-driving`,
  `preventivo` e `progetto` devono restare acceleratori opzionali, non passaggi
  obbligatori** — Nel caso `wedding`, il flusso giusto non è forzare sempre
  `preventivo -> progetto -> pagamento`, ma permettere anche un percorso più
  leggero come `preventivo -> pagamento` o persino `cliente -> pagamento`.
  Il CRM deve strutturare quando serve, non inventare burocrazia che poi
  produce dati fragili o finti.

- [2026-02-28] **Negli smoke remoti con utenti temporanei creati via admin API,
  la cleanup va fatta `sales` -> `auth.users`** — Sul progetto remoto, la
  cancellazione diretta dell'utente auth fallisce con vincolo
  `sales_user_id_fkey` se esiste ancora la riga dipendente in `sales`. Per
  evitare utenti sporchi nei test browser autenticati, eliminare prima il
  record `sales` e solo dopo l'utente in `auth.users`.

- [2026-02-28] **Con `useCreate(..., { returnPromise: true })` non assumere
  sempre la shape `{ data }` nel runtime reale** — Nel dialog
  `CreateProjectFromQuoteDialog` il progetto veniva creato davvero, ma il link
  al preventivo falliva perché il codice leggeva `createdProject.data.id`.
  Nello smoke browser reale la mutation risolveva invece il record diretto.
  Quando un flusso dipende dall'id appena creato, normalizzare esplicitamente
  il risultato prima di usarlo.

- [2026-02-28] **Nei `ReferenceInput` Supabase con lookup critico usare un
  `filterToQuery` esplicito, non il fallback generico `q`** — Nel form
  pagamenti, il preventivo appena creato non risultava trovabile in modo
  affidabile cercando per descrizione finché l'autocomplete usava il filtro
  di default. Per lookup business-critical conviene dichiarare il campo vero,
  per esempio `description@ilike`, invece di sperare che il resource supporti
  bene `q`.

- [2026-02-28] **Prima di rendere un CRM `AI-driving`, chiudi la spina dorsale
  commerciale minima con link espliciti tra moduli** — In questo repo, il primo
  salto di qualità non è stato "più AI", ma introdurre un collegamento nativo
  `quote.project_id` e usare `payment.quote_id` davvero nel form/UI. Senza
  queste relazioni, l'AI può solo parlare di moduli isolati.

- [2026-02-28] **Nel form pagamenti il preventivo selezionato deve diventare la
  fonte di verità per cliente e progetto, ma con pulizia dei link incoerenti se
  il cliente cambia dopo** — Il compromesso giusto per ridurre click senza
  accumulare stati impossibili è:
- seleziono il preventivo -> precompilo cliente/progetto
- cambio cliente in modo incompatibile -> pulisco `quote_id` / `project_id`

- [2026-02-28] **Per un prodotto che vuole diventare `AI-driving`, il prompt
  tuning ha valore solo come hardening minimo anti-bufala** — Dopo i primi casi
  reali su `Annuale`, migliorare il prompt aiutava ma non cambiava la natura del
  sistema. La parte durevole resta: contesto semantico corretto, tool contract,
  drill-down affidabili. Il prompting va usato per bloccare le derive evidenti,
  non come leva principale di prodotto.

- [2026-02-28] **Per domande libere ambigue conviene introdurre una
  reinterpretazione server-side prima del modello** — Nel Q&A annuale, frasi
  come `Qual è il punto più debole da controllare?` spingevano il modello verso
  diagnosi troppo assertive. Una riformulazione interna guidata dal contesto
  (`segnale più fragile visibile nei dati`, `non trattare gli zeri come
  problemi automatici`) ha corretto il comportamento meglio di un semplice
  ritocco del prompt generale.

- [2026-02-28] **Se una funzione appena deployata non viene trovata, verificare
  subito `supabase functions list` invece di fidarsi del solo messaggio finale
  del deploy** — Nel rollout di `annual_operations_summary`, il CLI ha stampato
  un esito apparentemente positivo ma la funzione non risultava davvero tra le
  function attive del progetto. Il controllo con `functions list` ha evitato di
  inseguire falsi bug nel codice applicativo.

- [2026-02-28] **Per i campi `asOfDate` business-critical non usare
  `toISOString().slice(0, 10)` se la semantica è locale** — Nel model
  annuale, con timer fissato al `2026-02-28` in Europa/Roma, `toISOString()`
  riportava `2026-02-27` in test a causa della conversione UTC. Per date di
  business che devono rappresentare il giorno locale, serve un helper
  `YYYY-MM-DD` costruito con `getFullYear/getMonth/getDate`.

- [2026-02-28] **Una dashboard annuale non è automaticamente AI-ready solo
  perché “sembra ordinata”** — In `Annuale` convivevano nello stesso schermo:
  valore del lavoro, incassi attesi, pipeline e simulazione fiscale. Prima di
  esporre l'AI bisogna separare i blocchi semantici e normalizzare la base dei
  ricavi; altrimenti il modello tende a fondere numeri veri ma di natura
  diversa in una spiegazione sbagliata.

- [2026-02-28] **Per una vista mista, il primo consumer AI va limitato al
  sottoinsieme semanticamente piu pulito** — In `Annuale` la scelta corretta
  non e stata “spiega tutta la pagina”, ma costruire un contesto
  `annual_operations` che includesse solo lavoro dell'anno, categorie, clienti,
  pagamenti da ricevere e preventivi aperti, lasciando fuori alert giornalieri
  e simulazione fiscale.

- [2026-02-28] **Quando estendi un flow AI già stabile, aggiungi una Edge
  Function separata invece di mutare quella esistente** — Per introdurre le
  domande libere sullo storico senza rischiare regressioni sul riepilogo già
  validato, la scelta più sicura è stata creare `historical_analytics_answer`
  separata da `historical_analytics_summary`. Questo mantiene rollback e smoke
  test molto più chiari.

- [2026-02-28] **Le assertion sui `useMutation` di React Query vanno spesso
  fatte con `waitFor`, non in modo sincrono dopo il click** — Nel test della
  card AI le chiamate a `generateHistoricalAnalyticsSummary()` e
  `askHistoricalAnalyticsQuestion()` risultavano a `0` subito dopo
  `fireEvent.click`, anche se il componente funzionava. Qui il fix corretto non
  era cambiare il codice applicativo, ma aspettare il scheduling async della
  mutation con `await waitFor(...)`.

- [2026-02-28] **Dashboard corretto ma incomprensibile = feature fallita** —
  Anche con semantica giusta, view corrette e AI funzionante, il valore per il
  titolare resta quasi nullo se la UI parla come un analyst. In questo
  progetto, termini come `YTD`, `YoY` e `competenza` vanno tradotti in lingua
  operativa direttamente nell'interfaccia e nel prompt AI. La "traduzione per
  non esperti" va trattata come requisito di prodotto, non come semplice copy.

- [2026-02-28] **Per i test UI in questo repo conviene dichiarare
  `@vitest-environment jsdom` direttamente nei file quando la config globale non
  viene applicata come atteso** — Dopo aver aggiunto `jsdom` e
  `@testing-library/react`, Vitest continuava a eseguire i nuovi test in
  ambiente Node (`document is not defined`). La soluzione più affidabile qui è
  stata annotare i file UI con `// @vitest-environment jsdom` e importare
  `src/setupTests.js` esplicitamente.

- [2026-02-28] **Il markdown dentro card Tailwind ha bisogno di classi
  esplicite per mostrare davvero le liste** — Nel riepilogo AI le sezioni erano
  semanticamente corrette, ma i bullet risultavano poco leggibili. Con il reset
  base di Tailwind conviene aggiungere classi come `list-disc`, `list-decimal`
  e spacing su `p/ul/ol` direttamente nel contenitore markdown, altrimenti le
  liste sembrano testo piatto anche quando il modello produce markdown giusto.

- [2026-02-28] **Se una Edge Function dice che una key non e configurata,
  verificare i secret remoti reali con `supabase secrets list`, non i `.env`
  locali** — Nel flusso AI storico i file `.env` del repo contenevano
  `OPENAI_API_KEY`, ma il progetto remoto `qvdmzhyzpyaveniirsmo` non aveva quel
  secret caricato. L'errore `OPENAI_API_KEY non configurata nelle Edge
  Functions` era quindi corretto. Prima di supporre un bug nel codice, usare
  `npx supabase secrets list --project-ref <ref>` e riallineare esplicitamente
  i secret mancanti.

- [2026-02-28] **Per smoke test Auth admin remoti conviene usare la chiave
  legacy `service_role`, non la nuova `secret` key** — Sul progetto storico la
  nuova key `sb_secret_...` non ha funzionato bene con
  `supabase-js auth.admin.createUser()`, che riceveva HTML invece di JSON. La
  chiave legacy `service_role` recuperata via
  `npx supabase projects api-keys --project-ref <ref>` ha invece permesso di
  creare l'utente temporaneo e chiudere lo smoke test autenticato.

- [2026-02-28] **Le view `security_invoker` su tabelle con RLS possono
  sembrare vuote con chiave anon anche quando i dati esistono** — Nella verifica
  remota dello storico, le query PostgREST con publishable/anon key tornavano
  array vuoti su `analytics_*`, mentre la stessa lettura con `service_role`
  mostrava dati reali. Se una view usa `security_invoker=on`, un risultato vuoto
  con ruolo anonimo puo essere solo l'effetto normale delle policy RLS sulle
  tabelle base, non un segnale che la migration non sia applicata.

- [2026-02-28] **`supabase db dump` può non essere utile per verifiche remote
  veloci su questa macchina perché passa da Docker** — Nel push del layer
  storico `incassi`, `supabase db push` ha funzionato, ma `supabase db dump`
  si è fermato subito con errore sul Docker daemon locale. Per view singole da
  verificare al volo, qui conviene restare su REST API e auth temporanea.

- [2026-02-28] **Per validare rapidamente Supabase remoto senza psql, usare
  `supabase projects api-keys` e poi interrogare PostgREST** — Quando il pooler
  Postgres va in circuit breaker o rifiuta il temp role CLI, il modo piu
  affidabile per confermare la presenza di dati e view resta:
  1) `npx supabase projects api-keys --project-ref <ref>`
  2) query REST dirette alle risorse da verificare
  Questo permette di distinguere tra problema di connessione DB e problema reale
  di schema/dati.

- [2026-02-28] **Il primo consumer AI conviene esporlo come metodo custom del
  `dataProvider`** — In questo progetto il punto di aggancio meno invasivo e piu
  riusabile e `dataProvider.getHistoricalAnalyticsContext()`: riusa auth/query
  gia esistenti, non costringe a introdurre subito una edge function, e separa
  l'assistente dalle tabelle raw.

- [2026-02-28] **La chiave OpenAI va usata da Edge Function, non dal client
  Vite** — Anche se `OPENAI_API_KEY` esiste nei file `.env` del repo, il punto
  corretto per il consumo runtime e una Edge Function con secret remoto
  (`OPENAI_API_KEY`) e invocazione autenticata da Supabase. La UI deve invocare
  la function, non parlare direttamente con OpenAI.

- [2026-02-28] **Per i modelli AI in UI conviene usare un dropdown
  whitelisted, non un campo libero** — Salvare in configurazione un valore
  scelto da lista (`gpt-5.2`, `gpt-5-mini`, `gpt-5-nano`) riduce errori di
  battitura, evita modelli non supportati e rende piu semplice validare lato
  server.

- [2026-02-28] **Per continuità tra chat servono tre file, non solo il
  resoconto finale** — Il pattern che funziona meglio è separare:
  1) specifica tecnica stabile (`doc/.../historical-analytics-ai-ready.mdx`),
  2) handoff operativo (`docs/historical-analytics-handoff.md`),
  3) backlog prioritizzato (`docs/historical-analytics-backlog.md`).
  In una nuova chat bisogna far leggere al modello questi file all'inizio,
  altrimenti si perde il contesto semantico e si rischia di riproporre scelte
  già fissate.

- [2026-02-28] **Quando la demo non e nel perimetro, meglio dichiararlo nei
  docs di continuita invece di lasciare backlog fittizi** — Se il prodotto non
  richiede parita FakeRest/demo, conviene de-prioritizzare esplicitamente quel
  lavoro nei file di handoff/backlog. Altrimenti le sessioni successive tendono
  a tornare su un ramo che il prodotto non considera importante.

- [2026-02-28] **Per riprendere una sessione nuova serve un prompt di resume
  esplicito** — Non basta dire "continua". Conviene indicare:
  obiettivo attuale, file da leggere, stato già raggiunto, e prossimo passo
  desiderato. Esempio robusto:
  `Leggi docs/historical-analytics-handoff.md, docs/historical-analytics-backlog.md e doc/src/content/docs/developers/historical-analytics-ai-ready.mdx. Poi continua dal primo punto aperto del backlog senza ridefinire l'architettura.`

- [2026-02-28] **`supabase db push --dry-run` può dare segnale utile anche
  quando `migration list --linked` fallisce** — Nel remoto collegato
  `qvdmzhyzpyaveniirsmo`, `migration list --linked` ha fallito per auth del
  temp role, ma `npx supabase db push --dry-run` ha comunque mostrato con
  precisione quale migration era pendente. Per capire il delta da pushare,
  il dry-run è spesso più utile del list command.

- [2026-02-28] **Dopo troppi errori auth il pooler Supabase può aprire un
  circuit breaker sul temp role CLI** — Dopo alcuni tentativi falliti di
  login del ruolo temporaneo, il CLI può rispondere con
  `Circuit breaker open: Too many authentication errors`. Se il push reale è
  già andato a buon fine, non insistere con ulteriori comandi diagnostici sul
  temp role: aggiornare i file di handoff e passare alla verifica runtime.

- [2026-02-28] **Per analytics e AI, prima si bloccano le regole in codice e
  test, poi si fa UI e solo dopo AI** — La sequenza giusta emersa è:
  SQL aggregate views -> model storico con regole YTD/YoY -> test unitari ->
  shell dashboard -> context builder AI-ready. Saltare direttamente alla UI o
  all'AI senza il layer semantico porta quasi sempre a metriche ambigue.

- [2026-02-28] **`FormLabel` + `FormControl` funzionano solo se `id` arriva
  all'elemento interattivo reale** — Nei controlli composti con `Popover`,
  `Select` o `combobox`, mettere `FormControl` attorno a un wrapper non basta.
  Se `id` e `name` non arrivano al `button`/`input` effettivo, Chrome segnala
  `Incorrect use of <label for=FORM_ELEMENT>` e il campo perde parte del
  comportamento atteso per autofill/accessibilita.

- [2026-02-28] **`AutocompleteInput` richiede `id/name` sul trigger del
  popover** — Il componente usa un `Button` con `role="combobox"` come campo
  reale. Se il trigger non riceve `id={id}` e `name={field.name}`, la label del
  `ReferenceInput` non si collega al campo anche se il `FormField` ha un id
  valido. Lo stesso principio vale per `AutocompleteArrayInput` e per qualsiasi
  input custom basato su `Command`/`Popover`.

- [2026-02-28] **Recharts puo emettere warning di mount con
  `ResponsiveContainer height="100%"` dentro wrapper ad altezza fissa** — Se il
  grafico parte prima che il contenitore sia misurato correttamente, Recharts
  logga `width(-1) and height(-1) of chart should be greater than 0` anche se il
  grafico poi si vede. Per card con altezza nota, passare un'altezza numerica
  diretta a `ResponsiveContainer` (`height={320}`) e piu stabile del pattern
  `div.h-[320px] > ResponsiveContainer height="100%"`.

- [2026-02-28] **`useGetOne` di ra-core usa `options` come terzo argomento** — In
  `ra-core@5.14.2` la firma corretta è `useGetOne(resource, params, options)`.
  Mettere `enabled` dentro `params` non disabilita la query: il fetch parte lo
  stesso con `id` vuoto e Supabase può rispondere `406 Not Acceptable` con
  "Cannot coerce the result to a single JSON object". Pattern corretto per FK
  opzionali: `useGetOne("projects", { id: record?.project_id }, { enabled: !!record?.project_id })`.

- [2026-02-28] **Supabase `406` su `getOne` spesso indica `id` nullo o vuoto** —
  Quando `ra-supabase` chiama `getOne()` senza un id valido, PostgREST genera
  richieste tipo `/projects?` e risponde `406`. Se l'errore appare in liste o
  show con relazioni opzionali, controllare subito i `useGetOne` sulle FK.

- [2026-02-28] **Hooks prima dei guard return anche nei fix rapidi** — Spostare
  `enabled` al posto giusto in `useGetOne` può far emergere warning ESLint già
  presenti (`react-hooks/rules-of-hooks`) se il hook sta sotto `if (!record) return null`.
  Pattern robusto: dichiarare SEMPRE i hook in cima e usare `record?.field` +
  `enabled: !!record?.field`.

- [2026-02-28] **`SelectInput` di shadcn-admin-kit assume `name/id` di default** —
  Se le choices hanno forma `LabeledValue { value, label }`, bisogna passare
  esplicitamente `optionText="label"` e `optionValue="value"`. Altrimenti il
  select può mostrare warning React sulle `key`, usare valori `undefined` e
  comportarsi male in edit. Questo vale in particolare per i campi configurabili
  da Impostazioni (`taskTypes`, `quoteServiceTypes`, `serviceTypeChoices`).

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

- [2026-02-25] **Scrivere design/analisi in file .md, non in chat** — L'utente ha
  esplicitamente chiesto di non scrivere design lunghi nella chat ma in file dedicati
  sotto `docs/`. Questo permette di consultarli nelle sessioni successive senza perderli.

- [2026-02-25] **SPOT = tariffa flat, non spezzata** — Gli spot hanno una tariffa unica
  (€312) che copre riprese + montaggio. Nel DB va in `fee_other` con `fee_shooting=0`
  e `fee_editing=0`. Il setting key va rinominato da `default_fee_editing_spot` a
  `default_fee_spot` per chiarezza.

- [2026-02-25] **numbers-parser per file .numbers** — I file Apple Numbers non sono
  leggibili direttamente (binari). Usare `pip3 install numbers-parser` e script Python
  per estrarre i dati. Il tool Read di Claude può leggere il file ma non parsare i dati
  strutturati delle celle.

- [2026-02-25] **Design phase obbligatoria prima di implementazione** — L'utente ha
  voluto vedere wireframe e design di OGNI modulo prima di scrivere codice. Creati
  `docs/design-fase2.md` (wireframe) e `docs/data-import-analysis.md` (dati reali).
  La Fase 2 è critica perché modifica il software, non lo usa soltanto.

- [2026-02-25] **Tariffe 2025/2026 aggiornate** — Nuove tariffe da PDF:
  Riprese €233, Montaggio GS €311, Montaggio VIV €156, SPOT completo €312.
  Aumento ~25% rispetto alle tariffe precedenti. Nuovo programma TV: Vale il Viaggio (VIV).

- [2026-02-26] **Moduli custom in directory separate** — Creati i nuovi moduli
  (clients, projects, services, payments, expenses) come directory separate in
  `src/components/atomic-crm/`, senza modificare i moduli originali di Atomic CRM.
  Ogni modulo segue la stessa struttura: index.tsx, List, ListContent, ListFilter,
  Create, Edit, Show, Inputs, Types.

- [2026-02-26] **Table component per liste tabulari** — Usato il componente Table
  di shadcn/ui (non CardList) per le liste dei moduli. Più appropriato per dati
  tabulari come servizi, pagamenti, spese. Import da `@/components/ui/table`.

- [2026-02-26] **useWatch per campi condizionali e totali real-time** — `useWatch`
  di react-hook-form è perfetto per: conditional rendering
  (campo tv_show visibile solo se category=produzione_tv), sezioni alternative
  (km vs importo in spese), e calcoli real-time (totali compensi in servizi).
  Import consigliato: `from "react-hook-form"` (non `ra-core`). Sintassi:
  `const value = useWatch({ name: "field_name" })`.

- [2026-02-26] **useGetOne per FK nelle liste** — Per mostrare nomi relazionali
  (es: nome progetto nella lista servizi), usare `useGetOne("resource", { id, enabled })`.
  Il parametro `enabled: !!id` evita fetch inutili quando l'FK è null.

- [2026-02-26] **Export CSV con fetchRelatedRecords** — Per includere nomi relazionali
  nel CSV (es: nome cliente nel CSV progetti), usare `fetchRelatedRecords` passato
  come secondo parametro dell'exporter. Esempio:
  `const clients = await fetchRelatedRecords(records, "client_id", "clients");`

- [2026-02-26] **Badge colorati per stati e tipi** — Pattern consolidato: definire
  una mappa `colorMap` con variant shadcn (default, secondary, destructive, outline)
  e usare `<Badge variant={colorMap[value]}>{label}</Badge>`. Le mappe label e color
  vanno nel file `[modulo]Types.ts`.

- [2026-02-26] **Non chiedere conferma su cose già documentate** — L'utente si è
  irritato quando gli è stato chiesto "da dove vuoi partire?" mentre l'ordine era
  già scritto in progress.md e docs/design-fase2.md. Regola: seguire il piano
  documentato senza chiedere conferma inutile. Chiedere SOLO per decisioni non
  coperte dalla documentazione.

- [2026-02-26] **Adattamento Kanban da Deals a Quotes** — Il pattern è quasi 1:1.
  Differenze chiave: campo `stage` → `status`, costanti locali anziché ConfigurationContext,
  niente `archived_at` (gli stati finali sono colonne normali), niente `sales_id`/`contact_ids`.
  La logica di reindex (updateQuoteStatus/updateQuoteStatusLocal) è identica cambiando solo
  il nome campo e il nome risorsa nel dataProvider.

- [2026-02-26] **Quotes richiede colonna `index` non prevista nello schema** — La tabella
  quotes originale nella migration non aveva la colonna `index` (SMALLINT) necessaria per
  l'ordinamento Kanban. Servita migration dedicata. Lezione: quando si adatta un pattern
  che usa un campo (come il Kanban con index), verificare che il campo esista nello schema.

- [2026-02-26] **Dialog modali per moduli Kanban, pagine full per moduli CRUD** — Due
  pattern distinti nel gestionale: i moduli CRUD (Clienti, Progetti, Servizi, Pagamenti,
  Spese) usano pagine full con Card layout e CreateBase/EditBase/ShowBase. I moduli
  Kanban (Preventivi, Deals) usano Dialog modali che si sovrappongono al board. Il
  pattern è determinato dal tipo di vista principale (tabella vs board).

- [2026-02-26] **Hooks React prima dei return condizionali** — ESLint `react-hooks/rules-of-hooks`
  rileva quando un hook (es: useGetOne) è chiamato dopo un `if (!record) return null`.
  Fix: spostare il hook prima del return condizionale e usare `enabled: !!record?.field`
  per evitare fetch inutili. Pattern: tutti gli hook in cima, poi i guard return.

- [2026-02-26] **10 colonne Kanban: min-width + overflow-x-auto** — Con 10 colonne,
  `flex-1` da solo produce colonne troppo strette. Soluzione: `min-w-[150px]` su ogni
  colonna + `overflow-x-auto` sul container + `text-xs` per gli header. Il gap tra
  colonne va ridotto da `gap-4` (Deals, 6 colonne) a `gap-2` (Quotes, 10 colonne).

- [2026-02-26] **Typecheck può passare ma Vite build fallire sugli export runtime** —
  In Fase 2 il codice compilava con `tsc --noEmit`, ma `npm run build` falliva perché
  `useWatch` era importato da `ra-core` (non esportato nel bundle runtime). Lezione:
  dopo modifiche ai form/hooks fare SEMPRE anche `npm run build`, non solo typecheck.

- [2026-02-26] **Views Supabase senza `id` richiedono primaryKeys esplicite nel dataProvider** —
  Le views `monthly_revenue` e `project_financials` non hanno colonna `id`. Per usarle
  in React Admin con `ra-supabase-core/@raphiniert/ra-data-postgrest` serve mappare le
  PK nel provider (`monthly_revenue` => `month,category`; `project_financials` => `project_id`).

- [2026-02-26] **Dashboard complessa: separare fetch e aggregazioni dalla UI** —
  Per la dashboard finanziaria (KPI + grafici + alert) è più robusto avere:
  `useDashboardData.ts` (query `useGetList`) + `dashboardModel.ts` (aggregazioni/format)
  + componenti presentazionali piccoli (card/grafici). Riduce duplicazioni e facilita debug.

- [2026-02-26] **UUID vs BIGINT: nuove tabelle per FK incompatibili** — Le tabelle originali
  Atomic CRM usano BIGINT per `contacts.id` e `tasks.contact_id`. Il gestionale usa UUID per
  `clients.id`. Non è possibile alterare le FK — serve creare nuove tabelle (`client_tasks`,
  `client_notes`) con UUID PK e FK. Pattern: quando il tipo di ID cambia, non adattare la
  vecchia tabella, creane una nuova.

- [2026-02-26] **FK opzionale con ON DELETE SET NULL per entità generiche** — `client_tasks`
  ha `client_id` opzionale (FK con ON DELETE SET NULL) perché un promemoria può essere generico
  ("comprare hard disk") o legato a un cliente. `client_notes` ha `client_id` obbligatorio
  (ON DELETE CASCADE) perché una nota senza cliente non ha senso. La scelta SET NULL vs CASCADE
  dipende dal significato semantico della relazione.

- [2026-02-26] **Pulizia moduli: analisi prima, decisione poi, esecuzione rapida** — L'utente
  si è irritato quando ho proposto di eliminare moduli senza spiegare cosa facessero. Pattern
  corretto: (1) analisi approfondita con documento dedicato, (2) presentare opzioni chiare,
  (3) ottenere approvazione, (4) eseguire rapidamente senza chiedere conferme intermedie.

- [2026-02-26] **FakeRest dataProvider: lifecycle callbacks pesanti** — Il dataProvider FakeRest
  aveva ~300 righe di callbacks per companies, contacts, deals, tasks (update nb_contacts,
  nb_deals, nb_tasks, avatar processing, company name sync). Nella pulizia, rimuovere prima
  i callbacks è più sicuro che rimuovere prima i tipi — evita errori di compilazione intermedi.

- [2026-02-26] **Import module non riutilizzabile con schema diverso** — Il modulo Import di
  Atomic CRM (ImportPage + useImportFromJson) era strutturato per importare companies → contacts
  → notes → tasks con FK BIGINT e ID mapping. Con lo schema UUID del gestionale, non è
  adattabile — va riscritto da zero quando servirà.

- [2026-02-27] **Import dati via migration SQL, non via API** — Per import iniziali di dati
  storici (es: fogli di calcolo clienti), una migration SQL con INSERT è più affidabile che
  passare dall'API REST. Vantaggi: idempotente (ON CONFLICT DO NOTHING), verificabile con
  script Python, tracciabile nel version control, bypassa RLS (è DDL). Pattern: generare
  gli UUID in anticipo per collegare le FK tra tabelle nella stessa migration.

- [2026-02-27] **Verifica totali con Python, non a mano** — Per import di dati finanziari
  da fogli di calcolo, creare uno script Python di verifica che calcola i totali dagli
  stessi dati della migration e li confronta con i totali attesi dal foglio originale.
  Trovare discrepanze al centesimo prima del push, non dopo.

- [2026-02-27] **psql verso Supabase remoto: IPv6 routing issue** — La connessione diretta
  psql al DB remoto Supabase può fallire con "No route to host" su reti che non supportano
  IPv6. `supabase db push` funziona perché usa la Management API (HTTPS), non psql.
  Per query di verifica su remoto, usare il Dashboard SQL Editor.

- [2026-02-27] **Cartesian product in SQL views con LEFT JOIN multipli** — Quando una view
  fa `LEFT JOIN services ON project_id` e `LEFT JOIN payments ON project_id` sullo stesso
  progetto, si ottiene N×M righe se il progetto ha N services e M payments. Tutti i SUM()
  risultano gonfiati. Fix: pre-aggregare in subquery prima del JOIN:
  `LEFT JOIN (SELECT project_id, SUM(...) FROM services GROUP BY project_id) sv ON ...`.
  Questo pattern è la regola per qualsiasi view con 2+ LEFT JOIN 1-to-many sulla stessa chiave.

- [2026-02-27] **Il sistema gestisce già feature che non usi nella migration** — L'utente si è
  irritato perché il tipo spesa `spostamento_km` esisteva già nel codice ma la migration di
  import non creava quei record. Stessa cosa per `project_id` sui pagamenti e i filtri per
  progetto. Regola: prima di importare dati, verificare TUTTE le colonne e tipi del modulo
  per assicurarsi che la migration crei record completi, non parziali.

- [2026-02-27] **service_role key per query remote via REST API** — La publishable key
  rispetta RLS e può restituire risultati vuoti. Per query di verifica/debug sul DB remoto
  Supabase, usare la `service_role` key nell'header `apikey` + `Authorization: Bearer`.
  Endpoint: `https://<project>.supabase.co/rest/v1/<table>?select=*&<filters>`.

- [2026-02-27] **Verificare via fatture, non solo file originale** — Per confermare che
  un lavoro non è stato fatturato, non basta che le celle siano vuote nel foglio di calcolo.
  Serve confrontare le date del servizio con le date di copertura delle fatture emesse. Se
  nessuna fattura copre quelle date → lavoro effettivamente non fatturato. L'utente considera
  le fatture PDF come fonte autoritativa, non il foglio di calcolo.

- [2026-02-27] **Completare un servizio = anche expense + payment** — Quando si completano
  servizi con fee e km, creare ANCHE i record expense (spostamento_km) e payment (in_attesa)
  corrispondenti. Senza questi record i moduli Pagamenti e Spese non mostrano nulla, anche
  se il servizio ha i dati corretti. Il sistema non genera automaticamente expense/payment
  dai servizi — sono entità separate.

- [2026-02-27] **File originale come fonte di verità per tariffe** — Per verificare tariffe
  km o compensi, controllare il file originale (Numbers/Excel) e non il DB. Il DB contiene
  i dati importati, che potrebbero avere errori di import. Il file originale è la fonte di
  verità. Usare `numbers_parser` per leggere file .numbers.

- [2026-02-27] **payment_type: acconto vs saldo dipende dalla fattura** — Un pagamento è
  "saldo" se completa l'importo della fattura (anche se è il secondo pagamento dopo un
  acconto). È "acconto" solo se rimane un saldo residuo sulla fattura. Verificare sempre
  confrontando la somma dei pagamenti con l'importo fattura.

- [2026-02-27] **PostgREST `q` filter richiede tsvector — usare `name@ilike` per ricerca testuale** —
  Il filtro `q` del formato ra-data-postgrest presuppone una colonna tsvector per full-text search.
  Se non esiste (e non serve crearla), usare `name@ilike` con `%value%` come wildcards. Pattern:
  `setFilters({ "name@ilike": \`%${value}%\` })` e recuperare il valore display con `.replace(/%/g, "")`.

- [2026-02-27] **Fogli contabili CSV come fonte di verità per allocazione pagamenti** —
  Quando i pagamenti coprono più progetti (fatture cumulative), l'unica fonte affidabile è il
  foglio contabile interno che dettaglia per-progetto: servizi, km, spese accessorie. Le fatture
  XML non hanno questo dettaglio (importo globale). Pattern: CSV foglio → totali per progetto →
  split pagamenti nel DB con stessa `invoice_ref`.

- [2026-02-27] **Una fattura può coprire più progetti — split payments con invoice_ref condiviso** —
  FPR 2/25 copriva GS + BTF + 6 Spot. Nel DB ogni progetto ha il suo record payment con lo stesso
  `invoice_ref`. Questo è corretto: la somma dei payments con stessa ref = importo fattura.

- [2026-02-27] **DO $$ blocks per migration complesse con variabili** — Per migration che devono
  referenziare gli stessi UUID più volte (client_id, project_ids), usare `DO $$ DECLARE ... BEGIN
  ... END $$;`. Le variabili rendono il SQL leggibile e meno soggetto a errori di copia-incolla.

- [2026-02-27] **`npx supabase db push --include-all` per migration fuori ordine** — Se il timestamp
  della migration è anteriore all'ultima migration remota, `db push` rifiuta con "Found local
  migration files to be inserted before the last migration". Flag `--include-all` forza l'inclusione.

- [2026-02-27] **Google Calendar: usare il server MCP integrato di Anthropic, non quello locale** —
  Ci sono DUE server MCP per Google Calendar configurati:
  1. `google-calendar` (locale, @cocal/google-calendar-mcp) — richiede OAuth Google Cloud separato,
     i token scadono facilmente, richiede `npx @cocal/google-calendar-mcp auth` per ri-autenticarsi,
     e serve aggiungere il proprio email come "utente di test" nella Google Cloud Console.
  2. `claude.ai Google Calendar` (integrato Anthropic) — connesso automaticamente tramite l'account
     Claude dell'utente. Funziona subito, nessuna configurazione OAuth necessaria. Tool names:
     `mcp__claude_ai_Google_Calendar__gcal_list_events` (con parametro `q` per ricerca testo),
     `mcp__claude_ai_Google_Calendar__gcal_list_calendars`, ecc.
  **USARE SEMPRE il server claude.ai**, non quello locale. Il server locale è ridondante.

- [2026-02-28] **Non c'è DB Supabase locale — sempre push diretto al remoto** — L'utente non usa
  `supabase start` per un'istanza locale. Tutte le migration vanno applicate direttamente con
  `npx supabase db push --include-all`. Non provare `npx supabase migration up`.

- [2026-02-28] **Segno determinato dal TIPO, non dal valore** — Per importi finanziari, il valore
  nel DB è sempre >= 0. Il tipo determina la direzione: `credito_ricevuto` (expense) → riduce
  le spese, `rimborso` (payment) → riduce il totale pagato. Questo evita ambiguità e permette
  CHECK >= 0 su tutte le colonne numeriche.

- [2026-02-28] **computeTotal ha 3 copie** — La funzione `computeTotal` per le spese esiste in
  3 file: ExpenseListContent.tsx, ExpenseShow.tsx, ExpenseList.tsx (export CSV). Quando si
  aggiungono tipi spesa o si modifica la logica, aggiornarle TUTTE. Valutare refactoring in
  un helper condiviso se cresce ulteriormente.

- [2026-02-28] **Dashboard non usa expenses — KPI non impattati da crediti/rimborsi** — La
  bacheca (`buildDashboardModel`) carica solo: monthly_revenue (view da services), payments,
  quotes, services, projects, clients. Le spese (expenses) NON sono nel data model della
  dashboard. Crediti e rimborsi impattano solo ClientFinancialSummary e project_financials view.

- [2026-02-28] **Spese senza project_id: correttamente escluse dalla view, incluse nel riepilogo cliente** —
  Una spesa/credito dissociata da un progetto (project_id = NULL) viene esclusa da
  `project_financials` (WHERE project_id IS NOT NULL) ma inclusa in ClientFinancialSummary
  (filtra per client_id). Questo è il comportamento corretto: crediti generici riducono il
  dovuto complessivo del cliente, non di un progetto specifico.

- [2026-02-28] **Tooltip nativi browser per descrizioni nei select** — Per mostrare descrizioni
  al passaggio del mouse sulle opzioni di un SelectInput, usare `optionText` come funzione che
  ritorna `<span title={description}>{name}</span>`. Funziona con Radix Select senza modificare
  i componenti admin/ui. Ritardo di ~1s prima che appaia (comportamento browser standard).

- [2026-02-28] **Kanban drag-and-drop e CHECK DB non sono compatibili** — Se un CHECK constraint
  richiede un campo compilato per un certo stato (es: rejection_reason per rifiutato), il drag-and-drop
  che cambia solo lo status farà fallire l'UPDATE. Soluzioni: (1) bloccare il drag verso quello stato,
  (2) solo validazione frontend senza CHECK DB, (3) default automatico. In questo progetto: opzione 1
  per rifiutato (drag bloccato), opzione 2 per date condizionali (sent_date/response_date).

- [2026-02-28] **ErrorMessage condiviso in misc/** — Componente riutilizzabile per errori di
  caricamento: `<ErrorMessage message="..." />` con AlertCircle icon. Usato da 4 ListContent e
  5 Show pages. Destrutturare `error` da `useListContext()` o `useShowContext()`. `useRecordContext()`
  (QuoteShow) non espone error — gestito a livello ShowBase.

- [2026-02-28] **Spiegare PRIMA, domande COERENTI, poi agire** — L'utente vuole sempre che si
  spieghi il problema, si facciano domande pertinenti (non quelle a cui l'utente non può
  ragionevolmente rispondere), e si attenda conferma prima di modificare codice. Non modificare
  mai silenziosamente.

- [2026-02-28] **Tipi configurabili via ConfigurationContext, non hardcoded** — Quando una lista
  di valori (tipi servizio, tipi preventivo) deve poter crescere senza intervento del developer,
  usare ConfigurationContext (persistito via `useStore` di ra-core). Pattern: aggiungere il campo
  a `ConfigurationContextValue`, defaults in `defaultConfiguration.ts`, sezione editabile in
  SettingsPage con ArrayInput + SimpleFormIterator, e `ensureValues()` nel transform per auto-generare
  slug value dal label. I consumatori usano `useConfigurationContext()` e lookup con `.find()`.

- [2026-02-28] **CHECK constraint DB incompatibili con valori dinamici** — Se i valori di un campo
  sono gestiti dall'utente via UI (ConfigurationContext/Settings), i CHECK constraint statici nel DB
  devono essere rimossi. Altrimenti inserire un nuovo tipo nel Settings non basta: il DB rifiuta il
  valore. Lesson: usare CHECK solo per valori veramente fissi (es: stati pipeline hardcoded).

- [2026-02-28] **Exporter CSV dentro il componente quando serve config** — L'exporter di react-admin
  è una funzione standalone passata come prop a `<List>`. Se deve leggere valori da ConfigurationContext
  (hook), non può stare fuori dal componente. Pattern: definire exporter dentro il componente con
  `useCallback`, passarlo sia a `<List exporter={}>` che a `<ExportButton exporter={}>`.

- [2026-02-28] **LabeledValue { value, label } vs { id, name }** — ConfigurationContext usa il formato
  `{ value: string; label: string }` (tipo `LabeledValue`). I vecchi array di choices usavano
  `{ id, name }`. Quando si migra, aggiornare TUTTI i consumatori: `type.id` → `type.value`,
  `type.name` → `type.label`. Se un SelectInput usa `optionValue="value"` e `optionText="label"`,
  i choices devono avere quei campi.

- [2026-02-28] **DateTimeInput già disponibile in admin/** — Il componente
  `src/components/admin/date-time-input.tsx` usa `<input type="datetime-local">` e gestisce
  conversione ISO automatica (format: ISO→local, parse: local→ISO via `.toISOString()`).
  Mai usato finora nel gestionale, ma pronto per datetime range support.

- [2026-02-28] **DATE → TIMESTAMPTZ migration sicura** — `ALTER COLUMN TYPE TIMESTAMPTZ USING
  col::TIMESTAMPTZ` converte DATE a mezzanotte UTC. DATE_TRUNC funziona identicamente su
  TIMESTAMPTZ (monthly_revenue, project_financials non necessitano modifiche). PostgREST
  accetta stringhe `YYYY-MM-DD` per colonne TIMESTAMPTZ (cast automatico a mezzanotte UTC).

- [2026-02-28] **Pattern all_day per date/datetime (stile Google Calendar)** — Aggiungere un
  campo `all_day BOOLEAN DEFAULT true` accanto alle colonne TIMESTAMPTZ. Nel form: toggle
  BooleanInput che commuta tra DateInput (all_day=true) e DateTimeInput (all_day=false).
  Nel display: formattare con/senza ora in base al flag. Questo pattern è compatibile con
  Google Calendar API e copre tutti i casi (giorno singolo, range, con/senza orario).

- [2026-02-28] **CHECK constraints: DROP prima di ALTER TYPE, poi RECREATE** — Se una colonna
  ha un CHECK constraint e si fa ALTER TYPE, PostgreSQL può rifiutare o generare risultati
  inaspettati. Pattern sicuro: DROP CONSTRAINT → ALTER TYPE → ADD CONSTRAINT (la comparazione
  >= funziona ugualmente con TIMESTAMPTZ).

- [2026-02-28] **Utility condivise in misc/ per formattazione date** — Quando lo stesso pattern
  di formattazione data (con varianti all_day/range) serve in 10+ file, creare una utility
  condivisa in `src/components/atomic-crm/misc/` (max 50 righe). Evita duplicazione e garantisce
  coerenza. Pattern: `formatDateRange(start, end, allDay)` + `formatDateLong(date, allDay)`.

- [2026-02-28] **Conditional DateComponent con useWatch** — Pattern per toggle all_day nei form:
  `const allDay = useWatch({ name: "all_day" }) ?? true;` +
  `const DateComponent = allDay ? DateInput : DateTimeInput;`. Usare `<DateComponent source="..." />`
  per commutare automaticamente tra data e data+ora. Importare sempre sia DateInput che DateTimeInput.

- [2026-02-28] **postponeDate deve preservare il time** — Quando si rimanda un task (domani,
  prossima settimana), se `all_day=false` il time component va preservato: restituire
  `.toISOString()` completo, non `.slice(0, 10)`. Il flag all_day guida il formato output.

- [2026-02-28] **Migration con DROP + ALTER TYPE + RECREATE per CHECK** — Quando si converte
  una colonna con CHECK constraint (es: `end_date >= start_date`) da DATE a TIMESTAMPTZ, il
  pattern sicuro è: `DROP CONSTRAINT` → `ALTER TYPE USING col::TIMESTAMPTZ` → `ADD CONSTRAINT`.
  La comparazione `>=` funziona identicamente con TIMESTAMPTZ.

- [2026-02-28] **event_date → event_start + event_end richiede data migration** — Quando si
  rinomina/split una colonna (quote.event_date → event_start), nella migration serve l'UPDATE
  per copiare i dati esistenti prima del DROP della colonna vecchia:
  `UPDATE SET event_start = event_date::TIMESTAMPTZ WHERE event_date IS NOT NULL;`

- [2026-02-28] **ALTER TYPE fallisce se una VIEW dipende dalla colonna** — PostgreSQL impedisce
  `ALTER COLUMN TYPE` se una view referenzia quella colonna. Pattern: `DROP VIEW` prima
  dell'ALTER, poi `CREATE VIEW` dopo. Verificare TUTTE le views che usano la colonna (non solo
  quelle ovvie). Nel gestionale: `services.service_date` era usato da `monthly_revenue` E
  `project_financials` — entrambe andavano droppate e ricreate.

- [2026-02-28] **Transform nel CreateSheet per all_day** — Quando `all_day=true` e il form usa
  DateInput (che salva `YYYY-MM-DD`), il transform deve impostare le ore a mezzanotte:
  `if (data.all_day) { dueDate.setHours(0, 0, 0, 0); return {...data, due_date: dueDate.toISOString()}; }`
  Questo garantisce coerenza con TIMESTAMPTZ nel DB.

- [2026-02-28] **FiscalConfig via ConfigurationContext, non tabella separata** — I parametri fiscali
  (profili ATECO, aliquote, tetto) sono salvati nel JSONB di configuration come campo `fiscalConfig`.
  Questo evita una tabella dedicata e sfrutta il meccanismo di persistenza già esistente di ra-core
  (`useStore` + EditBase su configuration). Il default viene unito alla config utente in
  `useConfigurationContext()` con spread operator.

- [2026-02-28] **Aliquota sostitutiva auto-calcolata, non manuale** — L'aliquota imposta sostitutiva
  (5% startup / 15% ordinaria) viene calcolata automaticamente da `annoInizioAttivita` sia nel form
  (Settings) che nel modello fiscale. L'override manuale è opzionale (checkbox + select). Questo
  previene errori: l'utente non deve ricordarsi di cambiarla quando scadono i 5 anni startup.

- [2026-02-28] **Modello fiscale come funzione pura, non hook** — `buildFiscalModel()` è una funzione
  pura che prende dati e config, ritorna un oggetto. Integrata nel `buildDashboardModel()` già esistente
  (non un hook separato). Vantaggi: testabile senza React, cacheable via useMemo, nessun re-render extra.

- [2026-02-28] **Acconti forfettari 50/50 dal 2019** — D.L. 124/2019, art. 58: per forfettari e
  soggetti ISA, gli acconti sono 50%+50% (non 40/60). Soglie: >257.52€ → due acconti, 51.65-257.52€ →
  acconto unico a novembre, <51.65€ → nessun acconto. INPS: acconti su 80% del totale stimato.

- [2026-02-28] **Year navigation: parametrizzare funzioni pure, non duplicare** — Per aggiungere
  navigazione anno alla dashboard, basta parametrizzare le funzioni pure esistenti (`buildDashboardModel`,
  `buildFiscalModel`) con un `year?` opzionale. Le query dati restano invariate (fetchano tutto lo
  storico), il filtraggio avviene nel model builder. Nessuna query aggiuntiva = nessun overhead.

- [2026-02-28] **Revenue trend: referenceDate per anni passati** — Per mostrare il trend gen-dic di un
  anno passato (invece del rolling 12 mesi), passare `new Date(selectedYear, 11, 31)` come referenceDate
  a `getSortedMonthStarts`. La stessa funzione funziona per entrambi i casi senza branching.

- [2026-02-28] **Componenti operativi vs storici nella dashboard** — Pattern di design: per anni passati,
  nascondere completamente (non mostrare avvisi) i componenti forward-looking (deadlines, business health,
  alerts, warnings fiscali). Mostrare solo dati storici (KPI filtrati, grafici, FiscalKpis con label
  definitive). L'utente ha confermato: "nascondi completamente ciò che non ha senso".

- [2026-02-28] **Filtro per anno: usare payment_date, non created_at** — I pagamenti vanno filtrati per
  `payment_date` (la data effettiva del pagamento), con fallback a `created_at`. I preventivi si filtrano
  per `created_at`. Un pagamento non ricevuto di un anno passato resta visibile solo in quell'anno — è un
  dato storico (credito perso), non operativo.

- [2026-02-28] **Colori semantici: estendere Badge e Progress, non index.css** — Per aggiungere verde/ambra
  alla dashboard, il pattern del progetto è: varianti CVA nei componenti UI (badge.tsx, progress.tsx), NON
  CSS custom properties in index.css. Badge: `success` (green-600) e `warning` (amber-600). Progress:
  prop `variant` con CVA. Usare amber-600 (non 500) per contrasto AA su testo bianco.
