type FilterValues = Record<string, unknown>;

const toFilterKey = (field: string) => `${field}@ilike`;

export const getClientTextFilterValue = (
  filterValues: FilterValues,
  field: string,
) =>
  ((filterValues[toFilterKey(field)] as string | undefined) ?? "").replace(
    /%/g,
    "",
  );

export const patchClientTextFilter = ({
  filterValues,
  field,
  value,
}: {
  filterValues: FilterValues;
  field:
    | "name"
    | "billing_name"
    | "vat_number"
    | "fiscal_code"
    | "billing_city"
    | "billing_sdi_code"
    | "billing_pec";
  value: string;
}) => {
  const normalized = value.trim();
  const next = { ...filterValues };
  const key = toFilterKey(field);

  if (!normalized) {
    delete next[key];
    return next;
  }

  next[key] = `%${normalized}%`;
  return next;
};
