import { AlertCircleIcon } from "lucide-react";
import { Form, required } from "ra-core";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { FileField, FileInput } from "@/components/admin";
import {
  type ImportFromJsonErrorState,
  type ImportFromJsonFailures,
  type ImportFromJsonFunction,
  type ImportFromJsonState,
  useImportFromJson,
} from "./useImportFromJson";
import sampleFile from "./import-sample.json?url";

export const ImportPage = () => {
  const [importState, importFile, reset] = useImportFromJson();

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Importa Dati</CardTitle>
        </CardHeader>
        <CardContent>
          {importState.status === "idle" ? (
            <ImportFromJsonIdle importFile={importFile} />
          ) : importState.status === "error" ? (
            <ImportFromJsonError
              importState={importState}
              importFile={importFile}
            />
          ) : importState.status === "importing" ? (
            <ImportFromJsonStatus importState={importState} />
          ) : (
            <ImportFromJsonSuccess importState={importState} reset={reset} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

ImportPage.path = "/import";

const ImportFromJsonIdle = ({
  importFile,
}: {
  importFile: ImportFromJsonFunction;
}) => (
  <>
    <div className="mb-4">
      <p className="text-sm">
        Puoi importare utenti, aziende, contatti, note e attività.
      </p>
      <p className="text-sm">
        I dati devono essere in un file JSON corrispondente a questo esempio:{" "}
        <a
          className="underline"
          download="import-sample.json"
          href={sampleFile}
        >
          sample.json
        </a>
      </p>
    </div>
    <ImportFromJsonForm importFile={importFile} />
  </>
);

const ImportFromJsonError = ({
  importState,
  importFile,
}: {
  importFile: ImportFromJsonFunction;
  importState: ImportFromJsonErrorState;
}) => (
  <>
    <Alert variant="destructive" className="mb-4">
      <AlertCircleIcon />
      <AlertTitle>Impossibile importare questo file.</AlertTitle>
      <AlertDescription>
        <p>{importState.error.message}</p>
      </AlertDescription>
    </Alert>
    <ImportFromJsonForm importFile={importFile} />
  </>
);

const ImportFromJsonForm = ({
  importFile,
}: {
  importFile: ImportFromJsonFunction;
}) => (
  <Form
    onSubmit={(values: any) => {
      importFile(values.file.rawFile);
    }}
  >
    <FileInput className="mt-4" source="file" validate={required()}>
      <FileField source="src" title="title" />
    </FileInput>
    <div className="flex justify-end mt-4">
      <Button type="submit">Importa</Button>
    </div>
  </Form>
);

const ImportFromJsonStatus = ({
  importState,
}: {
  importState: ImportFromJsonState;
}) => (
  <>
    <Spinner />
    <p className="my-4 text-sm text-center text-muted-foreground">
      Importazione in corso, non navigare lontano da questa pagina.
    </p>
    <ImportStats importState={importState} />
  </>
);

const ImportFromJsonSuccess = ({
  importState,
  reset,
}: {
  importState: ImportFromJsonState;
  reset: () => void;
}) => (
  <>
    <p className="mb-4 text-sm">
      Importazione completata.{" "}
      {hasFailedImports(importState.failedImports) ? (
        <>
          <span className="text-destructive">
            Alcuni record non sono stati importati.{" "}
          </span>
          <DownloadErrorFileButton failedImports={importState.failedImports} />
        </>
      ) : (
        <span>Tutti i record sono stati importati con successo.</span>
      )}
    </p>
    <ImportStats importState={importState} />
    <div className="flex justify-end mt-4">
      <Button variant="outline" onClick={reset}>
        Importa un altro file
      </Button>
    </div>
  </>
);

const hasFailedImports = (failedImports: ImportFromJsonFailures) => {
  return (
    failedImports.sales.length > 0 ||
    failedImports.companies.length > 0 ||
    failedImports.contacts.length > 0 ||
    failedImports.notes.length > 0 ||
    failedImports.tasks.length > 0
  );
};

const DownloadErrorFileButton = ({
  failedImports,
}: {
  failedImports: ImportFromJsonFailures;
}) => {
  return (
    <a
      className="font-semibold"
      onClick={async (event) => {
        const json = JSON.stringify(failedImports);
        const blob = new Blob([json], { type: "octet/stream" });
        const url = window.URL.createObjectURL(blob);
        event.currentTarget.href = url;
      }}
      download="atomic-crm-import-report.json"
    >
      Scarica il report degli errori
    </a>
  );
};

const ImportStats = ({
  importState: { stats, failedImports },
}: {
  importState: ImportFromJsonState;
}) => {
  const data = [
    {
      entity: "Utenti",
      imported: stats.sales,
      failed: failedImports.sales.length,
    },
    {
      entity: "Aziende",
      imported: stats.companies,
      failed: failedImports.companies.length,
    },
    {
      entity: "Contatti",
      imported: stats.contacts,
      failed: failedImports.contacts.length,
    },
    {
      entity: "Note",
      imported: stats.notes,
      failed: failedImports.notes.length,
    },
    {
      entity: "Attività",
      imported: stats.tasks,
      failed: failedImports.tasks.length,
    },
  ];
  return (
    <Table>
      <TableCaption className="sr-only">Stato importazione</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25"></TableHead>
          <TableHead className="text-right">Importati</TableHead>
          <TableHead className="text-right">Falliti</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((record) => (
          <TableRow key={record.entity}>
            <TableCell className="font-medium">{record.entity}</TableCell>
            <TableCell className="text-right text-success">
              {record.imported}
            </TableCell>
            <TableCell
              className={cn(
                "text-right",
                record.failed > 0 && "text-destructive",
              )}
            >
              {record.failed}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
