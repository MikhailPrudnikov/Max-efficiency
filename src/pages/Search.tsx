import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, X, Calendar, Hash, CheckCircle2, Circle, Clock } from "lucide-react";
import { tasksAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  priority: string;
  tags: string[];
  completed: boolean;
  created_at: string;
}

// Responsive filter button component
const ResponsiveFilterButton = ({
  filter,
  isActive,
  onClick
}: {
  filter: { id: string; label: string; icon: React.ComponentType<any> };
  isActive: boolean;
  onClick: () => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [paddingX, setPaddingX] = useState(12);

  useEffect(() => {
    const adjustButtonSize = () => {
      if (!buttonRef.current) return;

      const buttonWidth = buttonRef.current.offsetWidth;
      const buttonHeight = buttonRef.current.offsetHeight;

      if (!buttonWidth || !buttonHeight) return;

      // Calculate available width for text (subtracting space for icon and padding)
      const availableWidth = buttonWidth - 32; // 24px for icon + 8px buffer

      // Create temporary element to measure text
      const tempElement = document.createElement("span");
      tempElement.style.fontSize = "14px";
      tempElement.style.fontFamily = "inherit";
      tempElement.style.fontWeight = "500"; // font-medium
      tempElement.style.visibility = "hidden";
      tempElement.style.position = "absolute";
      tempElement.style.whiteSpace = "nowrap";
      tempElement.textContent = filter.label;

      document.body.appendChild(tempElement);
      const textWidth = tempElement.offsetWidth;
      document.body.removeChild(tempElement);

      // Adjust font size if text doesn't fit
      if (textWidth > availableWidth) {
        const scaleFactor = availableWidth / textWidth;
        const newFontSize = Math.max(10, 14 * scaleFactor * 0.9);
        setFontSize(newFontSize);

        // Also adjust padding for very small buttons
        if (newFontSize < 12) {
          setPaddingX(Math.max(8, 12 * (newFontSize / 14)));
        } else {
          setPaddingX(12);
        }
      } else {
        setFontSize(14);
        setPaddingX(12);
      }
    };

    adjustButtonSize();

    // Use ResizeObserver if available for better performance
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(adjustButtonSize);
      if (buttonRef.current) {
        resizeObserver.observe(buttonRef.current);
      }
    } else {
      // Fallback to window resize event
      window.addEventListener("resize", adjustButtonSize);
    }

    return () => {
      if (resizeObserver && buttonRef.current) {
        resizeObserver.unobserve(buttonRef.current);
      } else {
        window.removeEventListener("resize", adjustButtonSize);
      }
    };
  }, [filter.label]);

  const Icon = filter.icon;

  return (
    <Button
      ref={buttonRef}
      variant={isActive ? "default" : "outline"}
      size="sm"
      className="rounded-full flex-1 min-w-0 transition-all duration-200"
      onClick={onClick}
      style={{
        fontSize: `${fontSize}px`,
        paddingLeft: `${paddingX}px`,
        paddingRight: `${paddingX}px`,
      }}
    >
      <Icon className="w-4 h-4 mr-1 flex-shrink-0" />
      <span className="truncate">{filter.label}</span>
    </Button>
  );
};

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allTags, setAllTags] = useState<{ name: string; count: number }[]>([]);
  const { toast } = useToast();

  const filters = [
    { id: "tasks", label: "Задачи", icon: Calendar },
    { id: "tags", label: "Тэги", icon: Hash },
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setAllTags([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const response = await tasksAPI.search(searchQuery);
      const tasks = response.tasks || [];
      setSearchResults(tasks);

      // Extract and count tags
      const tagMap = new Map<string, number>();
      tasks.forEach((task: Task) => {
        if (task.tags && Array.isArray(task.tags)) {
          task.tags.forEach((tag: string) => {
            if (tag.toLowerCase().includes(searchQuery.toLowerCase())) {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
          });
        }
      });

      const tagsArray = Array.from(tagMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setAllTags(tagsArray);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Ошибка поиска",
        description: "Не удалось выполнить поиск. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveFilter(null);
    setSearchResults([]);
    setAllTags([]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan/5 via-blue/5 to-purple/5">
      <div className="container max-w-screen-xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Поиск</h1>
          <p className="text-muted-foreground mt-1">
            Найдите задачи и тэги
          </p>
        </div>

        {/* Search Input */}
        <Card className="p-4 rounded-2xl border-border">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по задачам и тэгам..."
              className="pl-10 pr-10 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.map((filter) => (
              <ResponsiveFilterButton
                key={filter.id}
                filter={filter}
                isActive={activeFilter === filter.id}
                onClick={() =>
                  setActiveFilter(activeFilter === filter.id ? null : filter.id)
                }
              />
            ))}
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 rounded-2xl border-border">
            <div className="text-center">
              <p className="text-muted-foreground">Поиск...</p>
            </div>
          </Card>
        )}

        {/* Results */}
        {!isLoading && searchQuery && searchQuery.trim().length >= 2 && (
          <div className="space-y-6">
            {/* Tasks Results */}
            {(!activeFilter || activeFilter === "tasks") && searchResults.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan" />
                  Задачи ({searchResults.length})
                </h2>
                <div className="space-y-2">
                  {searchResults.map((task) => (
                    <Card
                      key={task.id}
                      className="p-4 rounded-2xl border-border hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2 items-center">
                            <Badge className={getPriorityColor(task.priority)}>
                              {getPriorityLabel(task.priority)}
                            </Badge>
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {task.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="rounded-full">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Results */}
            {(!activeFilter || activeFilter === "tags") && allTags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-purple" />
                  Тэги ({allTags.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag.name}
                      variant="secondary"
                      className="rounded-full text-base py-2 px-4 cursor-pointer hover:bg-secondary/80"
                    >
                      #{tag.name} ({tag.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults.length === 0 && allTags.length === 0 && (
              <Card className="p-8 rounded-2xl border-border">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Ничего не найдено по запросу "{searchQuery}"
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && !isLoading && (
          <Card className="p-12 rounded-2xl border-border border-dashed">
            <div className="text-center">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Начните вводить запрос для поиска
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Минимум 2 символа для начала поиска
              </p>
            </div>
          </Card>
        )}

        {/* Minimum characters message */}
        {searchQuery && searchQuery.trim().length < 2 && !isLoading && (
          <Card className="p-8 rounded-2xl border-border">
            <div className="text-center">
              <p className="text-muted-foreground">
                Введите минимум 2 символа для поиска
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Search;
