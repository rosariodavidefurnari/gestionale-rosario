import { describe, expect, it } from "vitest";

import type { BusinessProfile, Client } from "../types";
import type { InvoiceDraftInput } from "./invoiceDraftTypes";
import {
  buildInvoiceDraftXml,
  mergeKmLinesIntoPrecedingService,
  sanitizeLatinForFatturaPA,
} from "./invoiceDraftXml";

// ── Fixtures aligned with real Aruba invoice ─────────────────────────
// Reference: Fatture/2025/IT01879020517A2025_aGgQD.xml

const testIssuer: BusinessProfile = {
  name: "Rosario Furnari",
  tagline: "Videomaker · Fotografo · Web Developer",
  vatNumber: "01309870861",
  fiscalCode: "FRNRRD87A11G580E",
  sdiCode: "KRRH6B9",
  iban: "IT88L0200883730000430121067",
  bankName: "UNICREDIT",
  bic: "UNCRITM1L81",
  address: "Via Calabria 13, 94019 Valguarnera Caropepe EN",
  addressStreet: "Via Calabria",
  addressNumber: "13",
  addressPostalCode: "94019",
  addressCity: "Valguarnera Caropepe",
  addressProvince: "EN",
  addressCountry: "IT",
  email: "rosariodavide.furnari@gmail.com",
  phone: "3286183554",
  beneficiaryName: "Rosario Davide Furnari",
};

const testClient: Client = {
  id: 1,
  name: "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
  client_type: "produzione_tv",
  fiscal_code: "05416820875",
  billing_address_street: "Via Marino",
  billing_postal_code: "95031",
  billing_city: "Adrano",
  billing_province: "CT",
  billing_country: "IT",
  billing_sdi_code: "KRRH6B9",
  tags: [],
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

const testDraft: InvoiceDraftInput = {
  client: testClient,
  lineItems: [
    {
      description:
        "Servizio di Riprese e Montaggio (Gustare Sicilia e Bella Tra I Fornelli)",
      quantity: 1,
      unitPrice: 5113,
    },
  ],
  invoiceDate: "2025-02-01",
  source: { kind: "project", id: "proj-1", label: "Gustare Sicilia" },
};

// ── Parse helper ─────────────────────────────────────────────────────

/** Simple tag content extractor (no nested tags with same name). */
const getTag = (xml: string, tagName: string): string | null => {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : null;
};

/** Get all occurrences of a tag block. */
const getAllTags = (xml: string, tagName: string): string[] => {
  const re = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[0]);
};

// ── Tests ────────────────────────────────────────────────────────────

