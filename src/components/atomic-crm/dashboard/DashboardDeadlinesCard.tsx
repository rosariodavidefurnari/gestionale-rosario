import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrencyPrecise } from "./dashboardModel";
import type { FiscalDeadline } from "./fiscalModel";

export const DashboardDeadlinesCard = ({
  deadlines,
  isFirstYear,
}: {
  deadlines: FiscalDeadline[];
  isFirstYear: boolean;
}) => {
  if (isFirstYear) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scadenze fiscali
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">
              Primo anno di attività
            </p>
            <p>
              Nessun acconto dovuto quest'anno. Accantonare circa il 30% del
              fatturato per il saldo di giugno del prossimo anno.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const futureDeadlines = deadlines.filter((d) => !d.isPast);
  const pastDeadlines = deadlines.filter((d) => d.isPast);

  if (futureDeadlines.length === 0 && pastDeadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scadenze fiscali
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground text-center py-6">
          Nessuna scadenza in programma
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Scadenze fiscali
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {futureDeadlines.map((deadline) => (
          <DeadlineRow key={deadline.date} deadline={deadline} />
        ))}
        {pastDeadlines.map((deadline) => (
          <DeadlineRow key={deadline.date} deadline={deadline} />
        ))}
      </CardContent>
    </Card>
  );
};

const DeadlineRow = ({ deadline }: { deadline: FiscalDeadline }) => {
  const [expanded, setExpanded] = useState(false);

  const urgencyVariant = deadline.isPast
    ? "secondary"
    : deadline.daysUntil <= 30
      ? "destructive"
      : deadline.daysUntil <= 90
        ? "outline"
        : "secondary";

  const countdownText = deadline.isPast
    ? "Passata"
    : deadline.daysUntil === 0
      ? "Oggi"
      : `${deadline.daysUntil}g`;

  const formattedDate = new Date(
    deadline.date + "T00:00:00",
  ).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
  });

  return (
    <div
      className={`rounded-md border p-3 space-y-2 ${deadline.isPast ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={urgencyVariant}>{countdownText}</Badge>
          <span className="font-medium">{formattedDate}</span>
          <span className="text-muted-foreground">— {deadline.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {formatCurrencyPrecise(deadline.totalAmount)}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="pl-4 space-y-1 text-xs text-muted-foreground border-l-2 ml-2">
          {deadline.items.map((item) => (
            <div key={item.description} className="flex justify-between">
              <span>{item.description}</span>
              <span>{formatCurrencyPrecise(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
