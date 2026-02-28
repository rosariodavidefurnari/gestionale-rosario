import { AlertCircle } from "lucide-react";

export const ErrorMessage = ({ message }: { message?: string }) => (
  <div className="flex items-center gap-2 p-4 text-destructive">
    <AlertCircle className="size-5 shrink-0" />
    <p className="text-sm">
      {message ?? "Errore durante il caricamento dei dati."}
    </p>
  </div>
);
