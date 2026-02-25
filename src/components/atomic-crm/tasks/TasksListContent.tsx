import { taskFilters, isBeforeFriday } from "./taskFilters";
import { TasksListEmpty } from "../dashboard/TasksListEmpty";
import { TasksListFilter } from "../dashboard/TasksListFilter";

export const TasksListContent = () => {
  return (
    <div className="flex flex-col gap-4">
      <TasksListEmpty />
      <TasksListFilter title="In ritardo" filter={taskFilters.overdue} />
      <TasksListFilter title="Oggi" filter={taskFilters.today} />
      <TasksListFilter title="Domani" filter={taskFilters.tomorrow} />
      {isBeforeFriday && (
        <TasksListFilter
          title="Questa settimana"
          filter={taskFilters.thisWeek}
        />
      )}
      <TasksListFilter title="Più avanti" filter={taskFilters.later} />
    </div>
  );
};
