import { todayISODate } from "@/lib/dateTimezone";
import type { BusinessProfile, Client } from "../types";
import {
  computeInvoiceDraftTotals,
  getInvoiceDraftLineTotal,
  normalizeInvoiceDraftLineItems,
  type InvoiceDraftInput,
  type InvoiceDraftLineItem,
} from "./invoiceDraftTypes";

// ── Constants ────────────────────────────────────────────────────────

/** Aruba PEC fiscal code — required as IdTrasmittente for XML upload. */
const ARUBA_PEC_CF = "01879020517";

const XML_NAMESPACE =
  "http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";

const CAUSALE =
  "Operazione non soggetta a ritenuta alla fonte a titolo di acconto " +
  "ai sensi dell'articolo 1, comma 67, l. n. 190 del 2014 e successive modificazioni";

const RIFERIMENTO_NORMATIVO = "Non soggette - altri casi";

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Replacement table for characters that fall outside FatturaPA's
 * `String*LatinType` pattern `[\x00-\x7F\xA0-\xFF]*`. The SdI / Aruba
 * validator strips anything outside this range, so we substitute known
 * characters with ASCII fallbacks before emitting the XML.
 *
 * Notable members:
 * - `€` (U+20AC) — currency symbol is OUT of Latin-1, must become "EUR"
 * - `–` (U+2013, en-dash) — must become "-"
 * - `—` (U+2014, em-dash) — must become "-"
 *
 * Characters that ARE in Latin-1 and need NO replacement:
 * - `·` (U+00B7 middle dot), `×` (U+00D7), `°` (U+00B0), `©`, `®`
 */
const LATIN_REPLACEMENTS: Record<string, string> = {
  "\u20AC": "EUR", // €
  "\u2013": "-", // –
  "\u2014": "-", // —
  "\u2012": "-", // figure dash
  "\u2015": "-", // horizontal bar
  "\u2018": "'", // ‘
  "\u2019": "'", // ’
  "\u201A": "'", // ‚
  "\u201C": '"', // “
  "\u201D": '"', // ”
  "\u201E": '"', // „
  "\u2026": "...", // …
  "\u2022": "*", // •
  "\u2192": "->", // →
  "\u2190": "<-", // ←
  "\u2194": "<->", // ↔
  "\u00A0": " ", // NBSP → space (NBSP is Latin-1 but some validators
  //                 treat it strictly; normalize to plain space)
};

/**
 * Sanitize a string so it matches FatturaPA's `String*LatinType` pattern.
 * First apply the replacement table for common non-Latin-1 characters,
 * then strip any remaining code point outside `[\x00-\x7F\xA0-\xFF]`.
 * Exported for unit tests.
 */
// eslint-disable-next-line no-control-regex
const NON_LATIN1_RE = /[^\x00-\x7F\xA0-\xFF]/gu;

export const sanitizeLatinForFatturaPA = (s: string): string => {
  let result = s;
  for (const [from, to] of Object.entries(LATIN_REPLACEMENTS)) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }
  return result.replace(NON_LATIN1_RE, "");
};

/**
 * Escape XML special characters AND sanitize characters outside the
 * FatturaPA Latin-1 pattern. All string values flowing into the XML
 * body pass through this.
 */
