import { useGetList } from "ra-core";

export const TasksListEmpty = () => {
  const { total } = useGetList("client_tasks", {
    pagination: { page: 1, perPage: 1 },
  });

  if (total) return null;

  return <p className="text-sm">I tuoi promemoria appariranno qui.</p>;
};
