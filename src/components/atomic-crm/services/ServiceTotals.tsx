import { useWatch } from "react-hook-form";

export const ServiceTotals = () => {
  const feeShooting = useWatch({ name: "fee_shooting" }) ?? 0;
  const feeEditing = useWatch({ name: "fee_editing" }) ?? 0;
  const feeOther = useWatch({ name: "fee_other" }) ?? 0;
  const discount = useWatch({ name: "discount" }) ?? 0;

  const total = Number(feeShooting) + Number(feeEditing) + Number(feeOther) - Number(discount);

  return (
    <div className="text-sm font-medium px-1 pt-1 border-t">
      Totale compensi:{" "}
      <span className="font-bold text-base">
        EUR {total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
};
