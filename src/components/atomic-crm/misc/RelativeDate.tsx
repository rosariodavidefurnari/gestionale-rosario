import { differenceInDays, formatRelative } from "date-fns";
import { it as itLocale } from "date-fns/locale";

export function RelativeDate({ date }: { date: string }) {
  const dateObj = new Date(date);
  const now = new Date();

  if (differenceInDays(now, dateObj) > 6) {
    return dateObj.toLocaleDateString();
  }

  return formatRelative(dateObj, now, { locale: itLocale });
}
