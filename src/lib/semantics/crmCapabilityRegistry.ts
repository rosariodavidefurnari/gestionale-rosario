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
        "Config centrale per marchio, tipi, regole fiscali, AI e operativita'.",
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
      description: "Apre il form pagamenti gia' precompilato dal preventivo.",
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
      description: "Crea un pagamento leggendo il saldo operativo dal progetto.",
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
