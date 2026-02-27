import { AlertTriangle, CalendarClock, Clock, MessageCircleQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { quoteStatusLabels } from "../quotes/quotesTypes";
import {
  formatCompactCurrency,
  formatDayMonth,
  type DashboardAlerts,
  type PaymentAlert,
} from "./dashboardModel";

export const DashboardAlertsCard = ({
  alerts,
}: {
  alerts: DashboardAlerts;
}) => (
  <Card className="gap-0">
    <CardHeader className="px-4 pb-3">
      <CardTitle className="text-base">Scadenze e alert</CardTitle>
      <p className="text-xs text-muted-foreground">Pagamenti, lavori e preventivi senza risposta</p>
    </CardHeader>
    <CardContent className="px-4 pb-4 space-y-5">
      <AlertSection
        icon={<AlertTriangle className="h-4 w-4" />}
        title="Pagamenti"
        count={alerts.paymentAlerts.length}
      >
        {alerts.paymentAlerts.length ? (
          alerts.paymentAlerts.map((payment) => (
            <PaymentAlertRow key={payment.id} payment={payment} />
          ))
        ) : (
          <EmptyText text="Nessun pagamento in sospeso." />
        )}
      </AlertSection>

      <AlertSection
        icon={<CalendarClock className="h-4 w-4" />}
        title="Prossimi lavori"
        count={alerts.upcomingServices.length}
      >
        {alerts.upcomingServices.length ? (
          alerts.upcomingServices.map((service) => (
            <div key={service.id} className="text-sm">
              <p className="font-medium">
                {formatDayMonth(service.serviceDate)} · {service.projectName}
              </p>
              <p className="text-xs text-muted-foreground">
                {service.clientName} · {prettifyServiceType(service.serviceType)} ·
                {service.daysAhead === 0 ? " oggi" : ` tra ${service.daysAhead}g`}
              </p>
            </div>
          ))
        ) : (
          <EmptyText text="Nessun lavoro nei prossimi 14 giorni." />
        )}
      </AlertSection>

      <AlertSection
        icon={<MessageCircleQuestion className="h-4 w-4" />}
        title="Preventivi senza risposta (>7g)"
        count={alerts.unansweredQuotes.length}
      >
        {alerts.unansweredQuotes.length ? (
          alerts.unansweredQuotes.map((quote) => (
            <div key={quote.id} className="text-sm">
              <p className="font-medium truncate">{quote.clientName} · {quote.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDayMonth(quote.sentDate)} · {quote.daysWaiting}g · {quoteStatusLabels[quote.status] ?? quote.status} · {formatCompactCurrency(quote.amount)}
              </p>
            </div>
          ))
        ) : (
          <EmptyText text="Nessun preventivo in attesa da oltre 7 giorni." />
        )}
      </AlertSection>
    </CardContent>
  </Card>
);

const PaymentAlertRow = ({ payment }: { payment: PaymentAlert }) => {
  const urgencyConfig = {
    overdue: { badge: "destructive" as const, label: "Scaduto", icon: <AlertTriangle className="h-3 w-3" /> },
    due_soon: { badge: "secondary" as const, label: "In scadenza", icon: <Clock className="h-3 w-3" /> },
    pending: { badge: "outline" as const, label: "In attesa", icon: null },
  };
  const config = urgencyConfig[payment.urgency];

  const dateInfo = payment.paymentDate
    ? payment.urgency === "overdue"
      ? `Scaduto il ${formatDayMonth(payment.paymentDate)}`
      : payment.daysOffset === 0
        ? "Scade oggi"
        : payment.daysOffset != null && payment.daysOffset > 0
          ? `Scade tra ${payment.daysOffset}g`
          : `Scadenza: ${formatDayMonth(payment.paymentDate)}`
    : "Senza scadenza";

  const detail = payment.projectName ?? payment.notes;

  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium truncate">
          {payment.clientName}
          {detail && <span className="font-normal text-muted-foreground"> · {detail}</span>}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {config.icon}
          {dateInfo}
        </p>
      </div>
      <Badge variant={config.badge}>
        {formatCompactCurrency(payment.amount)}
      </Badge>
    </div>
  );
};

const AlertSection = ({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) => (
  <section className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-sm font-medium flex-1">{title}</p>
      {count > 0 && <Badge variant="outline">{count}</Badge>}
    </div>
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">{children}</div>
  </section>
);

const EmptyText = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground">{text}</p>
);

const prettifyServiceType = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
