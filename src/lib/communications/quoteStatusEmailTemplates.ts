import { formatDateRange } from "@/components/atomic-crm/misc/formatDateRange";
import { quoteStatusLabels } from "@/components/atomic-crm/quotes/quotesTypes";
import type { Client, Quote } from "@/components/atomic-crm/types";

export type QuoteStatusEmailSendPolicy = "never" | "manual" | "recommended";

export type QuoteStatusEmailTemplateDefinition = {
  templateId: string;
  status: string;
  statusLabel: string;
  sendPolicy: QuoteStatusEmailSendPolicy;
  purpose: string;
  ctaLabel?: string;
  requiredDynamicFields: string[];
  optionalDynamicFields: string[];
};

export type BuildQuoteStatusEmailInput = {
  quote: Pick<
    Quote,
    | "status"
    | "description"
    | "amount"
    | "event_start"
    | "event_end"
    | "all_day"
    | "sent_date"
    | "response_date"
    | "rejection_reason"
  >;
  client?: Pick<Client, "name" | "email"> | null;
  serviceLabel?: string | null;
  projectName?: string | null;
  publicQuoteUrl?: string | null;
  paymentAmount?: number | null;
  amountPaid?: number | null;
  amountDue?: number | null;
  businessName?: string;
  supportEmail?: string | null;
  customMessage?: string | null;
  hasNonTaxableServices?: boolean | null;
};

