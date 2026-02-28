import { Input } from "@/components/ui/input";

interface DateRangeFilterProps {
  fromKey: string;
  toKey: string;
  filterValues: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
}

export const DateRangeFilter = ({
  fromKey,
  toKey,
  filterValues,
  setFilters,
}: DateRangeFilterProps) => {
  const fromValue = (filterValues[fromKey] as string) ?? "";
  const toValue = (filterValues[toKey] as string) ?? "";
  const hasError = fromValue && toValue && fromValue > toValue;

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      const { [fromKey]: _, ...rest } = filterValues;
      setFilters(rest);
      return;
    }
    if (toValue && value > toValue) return;
    setFilters({ ...filterValues, [fromKey]: value });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      const { [toKey]: _, ...rest } = filterValues;
      setFilters(rest);
      return;
    }
    if (fromValue && value < fromValue) return;
    setFilters({ ...filterValues, [toKey]: value });
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div>
        <label className="text-xs text-muted-foreground">Da</label>
        <Input
          type="date"
          className="h-8 text-sm"
          value={fromValue}
          max={toValue || undefined}
          onChange={handleFromChange}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">A</label>
        <Input
          type="date"
          className="h-8 text-sm"
          value={toValue}
          min={fromValue || undefined}
          onChange={handleToChange}
        />
      </div>
      {hasError && (
        <p className="text-xs text-destructive">
          La data iniziale deve essere precedente alla finale
        </p>
      )}
    </div>
  );
};
