import { quoteStatusEmailTemplateDefinitions } from "@/lib/communications/quoteStatusEmailTemplates";

export type CrmCapabilityRegistry = {
  routing: {
    mode: "hash";
    routePrefix: "/#/";
    meaning: string;
  };
  resources: Array<{
    resource: string;
    label: string;
    description: string;
    routePatterns: string[];
    supportedViews: Array<"list" | "show" | "create" | "edit">;
  }>;
  pages: Array<{
    id: string;
    label: string;
    routePattern: string;
    description: string;
  }>;
  dialogs: Array<{
    id: string;
    label: string;
    description: string;
    sourceFile: string;
    entryPoints: string[];
    actsOn?: string[];
  }>;
  actions: Array<{
    id: string;
    label: string;
    description: string;
    sourceFile: string;
    actsOn: string[];
    requiredFields: string[];
    sideEffects?: string[];
  }>;
  communications: {
    quoteStatusEmails: {
      provider: "gmail_smtp";
      description: string;
      sharedBlocks: string[];
      safetyRules: string[];
      requiredEnvKeys: string[];
      templates: typeof quoteStatusEmailTemplateDefinitions;
    };
    internalPriorityNotifications: {
      provider: "callmebot";
      description: string;
      useCases: string[];
      requiredEnvKeys: string[];
      rules: string[];
    };
  };
  integrationChecklist: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

export const buildCrmCapabilityRegistry = (): CrmCapabilityRegistry => ({
  routing: {
    mode: "hash",
    routePrefix: "/#/",
    meaning:
      "Nel runtime locale e nelle route principali del CRM si usa hash routing; gli smoke e i deep link devono rispettarlo.",
  },
  resources: [
    {
      resource: "clients",
      label: "Clienti",
      description: "Anagrafica clienti e punto di partenza per lavoro o incassi semplici.",
      routePatterns: [
        "/#/clients",
        "/#/clients/create",
        "/#/clients/:id",
        "/#/clients/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "quotes",
      label: "Preventivi",
      description:
        "Pipeline commerciale, importi proposti, stati, PDF e link a progetto/pagamento.",
      routePatterns: [
        "/#/quotes",
        "/#/quotes/create",
        "/#/quotes/:id",
        "/#/quotes/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "projects",
      label: "Progetti",
      description: "Contenitore operativo dei lavori strutturati.",
      routePatterns: [
        "/#/projects",
        "/#/projects/create",
        "/#/projects/:id",
        "/#/projects/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "services",
      label: "Servizi",
      description: "Registro lavori con compensi, km, tassabilita' e date operative.",
      routePatterns: [
        "/#/services",
        "/#/services/create",
        "/#/services/:id",
        "/#/services/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "payments",
      label: "Pagamenti",
      description: "Incassi ricevuti o attesi collegati a cliente, progetto o preventivo.",
      routePatterns: [
        "/#/payments",
        "/#/payments/create",
        "/#/payments/:id",
        "/#/payments/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "expenses",
      label: "Spese",
      description: "Spese operative e rimborsi km collegati ai progetti.",
      routePatterns: [
        "/#/expenses",
        "/#/expenses/create",
        "/#/expenses/:id",
        "/#/expenses/:id/show",
      ],
      supportedViews: ["list", "show", "create", "edit"],
    },
    {
      resource: "client_tasks",
      label: "Promemoria",
      description: "Attivita' e follow-up rapidi collegati ai clienti.",
      routePatterns: ["/#/client_tasks"],
      supportedViews: ["list"],
    },
  ],
  pages: [
    {
      id: "dashboard",
      label: "Dashboard",
      routePattern: "/#/",
      description:
        "Dashboard con vista Annuale e Storico; lo Storico e' AI-ready, Annuale ha AI solo sul contesto annual_operations.",
    },
    {
      id: "settings",
      label: "Impostazioni",
      routePattern: "/#/settings",
      description:
        "Config centrale per marchio, tipi, regole fiscali, AI analitica/read-only CRM, modello Gemini fatture e operativita'.",
    },
    {
      id: "profile",
      label: "Profilo",
      routePattern: "/#/profile",
      description: "Pagina profilo utente corrente.",
    },
  ],
  dialogs: [
    {
      id: "unified_ai_launcher_sheet",
      label: "Chat AI unificata",
      description:
        "Launcher globale flottante che apre la shell unica della chat AI sopra il CRM senza cambiare route e ora include anche una snapshot coerente del CRM core.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      entryPoints: ["global_floating_button"],
    },
    {
      id: "quote_create_dialog",
      label: "Nuovo preventivo",
      description: "Creazione preventivo in dialog sopra la board preventivi.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteCreate.tsx",
      entryPoints: ["/#/quotes/create"],
      actsOn: ["quotes"],
    },
    {
      id: "quote_show_dialog",
      label: "Dettaglio preventivo",
      description: "Vista dettaglio preventivo con PDF, link pagamenti e progetto.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteShow.tsx",
      entryPoints: ["/#/quotes/:id/show"],
      actsOn: ["quotes", "projects", "payments"],
    },
    {
      id: "quote_edit_dialog",
      label: "Modifica preventivo",
      description: "Modifica campi preventivo in dialog dedicato.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteEdit.tsx",
      entryPoints: ["/#/quotes/:id"],
      actsOn: ["quotes"],
    },
    {
      id: "create_project_from_quote_dialog",
      label: "Crea progetto dal preventivo",
      description: "Crea e collega un progetto partendo da un preventivo operativo.",
      sourceFile: "src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.tsx",
      entryPoints: ["quote_show_dialog"],
      actsOn: ["quotes", "projects"],
    },
    {
      id: "quick_episode_dialog",
      label: "Registra puntata",
      description: "Inserimento rapido di servizio+spostamento per progetti TV.",
      sourceFile: "src/components/atomic-crm/projects/QuickEpisodeDialog.tsx",
      entryPoints: ["/#/projects/:id/show"],
      actsOn: ["projects", "services", "expenses"],
    },
    {
      id: "quick_payment_dialog",
      label: "Registra pagamento rapido",
      description: "Registra un pagamento dal progetto usando i financials del progetto.",
      sourceFile: "src/components/atomic-crm/projects/QuickPaymentDialog.tsx",
      entryPoints: ["/#/projects/:id/show"],
      actsOn: ["projects", "payments"],
    },
    {
      id: "add_task_dialog",
      label: "Nuova attivita'",
      description: "Creazione rapida promemoria o follow-up cliente.",
      sourceFile: "src/components/atomic-crm/tasks/AddTask.tsx",
      entryPoints: ["/#/client_tasks"],
      actsOn: ["client_tasks"],
    },
    {
      id: "task_edit_dialog",
      label: "Modifica attivita'",
      description: "Aggiorna testo, data o stato di un promemoria.",
      sourceFile: "src/components/atomic-crm/tasks/TaskEdit.tsx",
      entryPoints: ["/#/client_tasks"],
      actsOn: ["client_tasks"],
    },
    {
      id: "tag_dialog",
      label: "Gestione tag",
      description: "Crea o modifica etichette cliente.",
      sourceFile: "src/components/atomic-crm/tags/TagDialog.tsx",
      entryPoints: ["/#/clients", "/#/settings"],
      actsOn: ["tags"],
    },
  ],
  actions: [
    {
      id: "open_unified_ai_launcher",
      label: "Apri chat AI unificata",
      description:
        "Apre la shell AI globale dal bottone flottante disponibile ovunque nel CRM.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      actsOn: [],
      requiredFields: [],
    },
    {
      id: "read_unified_crm_context",
      label: "Leggi snapshot CRM unificata",
      description:
        "Carica nel launcher unificato un contesto read-only dei moduli core del CRM, includendo per i clienti recenti il profilo fiscale essenziale, i recapiti di fatturazione principali e nomi cliente coerenti con la fatturazione quando disponibili, sempre riusando registri semantici e capability senza cambiare pagina.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      actsOn: ["clients", "quotes", "projects", "payments", "expenses"],
      requiredFields: [],
    },
    {
      id: "ask_unified_crm_question",
      label: "Chiedi al CRM nella chat unificata",
      description:
        "Invia una domanda sul CRM core usando la stessa snapshot mostrata nel launcher e restituisce una risposta grounded con possibili handoff verso route o azioni gia approvate e, in casi stretti, una bozza pagamento modificabile che comunque non scrive nel CRM.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      actsOn: ["clients", "quotes", "projects", "payments", "expenses"],
      requiredFields: [
        "question",
        "context.meta.generatedAt",
        "aiConfig.historicalAnalysisModel",
      ],
      sideEffects: ["invoke modello testuale read-only"],
    },
    {
      id: "prepare_payment_write_draft",
      label: "Prepara bozza pagamento nel launcher",
      description:
        "Propone nel launcher una bozza pagamento stretta, modificabile dall'utente e trasportabile solo verso superfici gia approvate senza scrivere direttamente nel CRM: `payments/create` per il caso quote-driven e `project quick payment` per il caso project-driven. Sul form pagamenti la superficie di arrivo deve preservare gli edit espliciti gia fatti nel launcher finche l'utente non sceglie un valore diverso e finche resta sullo stesso preventivo della bozza, segnalando esplicitamente quando quel contesto non vale piu. Sul quick payment di progetto la bozza puo portare importo, tipo e stato gia derivati dai financials del progetto attivo. Dopo il primo edit manuale dell'importo sul form pagamenti, il ricalcolo automatico non deve piu riprendersi il campo.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedCrmAnswerPanel.tsx",
      actsOn: ["quotes", "projects", "payments"],
      requiredFields: [
        "answer.paymentDraft.originActionId",
        "answer.paymentDraft.clientId",
        "answer.paymentDraft.projectId",
        "answer.paymentDraft.paymentType",
        "answer.paymentDraft.amount",
        "answer.paymentDraft.status",
        "answer.paymentDraft.draftKind",
      ],
    },
    {
      id: "follow_unified_crm_handoff",
      label: "Segui handoff del launcher unificato",
      description:
        "Apre dal launcher una route o una superficie commerciale gia approvata del CRM suggerita dalla risposta AI, con una raccomandazione primaria deterministica quando il contesto lo permette e con i migliori prefills/search params gia supportati dalla superficie di arrivo, senza eseguire direttamente azioni di scrittura.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedCrmAnswerPanel.tsx",
      actsOn: ["clients", "quotes", "projects", "payments", "expenses"],
      requiredFields: [
        "answer.suggestedActions[].href",
        "answer.suggestedActions[].capabilityActionId",
        "answer.suggestedActions[].recommended",
        "answer.suggestedActions[].recommendationReason",
      ],
    },
    {
      id: "invoice_import_extract",
      label: "Analizza fatture nella chat AI",
      description:
        "Carica PDF, scansioni o foto nella chat AI unificata e genera una proposta strutturata orientata a payments o expenses, includendo quando leggibile anche l'anagrafica fiscale della controparte.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      actsOn: ["payments", "expenses", "clients", "projects"],
      requiredFields: ["files", "aiConfig.invoiceExtractionModel"],
      sideEffects: ["upload temporaneo file", "invoke Gemini", "pulizia upload temporanei"],
    },
    {
      id: "invoice_import_open_client_create",
      label: "Apri nuovo cliente da import fatture",
      description:
        "Dalla bozza import fatture apre il form clienti gia precompilato con denominazione, identificativi fiscali e indirizzo fatturazione letti dal documento, senza creare nulla automaticamente.",
      sourceFile: "src/components/atomic-crm/ai/InvoiceImportDraftEditor.tsx",
      actsOn: ["clients"],
      requiredFields: [
        "record.counterpartyName",
        "record.billingName",
        "record.vatNumber",
        "record.fiscalCode",
      ],
    },
    {
      id: "invoice_import_confirm",
      label: "Conferma import fatture nel CRM",
      description:
        "Conferma la proposta corretta in chat e crea record reali su payments o expenses.",
      sourceFile: "src/components/atomic-crm/ai/UnifiedAiLauncher.tsx",
      actsOn: ["payments", "expenses", "clients", "projects"],
      requiredFields: ["draft.records", "conferma utente"],
      sideEffects: ["crea record CRM"],
    },
    {
      id: "quote_drag_change_status",
      label: "Sposta preventivo tra stati",
      description:
        "Sposta un preventivo nella board e aggiorna stato+indice; non permette drag diretto verso rifiutato.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteListContent.tsx",
      actsOn: ["quotes"],
      requiredFields: ["id", "status", "index"],
      sideEffects: ["riordino indici nella colonna sorgente/destinazione"],
    },
    {
      id: "quote_download_pdf",
      label: "Scarica PDF preventivo",
      description: "Genera il PDF del preventivo con branding e dati cliente.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteShow.tsx",
      actsOn: ["quotes"],
      requiredFields: ["description", "amount", "client_id"],
    },
    {
      id: "quote_create_project",
      label: "Crea progetto dal preventivo",
      description:
        "Trasforma un preventivo in progetto quando il lavoro richiede struttura operativa.",
      sourceFile: "src/components/atomic-crm/quotes/CreateProjectFromQuoteDialog.tsx",
      actsOn: ["quotes", "projects"],
      requiredFields: ["client_id", "status"],
      sideEffects: ["collega quote.project_id"],
    },
    {
      id: "quote_create_payment",
      label: "Registra pagamento dal preventivo",
      description:
        "Apre il form pagamenti gia' precompilato dal preventivo e puo suggerire l'importo residuo ancora non collegato.",
      sourceFile: "src/components/atomic-crm/quotes/QuoteShow.tsx",
      actsOn: ["quotes", "payments"],
      requiredFields: ["client_id", "amount", "status"],
      sideEffects: ["precompila client_id, quote_id e project_id se presente"],
    },
    {
      id: "quote_send_status_email",
      label: "Invia mail cliente stato preventivo",
      description:
        "Apre una preview manuale e invia via Gmail SMTP la mail cliente coerente con lo stato corrente del preventivo.",
      sourceFile: "src/components/atomic-crm/quotes/SendQuoteStatusEmailDialog.tsx",
      actsOn: ["quotes", "clients", "payments", "services"],
      requiredFields: ["id", "status", "client_id"],
      sideEffects: ["invia mail cliente via Gmail SMTP"],
    },
    {
      id: "client_create_payment",
      label: "Registra pagamento dal cliente",
      description: "Percorso leggero per i casi senza progetto o preventivo strutturato.",
      sourceFile: "src/components/atomic-crm/clients/ClientShow.tsx",
      actsOn: ["clients", "payments"],
      requiredFields: ["client_id"],
      sideEffects: ["precompila client_id nel form pagamenti"],
    },
    {
      id: "project_quick_episode",
      label: "Registra puntata TV",
      description:
        "Crea un servizio e, se necessario, una spesa km dal progetto TV con valori predefiniti.",
      sourceFile: "src/components/atomic-crm/projects/QuickEpisodeDialog.tsx",
      actsOn: ["projects", "services", "expenses"],
      requiredFields: ["project_id", "client_id", "service_date"],
      sideEffects: ["crea servizio", "crea spesa km se km_distance > 0"],
    },
    {
      id: "project_quick_payment",
      label: "Registra pagamento rapido dal progetto",
      description:
        "Crea un pagamento leggendo il saldo operativo dal progetto e puo aprirsi da handoff guidato con tipo pagamento gia selezionato o con una bozza stretta che porta anche importo e stato derivati dai financials del progetto.",
      sourceFile: "src/components/atomic-crm/projects/QuickPaymentDialog.tsx",
      actsOn: ["projects", "payments"],
      requiredFields: ["project_id", "client_id", "amount", "payment_type"],
    },
  ],
  communications: {
    quoteStatusEmails: {
      provider: "gmail_smtp",
      description:
        "Template mail cliente per cambi stato preventivo con layout condiviso e policy di invio per stato.",
      sharedBlocks: [
        "header brand",
        "summary card",
        "body sections",
        "optional CTA",
        "footer support",
      ],
      safetyRules: [
        "Se il flusso coinvolge servizi con is_taxable = false, l'invio automatico email deve restare sempre bloccato.",
      ],
      requiredEnvKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"],
      templates: quoteStatusEmailTemplateDefinitions,
    },
    internalPriorityNotifications: {
      provider: "callmebot",
      description:
        "Canale notifiche interne ad alta priorita' per scadenze, blocchi o eventi che richiedono attenzione rapida.",
      useCases: [
        "scadenze urgenti",
        "anomalie operative critiche",
        "blocchi amministrativi o di incasso",
      ],
      requiredEnvKeys: ["CALLMEBOT_PHONE", "CALLMEBOT_APIKEY"],
      rules: [
        "Usare CallMeBot solo per notifiche interne, non per messaggi cliente.",
        "Usare il canale solo per eventi ad alta priorita' che richiedono attenzione rapida.",
      ],
    },
  },
  integrationChecklist: [
    {
      id: "resource-registration",
      label: "Registrare la nuova risorsa o pagina nei punti di ingresso",
      description:
        "Aggiorna CRM root, route, index del modulo e route hash usate negli smoke se la feature espone una nuova superficie.",
    },
    {
      id: "copy-and-i18n",
      label: "Aggiornare label, copy e i18n",
      description:
        "Ogni nuovo campo o azione deve avere un nome leggibile per utente e AI, non solo il nome tecnico del DB.",
    },
    {
      id: "semantic-registry",
      label: "Aggiornare il registry semantico",
      description:
        "Nuovi tipi, stati, categorie, date o formule vanno aggiunti a crmSemanticRegistry.",
    },
    {
      id: "capability-registry",
      label: "Aggiornare il registry delle capacita'",
      description:
        "Nuove pagine, modali, tool o azioni vanno dichiarati in crmCapabilityRegistry per restare conoscibili dall'AI.",
    },
    {
      id: "communications",
      label: "Aggiornare template mail o notifiche cliente quando la feature tocca stati cliente-facing",
      description:
        "Se la feature cambia stati o passaggi che il cliente deve conoscere, va aggiornato anche il layer comunicazioni.",
    },
    {
      id: "tests-and-smoke",
      label: "Aggiungere test e smoke realistici",
      description:
        "Ogni feature va chiusa con typecheck, test mirati e smoke reale se tocca percorsi business-critical.",
    },
    {
      id: "continuity-docs",
      label: "Aggiornare handoff, backlog, progress e learnings",
      description:
        "I cambi strutturali devono sopravvivere ai reset di chat e diventare memoria esplicita del progetto.",
    },
  ],
});
