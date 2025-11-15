import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { ChevronLeft, TrendingUp, Target, Calendar, Award } from "lucide-react";
import { tasksAPI } from "@/lib/api";

interface TaskStats {
  completedThisWeek: number;
  averageCompletion: number;
  bestDay: string;
  currentStreak: number;
  tasksByDay: { day: string; count: number }[];
  tasksByTag: { tag: string; count: number; color: string }[];
  tasksByPriority: { priority: string; count: number }[];
  productivityStreak: { day: string; productivity: number }[];
}

const Statistics = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const { toast } = useToast();
  const [stats, setStats] = useState<TaskStats>({
    completedThisWeek: 0,
    averageCompletion: 0,
    bestDay: "Понедельник",
    currentStreak: 0,
    tasksByDay: [],
    tasksByTag: [],
    tasksByPriority: [],
    productivityStreak: [],
  });

  useEffect(() => {
    // Don't load stats if still checking authentication or not authenticated
    if (authLoading || !isAuthenticated) {
      return;
    }
    loadStats();
  }, [authLoading, isAuthenticated]);

  const loadStats = async () => {
    try {
      console.log('🔄 Statistics: Starting to load stats...');

      const data = await tasksAPI.getAll();

      console.log('📊 Statistics: Raw tasks data received:', data);
      console.log('📊 Statistics: Data type:', typeof data);
      console.log('📊 Statistics: Data keys:', data ? Object.keys(data) : 'null');

      if (!data || !data.tasks) {
        console.error('❌ Statistics: Invalid tasks data structure!', {
          data,
          hasTasks: data?.tasks,
          tasksType: typeof data?.tasks
        });
        throw new Error('Invalid tasks data received');
      }

      console.log('✅ Statistics: Data validation passed, tasks count:', data.tasks.length);

      const tasks = data.tasks || [];
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Tasks completed this week
      const completedThisWeek = tasks.filter((task: any) => {
        if (!task.completed || !task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= weekAgo;
      }).length;

      // Calculate average completion rate
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task: any) => task.completed).length;
      const averageCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate tasks by day (based on completion dates)
      const dayMap = new Map<string, number>();
      const completedTasksByDay = new Map<string, number>();

      tasks.forEach((task: any) => {
        // Count all tasks by deadline day
        if (task.deadline) {
          const date = new Date(task.deadline);
          const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];
          dayMap.set(dayName, (dayMap.get(dayName) || 0) + 1);
        }

        // Count completed tasks by completion day
        if (task.completed && task.completed_at) {
          const completedDate = new Date(task.completed_at);
          const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][completedDate.getDay()];
          completedTasksByDay.set(dayName, (completedTasksByDay.get(dayName) || 0) + 1);
        }
      });

      const tasksByDay = [
        { day: "Пн", count: dayMap.get("Пн") || 0 },
        { day: "Вт", count: dayMap.get("Вт") || 0 },
        { day: "Ср", count: dayMap.get("Ср") || 0 },
        { day: "Чт", count: dayMap.get("Чт") || 0 },
        { day: "Пт", count: dayMap.get("Пт") || 0 },
        { day: "Сб", count: dayMap.get("Сб") || 0 },
        { day: "Вс", count: dayMap.get("Вс") || 0 },
      ];

      // Find the best day (day with most completed tasks)
      let bestDay = "Понедельник";
      let maxCompleted = 0;
      const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
      const shortDayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

      for (let i = 0; i < shortDayNames.length; i++) {
        const count = completedTasksByDay.get(shortDayNames[i]) || 0;
        if (count > maxCompleted) {
          maxCompleted = count;
          bestDay = dayNames[i];
        }
      }

      // Calculate tasks by tags
      const tagMap = new Map<string, number>();
      tasks.forEach((task: any) => {
        const tags = typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : task.tags || [];
        tags.forEach((tag: string) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });

      const colors = ['hsl(var(--cyan))', 'hsl(var(--blue))', 'hsl(var(--purple))', 'hsl(var(--pink))', 'hsl(var(--primary))'];
      const tasksByTag = Array.from(tagMap.entries())
        .map(([tag, count], index) => ({
          tag,
          count,
          color: colors[index % colors.length]
        }))
        .slice(0, 5);

      // Calculate tasks by priority
      const priorityMap = new Map<string, number>();
      tasks.forEach((task: any) => {
        priorityMap.set(task.priority || 'Средний', (priorityMap.get(task.priority || 'Средний') || 0) + 1);
      });

      const tasksByPriority = [
        { priority: "Критичный", count: priorityMap.get("Критичный") || 0 },
        { priority: "Высокий", count: priorityMap.get("Высокий") || 0 },
        { priority: "Средний", count: priorityMap.get("Средний") || 0 },
        { priority: "Низкий", count: priorityMap.get("Низкий") || 0 },
      ];

      // Calculate current streak (consecutive days with completed tasks)
      const calculateStreak = () => {
        const completedDates = new Set<string>();
        tasks.forEach((task: any) => {
          if (task.completed && task.completed_at) {
            const date = new Date(task.completed_at);
            // Normalize to start of day
            date.setHours(0, 0, 0, 0);
            completedDates.add(date.toISOString().split('T')[0]);
          }
        });

        if (completedDates.size === 0) return 0;

        const sortedDates = Array.from(completedDates).sort().reverse();
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Check if today has completed tasks
        if (!completedDates.has(todayStr)) {
          // If no tasks completed today, check yesterday
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (!completedDates.has(yesterdayStr)) {
            return 0; // No streak if neither today nor yesterday have completed tasks
          }
        }

        // Count consecutive days
        let currentDate = new Date(today);
        if (!completedDates.has(todayStr)) {
          currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday if today is empty
        }

        while (true) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (completedDates.has(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }

        return streak;
      };

      // Calculate productivity for the last 7 days
      const calculateProductivityStreak = () => {
        const productivityData = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          // Count tasks completed on this day
          const dayCompleted = tasks.filter((task: any) => {
            if (!task.completed || !task.completed_at) return false;
            const completedDate = new Date(task.completed_at);
            return completedDate >= date && completedDate < nextDate;
          }).length;

          // Count total tasks for this day (by deadline)
          const dayTotal = tasks.filter((task: any) => {
            if (!task.deadline) return false;
            const deadlineDate = new Date(task.deadline);
            return deadlineDate >= date && deadlineDate < nextDate;
          }).length;

          const productivity = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;

          productivityData.push({
            day: String(7 - i), // Display as "1" to "7"
            productivity
          });
        }

        return productivityData;
      };

      const currentStreak = calculateStreak();
      const productivityStreak = calculateProductivityStreak();

      setStats({
        completedThisWeek: completedThisWeek || 0,
        averageCompletion: averageCompletion || 0,
        bestDay,
        currentStreak,
        tasksByDay,
        tasksByTag,
        tasksByPriority,
        productivityStreak,
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статистику",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container max-w-screen-xl mx-auto p-4 space-y-6 sm:p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/workspace")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Назад к Workspace
        </Button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Статистика продуктивности</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Анализ вашего прогресса и достижений
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          <Card className="p-3 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-cyan" />
              <span className="text-xs sm:text-sm text-muted-foreground">За неделю</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-cyan">{stats.completedThisWeek}</p>
            <p className="text-xs text-muted-foreground mt-1">выполнено задач</p>
          </Card>

          <Card className="p-3 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue" />
              <span className="text-xs sm:text-sm text-muted-foreground">Средний %</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue">{stats.averageCompletion}%</p>
            <p className="text-xs text-muted-foreground mt-1">выполнения</p>
          </Card>

          <Card className="p-3 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple" />
              <span className="text-xs sm:text-sm text-muted-foreground">Лучший день</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple">{stats.bestDay}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(() => {
                const dayMap: { [key: string]: string } = {
                  "Понедельник": "Пн",
                  "Вторник": "Вт",
                  "Среда": "Ср",
                  "Четверг": "Чт",
                  "Пятница": "Пт",
                  "Суббота": "Сб",
                  "Воскресенье": "Вс"
                };
                const shortDay = dayMap[stats.bestDay] || "Пн";
                const dayData = stats.tasksByDay.find(d => d.day === shortDay);
                return `${dayData?.count || 0} задач`;
              })()} задач
            </p>
          </Card>

          <Card className="p-3 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-pink" />
              <span className="text-xs sm:text-sm text-muted-foreground">Streak</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-pink">{stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-1">дней подряд</p>
          </Card>
        </div>

        {/* Tasks by Day Chart */}
        <Card className="p-4 sm:p-6 rounded-2xl">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">Задачи по дням недели</h3>
          <ChartContainer
            config={{
              count: {
                label: "Задачи",
                color: "hsl(var(--cyan))",
              },
            }}
            className="aspect-video w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tasksByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--cyan))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Tasks by Tag Pie Chart */}
          <Card className="p-4 sm:p-6 rounded-2xl">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Задачи по тэгам</h3>
            <ChartContainer
              config={{
                count: {
                  label: "Количество",
                },
              }}
              className="aspect-video w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tasksByTag}
                    dataKey="count"
                    nameKey="tag"
                    cx="50%"
                    cy="50%"
                    outerRadius={'70%'}
                    label={({ tag, percent }) => `${tag}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.tasksByTag.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {stats.tasksByTag.map((tag) => (
                <div key={tag.tag} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.tag}</span>
                  </div>
                  <span className="text-sm font-semibold">{tag.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Tasks by Priority */}
          <Card className="p-4 sm:p-6 rounded-2xl">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Распределение по приоритетам</h3>
            <ChartContainer
              config={{
                count: {
                  label: "Задачи",
                  color: "hsl(var(--blue))",
                },
              }}
              className="aspect-video w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.tasksByPriority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="priority"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--blue))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        </div>

        {/* Productivity Streak */}
        <Card className="p-4 sm:p-6 rounded-2xl">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">Продуктивность за неделю</h3>
          <ChartContainer
            config={{
              productivity: {
                label: "Продуктивность",
                color: "hsl(var(--purple))",
              },
            }}
            className="aspect-video w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.productivityStreak}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="productivity"
                  stroke="hsl(var(--purple))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--purple))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;

