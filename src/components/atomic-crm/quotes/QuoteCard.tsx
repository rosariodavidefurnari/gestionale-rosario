import { Draggable } from "@hello-pangea/dnd";
import { format, isValid } from "date-fns";
import { useGetOne, useRedirect } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Quote } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const QuoteCard = ({
  quote,
  index,
}: {
  quote: Quote;
  index: number;
}) => {
  if (!quote) return null;

  return (
    <Draggable draggableId={String(quote.id)} index={index}>
      {(provided, snapshot) => (
        <QuoteCardContent
          provided={provided}
          snapshot={snapshot}
          quote={quote}
        />
      )}
    </Draggable>
  );
};

const QuoteCardContent = ({
  provided,
  snapshot,
  quote,
}: {
  provided?: any;
  snapshot?: any;
  quote: Quote;
}) => {
  const redirect = useRedirect();
  const { quoteServiceTypes } = useConfigurationContext();
  const { data: client } = useGetOne("clients", {
    id: quote.client_id,
    enabled: !!quote.client_id,
  });

  const handleClick = () => {
    redirect(`/quotes/${quote.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  const serviceLabel =
    quoteServiceTypes.find((t) => t.value === quote.service_type)?.label ??
    quote.service_type;
  const eventDate =
    quote.event_date && isValid(new Date(quote.event_date))
      ? format(new Date(quote.event_date), "dd/MM/yyyy")
      : null;

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <Card
        className={`py-3 transition-all duration-200 ${
          snapshot?.isDragging
            ? "opacity-90 transform rotate-1 shadow-lg"
            : "shadow-sm hover:shadow-md"
        }`}
      >
        <CardContent className="px-3">
          <p className="text-sm font-medium mb-1 truncate">
            {quote.description || "Preventivo"}
          </p>
          {client && (
            <p className="text-xs text-muted-foreground mb-1 truncate">
              {client.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {serviceLabel}
            {eventDate ? ` - ${eventDate}` : ""}
          </p>
          <p className="text-xs font-medium mt-1">
            {quote.amount.toLocaleString("it-IT", {
              style: "currency",
              currency: "EUR",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