export type BuiltQuoteStatusEmailTemplate = QuoteStatusEmailTemplateDefinition & {
  canSend: boolean;
  automaticSendAllowed: boolean;
  automaticSendBlockReason?: string;
  missingFields: string[];
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

export type QuoteStatusEmailSendRequest = {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateId: string;
  status: string;
  quoteId?: string | number | null;
  automatic?: boolean;
  hasNonTaxableServices?: boolean | null;
};

export type QuoteStatusEmailSendResponse = {
  messageId?: string;
  accepted: string[];
  rejected: string[];
  response?: string;
};

type EmailSection = {
  title: string;
  body: string;
};

const DEFAULT_BUSINESS_NAME = "Rosario Furnari";

const formatCurrency = (value?: number | null) =>
  Number(value ?? 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const toParagraphs = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const quoteStatusEmailDefinitions: Record<string, QuoteStatusEmailTemplateDefinition> = {
  primo_contatto: {
    templateId: "quote-status.primo-contatto",
    status: "primo_contatto",
    statusLabel: quoteStatusLabels.primo_contatto ?? "Primo contatto",
    sendPolicy: "never",
    purpose: "Stato interno iniziale: non va trasformato in mail cliente automatica.",
    requiredDynamicFields: [],
    optionalDynamicFields: [],
  },
  preventivo_inviato: {
    templateId: "quote-status.preventivo-inviato",
    status: "preventivo_inviato",
    statusLabel: quoteStatusLabels.preventivo_inviato ?? "Preventivo inviato",
    sendPolicy: "recommended",
    purpose: "Inviare il preventivo e spiegare i prossimi passi al cliente.",
    ctaLabel: "Apri il preventivo",
    requiredDynamicFields: ["client_name", "client_email", "quote_description"],
    optionalDynamicFields: [
      "public_quote_url",
      "service_label",
      "event_range",
      "support_email",
    ],
  },
  in_trattativa: {
    templateId: "quote-status.in-trattativa",
    status: "in_trattativa",
    statusLabel: quoteStatusLabels.in_trattativa ?? "In trattativa",
    sendPolicy: "manual",
    purpose: "Aggiornare il cliente quando il preventivo e' in confronto o revisione.",
    ctaLabel: "Rivedi il preventivo",
    requiredDynamicFields: ["client_name", "client_email", "quote_description"],
    optionalDynamicFields: ["public_quote_url", "custom_message", "support_email"],
  },
  accettato: {
    templateId: "quote-status.accettato",
    status: "accettato",
    statusLabel: quoteStatusLabels.accettato ?? "Accettato",
    sendPolicy: "recommended",
    purpose: "Confermare al cliente che il preventivo e' stato preso in carico.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["project_name", "event_range", "support_email"],
  },
  acconto_ricevuto: {
    templateId: "quote-status.acconto-ricevuto",
    status: "acconto_ricevuto",
    statusLabel: quoteStatusLabels.acconto_ricevuto ?? "Acconto ricevuto",
    sendPolicy: "recommended",
    purpose: "Confermare al cliente che il primo pagamento e' stato registrato.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: [
      "payment_amount",
      "amount_paid",
      "amount_due",
      "support_email",
    ],
  },
  in_lavorazione: {
    templateId: "quote-status.in-lavorazione",
    status: "in_lavorazione",
    statusLabel: quoteStatusLabels.in_lavorazione ?? "In lavorazione",
    sendPolicy: "manual",
    purpose: "Segnalare al cliente che il lavoro e' partito davvero.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["project_name", "event_range", "support_email"],
  },
  completato: {
    templateId: "quote-status.completato",
    status: "completato",
    statusLabel: quoteStatusLabels.completato ?? "Completato",
    sendPolicy: "recommended",
    purpose: "Avvisare il cliente che il lavoro e' completato.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["amount_due", "support_email", "custom_message"],
  },
  saldato: {
    templateId: "quote-status.saldato",
    status: "saldato",
    statusLabel: quoteStatusLabels.saldato ?? "Saldato",
    sendPolicy: "recommended",
    purpose: "Chiudere il lavoro comunicando che il preventivo e' completamente saldato.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["amount_paid", "support_email"],
  },
  rifiutato: {
    templateId: "quote-status.rifiutato",
    status: "rifiutato",
    statusLabel: quoteStatusLabels.rifiutato ?? "Rifiutato",
    sendPolicy: "manual",
    purpose: "Usare solo se vuoi mandare un messaggio di chiusura o cortesia.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["rejection_reason", "support_email", "custom_message"],
  },
  perso: {
    templateId: "quote-status.perso",
    status: "perso",
    statusLabel: quoteStatusLabels.perso ?? "Perso",
    sendPolicy: "never",
    purpose: "Stato interno di pipeline: non va inviato automaticamente al cliente.",
    requiredDynamicFields: [],
    optionalDynamicFields: [],
  },
};

export const quoteStatusEmailTemplateDefinitions = Object.values(
  quoteStatusEmailDefinitions,
);

export const getQuoteStatusEmailTemplateDefinition = (status: string) =>
  quoteStatusEmailDefinitions[status] ?? {
    templateId: `quote-status.${status}`,
    status,
    statusLabel: quoteStatusLabels[status] ?? status,
    sendPolicy: "manual",
    purpose: "Stato non ancora classificato per l'invio mail cliente.",
    requiredDynamicFields: ["client_name", "client_email"],
    optionalDynamicFields: ["custom_message"],
  };

const getAutomaticSendBlockReason = (input: BuildQuoteStatusEmailInput) => {
  if (input.hasNonTaxableServices) {
    return "Invio automatico vietato: il flusso include servizi con is_taxable = false.";
  }

  return undefined;
};

const buildSummaryRows = (input: BuildQuoteStatusEmailInput) => {
  const rows = [
    {
      label: "Preventivo",
      value: input.quote.description?.trim() || "Preventivo",
    },
    {
      label: "Stato",
      value: quoteStatusLabels[input.quote.status] ?? input.quote.status,
    },
    {
      label: "Importo",
      value: formatCurrency(input.quote.amount),
    },
  ];

  if (input.serviceLabel) {
    rows.push({ label: "Tipo", value: input.serviceLabel });
  }

  const eventRange = formatDateRange(
    input.quote.event_start,
    input.quote.event_end,
    input.quote.all_day,
  );
  if (eventRange) {
    rows.push({ label: "Quando", value: eventRange });
  }

  if (input.projectName) {
    rows.push({ label: "Progetto", value: input.projectName });
  }

  if (input.amountPaid != null) {
    rows.push({ label: "Gia' registrato", value: formatCurrency(input.amountPaid) });
  }

  if (input.amountDue != null) {
    rows.push({ label: "Residuo", value: formatCurrency(input.amountDue) });
  }

  return rows;
};

const buildStatusCopy = (
  definition: QuoteStatusEmailTemplateDefinition,
  input: BuildQuoteStatusEmailInput,
): {
  subject: string;
  previewText: string;
  intro: string;
  sections: EmailSection[];
  ctaUrl?: string;
} => {
  const clientName = input.client?.name?.trim() || "cliente";
  const quoteTitle = input.quote.description?.trim() || "Preventivo";
  const businessName = input.businessName?.trim() || DEFAULT_BUSINESS_NAME;
  const amountPaid = formatCurrency(
    input.amountPaid ?? input.paymentAmount ?? input.quote.amount,
  );
  const amountDue = formatCurrency(input.amountDue);

  switch (definition.status) {
    case "preventivo_inviato":
      return {
        subject: `${quoteTitle} - preventivo inviato`,
        previewText: "Ti ho inviato il preventivo con i dettagli principali.",
        intro: `Ciao ${clientName}, ti invio il preventivo aggiornato. Qui sotto trovi il riepilogo essenziale e il prossimo passo.`,
        sections: [
          {
            title: "Cosa aspettarti adesso",
            body: "Puoi rivedere i dettagli, l'importo e le date previste. Se vuoi confermare o fare domande, puoi rispondere a questa mail.",
          },
        ],
        ctaUrl: input.publicQuoteUrl ?? undefined,
      };
    case "in_trattativa":
      return {
        subject: `${quoteTitle} - aggiornamento sulla trattativa`,
        previewText: "Il preventivo e' in revisione o confronto.",
        intro: `Ciao ${clientName}, sto aggiornando il preventivo e lo tengo in stato di trattativa per allineare bene dettagli, tempi o condizioni.`,
        sections: [
          {
            title: "Perche' ricevi questa mail",
            body:
              input.customMessage?.trim() ||
              "Sto lavorando sugli ultimi punti aperti prima della conferma finale. Se vuoi aggiungere una nota o un chiarimento, puoi rispondere direttamente.",
          },
        ],
        ctaUrl: input.publicQuoteUrl ?? undefined,
      };
    case "accettato":
      return {
        subject: `${quoteTitle} - conferma ricevuta`,
        previewText: "Il preventivo risulta confermato.",
        intro: `Ciao ${clientName}, ho registrato la conferma del preventivo. Da questo momento il lavoro entra nel flusso operativo.`,
        sections: [
          {
            title: "Prossimo passo",
            body:
              input.projectName?.trim()
                ? `Il lavoro e' ora collegato al progetto "${input.projectName}".`
                : "Ti aggiornero' man mano che il lavoro passa alle fasi operative.",
          },
        ],
      };
    case "acconto_ricevuto":
      return {
        subject: `${quoteTitle} - acconto registrato`,
        previewText: "Il primo pagamento risulta registrato correttamente.",
        intro: `Ciao ${clientName}, ho registrato l'acconto relativo al preventivo.`,
        sections: [
          {
            title: "Riepilogo pagamento",
            body:
              input.amountDue != null
                ? `Importo registrato: ${amountPaid}. Residuo ancora aperto: ${amountDue}.`
                : `Importo registrato: ${amountPaid}.`,
          },
        ],
      };
    case "in_lavorazione":
      return {
        subject: `${quoteTitle} - lavoro avviato`,
        previewText: "Il lavoro e' ufficialmente in lavorazione.",
        intro: `Ciao ${clientName}, il lavoro collegato al preventivo e' partito e risulta ora in lavorazione.`,
        sections: [
          {
            title: "Stato operativo",
            body:
              input.customMessage?.trim() ||
              "Se dovesse servire un aggiornamento puntuale su tempi o consegne, puoi rispondere a questa mail.",
          },
        ],
      };
    case "completato":
      return {
        subject: `${quoteTitle} - lavoro completato`,
        previewText: "Il lavoro risulta completato.",
        intro: `Ciao ${clientName}, ti confermo che il lavoro legato al preventivo risulta completato.`,
        sections: [
          {
            title: "Chiusura operativa",
            body:
              input.amountDue != null
                ? `Il lavoro e' chiuso dal punto di vista operativo. Residuo economico ancora aperto: ${amountDue}.`
                : "Il lavoro e' chiuso dal punto di vista operativo.",
          },
          ...(input.customMessage?.trim()
            ? [{ title: "Nota", body: input.customMessage.trim() }]
            : []),
        ],
      };
    case "saldato":
      return {
        subject: `${quoteTitle} - saldo completato`,
        previewText: "Il preventivo risulta completamente saldato.",
        intro: `Ciao ${clientName}, il preventivo risulta ora completamente saldato.`,
        sections: [
          {
            title: "Chiusura amministrativa",
            body: `Totale registrato: ${amountPaid}. Grazie per la collaborazione.`,
          },
        ],
      };
    case "rifiutato":
      return {
        subject: `${quoteTitle} - chiusura preventivo`,
        previewText: "Mail di chiusura da usare solo manualmente.",
        intro: `Ciao ${clientName}, chiudo il preventivo nel gestionale.`,
        sections: [
          {
            title: "Nota",
            body:
              input.customMessage?.trim() ||
              input.quote.rejection_reason?.trim() ||
              "Ti ringrazio per il confronto. Se in futuro vorrai riaprire il discorso, possiamo ripartire da qui.",
          },
        ],
      };
    default:
      return {
        subject: `${quoteTitle} - aggiornamento stato`,
        previewText: `Aggiornamento stato: ${definition.statusLabel}.`,
        intro: `Ciao ${clientName}, il preventivo e' stato aggiornato in stato "${definition.statusLabel}".`,
        sections: [
          {
            title: "Aggiornamento",
            body:
              input.customMessage?.trim() ||
              `Questo messaggio conferma l'aggiornamento dello stato nel CRM di ${businessName}.`,
          },
        ],
      };
  }
};

const renderHtml = ({
  businessName,
  previewText,
  subject,
  intro,
  summaryRows,
  sections,
  ctaLabel,
  ctaUrl,
  supportEmail,
}: {
  businessName: string;
  previewText: string;
  subject: string;
  intro: string;
  summaryRows: Array<{ label: string; value: string }>;
  sections: EmailSection[];
  ctaLabel?: string;
  ctaUrl?: string;
  supportEmail?: string | null;
}) => {
  const summaryHtml = summaryRows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:13px;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join("");

  const sectionsHtml = sections
    .map(
      (section) => `
        <div style="margin-top:20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(section.title)}</p>
          ${toParagraphs(section.body)
            .map(
              (paragraph) =>
                `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(paragraph)}</p>`,
            )
            .join("")}
        </div>`,
    )
    .join("");

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<div style="margin-top:24px;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
        </div>`
      : "";

  const footerHtml = supportEmail
    ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">Se ti serve un chiarimento puoi rispondere a questa mail o scrivere a ${escapeHtml(
        supportEmail,
      )}.</p>`
    : `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">Se ti serve un chiarimento puoi rispondere a questa mail.</p>`;

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 24px 16px;background:#0f172a;color:#ffffff;">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#cbd5e1;">Aggiornamento preventivo</p>
        <h1 style="margin:0;font-size:24px;line-height:1.3;">${escapeHtml(subject)}</h1>
        <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">${escapeHtml(businessName)}</p>
      </div>
      <div style="padding:24px;">
        ${toParagraphs(intro)
          .map(
            (paragraph) =>
              `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(paragraph)}</p>`,
          )
          .join("")}
        <div style="margin-top:20px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
          <table style="width:100%;border-collapse:collapse;">${summaryHtml}</table>
        </div>
        ${sectionsHtml}
        ${ctaHtml}
        ${footerHtml}
      </div>
    </div>
  </body>
</html>`;
};

const renderText = ({
  businessName,
  subject,
  intro,
  summaryRows,
  sections,
  ctaLabel,
  ctaUrl,
  supportEmail,
}: {
  businessName: string;
  subject: string;
  intro: string;
  summaryRows: Array<{ label: string; value: string }>;
  sections: EmailSection[];
  ctaLabel?: string;
  ctaUrl?: string;
  supportEmail?: string | null;
}) =>
  [
    businessName,
    subject,
    "",
    ...toParagraphs(intro),
    "",
    "Riepilogo",
    ...summaryRows.map((row) => `- ${row.label}: ${row.value}`),
    "",
    ...sections.flatMap((section) => [
      section.title,
      ...toParagraphs(section.body),
      "",
    ]),
    ...(ctaLabel && ctaUrl ? [`${ctaLabel}: ${ctaUrl}`, ""] : []),
    supportEmail
      ? `Per chiarimenti puoi rispondere a questa mail o scrivere a ${supportEmail}.`
      : "Per chiarimenti puoi rispondere a questa mail.",
  ].join("\n");

const resolveMissingFields = (
  definition: QuoteStatusEmailTemplateDefinition,
  input: BuildQuoteStatusEmailInput,
) => {
  const eventRange = formatDateRange(
    input.quote.event_start,
    input.quote.event_end,
    input.quote.all_day,
  );

  const fieldMap: Record<string, boolean> = {
    client_name: !!input.client?.name?.trim(),
    client_email: !!input.client?.email?.trim(),
    quote_description: !!input.quote.description?.trim(),
    public_quote_url: !!input.publicQuoteUrl?.trim(),
    service_label: !!input.serviceLabel?.trim(),
    event_range: !!eventRange,
    project_name: !!input.projectName?.trim(),
    payment_amount: input.paymentAmount != null,
    amount_paid: input.amountPaid != null,
    amount_due: input.amountDue != null,
    support_email: !!input.supportEmail?.trim(),
    rejection_reason: !!input.quote.rejection_reason?.trim(),
    custom_message: !!input.customMessage?.trim(),
  };

  return definition.requiredDynamicFields.filter((field) => !fieldMap[field]);
};

export const buildQuoteStatusEmailTemplate = (
  input: BuildQuoteStatusEmailInput,
): BuiltQuoteStatusEmailTemplate => {
  const definition = getQuoteStatusEmailTemplateDefinition(input.quote.status);
  const missingFields = resolveMissingFields(definition, input);
  const automaticSendBlockReason = getAutomaticSendBlockReason(input);
  const businessName = input.businessName?.trim() || DEFAULT_BUSINESS_NAME;
  const summaryRows = buildSummaryRows(input);
  const statusCopy = buildStatusCopy(definition, input);
  const canSend = definition.sendPolicy !== "never" && missingFields.length === 0;
  const automaticSendAllowed =
    definition.sendPolicy === "recommended" &&
    missingFields.length === 0 &&
    !automaticSendBlockReason;

  return {
    ...definition,
    canSend,
    automaticSendAllowed,
    automaticSendBlockReason,
    missingFields,
    subject: statusCopy.subject,
    previewText: statusCopy.previewText,
    html: renderHtml({
      businessName,
      previewText: statusCopy.previewText,
      subject: statusCopy.subject,
      intro: statusCopy.intro,
      summaryRows,
      sections: statusCopy.sections,
      ctaLabel: definition.ctaLabel,
      ctaUrl: statusCopy.ctaUrl,
      supportEmail: input.supportEmail,
    }),
    text: renderText({
      businessName,
      subject: statusCopy.subject,
      intro: statusCopy.intro,
      summaryRows,
      sections: statusCopy.sections,
      ctaLabel: definition.ctaLabel,
      ctaUrl: statusCopy.ctaUrl,
      supportEmail: input.supportEmail,
    }),
  };
};
