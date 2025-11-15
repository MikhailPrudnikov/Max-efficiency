import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trophy, ChevronLeft, Calendar, Target, Award, Flame, Droplet, Brain, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { challengesAPI } from "@/lib/api";
import { toast } from "sonner";

interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
}

interface DayProgress {
  day: number;
  completed: boolean;
  completedAt?: string;
  tasks: DailyTask[];
}

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  requirement: number; // день, когда разблокируется
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  theory: string;
  duration: number;
  currentDay: number;
  daysProgress: DayProgress[];
  quizzes: Quiz[];
  achievements: Achievement[];
  color: string;
  icon: string;
  startedAt?: string;
}

const challengeTemplates = [
  {
    id: "morning-focus",
    title: "Утренний фокус",
    description: "Развивайте привычку продуктивного утра",
    theory: "Утренние часы — самое продуктивное время. Исследования показывают, что первые 2-3 часа после пробуждения мозг работает максимально эффективно. Регулярный утренний ритуал помогает настроиться на продуктивный день.",
    duration: 7,
    icon: "☀️",
    dailyTasksTemplate: [
      "Проснуться в 6:00",
      "Выпить стакан воды",
      "10 минут медитации",
      "Планирование дня"
    ],
    quizzes: [
      {
        id: "q1",
        question: "В какое время мозг наиболее продуктивен?",
        options: ["Утром", "Днем", "Вечером", "Ночью"],
        correctAnswer: 0,
      },
    ],
    achievements: [
      { id: "a1", title: "Первое утро", description: "Завершите первый день", icon: "🌅", requirement: 1 },
      { id: "a2", title: "На полпути", description: "Завершите 3 дня подряд", icon: "⭐", requirement: 3 },
      { id: "a3", title: "Неделя силы", description: "Завершите все 7 дней", icon: "💪", requirement: 7 },
    ],
    color: "from-orange-400 to-amber-500",
  },
  {
    id: "fitness-30",
    title: "30 дней фитнеса",
    description: "Ежедневные тренировки для здоровья",
    theory: "Регулярные физические упражнения улучшают не только тело, но и когнитивные функции мозга. Всего 20-30 минут в день могут существенно повысить уровень энергии и концентрацию.",
    duration: 30,
    icon: "🏃",
    dailyTasksTemplate: [
      "20 минут кардио",
      "Растяжка 10 минут",
      "Выпить 2 литра воды"
    ],
    quizzes: [
      {
        id: "q1",
        question: "Сколько минут кардио рекомендуется в день?",
        options: ["10 минут", "20-30 минут", "60 минут", "2 часа"],
        correctAnswer: 1,
      },
    ],
    achievements: [
      { id: "a1", title: "Первый шаг", description: "Первая тренировка", icon: "👟", requirement: 1 },
      { id: "a2", title: "Неделя здоровья", description: "7 дней подряд", icon: "🏃", requirement: 7 },
      { id: "a3", title: "Две недели", description: "14 дней подряд", icon: "💪", requirement: 14 },
      { id: "a4", title: "Месяц силы", description: "30 дней подряд", icon: "🏆", requirement: 30 },
    ],
    color: "from-blue-500 to-purple-500",
  },
  {
    id: "digital-detox",
    title: "Цифровой детокс",
    description: "Осознанное использование времени",
    theory: "Отказ от бесконечной прокрутки помогает вернуть фокус и улучшить концентрацию. Контроль над использованием соцсетей освобождает время для более важных дел.",
    duration: 7,
    icon: "📵",
    dailyTasksTemplate: [
      "Не открывать соцсети утром",
      "Максимум 30 минут соцсетей в день",
      "Записать наблюдения в дневник"
    ],
    quizzes: [
      {
        id: "q1",
        question: "Сколько времени в среднем человек проводит в соцсетях?",
        options: ["30 минут", "1 час", "2-3 часа", "5 часов"],
        correctAnswer: 2,
      },
    ],
    achievements: [
      { id: "a1", title: "Осознанность", description: "Первый день детокса", icon: "🧠", requirement: 1 },
      { id: "a2", title: "Свобода", description: "Неделя осознанности", icon: "🕊️", requirement: 7 },
    ],
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "reading-habit",
    title: "21 день чтения",
    description: "Сформируйте привычку ежедневного чтения",
    theory: "Чтение улучшает словарный запас, память и критическое мышление. 21 день — минимальный срок для формирования новой привычки.",
    duration: 21,
    icon: "📚",
    dailyTasksTemplate: [
      "Прочитать 20 страниц",
      "Записать ключевую мысль"
    ],
    quizzes: [
      {
        id: "q1",
        question: "Сколько дней нужно для формирования привычки?",
        options: ["7 дней", "14 дней", "21 день", "30 дней"],
        correctAnswer: 2,
      },
    ],
    achievements: [
      { id: "a1", title: "Книголюб", description: "Неделя чтения", icon: "📖", requirement: 7 },
      { id: "a2", title: "Эрудит", description: "21 день чтения", icon: "🎓", requirement: 21 },
    ],
    color: "from-cyan-500 to-teal-500",
  },
];

