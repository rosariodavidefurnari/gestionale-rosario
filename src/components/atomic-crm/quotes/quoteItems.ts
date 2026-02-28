import type { Quote, QuoteItem } from "../types";

const normalizeDescription = (value?: string | null) => value?.trim() ?? "";

const normalizePositiveNumber = (
  value: number | string | null | undefined,
  fallback: number,
) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
};

export const sanitizeQuoteItems = (
  items?: QuoteItem[] | null,
): QuoteItem[] =>
  (items ?? [])
    .map((item) => ({
      description: normalizeDescription(item?.description),
      quantity: normalizePositiveNumber(item?.quantity, 1) || 1,
      unit_price: normalizePositiveNumber(item?.unit_price, 0),
    }))
    .filter((item) => item.description.length > 0);

export const hasQuoteItems = (items?: QuoteItem[] | null) =>
  sanitizeQuoteItems(items).length > 0;

export const getQuoteItemLineTotal = (item: Pick<QuoteItem, "quantity" | "unit_price">) =>
  item.quantity * item.unit_price;

export const computeQuoteItemsTotal = (items?: QuoteItem[] | null) =>
  sanitizeQuoteItems(items).reduce(
    (total, item) => total + getQuoteItemLineTotal(item),
    0,
  );

export const transformQuoteFormData = <
  T extends Pick<Quote, "amount" | "quote_items">,
>(
  data: T,
) => {
  const quoteItems = sanitizeQuoteItems(data.quote_items);

  if (quoteItems.length === 0) {
    return {
      ...data,
      quote_items: [],
    };
  }

  return {
    ...data,
    quote_items: quoteItems,
    amount: computeQuoteItemsTotal(quoteItems),
  };
};
