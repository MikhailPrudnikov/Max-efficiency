import { useState, useEffect } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TaskList } from "@/components/calendar/TaskList";
import { Button } from "@/components/ui/button";
import { Plus, List, Calendar as CalendarIcon } from "lucide-react";
import { TaskDialog } from "@/components/calendar/TaskDialog";
import { tasksAPI } from "@/lib/api";
import { toast } from "sonner";

export type Task = {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  completed: boolean;
  subtasks?: { id: string; text: string; completed: boolean }[];
  callLink?: string;
  attachments?: string[];
  reminders?: { frequency: string; time: string }[];
};

const Index = () => {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Load tasks from database on mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksAPI.getAll();
      // Convert deadline strings to Date objects
      const tasksWithDates = data.tasks.map((task: any) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : undefined,
        subtasks: typeof task.subtasks === 'string' ? JSON.parse(task.subtasks) : task.subtasks || [],
      }));
      setTasks(tasksWithDates);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (task: Omit<Task, "id" | "completed">) => {
    try {
      const response = await tasksAPI.create(task);
      const newTask = {
        ...response.task,
        deadline: response.task.deadline ? new Date(response.task.deadline) : undefined,
        subtasks: typeof response.task.subtasks === 'string' ? JSON.parse(response.task.subtasks) : response.task.subtasks || [],
      };
      setTasks([...tasks, newTask]);
      setIsDialogOpen(false);
      toast.success('Задача создана');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Не удалось создать задачу');
    }
  };

  const handleEditTask = async (task: Task) => {
    try {
      const response = await tasksAPI.update(task.id, task);
      const updatedTask = {
        ...response.task,
        deadline: response.task.deadline ? new Date(response.task.deadline) : undefined,
        subtasks: typeof response.task.subtasks === 'string' ? JSON.parse(response.task.subtasks) : response.task.subtasks || [],
      };
      setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
      setIsDialogOpen(false);
      setEditingTask(undefined);
      toast.success('Задача обновлена');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Не удалось обновить задачу');
    }
  };

  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const response = await tasksAPI.update(id, { ...task, completed: !task.completed });
      const updatedTask = {
        ...response.task,
        deadline: response.task.deadline ? new Date(response.task.deadline) : undefined,
        subtasks: typeof response.task.subtasks === 'string' ? JSON.parse(response.task.subtasks) : response.task.subtasks || [],
      };
      setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
    } catch (error) {
      console.error('Failed to toggle task:', error);
      toast.error('Не удалось обновить задачу');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await tasksAPI.delete(id);
      setTasks(tasks.filter((t) => t.id !== id));
      toast.success('Задача удалена');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Не удалось удалить задачу');
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan/5 via-blue/5 to-purple/5">
      <div className="container max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan via-blue to-purple bg-clip-text text-transparent">
              Max Efficiency
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Повысьте свою продуктивность
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("calendar")}
              className="rounded-xl"
            >
              <CalendarIcon className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-xl"
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-cyan">{tasks.length}</div>
            <div className="text-sm text-muted-foreground">Всего задач</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-blue">
              {tasks.filter((t) => !t.completed).length}
            </div>
            <div className="text-sm text-muted-foreground">Активных</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-purple">
              {tasks.filter((t) => t.completed).length}
            </div>
            <div className="text-sm text-muted-foreground">Завершено</div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="text-2xl font-bold text-pink">
              {tasks.filter((t) => t.priority === "high" || t.priority === "critical").length}
            </div>
            <div className="text-sm text-muted-foreground">Приоритетных</div>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === "calendar" ? (
          <CalendarView tasks={tasks} onEditTask={openEditDialog} onToggleComplete={handleToggleComplete} />
        ) : (
          <TaskList
            tasks={tasks}
            onEditTask={openEditDialog}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {/* FAB */}
        <Button
          size="lg"
          className="fixed bottom-20 md:bottom-24 right-6 w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-cyan via-blue to-purple hover:shadow-xl transition-all"
          onClick={() => {
            setEditingTask(undefined);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-6 h-6" />
        </Button>

        <TaskDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingTask(undefined);
          }}
          onSave={editingTask ? handleEditTask : handleAddTask}
          task={editingTask}
        />
      </div>
    </div>
  );
};

export default Index;
