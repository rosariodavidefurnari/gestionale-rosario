import type { FinancialDocumentSummary } from "../types";
import { FinancialDocumentList } from "./FinancialDocumentList";
import { FinancialDocumentShow } from "./FinancialDocumentShow";

export default {
  list: FinancialDocumentList,
  show: FinancialDocumentShow,
  recordRepresentation: (r: FinancialDocumentSummary) => r.document_number,
};
