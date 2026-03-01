// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useIsMobile = vi.fn();
const getUnifiedCrmReadContext = vi.fn();
const askUnifiedCrmQuestion = vi.fn();
const getInvoiceImportWorkspace = vi.fn();
const uploadInvoiceImportFiles = vi.fn();
const generateInvoiceImportDraft = vi.fn();
const confirmInvoiceImportDraft = vi.fn();
const notify = vi.fn();

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobile(),
}));

vi.mock("ra-core", async () => {
  const actual = await vi.importActual<typeof import("ra-core")>("ra-core");
  return {
    ...actual,
    useDataProvider: () => ({
      getUnifiedCrmReadContext,
      askUnifiedCrmQuestion,
      getInvoiceImportWorkspace,
      uploadInvoiceImportFiles,
      generateInvoiceImportDraft,
      confirmInvoiceImportDraft,
    }),
    useNotify: () => notify,
  };
});

vi.mock("../root/ConfigurationContext", () => ({
  useConfigurationContext: () => ({
    aiConfig: {
      historicalAnalysisModel: "gpt-5.2",
      invoiceExtractionModel: "gemini-2.5-pro",
    },
  }),
}));

import { UnifiedAiLauncher } from "./UnifiedAiLauncher";

const renderLauncher = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UnifiedAiLauncher />
    </QueryClientProvider>,
  );
};