describe("buildInvoiceDraftXml", () => {
  const xml = buildInvoiceDraftXml({
    draft: testDraft,
    issuer: testIssuer,
    invoiceNumber: "FPR 1/25",
    progressivoInvio: "1",
  });

  describe("XML envelope", () => {
    it("starts with XML declaration", () => {
      expect(xml).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    });

    it("has FatturaElettronica root with versione FPR12", () => {
      expect(xml).toContain('versione="FPR12"');
    });

    it("has correct namespace", () => {
      expect(xml).toContain(
        'xmlns="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"',
      );
    });
  });

  describe("DatiTrasmissione", () => {
    it("has Aruba PEC fiscal code as IdTrasmittente", () => {
      const idTrasmittente = getTag(xml, "IdTrasmittente")!;
      expect(getTag(idTrasmittente, "IdPaese")).toBe("IT");
      expect(getTag(idTrasmittente, "IdCodice")).toBe("01879020517");
    });

    it("has FormatoTrasmissione FPR12", () => {
      expect(getTag(xml, "FormatoTrasmissione")).toBe("FPR12");
    });

    it("has ProgressivoInvio", () => {
      expect(getTag(xml, "ProgressivoInvio")).toBe("1");
    });

    it("has client SDI code as CodiceDestinatario", () => {
      expect(getTag(xml, "CodiceDestinatario")).toBe("KRRH6B9");
    });
  });

  describe("CedentePrestatore (issuer)", () => {
    it("has issuer P.IVA with IT prefix", () => {
      const cedente = getTag(xml, "CedentePrestatore")!;
      const idFiscale = getTag(cedente, "IdFiscaleIVA")!;
      expect(getTag(idFiscale, "IdPaese")).toBe("IT");
      expect(getTag(idFiscale, "IdCodice")).toBe("01309870861");
    });

    it("has issuer CodiceFiscale", () => {
      const cedente = getTag(xml, "CedentePrestatore")!;
      expect(getTag(cedente, "CodiceFiscale")).toBe("FRNRRD87A11G580E");
    });

    it("has issuer Denominazione", () => {
      const cedente = getTag(xml, "CedentePrestatore")!;
      expect(getTag(cedente, "Denominazione")).toBe("Rosario Furnari");
    });

    it("has RegimeFiscale RF19 (forfettario)", () => {
      expect(getTag(xml, "RegimeFiscale")).toBe("RF19");
    });

    it("has structured Sede (street, number, CAP, city, province, country)", () => {
      const cedente = getTag(xml, "CedentePrestatore")!;
      const sede = getTag(cedente, "Sede")!;
      expect(getTag(sede, "Indirizzo")).toBe("Via Calabria");
      expect(getTag(sede, "NumeroCivico")).toBe("13");
      expect(getTag(sede, "CAP")).toBe("94019");
      expect(getTag(sede, "Comune")).toBe("Valguarnera Caropepe");
      expect(getTag(sede, "Provincia")).toBe("EN");
      expect(getTag(sede, "Nazione")).toBe("IT");
    });

    it("has Contatti (phone, email)", () => {
      const cedente = getTag(xml, "CedentePrestatore")!;
      const contatti = getTag(cedente, "Contatti")!;
      expect(getTag(contatti, "Telefono")).toBe("3286183554");
      expect(getTag(contatti, "Email")).toBe("rosariodavide.furnari@gmail.com");
    });
  });

  describe("CessionarioCommittente (client)", () => {
    it("has client CodiceFiscale", () => {
      const cessionario = getTag(xml, "CessionarioCommittente")!;
      expect(getTag(cessionario, "CodiceFiscale")).toBe("05416820875");
    });

    it("has client Denominazione", () => {
      const cessionario = getTag(xml, "CessionarioCommittente")!;
      expect(getTag(cessionario, "Denominazione")).toBe(
        "ASSOCIAZIONE CULTURALE GUSTARE SICILIA",
      );
    });

    it("has client Sede", () => {
      const cessionario = getTag(xml, "CessionarioCommittente")!;
      const sede = getTag(cessionario, "Sede")!;
      expect(getTag(sede, "Indirizzo")).toBe("Via Marino");
      expect(getTag(sede, "CAP")).toBe("95031");
      expect(getTag(sede, "Comune")).toBe("Adrano");
      expect(getTag(sede, "Provincia")).toBe("CT");
      expect(getTag(sede, "Nazione")).toBe("IT");
    });
  });

  describe("DatiGeneraliDocumento", () => {
    it("has TipoDocumento TD01", () => {
      expect(getTag(xml, "TipoDocumento")).toBe("TD01");
    });

    it("has Divisa EUR", () => {
      expect(getTag(xml, "Divisa")).toBe("EUR");
    });

    it("has correct Data", () => {
      expect(getTag(xml, "Data")).toBe("2025-02-01");
    });

    it("has correct Numero", () => {
      expect(getTag(xml, "Numero")).toBe("FPR 1/25");
    });

    it("has ImportoTotaleDocumento matching total", () => {
      expect(getTag(xml, "ImportoTotaleDocumento")).toBe("5115.00");
      // 5113 + 2 (stamp duty) = 5115
    });

    it("has Causale with forfettario legal text", () => {
      const causale = getTag(xml, "Causale")!;
      expect(causale).toContain("articolo 1, comma 67");
      expect(causale).toContain("l. n. 190 del 2014");
    });
  });

  describe("DettaglioLinee", () => {
    it("has one line item", () => {
      const linee = getAllTags(xml, "DettaglioLinee");
      expect(linee).toHaveLength(1);
    });

    it("has correct NumeroLinea", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "NumeroLinea")).toBe("1");
    });

    it("has correct Descrizione", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "Descrizione")).toBe(
        "Servizio di Riprese e Montaggio (Gustare Sicilia e Bella Tra I Fornelli)",
      );
    });

    it("has correct Quantita", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "Quantita")).toBe("1.00");
    });

    it("has correct PrezzoUnitario", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "PrezzoUnitario")).toBe("5113.00");
    });

    it("has correct PrezzoTotale", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "PrezzoTotale")).toBe("5113.00");
    });

    it("has AliquotaIVA 0.00", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "AliquotaIVA")).toBe("0.00");
    });

    it("has Natura N2.2", () => {
      const linea = getAllTags(xml, "DettaglioLinee")[0];
      expect(getTag(linea, "Natura")).toBe("N2.2");
    });
  });

  describe("DatiRiepilogo", () => {
    it("has AliquotaIVA 0.00", () => {
      const riepilogo = getTag(xml, "DatiRiepilogo")!;
      expect(getTag(riepilogo, "AliquotaIVA")).toBe("0.00");
    });

    it("has Natura N2.2", () => {
      const riepilogo = getTag(xml, "DatiRiepilogo")!;
      expect(getTag(riepilogo, "Natura")).toBe("N2.2");
    });

    it("has ImponibileImporto equal to sum of PrezzoTotale (excludes stamp duty)", () => {
      // Critical for SdI validation (error 00422): ImponibileImporto MUST
      // equal the sum of DettaglioLinee.PrezzoTotale. The stamp duty lives
      // in <DatiBollo>, not in the riepilogo sum.
      const riepilogo = getTag(xml, "DatiRiepilogo")!;
      expect(getTag(riepilogo, "ImponibileImporto")).toBe("5113.00");
    });

    it("has Imposta 0.00", () => {
      const riepilogo = getTag(xml, "DatiRiepilogo")!;
      expect(getTag(riepilogo, "Imposta")).toBe("0.00");
    });

    it("has RiferimentoNormativo", () => {
      const riepilogo = getTag(xml, "DatiRiepilogo")!;
      expect(getTag(riepilogo, "RiferimentoNormativo")).toBe(
        "Non soggette - altri casi",
      );
    });
  });

  describe("DatiPagamento", () => {
    it("has CondizioniPagamento TP02 (pagamento completo)", () => {
      expect(getTag(xml, "CondizioniPagamento")).toBe("TP02");
    });

    it("has Beneficiario", () => {
      expect(getTag(xml, "Beneficiario")).toBe("Rosario Davide Furnari");
    });

    it("has ModalitaPagamento MP05 (bonifico)", () => {
      expect(getTag(xml, "ModalitaPagamento")).toBe("MP05");
    });

    it("has ImportoPagamento matching total", () => {
      expect(getTag(xml, "ImportoPagamento")).toBe("5115.00");
    });

    it("has IstitutoFinanziario", () => {
      expect(getTag(xml, "IstitutoFinanziario")).toBe("UNICREDIT");
    });

    it("has IBAN", () => {
      expect(getTag(xml, "IBAN")).toBe("IT88L0200883730000430121067");
    });

    it("has BIC", () => {
      expect(getTag(xml, "BIC")).toBe("UNCRITM1L81");
    });
  });

  describe("Bollo handling", () => {
    it("includes DatiBollo inside DatiGeneraliDocumento when stamp duty applies", () => {
      const datiGenerali = getTag(xml, "DatiGeneraliDocumento")!;
      expect(datiGenerali).toContain("<DatiBollo>");
      const datiBollo = getTag(datiGenerali, "DatiBollo")!;
      expect(getTag(datiBollo, "BolloVirtuale")).toBe("SI");
      expect(getTag(datiBollo, "ImportoBollo")).toBe("2.00");
    });

    it("stamp duty IS included in ImportoTotaleDocumento", () => {
      // 5113 (service) + 2 (stamp) = 5115
      expect(getTag(xml, "ImportoTotaleDocumento")).toBe("5115.00");
    });

    it("omits DatiBollo when invoice total is below stamp duty threshold", () => {
      // Taxable amount 50 < 77.47 → no stamp duty
      const smallDraft: InvoiceDraftInput = {
        ...testDraft,
        lineItems: [
          {
            description: "Prestazione minore",
            quantity: 1,
            unitPrice: 50,
            kind: "service",
          },
        ],
      };
      const xmlSmall = buildInvoiceDraftXml({
        draft: smallDraft,
        issuer: testIssuer,
        invoiceNumber: "FPR 7/26",
      });
      expect(xmlSmall).not.toContain("<DatiBollo>");
      expect(getTag(xmlSmall, "ImportoTotaleDocumento")).toBe("50.00");
    });
  });

  describe("PEC fallback when no SDI code", () => {
    it("uses 0000000 + PECDestinatario when client has no SDI code but has PEC", () => {
      const clientWithPec: Client = {
        ...testClient,
        billing_sdi_code: undefined,
        billing_pec: "gustare@pec.it",
      };
      const xmlPec = buildInvoiceDraftXml({
        draft: { ...testDraft, client: clientWithPec },
        issuer: testIssuer,
        invoiceNumber: "FPR 2/25",
      });
      expect(getTag(xmlPec, "CodiceDestinatario")).toBe("0000000");
      expect(getTag(xmlPec, "PECDestinatario")).toBe("gustare@pec.it");
    });

    it("uses 0000000 without PEC when client has neither", () => {
      const clientNone: Client = {
        ...testClient,
        billing_sdi_code: undefined,
        billing_pec: undefined,
      };
      const xmlNone = buildInvoiceDraftXml({
        draft: { ...testDraft, client: clientNone },
        issuer: testIssuer,
        invoiceNumber: "FPR 3/25",
      });
      expect(getTag(xmlNone, "CodiceDestinatario")).toBe("0000000");
      expect(xmlNone).not.toContain("<PECDestinatario>");
    });
  });

  describe("Multiple line items", () => {
    it("generates correct NumeroLinea for each line", () => {
      const multiDraft: InvoiceDraftInput = {
        ...testDraft,
        lineItems: [
          { description: "Riprese", quantity: 2, unitPrice: 500 },
          { description: "Montaggio", quantity: 1, unitPrice: 300 },
        ],
      };
      const xmlMulti = buildInvoiceDraftXml({
        draft: multiDraft,
        issuer: testIssuer,
        invoiceNumber: "FPR 4/25",
      });
      const linee = getAllTags(xmlMulti, "DettaglioLinee");
      expect(linee).toHaveLength(2);
      expect(getTag(linee[0], "NumeroLinea")).toBe("1");
      expect(getTag(linee[1], "NumeroLinea")).toBe("2");
      expect(getTag(linee[0], "PrezzoTotale")).toBe("1000.00");
      expect(getTag(linee[1], "PrezzoTotale")).toBe("300.00");
    });
  });

  describe("XML escaping", () => {
    it("escapes special characters in description", () => {
      const specialDraft: InvoiceDraftInput = {
        ...testDraft,
        lineItems: [
          {
            description: 'Servizio "A&B" <test>',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };
      const xmlSpecial = buildInvoiceDraftXml({
        draft: specialDraft,
        issuer: testIssuer,
        invoiceNumber: "FPR 5/25",
      });
      expect(xmlSpecial).toContain("&amp;");
      expect(xmlSpecial).toContain("&lt;");
      expect(xmlSpecial).toContain("&gt;");
      expect(xmlSpecial).toContain("&quot;");
    });
  });

  describe("Client with IdFiscaleIVA", () => {
    it("uses IdFiscaleIVA when client has vat_number", () => {
      const clientVat: Client = {
        ...testClient,
        vat_number: "12345678901",
      };
      const xmlVat = buildInvoiceDraftXml({
        draft: { ...testDraft, client: clientVat },
        issuer: testIssuer,
        invoiceNumber: "FPR 6/25",
      });
      const cessionario = getTag(xmlVat, "CessionarioCommittente")!;
      const idFiscale = getTag(cessionario, "IdFiscaleIVA")!;
      expect(getTag(idFiscale, "IdPaese")).toBe("IT");
      expect(getTag(idFiscale, "IdCodice")).toBe("12345678901");
    });
  });
});

