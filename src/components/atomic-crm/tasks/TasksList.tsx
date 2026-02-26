import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTask } from "./AddTask";
import { TasksListContent } from "./TasksListContent";

export const TasksList = () => (
  <div className="max-w-3xl mx-auto mt-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Promemoria</CardTitle>
        <AddTask selectClient display="chip" />
      </CardHeader>
      <CardContent>
        <TasksListContent />
      </CardContent>
    </Card>
  </div>
);