describe("UnifiedAiLauncher", () => {
  beforeEach(() => {
    useIsMobile.mockReset();
    useIsMobile.mockReturnValue(false);
    getUnifiedCrmReadContext.mockReset();
    askUnifiedCrmQuestion.mockReset();
    getInvoiceImportWorkspace.mockReset();
    uploadInvoiceImportFiles.mockReset();
    generateInvoiceImportDraft.mockReset();
    confirmInvoiceImportDraft.mockReset();
    notify.mockReset();

    getUnifiedCrmReadContext.mockResolvedValue({
      meta: {
        generatedAt: "2026-02-28T22:00:00.000Z",
        generatedAtLabel: "28/02/26, 23:00",
        businessTimezone: "Europe/Rome",
        routePrefix: "/#/",
        scope: "crm_read_snapshot",
      },
      registries: {
        semantic: {
          dictionaries: {
            clientTypes: [],
            acquisitionSources: [],
            projectCategories: [],
            projectStatuses: [],
            projectTvShows: [],
            quoteStatuses: [],
            quoteServiceTypes: [],
            serviceTypes: [],
            paymentTypes: [],
            paymentMethods: [],
            paymentStatuses: [],
          },
          fields: {
            descriptions: [],
            dates: [],
          },
          rules: {
            serviceNetValue: {
              formula: "",
              taxableFlagField: "is_taxable",
              meaning: "",
            },
            travelReimbursement: {
              formula: "",
              defaultKmRate: 0.19,
              meaning: "",
            },
            dateRanges: {
              allDayField: "all_day",
              meaning: "",
            },
            quoteStatusEmail: {
              outstandingDueFormula: "",
              automaticBlockerField: "services.is_taxable",
              meaning: "",
            },
            invoiceImport: {
              customerInvoiceResource: "payments",
              supplierInvoiceResource: "expenses",
              confirmationRule: "",
              meaning: "",
            },
            unifiedAiReadContext: {
              scope: "clients + quotes + projects + payments + expenses",
              freshnessField: "generatedAt",
              meaning: "",
            },
          },
        },
        capability: {
          routing: {
            mode: "hash",
            routePrefix: "/#/",
            meaning: "",
          },
          resources: [],
          pages: [],
          dialogs: [],
          actions: [],
          communications: {
            quoteStatusEmails: {
              provider: "gmail_smtp",
              description: "",
              sharedBlocks: [],
              safetyRules: [],
              requiredEnvKeys: [],
              templates: [],
            },
            internalPriorityNotifications: {
              provider: "callmebot",
              description: "",
              useCases: [],
              requiredEnvKeys: [],
              rules: [],
            },
          },
          integrationChecklist: [],
        },
      },
      snapshot: {
        counts: {
          clients: 1,
          quotes: 1,
          openQuotes: 1,
          activeProjects: 1,
          pendingPayments: 1,
          expenses: 1,
        },
        totals: {
          openQuotesAmount: 1200,
          pendingPaymentsAmount: 800,
          expensesAmount: 300,
        },
        recentClients: [
          {
            clientId: "client-1",
            clientName: "MARIO ROSSI STUDIO",
            operationalName: "Mario Rossi",
            billingName: "MARIO ROSSI STUDIO",
            email: "mario@example.com",
            vatNumber: "IT12345678901",
            fiscalCode: "RSSMRA80A01C351Z",
            billingAddress: "Via Etnea, 10 · 95100 Catania CT · IT",
            billingCity: "Catania",
            billingSdiCode: "M5UXCR1",
            billingPec: "mario@examplepec.it",
            createdAt: "2026-02-20T10:00:00.000Z",
          },
        ],
        openQuotes: [
          {
            quoteId: "quote-1",
            clientId: "client-1",
            projectId: "project-1",
            clientName: "MARIO ROSSI STUDIO",
            projectName: "Wedding Mario",
            amount: 1200,
            linkedPaymentsTotal: 0,
            remainingAmount: 1200,
            status: "in_trattativa",
            statusLabel: "In trattativa",
            createdAt: "2026-02-20T10:00:00.000Z",
          },
        ],
        activeProjects: [
          {
            projectId: "project-1",
            clientId: "client-1",
            projectName: "Wedding Mario",
            clientName: "MARIO ROSSI STUDIO",
            status: "in_corso",
            statusLabel: "In corso",
            startDate: "2026-02-20T10:00:00.000Z",
            totalServices: 0,
            totalFees: 0,
            totalExpenses: 0,
            totalPaid: 0,
            balanceDue: 0,
          },
        ],
        pendingPayments: [
          {
            paymentId: "payment-1",
            quoteId: "quote-1",
            clientId: "client-1",
            projectId: "project-1",
            clientName: "MARIO ROSSI STUDIO",
            projectName: "Wedding Mario",
            amount: 800,
            status: "in_attesa",
            statusLabel: "In attesa",
            paymentDate: "2026-03-10T00:00:00.000Z",
          },
        ],
        recentExpenses: [
          {
            expenseId: "expense-1",
            clientId: null,
            projectId: null,
            clientName: null,
            projectName: null,
            amount: 300,
            expenseType: "noleggio",
            expenseTypeLabel: "Noleggio",
            expenseDate: "2026-02-18T00:00:00.000Z",
            description: "Noleggio luci",
          },
        ],
      },
      caveats: [],
    });

    getInvoiceImportWorkspace.mockResolvedValue({
      clients: [
        {
          id: "client-1",
          name: "Mario Rossi",
          email: "mario@example.com",
        },
      ],
      projects: [
        {
          id: "project-1",
          name: "Wedding Mario",
          client_id: "client-1",
        },
      ],
    });
  });

  it("opens on chat view and lets the user reach snapshot/import from the launcher menu", async () => {
    renderLauncher();

    const launcherButton = screen.getByRole("button", {
      name: "Apri chat AI unificata",
    });

    fireEvent.click(launcherButton);

    expect(await screen.findByText("Chat AI")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Dammi un riepilogo operativo rapido del CRM.",
      }),
    ).toBeInTheDocument();
    const composer = screen.getByTestId("unified-crm-composer");
    const composerMenuButton = within(composer).getByRole("button", {
      name: "Apri altre viste AI",
    });
    expect(
      within(composer).getByLabelText("Fai una domanda sul CRM corrente"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Snapshot CRM")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Documenti")).not.toBeInTheDocument();

    fireEvent.pointerDown(composerMenuButton);

    expect(
      await screen.findByRole("menuitem", { name: "Snapshot CRM" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Importa fatture e ricevute" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Snapshot CRM" }));

    expect(await screen.findByText("Pagamenti da seguire")).toBeInTheDocument();
    expect(await screen.findByText("Clienti recenti")).toBeInTheDocument();
    expect(
      (await screen.findAllByText("MARIO ROSSI STUDIO")).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByText(/P\.IVA IT12345678901/)).toBeInTheDocument();
    expect(
      await screen.findByText(/PEC mario@examplepec.it/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Torna alla chat AI" }));

    expect(await screen.findByText("Chat AI")).toBeInTheDocument();
    await waitFor(() =>
      expect(getInvoiceImportWorkspace).toHaveBeenCalledTimes(1),
    );
    expect(getUnifiedCrmReadContext).toHaveBeenCalledTimes(1);
  });

  it("asks a read-only CRM question inside the launcher", async () => {
    askUnifiedCrmQuestion.mockResolvedValue({
      question: "Dammi un riepilogo operativo rapido del CRM.",
      model: "gpt-5.2",
      generatedAt: "2026-02-28T22:05:00.000Z",
      answerMarkdown:
        "## Risposta breve\nTutto sotto controllo.\n\n## Dati usati\n- 1 preventivo aperto.\n- 1 pagamento pendente.",
      paymentDraft: {
        id: "payment-draft-from-open-quote",
        resource: "payments",
        originActionId: "quote_create_payment",
        draftKind: "payment_create",
        label: "Bozza pagamento dal preventivo aperto",
        explanation:
          "Questa bozza usa il residuo ancora non collegato del preventivo aperto principale. Puoi correggerla qui e poi aprire il form pagamenti per confermare davvero.",
        quoteId: "quote-1",
        clientId: "client-1",
        projectId: "project-1",
        paymentType: "saldo",
        amount: 450,
        status: "in_attesa",
        href: "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
      },
      suggestedActions: [
        {
          id: "quote-create-payment-handoff",
          kind: "approved_action",
          resource: "payments",
          capabilityActionId: "quote_create_payment",
          label: "Registra pagamento dal preventivo",
          description: "Apre il form pagamenti precompilato dal preventivo.",
          recommended: true,
          recommendationReason:
            "Consigliata perche il preventivo rilevante e' in stato accettato e qui il pagamento si apre gia precompilato dal record corretto.",
          href: "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&launcher_action=quote_create_payment&launcher_source=unified_ai_launcher",
        },
        {
          id: "open-dashboard",
          kind: "page",
          resource: "dashboard",
          label: "Apri la dashboard",
          description: "Torna al quadro generale.",
          href: "/#/",
        },
      ],
    });

    renderLauncher();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    );

    const suggestionButton = await screen.findByRole("button", {
      name: "Dammi un riepilogo operativo rapido del CRM.",
    });

    await waitFor(() => expect(suggestionButton).toBeEnabled());

    fireEvent.click(suggestionButton);

    await waitFor(() => expect(askUnifiedCrmQuestion).toHaveBeenCalledTimes(1));

    expect(askUnifiedCrmQuestion).toHaveBeenCalledWith(
      "Dammi un riepilogo operativo rapido del CRM.",
      expect.objectContaining({
        meta: expect.objectContaining({
          scope: "crm_read_snapshot",
        }),
      }),
    );

    expect(
      await screen.findByText("Tutto sotto controllo."),
    ).toBeInTheDocument();
    const answerPanel = await screen.findByTestId("unified-crm-answer");
    const composer = screen.getByTestId("unified-crm-composer");
    expect(
      answerPanel.compareDocumentPosition(composer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      await screen.findByText("Bozza pagamento proposta"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Azioni suggerite")).toBeInTheDocument();
    expect(
      screen.getByText("Registra pagamento dal preventivo"),
    ).toBeInTheDocument();
    expect(screen.getByText("Consigliata ora")).toBeInTheDocument();
    expect(screen.getByText("Azione approvata")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Consigliata perche il preventivo rilevante e' in stato accettato e qui il pagamento si apre gia precompilato dal record corretto.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Apri form pagamenti con questa bozza",
      }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("450")).toBeInTheDocument();
    expect(
      screen.getByText("Registra pagamento dal preventivo").closest("a"),
    ).toHaveAttribute(
      "href",
      "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&launcher_action=quote_create_payment&launcher_source=unified_ai_launcher",
    );
    expect(
      screen.getByText("Apri form pagamenti con questa bozza").closest("a"),
    ).toHaveAttribute(
      "href",
      "/#/payments/create?quote_id=quote-1&client_id=client-1&project_id=project-1&payment_type=saldo&amount=450&status=in_attesa&launcher_source=unified_ai_launcher&launcher_action=quote_create_payment&draft_kind=payment_create",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Tutto sotto controllo.")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    );

    expect(
      await screen.findByText("Tutto sotto controllo."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Bozza pagamento proposta")).toBeInTheDocument();
    expect(askUnifiedCrmQuestion).toHaveBeenCalledTimes(1);
  });

  it("uploads files, generates a draft, and confirms the import", async () => {
    uploadInvoiceImportFiles.mockResolvedValue([
      {
        path: "ai-invoice-imports/fattura-1.pdf",
        name: "fattura-1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    ]);
    generateInvoiceImportDraft.mockResolvedValue({
      model: "gemini-2.5-pro",
      generatedAt: "2026-02-28T22:00:00.000Z",
      summary: "Bozza pronta",
      warnings: [],
      records: [
        {
          id: "draft-1",
          sourceFileNames: ["fattura-1.pdf"],
          resource: "payments",
          confidence: "high",
          documentType: "customer_invoice",
          counterpartyName: "Mario Rossi",
          invoiceRef: "FAT-12",
          amount: 1200,
          documentDate: "2026-02-20",
          clientId: "client-1",
          projectId: "project-1",
          paymentType: "saldo",
          paymentMethod: "bonifico",
          paymentStatus: "in_attesa",
        },
      ],
    });
    confirmInvoiceImportDraft.mockResolvedValue({
      created: [
        {
          resource: "payments",
          id: "payment-1",
          invoiceRef: "FAT-12",
          amount: 1200,
        },
      ],
    });

    renderLauncher();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    );

    fireEvent.pointerDown(
      await screen.findByRole("button", { name: "Apri altre viste AI" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Importa fatture e ricevute",
      }),
    );

    const fileInput = await screen.findByLabelText("Documenti");
    const file = new File(["invoice"], "fattura-1.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analizza documenti" }));

    expect(await screen.findByText("Bozza pronta")).toBeInTheDocument();
    expect(uploadInvoiceImportFiles).toHaveBeenCalledWith([file]);
    expect(generateInvoiceImportDraft).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Conferma import nel CRM" }),
    );

    await waitFor(() =>
      expect(confirmInvoiceImportDraft).toHaveBeenCalledTimes(1),
    );
    expect(await screen.findByText("Import completato")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    );
    fireEvent.pointerDown(
      await screen.findByRole("button", { name: "Apri altre viste AI" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Importa fatture e ricevute",
      }),
    );

    expect(screen.queryByText("Bozza pronta")).not.toBeInTheDocument();
    expect(screen.queryByText("Import completato")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analizza documenti" }),
    ).toBeDisabled();
  });

  it("uses the full mobile viewport for the launcher drawer", async () => {
    useIsMobile.mockReturnValue(true);

    renderLauncher();
    fireEvent.click(
      screen.getByRole("button", { name: "Apri chat AI unificata" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("inset-0");
    expect(dialog.className).toContain("h-dvh");
    expect(dialog.className).toContain("rounded-none");
  });
});
