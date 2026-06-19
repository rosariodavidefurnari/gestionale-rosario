import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "ra-core";
import type { CrmDataProvider } from "../providers/types";
import type { FiscalDeadline } from "./fiscalModelTypes";
import type {
  FiscalDeadlineView,
  FiscalDeclaration,
  FiscalObligation,
  FiscalF24PaymentLineEnriched,
} from "./fiscalRealityTypes";
import { buildFiscalRealityAwareSchedule } from "./buildFiscalRealityAwareSchedule";
import {
  buildFiledDeclarationIds,
  buildPaidObligationIds,
  selectCertifiedObligations,
} from "./selectCertifiedObligations";

// ── Types ────────────────────────────────────────────────────────────────────

type UseFiscalRealityInput = {
  estimatedDeadlines: FiscalDeadline[];
  paymentYear: number;
  todayIso: string;
};

type UseFiscalRealityResult = {
  deadlineViews: FiscalDeadlineView[] | null;
  obligations: FiscalObligation[];
  enrichedPaymentLines: FiscalF24PaymentLineEnriched[];
  totalOpenObligations: number;
  hasRealFiscalData: boolean;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useFiscalReality = ({
  estimatedDeadlines,
  paymentYear,
  todayIso,
}: UseFiscalRealityInput): UseFiscalRealityResult => {
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { data: obligations, isPending: obligationsPending } = useQuery({
    queryKey: ["fiscal-obligations", paymentYear],
    queryFn: () => dataProvider.getFiscalObligations(paymentYear),
  });

  const { data: enrichedPaymentLines, isPending: paymentLinesPending } =
    useQuery({
      queryKey: ["fiscal-enriched-payment-lines", paymentYear],
      queryFn: () => dataProvider.getEnrichedPaymentLinesForYear(paymentYear),
    });

  // All declarations (few rows). Needed to tell a CERTIFIED obligation (backed by
  // a filed declaration with non-zero totals) from a stale hand-entered PROJECTION.
  // queryKey is year-independent -> react-query dedups across desktop/mobile.
  const { data: declarations, isPending: declarationsPending } = useQuery({
    queryKey: ["fiscal-declarations"],
    queryFn: () => dataProvider.getFiscalDeclarations(),
  });

  const isLoading =
    obligationsPending || paymentLinesPending || declarationsPending;

  // Keep ONLY certified obligations. Uncertified projections (declaration_id null,
  // or backed by an unfiled/zero-totals declaration, with no F24 payment) must
  // never reach the reality merge: otherwise they masquerade as "Da dichiarazione"
  // and override the cassa estimate (the 2026 false 11.100,60 bug).
  const certifiedObligations = useMemo<FiscalObligation[]>(() => {
    if (obligations == null) return [];
    const filedDeclarationIds = buildFiledDeclarationIds(
      (declarations as FiscalDeclaration[] | undefined) ?? [],
    );
    const paidObligationIds = buildPaidObligationIds(
      enrichedPaymentLines ?? [],
    );
    return selectCertifiedObligations(
      obligations,
      filedDeclarationIds,
      paidObligationIds,
    );
  }, [obligations, declarations, enrichedPaymentLines]);

  const deadlineViews = useMemo<FiscalDeadlineView[] | null>(() => {
    if (isLoading || obligations == null || enrichedPaymentLines == null) {
      return null;
    }

    return buildFiscalRealityAwareSchedule({
      estimatedDeadlines,
      obligations: certifiedObligations,
      enrichedPaymentLines,
      todayIso,
    });
  }, [
    estimatedDeadlines,
    certifiedObligations,
    obligations,
    enrichedPaymentLines,
    todayIso,
    isLoading,
  ]);

  const resolvedPaymentLines = enrichedPaymentLines ?? [];

  const totalOpenObligations = useMemo(() => {
    if (deadlineViews == null) return 0;
    return deadlineViews.reduce((sum, view) => {
      return sum + view.items.reduce((s, item) => s + item.remainingAmount, 0);
    }, 0);
  }, [deadlineViews]);

  const hasRealFiscalData = certifiedObligations.length > 0;

  return {
    deadlineViews,
    obligations: certifiedObligations,
    enrichedPaymentLines: resolvedPaymentLines,
    totalOpenObligations,
    hasRealFiscalData,
  };
};
