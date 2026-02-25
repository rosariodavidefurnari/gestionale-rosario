import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Welcome = () => (
  <Card>
    <CardHeader className="px-4">
      <CardTitle>Gestionale Rosario Furnari</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-sm mb-4">
        Gestionale per la gestione di clienti, progetti, preventivi e attività.
      </p>
      <p className="text-sm">
        Questa è la modalità demo con dati fittizi. I dati si resettano al
        ricaricamento della pagina.
      </p>
    </CardContent>
  </Card>
);