const esc = (s: string) =>
  sanitizeLatinForFatturaPA(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Consolidate km reimbursement lines (`kind: "km"`) into the preceding
 * service line so the resulting XML has one line per work item instead
 * of interleaved service+km pairs. Rationale:
 *
 *  - Some validators / receivers (Aruba PEC) dislike lines that are
 *    not clearly "products/services" and expose odd descriptions
 *    ("Rimborso chilometrico · Via... – ...").
 *  - In regime forfettario the km reimbursement is fully taxable
 *    revenue, same as the fee — merging the two into a single line
 *    is fiscally equivalent.
 *  - The PDF renderer still receives the original, dettailed lines:
 *    only the XML output is consolidated.
 *
 * Behavior:
 *  - A line with `kind: "km"` is added to the `unitPrice` of the
 *    immediately preceding line whose `kind === "service"` (same
 *    work log entry).
 *  - The merged description is annotated with
 *    " (incl. rimborso trasferta EUR X,YY)" so the recipient still
 *    sees that a reimbursement is embedded.
 *  - If no preceding service exists (standalone km line), the line
 *    is kept as-is — it will hit the Latin sanitize and be emitted
 *    verbatim.
 *
 * Exported for unit tests.
 */
export const mergeKmLinesIntoPrecedingService = (
  lineItems: InvoiceDraftLineItem[],
): InvoiceDraftLineItem[] => {
  const out: InvoiceDraftLineItem[] = [];
  for (const line of lineItems) {
    if (line.kind === "km") {
      const last = out[out.length - 1];
      if (last && last.kind === "service") {
        const kmAmount = line.quantity * line.unitPrice;
        const mergedUnitPrice =
          last.unitPrice + kmAmount / (last.quantity || 1);
        out[out.length - 1] = {
          ...last,
          description:
            `${last.description} ` +
            `(incl. rimborso trasferta EUR ${kmAmount.toFixed(2)})`,
          unitPrice: mergedUnitPrice,
        };
        continue;
      }
    }
    out.push(line);
  }
  return out;
};

/** Format a number with exactly `decimals` decimal places (no locale). */
const fmtNum = (n: number, decimals = 2) => n.toFixed(decimals);

const tag = (name: string, value: string | number) =>
  `<${name}>${esc(String(value))}</${name}>`;

const optTag = (name: string, value: string | number | undefined | null) =>
  value != null && String(value).trim() !== "" ? tag(name, value) : "";

// ── Client billing address for XML ──────────────────────────────────

const buildClientSede = (client: Client): string => {
  const street = client.billing_address_street ?? "";
  const number = client.billing_address_number ?? "";
  const cap = client.billing_postal_code ?? "";
  const city = client.billing_city ?? "";
  const prov = client.billing_province ?? "";
  const country = client.billing_country ?? "IT";

  // Minimum required: street + CAP + city + country
  if (!street || !cap || !city) return "";

  return [
    "<Sede>",
    tag("Indirizzo", street),
    optTag("NumeroCivico", number),
    tag("CAP", cap),
    tag("Comune", city),
    optTag("Provincia", prov),
    tag("Nazione", country),
    "</Sede>",
  ].join("\n");
};

// ── XML builder ──────────────────────────────────────────────────────

export type InvoiceDraftXmlOptions = {
  draft: InvoiceDraftInput;
  issuer: BusinessProfile;
  invoiceNumber: string;
  progressivoInvio?: string;
};

export const buildInvoiceDraftXml = ({
  draft,
  issuer,
  invoiceNumber,
  progressivoInvio = "1",
}: InvoiceDraftXmlOptions): string => {
  // Normalize, then fold km reimbursements into the preceding service
  // line (see `mergeKmLinesIntoPrecedingService` for the rationale).
  const lines = mergeKmLinesIntoPrecedingService(
    normalizeInvoiceDraftLineItems(draft.lineItems),
  );
  const totals = computeInvoiceDraftTotals(lines);

  const clientName =
    draft.client.billing_name ?? draft.client.name ?? "Cliente";
  const clientCodiceDestinatario = draft.client.billing_sdi_code ?? "0000000";

  // ── Header ─────────────────────────────────────────────────────

  const datiTrasmissione = [
    "<DatiTrasmissione>",
    "<IdTrasmittente>",
    tag("IdPaese", "IT"),
    tag("IdCodice", ARUBA_PEC_CF),
    "</IdTrasmittente>",
    tag("ProgressivoInvio", progressivoInvio),
    tag("FormatoTrasmissione", "FPR12"),
    tag("CodiceDestinatario", clientCodiceDestinatario),
    clientCodiceDestinatario === "0000000" && draft.client.billing_pec
      ? tag("PECDestinatario", draft.client.billing_pec)
      : "",
    "</DatiTrasmissione>",
  ].join("\n");

  const cedentePrestatore = [
    "<CedentePrestatore>",
    "<DatiAnagrafici>",
    "<IdFiscaleIVA>",
    tag("IdPaese", "IT"),
    tag("IdCodice", issuer.vatNumber),
    "</IdFiscaleIVA>",
    optTag("CodiceFiscale", issuer.fiscalCode),
    "<Anagrafica>",
    tag("Denominazione", issuer.name),
    "</Anagrafica>",
    tag("RegimeFiscale", "RF19"),
    "</DatiAnagrafici>",
    "<Sede>",
    tag("Indirizzo", issuer.addressStreet),
    optTag("NumeroCivico", issuer.addressNumber),
    tag("CAP", issuer.addressPostalCode),
    tag("Comune", issuer.addressCity),
    optTag("Provincia", issuer.addressProvince),
    tag("Nazione", issuer.addressCountry || "IT"),
    "</Sede>",
    "<Contatti>",
    optTag("Telefono", issuer.phone),
    optTag("Email", issuer.email),
    "</Contatti>",
    "</CedentePrestatore>",
  ].join("\n");

  // Client anagrafica: prefer IdFiscaleIVA if vat_number, else CodiceFiscale
  const clientAnagrafici = [
    "<DatiAnagrafici>",
    draft.client.vat_number
      ? [
          "<IdFiscaleIVA>",
          tag("IdPaese", "IT"),
          tag("IdCodice", draft.client.vat_number),
          "</IdFiscaleIVA>",
        ].join("\n")
      : "",
    optTag("CodiceFiscale", draft.client.fiscal_code),
    "<Anagrafica>",
    tag("Denominazione", clientName),
    "</Anagrafica>",
    "</DatiAnagrafici>",
  ].join("\n");

  const clientSede = buildClientSede(draft.client);

  const cessionarioCommittente = [
    "<CessionarioCommittente>",
    clientAnagrafici,
    clientSede,
    "</CessionarioCommittente>",
  ].join("\n");

  const header = [
    '<FatturaElettronicaHeader xmlns="">',
    datiTrasmissione,
    cedentePrestatore,
    cessionarioCommittente,
    "</FatturaElettronicaHeader>",
  ].join("\n");

  // ── Body ───────────────────────────────────────────────────────

  const datiGeneraliDocumento = [
    "<DatiGeneraliDocumento>",
    tag("TipoDocumento", "TD01"),
    tag("Divisa", "EUR"),
    tag("Data", draft.invoiceDate ?? todayISODate()),
    tag("Numero", invoiceNumber),
    tag("ImportoTotaleDocumento", fmtNum(totals.totalAmount)),
    tag("Causale", CAUSALE),
    "</DatiGeneraliDocumento>",
  ].join("\n");

  const dettaglioLinee = lines.map((li, i) =>
    [
      "<DettaglioLinee>",
      tag("NumeroLinea", i + 1),
      tag("Descrizione", li.description),
      tag("Quantita", fmtNum(li.quantity)),
      tag("PrezzoUnitario", fmtNum(li.unitPrice)),
      tag("PrezzoTotale", fmtNum(getInvoiceDraftLineTotal(li))),
      tag("AliquotaIVA", "0.00"),
      tag("Natura", "N2.2"),
      "</DettaglioLinee>",
    ].join("\n"),
  );

  const datiRiepilogo = [
    "<DatiRiepilogo>",
    tag("AliquotaIVA", "0.00"),
    tag("Natura", "N2.2"),
    tag("ImponibileImporto", fmtNum(totals.totalAmount)),
    tag("Imposta", "0.00"),
    tag("RiferimentoNormativo", RIFERIMENTO_NORMATIVO),
    "</DatiRiepilogo>",
  ].join("\n");

  const datiBeniServizi = [
    "<DatiBeniServizi>",
    ...dettaglioLinee,
    datiRiepilogo,
    "</DatiBeniServizi>",
  ].join("\n");

  const datiPagamento = [
    "<DatiPagamento>",
    tag("CondizioniPagamento", "TP02"),
    "<DettaglioPagamento>",
    optTag("Beneficiario", issuer.beneficiaryName),
    tag("ModalitaPagamento", "MP05"),
    tag("ImportoPagamento", fmtNum(totals.totalAmount)),
    optTag("IstitutoFinanziario", issuer.bankName),
    optTag("IBAN", issuer.iban),
    optTag("BIC", issuer.bic),
    "</DettaglioPagamento>",
    "</DatiPagamento>",
  ].join("\n");

  const body = [
    '<FatturaElettronicaBody xmlns="">',
    "<DatiGenerali>",
    datiGeneraliDocumento,
    "</DatiGenerali>",
    datiBeniServizi,
    datiPagamento,
    "</FatturaElettronicaBody>",
  ].join("\n");

  // ── Document ───────────────────────────────────────────────────

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<FatturaElettronica versione="FPR12" xmlns="${XML_NAMESPACE}">`,
    header,
    body,
    "</FatturaElettronica>",
  ].join("\n");
};

// ── Download helper ──────────────────────────────────────────────────

export const downloadInvoiceDraftXml = (
  options: InvoiceDraftXmlOptions,
): void => {
  const xml = buildInvoiceDraftXml(options);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  // Standard naming: IT{CF}_{progressive}.xml
  const cfPart =
    options.issuer.fiscalCode || options.issuer.vatNumber || "draft";
  anchor.download = `IT${cfPart}_${String(options.draft.source.id)}.xml`;
  anchor.click();

  URL.revokeObjectURL(url);
};