describe("sanitizeLatinForFatturaPA", () => {
  it("replaces € with EUR", () => {
    expect(sanitizeLatinForFatturaPA("€0,25/km")).toBe("EUR0,25/km");
  });

  it("replaces en-dash, em-dash and figure dash with hyphen", () => {
    expect(sanitizeLatinForFatturaPA("Valguarnera – Acireale")).toBe(
      "Valguarnera - Acireale",
    );
    expect(sanitizeLatinForFatturaPA("a—b")).toBe("a-b");
    expect(sanitizeLatinForFatturaPA("a‒b")).toBe("a-b");
  });

  it("replaces smart quotes with ASCII quotes", () => {
    expect(sanitizeLatinForFatturaPA("\u201Choh\u201D")).toBe('"hoh"');
    expect(sanitizeLatinForFatturaPA("\u2018test\u2019")).toBe("'test'");
  });

  it("replaces ellipsis with three dots", () => {
    expect(sanitizeLatinForFatturaPA("hmm…")).toBe("hmm...");
  });

  it("preserves characters that are already in Latin-1", () => {
    // · U+00B7, × U+00D7, ° U+00B0, © U+00A9
    expect(sanitizeLatinForFatturaPA("a · b × c ° d ©")).toBe(
      "a · b × c ° d ©",
    );
  });

  it("strips code points outside Latin-1 with no explicit mapping", () => {
    // Chinese char U+4E2D is not in the replacement table and not in Latin-1
    expect(sanitizeLatinForFatturaPA("hello 中 world")).toBe("hello  world");
  });

  it("handles the real-world km reimbursement description", () => {
    const input =
      "Rimborso chilometrico · Via Calabria, 13, 94019 Valguarnera " +
      "Caropepe EN, Italia – 95024 Acireale CT, Italia A/R · 195.43 " +
      "km × €0,25/km";
    const output = sanitizeLatinForFatturaPA(input);
    // No en-dash, no €, everything else preserved
    expect(output).not.toContain("\u2013");
    expect(output).not.toContain("\u20AC");
    expect(output).toContain("Italia - 95024");
    expect(output).toContain("EUR0,25/km");
    // All remaining characters must be in Latin-1
    // eslint-disable-next-line no-control-regex
    expect(output).toMatch(/^[\x00-\x7F\xA0-\xFF]*$/);
  });
});

