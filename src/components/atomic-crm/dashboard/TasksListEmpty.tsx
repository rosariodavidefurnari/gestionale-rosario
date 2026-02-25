import { useGetIdentity, useGetList } from "ra-core";

export const TasksListEmpty = () => {
  const { identity } = useGetIdentity();

  const { total } = useGetList(
    "tasks",
    {
      pagination: { page: 1, perPage: 1 },
      filter: {
        sales_id: identity?.id,
      },
    },
    { enabled: !!identity },
  );

  if (total) return null;

  return (
    <p className="text-sm">
      Le attività assegnate ai tuoi contatti appariranno qui.
    </p>
  );
};
