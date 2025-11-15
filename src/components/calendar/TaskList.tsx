import { Task } from "@/pages/Index";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type TaskListProps = {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
};

const priorityColors = {
  low: "bg-blue/10 text-blue border-blue/20",
  medium: "bg-cyan/10 text-cyan border-cyan/20",
  high: "bg-purple/10 text-purple border-purple/20",
  critical: "bg-pink/10 text-pink border-pink/20",
};

export const TaskList = ({ tasks, onEditTask, onToggleComplete, onDeleteTask }: TaskListProps) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.getTime() - b.deadline.getTime();
  });

  return (
    <div className="space-y-3">
      {sortedTasks.map((task) => (
        <Card
          key={task.id}
          className="p-4 rounded-2xl border-border hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggleComplete(task.id)}
              className="mt-1"
            >
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            <div className="flex-1 min-w-0" onClick={() => onEditTask(task)}>
              <h4
                className={`font-semibold ${
                  task.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {task.description}
                </p>
              )}

              {task.deadline && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <Calendar className="w-4 h-4" />
                  {format(task.deadline, "d MMMM yyyy, HH:mm", { locale: ru })}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className={priorityColors[task.priority]}>
                  {task.priority === "critical" && "Критично"}
                  {task.priority === "high" && "Высокий"}
                  {task.priority === "medium" && "Средний"}
                  {task.priority === "low" && "Низкий"}
                </Badge>
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>

              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {task.subtasks.filter((st) => st.completed).length} /{" "}
                  {task.subtasks.length} подзадач выполнено
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(task.id);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}

      {tasks.length === 0 && (
        <Card className="p-12 rounded-2xl border-border border-dashed">
          <p className="text-center text-muted-foreground">
            Нет задач. Создайте свою первую задачу!
          </p>
        </Card>
      )}
    </div>
  );
};
