import {
  type Identifier,
  RecordRepresentation,
  useGetIdentity,
  useGetOne,
  useNotify,
} from "ra-core";
import { CreateSheet } from "../misc/CreateSheet";
import { TaskFormContent } from "./TaskFormContent";

export interface TaskCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client_id?: Identifier;
}

export const TaskCreateSheet = ({
  open,
  onOpenChange,
  client_id,
}: TaskCreateSheetProps) => {
  const { identity } = useGetIdentity();
  const notify = useNotify();

  const selectClient = client_id == null;
  const { data: client } = useGetOne(
    "clients",
    { id: client_id! },
    { enabled: !selectClient },
  );

  if (!identity) return null;

  const handleSuccess = async () => {
    notify("Promemoria aggiunto");
    onOpenChange(false);
  };

  return (
    <CreateSheet
      resource="client_tasks"
      title={
        <h1 className="text-xl font-semibold truncate pr-10">
          {!selectClient ? "Crea promemoria per " : "Crea promemoria"}
          {!selectClient && (
            <RecordRepresentation record={client} resource="clients" />
          )}
        </h1>
      }
      redirect={false}
      record={{
        type: "none",
        client_id: client_id ?? null,
        due_date: new Date().toISOString().slice(0, 10),
      }}
      transform={(data) => {
        const dueDate = new Date(data.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return {
          ...data,
          due_date: dueDate.toISOString(),
        };
      }}
      mutationOptions={{
        onSuccess: handleSuccess,
      }}
      open={open}
      onOpenChange={onOpenChange}
    >
      <TaskFormContent selectClient={selectClient} />
    </CreateSheet>
  );
};
