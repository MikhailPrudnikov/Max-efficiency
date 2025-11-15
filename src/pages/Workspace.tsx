import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  TrendingUp,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tasksAPI, businessAPI, challengesAPI } from "@/lib/api";

const miniApps = [
  {
    id: "challenges",
    title: "Челленджи",
    description: "Участвуйте в челленджах и достигайте целей",
    icon: Trophy,
    color: "from-cyan to-blue",
  },
  {
    id: "statistics",
    title: "Статистика",
    description: "Анализ продуктивности и прогресса",
    icon: TrendingUp,
    color: "from-blue to-purple",
  },
  {
    id: "business",
    title: "Для бизнеса",
    description: "Управление заказами и клиентами",
    icon: Briefcase,
    color: "from-purple to-pink",
  },
];


const Workspace = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeChallenges: 0,
    productivity: 0,
    orders: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [tasksData, ordersData, challengesData] = await Promise.all([
        tasksAPI.getAll().catch(() => ({ tasks: [] })),
        businessAPI.getOrders().catch(() => ({ orders: [] })),
        challengesAPI.getAll().catch(() => ({ challenges: [] })),
      ]);

      const tasks = tasksData.tasks || [];
      const completedTasks = tasks.filter((task: any) => task.completed);
      
      // Calculate productivity based on this week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weekTasks = completedTasks.filter((task: any) => {
        if (!task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= startOfWeek;
      });

      const productivity = weekTasks.length > 0 ? Math.min(100, Math.round((weekTasks.length / 7) * 100)) : 0;

      // Count active challenges (with incomplete tasks)
      const challenges = challengesData.challenges || [];
      const activeChallenges = challenges.filter((c: any) => {
        const dailyTasks = JSON.parse(c.daily_tasks || '[]');
        const completedCount = dailyTasks.filter((t: any) => t.completed).length;
        return completedCount < dailyTasks.length;
      }).length;

      // Calculate moodboards based on tasks with "moodboard" or "creative" tags
      const moodboards = tasks.filter((task: any) => {
        const tags = typeof task.tags === 'string' ? JSON.parse(task.tags || '[]') : task.tags || [];
        return tags.some((tag: string) =>
          tag.toLowerCase().includes('moodboard') ||
          tag.toLowerCase().includes('creative') ||
          tag.toLowerCase().includes('дизайн') ||
          tag.toLowerCase().includes('творчество')
        );
      }).length;

      setStats({
        activeChallenges,
        productivity,
        orders: ordersData.orders?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load workspace stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan/5 via-blue/5 to-purple/5">
      <div className="container max-w-screen-xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Workspace</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Дополнительные инструменты для продуктивности
          </p>
        </div>

        {/* Mini Apps Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Инструменты</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {miniApps.map((app) => (
            <Card
              key={app.id}
              className="p-4 sm:p-6 rounded-2xl border-border hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(`/workspace/${app.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-r ${app.color}`}>
                  <app.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>

              <div className="mt-4">
                <h3 className="text-lg sm:text-xl font-semibold">{app.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {app.description}
                </p>
              </div>

              <Button
                className="w-full mt-4 rounded-xl text-sm sm:text-base"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/workspace/${app.id}`);
                }}
              >
                Открыть
              </Button>
            </Card>
          ))}
          </div>
        </div>

        {/* Quick Access Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Быстрый доступ</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 rounded-2xl border-border text-center hover:shadow-md transition-all cursor-pointer">
              <div className="text-xl sm:text-2xl mb-2">🎯</div>
              <div className="text-xs sm:text-sm font-medium">Активные челленджи</div>
              <div className="text-xl sm:text-2xl font-bold text-cyan mt-2">{stats.activeChallenges}</div>
            </Card>
            <Card className="p-3 sm:p-4 rounded-2xl border-border text-center hover:shadow-md transition-all cursor-pointer">
              <div className="text-xl sm:text-2xl mb-2">📊</div>
              <div className="text-xs sm:text-sm font-medium">Продуктивность</div>
              <div className="text-xl sm:text-2xl font-bold text-blue mt-2">{stats.productivity}%</div>
            </Card>
            <Card className="p-3 sm:p-4 rounded-2xl border-border text-center hover:shadow-md transition-all cursor-pointer">
              <div className="text-xl sm:text-2xl mb-2">💼</div>
              <div className="text-xs sm:text-sm font-medium">Заказы</div>
              <div className="text-xl sm:text-2xl font-bold text-purple mt-2">{stats.orders}</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
