import type { Payment } from "../types";

type QuotePaymentSummaryInput = {
  quoteAmount: number;
  payments: Array<Pick<Payment, "amount" | "payment_type" | "status">>;
};

export type QuotePaymentSummary = {
  paymentsCount: number;
  receivedCount: number;
  pendingCount: number;
  overdueCount: number;
  receivedTotal: number;
  pendingTotal: number;
  overdueTotal: number;
  linkedTotal: number;
  remainingAmount: number;
};

const getSignedAmount = (
  payment: Pick<Payment, "amount" | "payment_type">,
) => {
  if (payment.payment_type === "rimborso") {
    return -payment.amount;
  }

  return payment.amount;
};

export const buildQuotePaymentsSummary = ({
  quoteAmount,
  payments,
}: QuotePaymentSummaryInput): QuotePaymentSummary => {
  const summary = payments.reduce(
    (acc, payment) => {
      const amount = getSignedAmount(payment);

      acc.paymentsCount += 1;
      acc.linkedTotal += amount;

      if (payment.status === "ricevuto") {
        acc.receivedCount += 1;
        acc.receivedTotal += amount;
      } else if (payment.status === "in_attesa") {
        acc.pendingCount += 1;
        acc.pendingTotal += amount;
      } else if (payment.status === "scaduto") {
        acc.overdueCount += 1;
        acc.overdueTotal += amount;
      }

      return acc;
    },
    {
      paymentsCount: 0,
      receivedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      receivedTotal: 0,
      pendingTotal: 0,
      overdueTotal: 0,
      linkedTotal: 0,
      remainingAmount: quoteAmount,
    },
  );

  return {
    ...summary,
    remainingAmount: quoteAmount - summary.linkedTotal,
  };
};