describe("mergeKmLinesIntoPrecedingService", () => {
  it("merges a km line into the immediately preceding service line", () => {
    const result = mergeKmLinesIntoPrecedingService([
      {
        description: "Rosario Bambara · Riprese Montaggio · Taormina",
        quantity: 1,
        unitPrice: 389,
        kind: "service",
      },
      {
        description: "Rimborso chilometrico · 195.43 km × €0,25/km",
        quantity: 1,
        unitPrice: 48.86,
        kind: "km",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("service");
    expect(result[0].unitPrice).toBeCloseTo(437.86, 2);
    expect(result[0].description).toContain("(incl. rimborso trasferta");
    expect(result[0].description).toContain("EUR 48.86");
  });

  it("pairs each km line with its own preceding service (multiple services)", () => {
    const result = mergeKmLinesIntoPrecedingService([
      { description: "Svc A", quantity: 1, unitPrice: 100, kind: "service" },
      { description: "km A", quantity: 1, unitPrice: 10, kind: "km" },
      { description: "Svc B", quantity: 1, unitPrice: 200, kind: "service" },
      { description: "km B", quantity: 1, unitPrice: 20, kind: "km" },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].unitPrice).toBe(110);
    expect(result[1].unitPrice).toBe(220);
  });

  it("leaves a km line untouched if there is no preceding service", () => {
    const result = mergeKmLinesIntoPrecedingService([
      { description: "km alone", quantity: 1, unitPrice: 10, kind: "km" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("km");
    expect(result[0].unitPrice).toBe(10);
  });

  it("does not touch expense, payment or stamp_duty lines", () => {
    const result = mergeKmLinesIntoPrecedingService([
      { description: "Svc", quantity: 1, unitPrice: 100, kind: "service" },
      { description: "km", quantity: 1, unitPrice: 10, kind: "km" },
      { description: "Spesa", quantity: 1, unitPrice: 50, kind: "expense" },
      { description: "Pag", quantity: 1, unitPrice: -60, kind: "payment" },
      { description: "Bollo", quantity: 1, unitPrice: 2, kind: "stamp_duty" },
    ]);
    expect(result).toHaveLength(4);
    expect(result[0].unitPrice).toBe(110);
    expect(result[1].kind).toBe("expense");
    expect(result[2].kind).toBe("payment");
    expect(result[3].kind).toBe("stamp_duty");
  });

  it("preserves the overall invoice total after merging", () => {
    const input: InvoiceDraftInput["lineItems"] = [
      { description: "Svc 1", quantity: 1, unitPrice: 389, kind: "service" },
      { description: "km 1", quantity: 1, unitPrice: 48.86, kind: "km" },
      { description: "Svc 2", quantity: 1, unitPrice: 389, kind: "service" },
      { description: "km 2", quantity: 1, unitPrice: 40.54, kind: "km" },
    ];
    const before = input.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const after = mergeKmLinesIntoPrecedingService(input).reduce(
      (s, l) => s + l.quantity * l.unitPrice,
      0,
    );
    expect(after).toBeCloseTo(before, 2);
  });
});