const Challenges = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [templateToStart, setTemplateToStart] = useState<typeof challengeTemplates[0] | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (id && challenges.length > 0) {
      const challenge = challenges.find((c) => c.id === id);
      setSelectedChallenge(challenge || null);
    } else {
      setSelectedChallenge(null);
    }
  }, [id, challenges]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const { challenges: dbChallenges } = await challengesAPI.getAll();
      
      const mappedChallenges = dbChallenges.map((c: any) => {
        const daysProgress = JSON.parse(c.daily_tasks || '[]');
        const achievements = JSON.parse(c.achievements || '[]');
        
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          theory: c.theory,
          duration: c.duration,
          currentDay: c.current_day,
          daysProgress,
          quizzes: JSON.parse(c.quizzes || '[]'),
          achievements,
          color: c.color,
          icon: getIconForChallenge(c.id),
          startedAt: c.created_at,
        };
      });
      
      setChallenges(mappedChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
      // Не показываем ошибку если просто нет данных
      // Ошибка будет только если реально есть проблема с сервером
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const getIconForChallenge = (id: string) => {
    const template = challengeTemplates.find(t => t.id === id);
    return template?.icon || "🎯";
  };

  const handleStartChallenge = async (template: typeof challengeTemplates[0]) => {
    setTemplateToStart(template);
    setShowStartDialog(true);
  };

  const confirmStartChallenge = async () => {
    if (!templateToStart) return;

    try {
      // Создаем структуру прогресса по дням
      const daysProgress: DayProgress[] = Array.from({ length: templateToStart.duration }, (_, i) => ({
        day: i + 1,
        completed: false,
        tasks: templateToStart.dailyTasksTemplate.map((task, idx) => ({
          id: `task-${i}-${idx}`,
          title: task,
          completed: false,
        })),
      }));

      await challengesAPI.create({
        id: templateToStart.id,
        title: templateToStart.title,
        description: templateToStart.description,
        theory: templateToStart.theory,
        duration: templateToStart.duration,
        current_day: 1,
        daily_tasks: JSON.stringify(daysProgress),
        quizzes: JSON.stringify(templateToStart.quizzes),
        achievements: JSON.stringify(templateToStart.achievements.map(a => ({ ...a, unlocked: false }))),
        color: templateToStart.color,
      });

      toast.success(`Челлендж "${templateToStart.title}" начат!`);
      setShowStartDialog(false);
      setTemplateToStart(null);
      loadChallenges();
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast.error('Не удалось начать челлендж');
    }
  };

  const handleToggleTask = async (dayIndex: number, taskIndex: number) => {
    if (!selectedChallenge) return;

    const updatedDaysProgress = [...selectedChallenge.daysProgress];
    const day = updatedDaysProgress[dayIndex];
    
    day.tasks[taskIndex].completed = !day.tasks[taskIndex].completed;

    // Проверяем, все ли задачи дня выполнены
    const allTasksCompleted = day.tasks.every(t => t.completed);
    if (allTasksCompleted && !day.completed) {
      day.completed = true;
      day.completedAt = new Date().toISOString();
      
      // Проверяем достижения
      const unlockedAchievements = selectedChallenge.achievements
        .filter(a => !a.unlocked && a.requirement === dayIndex + 1)
        .map(a => ({ ...a, unlocked: true }));

      if (unlockedAchievements.length > 0) {
        const updatedAchievements = selectedChallenge.achievements.map(a => {
          const unlocked = unlockedAchievements.find(ua => ua.id === a.id);
          return unlocked ? { ...a, unlocked: true } : a;
        });

        await challengesAPI.update(selectedChallenge.id, {
          daily_tasks: JSON.stringify(updatedDaysProgress),
          current_day: Math.min(dayIndex + 2, selectedChallenge.duration),
          achievements: JSON.stringify(updatedAchievements),
        });

        setSelectedChallenge({
          ...selectedChallenge,
          daysProgress: updatedDaysProgress,
          currentDay: Math.min(dayIndex + 2, selectedChallenge.duration),
          achievements: updatedAchievements,
        });

        toast.success(`День ${dayIndex + 1} завершен! 🎉`, {
          description: unlockedAchievements.map(a => `${a.icon} ${a.title}`).join(', '),
        });
      } else {
        await challengesAPI.update(selectedChallenge.id, {
          daily_tasks: JSON.stringify(updatedDaysProgress),
          current_day: Math.min(dayIndex + 2, selectedChallenge.duration),
        });

        setSelectedChallenge({
          ...selectedChallenge,
          daysProgress: updatedDaysProgress,
          currentDay: Math.min(dayIndex + 2, selectedChallenge.duration),
        });

        toast.success(`День ${dayIndex + 1} завершен! 🎉`);
      }
    } else {
      await challengesAPI.update(selectedChallenge.id, {
        daily_tasks: JSON.stringify(updatedDaysProgress),
      });

      setSelectedChallenge({
        ...selectedChallenge,
        daysProgress: updatedDaysProgress,
      });
    }

    // Обновляем список челленджей
    setChallenges(challenges.map(c => 
      c.id === selectedChallenge.id 
        ? { ...c, daysProgress: updatedDaysProgress, currentDay: selectedChallenge.currentDay }
        : c
    ));
  };

  const handleQuizSubmit = () => setShowQuizResult(true);

  const handleNextQuiz = () => {
    if (selectedChallenge && currentQuizIndex < selectedChallenge.quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setQuizAnswer(null);
      setShowQuizResult(false);
    } else {
      setShowQuiz(false);
      setCurrentQuizIndex(0);
      setQuizAnswer(null);
      setShowQuizResult(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedChallenge) {
    const totalTasks = selectedChallenge.daysProgress.reduce((sum, day) => sum + day.tasks.length, 0);
    const completedTasks = selectedChallenge.daysProgress.reduce(
      (sum, day) => sum + day.tasks.filter(t => t.completed).length,
      0
    );
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const completedDays = selectedChallenge.daysProgress.filter(d => d.completed).length;

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/workspace/challenges")} 
            className="rounded-xl"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>

          {/* Header Card */}
          <Card className="p-6 rounded-2xl border-border overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedChallenge.color} opacity-5`} />
            <div className="relative">
              <div className="flex items-start gap-4 mb-4">
                <div className={`text-5xl`}>{selectedChallenge.icon}</div>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">{selectedChallenge.title}</h1>
                  <p className="text-muted-foreground">{selectedChallenge.description}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl mb-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Теория
                </h3>
                <p className="text-sm text-muted-foreground">{selectedChallenge.theory}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Общий прогресс</div>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-sm font-semibold">{Math.round(progress)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    <Calendar className="w-3 h-3 mr-1" />
                    {completedDays}/{selectedChallenge.duration} дней
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Days Progress */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Прогресс по дням</h2>
            {selectedChallenge.daysProgress.map((day, dayIndex) => {
              const isCurrentDay = dayIndex + 1 === selectedChallenge.currentDay;
              const isLocked = dayIndex + 1 > selectedChallenge.currentDay;
              const dayProgress = day.tasks.length > 0 
                ? (day.tasks.filter(t => t.completed).length / day.tasks.length) * 100 
                : 0;

              return (
                <Card 
                  key={dayIndex} 
                  className={`p-4 sm:p-6 rounded-2xl transition-all ${
                    isCurrentDay ? 'border-primary shadow-md' : ''
                  } ${isLocked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {day.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : isLocked ? (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 ${
                          isCurrentDay ? 'border-primary' : 'border-muted-foreground'
                        }`} />
                      )}
                      <div>
                        <h3 className="font-semibold">
                          День {day.day}
                          {isCurrentDay && <span className="ml-2 text-xs text-primary">(Текущий)</span>}
                        </h3>
                        {day.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            Завершен {new Date(day.completedAt).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={dayProgress} className="w-20 h-2" />
                      <span className="text-sm font-medium">{Math.round(dayProgress)}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {day.tasks.map((task, taskIndex) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isLocked ? 'bg-muted/30' : 'bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => !isLocked && handleToggleTask(dayIndex, taskIndex)}
                          disabled={isLocked}
                        />
                        <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quizzes */}
          {selectedChallenge.quizzes.length > 0 && (
            <Card className="p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Проверка знаний
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Пройдите тест, чтобы проверить усвоение материала
              </p>
              <Button onClick={() => setShowQuiz(true)} className="w-full rounded-xl">
                Пройти тест
              </Button>
            </Card>
          )}

          {/* Achievements */}
          <Card className="p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Достижения
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedChallenge.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all ${
                    achievement.unlocked
                      ? "border-primary bg-primary/5"
                      : "border-border opacity-60"
                  }`}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <h3 className="font-semibold">{achievement.title}</h3>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  {!achievement.unlocked && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Разблокируется на {achievement.requirement} дне
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quiz Dialog */}
        <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Тест знаний</DialogTitle>
              <DialogDescription>
                Вопрос {currentQuizIndex + 1} из {selectedChallenge.quizzes.length}
              </DialogDescription>
            </DialogHeader>
            {selectedChallenge.quizzes[currentQuizIndex] && (
              <div className="space-y-4">
                <p className="font-medium">{selectedChallenge.quizzes[currentQuizIndex].question}</p>
                <div className="space-y-2">
                  {selectedChallenge.quizzes[currentQuizIndex].options.map((option, index) => (
                    <Button
                      key={index}
                      variant={quizAnswer === index ? "default" : "outline"}
                      className="w-full justify-start rounded-xl"
                      onClick={() => setQuizAnswer(index)}
                      disabled={showQuizResult}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {!showQuizResult ? (
                  <Button
                    onClick={handleQuizSubmit}
                    disabled={quizAnswer === null}
                    className="w-full rounded-xl"
                  >
                    Ответить
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p
                      className={`text-center font-semibold ${
                        quizAnswer === selectedChallenge.quizzes[currentQuizIndex].correctAnswer
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {quizAnswer === selectedChallenge.quizzes[currentQuizIndex].correctAnswer
                        ? "✅ Правильно!"
                        : "❌ Неправильно"}
                    </p>
                    <Button onClick={handleNextQuiz} className="w-full rounded-xl">
                      {currentQuizIndex < selectedChallenge.quizzes.length - 1
                        ? "Следующий вопрос"
                        : "Завершить"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main challenges list view
  const activeChallenges = challenges.filter(c => c.currentDay <= c.duration);
  const completedChallenges = challenges.filter(c => 
    c.daysProgress.every(d => d.completed)
  );
  const availableTemplates = challengeTemplates.filter(
    t => !challenges.some(c => c.id === t.id)
  );

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-24">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Челленджи</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Начните челлендж и развивайте полезные привычки
          </p>
        </div>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Активные челленджи</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              {activeChallenges.map((challenge) => {
                const totalTasks = challenge.daysProgress.reduce((sum, day) => sum + day.tasks.length, 0);
                const completedTasks = challenge.daysProgress.reduce(
                  (sum, day) => sum + day.tasks.filter(t => t.completed).length,
                  0
                );
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                const completedDays = challenge.daysProgress.filter(d => d.completed).length;

                return (
                  <Card
                    key={challenge.id}
                    className="group p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => navigate(`/workspace/challenges/${challenge.id}`)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${challenge.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative">
                      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="text-3xl sm:text-4xl flex-shrink-0">{challenge.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">{challenge.title}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Прогресс</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{completedDays}/{challenge.duration} дней</span>
                          <Badge variant="secondary" className="rounded-full">
                            День {challenge.currentDay}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Templates */}
        {availableTemplates.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Доступные челленджи</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              {availableTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="group p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                  onClick={() => handleStartChallenge(template)}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="text-3xl sm:text-4xl flex-shrink-0">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold mb-1">{template.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{template.description}</p>
                        <Badge className={`bg-gradient-to-r ${template.color} text-white border-0 text-xs sm:text-sm`}>
                          {template.duration} дней
                        </Badge>
                      </div>
                    </div>
                    <Button className="w-full rounded-lg sm:rounded-xl text-sm sm:text-base" variant="outline">
                      Начать челлендж
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Завершенные челленджи</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              {completedChallenges.map((challenge) => (
                <Card
                  key={challenge.id}
                  className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => navigate(`/workspace/challenges/${challenge.id}`)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-3xl sm:text-4xl flex-shrink-0">{challenge.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">{challenge.title}</h3>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-green-500 font-medium">Завершен!</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {challenges.length === 0 && (
          <Card className="p-8 sm:p-10 md:p-12 rounded-xl sm:rounded-2xl text-center">
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Начните свой первый челлендж</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
              Выберите челлендж из списка выше и начните развивать полезные привычки
            </p>
          </Card>
        )}
      </div>

      {/* Start Challenge Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Начать челлендж?</DialogTitle>
            <DialogDescription>
              {templateToStart && (
                <>
                  Вы начинаете челлендж "{templateToStart.title}" на {templateToStart.duration} дней.
                  Каждый день вам нужно будет выполнять {templateToStart.dailyTasksTemplate.length} задачи.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStartDialog(false)}
              className="flex-1 rounded-xl"
            >
              Отмена
            </Button>
            <Button onClick={confirmStartChallenge} className="flex-1 rounded-xl">
              Начать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Challenges;
