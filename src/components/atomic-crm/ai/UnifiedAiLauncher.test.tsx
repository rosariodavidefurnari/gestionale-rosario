// @vitest-environment jsdom

import "@/setupTests";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useIsMobile = vi.fn();
const getUnifiedCrmReadContext = vi.fn();
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
            clientName: "Mario Rossi",
            email: "mario@example.com",
            createdAt: "2026-02-20T10:00:00.000Z",
          },
        ],
        openQuotes: [
          {
            quoteId: "quote-1",
            clientName: "Mario Rossi",
            projectName: "Wedding Mario",
            amount: 1200,
            status: "in_trattativa",
            statusLabel: "In trattativa",
            createdAt: "2026-02-20T10:00:00.000Z",
          },
        ],
        activeProjects: [
          {
            projectId: "project-1",
            projectName: "Wedding Mario",
            clientName: "Mario Rossi",
            status: "in_corso",
            statusLabel: "In corso",
            startDate: "2026-02-20T10:00:00.000Z",
          },
        ],
        pendingPayments: [
          {
            paymentId: "payment-1",
            clientName: "Mario Rossi",
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

  it("opens the launcher and shows the invoice chat shell", async () => {
    renderLauncher();

    const launcherButton = screen.getByRole("button", {
      name: "Apri chat AI unificata",
    });

    fireEvent.click(launcherButton);

    expect(await screen.findByText("Chat AI fatture")).toBeInTheDocument();
    expect(await screen.findByText("Snapshot CRM")).toBeInTheDocument();
    expect(
      screen.getByText(/Carica PDF, scansioni o foto/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(getInvoiceImportWorkspace).toHaveBeenCalledTimes(1),
    );
    expect(getUnifiedCrmReadContext).toHaveBeenCalledTimes(1);
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
  });
});
