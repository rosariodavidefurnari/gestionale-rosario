import { useRedirect } from "ra-core";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const QuoteEmpty = () => {
  const redirect = useRedirect();

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground mb-4">
        Nessun preventivo ancora. Crea il primo!
      </p>
      <Button onClick={() => redirect("/quotes/create")} className="gap-2">
        <Plus className="w-4 h-4" />
        Nuovo Preventivo
      </Button>
    </div>
  );
};
