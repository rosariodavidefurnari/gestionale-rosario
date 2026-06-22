import { toISODate } from "@/lib/dateTimezone";
import { useGetList } from "ra-core";

import { Badge } from "@/components/ui/badge";

import type { Payment } from "../types";
import { openReceivablePaymentStatusInFilter } from "./paymentTypes";

export const PaymentOverdueBadge = () => {
  const { total, isPending } = useGetList<Payment>("payments", {
    pagination: { page: 1, perPage: 1 },
    sort: { field: "payment_date", order: "ASC" },
    filter: {
      "status@in": openReceivablePaymentStatusInFilter,
      "payment_type@neq": "rimborso",
      "payment_date@lt": toISODate(new Date()),
    },
  });

  if (isPending || !total || total <= 0) {
    return null;
  }

  return (
    <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
      {total}
    </Badge>
  );
};
