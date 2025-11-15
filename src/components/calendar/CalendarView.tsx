import { useState, useRef, useEffect } from "react";
import { Task } from "@/pages/Index";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

type CalendarViewProps = {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onToggleComplete: (id: string) => void;
};

const priorityColors = {
  low: "bg-blue/10 text-blue border-blue/20",
  medium: "bg-cyan/10 text-cyan border-cyan/20",
  high: "bg-purple/10 text-purple border-purple/20",
  critical: "bg-pink/10 text-pink border-pink/20",
};

export const CalendarView = ({ tasks, onEditTask, onToggleComplete }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Format the date
  const formattedDate = format(selectedDate, "d MMMM yyyy", { locale: ru });
  const dateHeaderText = `Задачи на ${formattedDate}`;

  const tasksForSelectedDate = tasks.filter(
    (task) => task.deadline && isSameDay(task.deadline, selectedDate)
  );

  const datesWithTasks = tasks
    .filter((task) => task.deadline)
    .map((task) => task.deadline!);

  // Track container width for responsive sizing
  useEffect(() => {
    const updateWidth = () => {
      if (calendarRef.current) {
        setContainerWidth(calendarRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate responsive sizes based on container width
  const getResponsiveSizes = () => {
    const width = containerWidth || window.innerWidth;

    // Base sizes that scale with container width
    const cellSize = Math.max(36, Math.min(56, width / 9));
    const fontSize = Math.max(12, Math.min(18, width / 32));
    const headerFontSize = Math.max(14, Math.min(20, width / 25));
    const padding = Math.max(8, Math.min(16, width / 50));

    return {
      cellSize,
      fontSize,
      headerFontSize,
      padding,
      iconSize: Math.max(16, Math.min(24, width / 35)),
      badgeFontSize: Math.max(10, Math.min(14, width / 40)),
    };
  };

  const sizes = getResponsiveSizes();

  // Calculate highlight size (larger than cell for better visibility)
  const highlightSize = sizes.cellSize * 0.85;


  return (
    <div className="flex flex-col items-center justify-start w-full h-full px-2 sm:px-4" ref={calendarRef}>
      {/* Calendar Card - centered and responsive */}
      <Card
        className="rounded-2xl border-border mb-4 w-full flex items-center justify-center"
        style={{
          maxWidth: `${Math.min(600, containerWidth || 600)}px`,
          padding: `${sizes.padding}px`
        }}
      >
        <div className="w-full flex justify-center">
          <style>{`
            .calendar-custom .rdp-day {
              width: ${sizes.cellSize}px !important;
              height: ${sizes.cellSize}px !important;
              font-size: ${sizes.fontSize}px !important;
            }
            .calendar-custom .rdp-day_selected,
            .calendar-custom .rdp-day_selected:hover {
              background-color: hsl(var(--primary)) !important;
              color: hsl(var(--primary-foreground)) !important;
              width: ${highlightSize}px !important;
              height: ${highlightSize}px !important;
              border-radius: 12px !important;
              font-weight: 600 !important;
              text-decoration: underline !important;
              text-decoration-color: hsl(var(--purple)) !important;
              text-decoration-thickness: 2px !important;
              text-underline-offset: 3px !important;
            }
            .calendar-custom .rdp-day_today {
              background-color: hsl(var(--accent)) !important;
              color: hsl(var(--accent-foreground)) !important;
              width: ${highlightSize}px !important;
              height: ${highlightSize}px !important;
              border-radius: 12px !important;
              font-weight: 600 !important;
            }
            .calendar-custom .rdp-day_today.rdp-day_selected {
              background-color: hsl(var(--primary)) !important;
              color: hsl(var(--primary-foreground)) !important;
            }
            .calendar-custom .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_outside) {
              background-color: hsl(var(--primary) / 0.1) !important;
              width: ${highlightSize}px !important;
              height: ${highlightSize}px !important;
              border-radius: 12px !important;
            }
            .calendar-custom .rdp-head_cell {
              width: ${sizes.cellSize}px !important;
              height: ${sizes.cellSize}px !important;
              font-size: ${sizes.fontSize * 0.85}px !important;
            }
            .calendar-custom .rdp-cell {
              width: ${sizes.cellSize}px !important;
              height: ${sizes.cellSize}px !important;
            }
            .calendar-custom .rdp-caption_label {
              font-size: ${sizes.fontSize * 1.1}px !important;
            }
          `}</style>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ru}
            modifiers={{
              hasTask: datesWithTasks,
              selected: [selectedDate],
            }}
            modifiersStyles={{
              hasTask: {
                fontWeight: "bold",
                textDecoration: "underline",
                textDecorationColor: "hsl(var(--cyan))",
                textDecorationThickness: "2px",
                textUnderlineOffset: "3px",
              },
              selected: {
                fontWeight: "bold",
                textDecoration: "underline",
                textDecorationColor: "hsl(var(--purple))",
                textDecorationThickness: "2px",
                textUnderlineOffset: "3px",
              },
            }}
            className="w-full calendar-custom"
            classNames={{
              months: "flex flex-col space-y-4 w-full",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center mb-2",
              caption_label: "font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full justify-between mb-1",
              head_cell: "text-muted-foreground rounded-md font-normal flex-1 flex items-center justify-center",
              row: "flex w-full justify-between mt-1",
              cell: "text-center p-0 relative flex-1 flex items-center justify-center",
              day: "rounded-xl font-normal aria-selected:opacity-100 flex items-center justify-center transition-all",
              day_range_end: "day-range-end",
              day_selected: "",
              day_today: "",
              day_outside:
                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            components={{
              IconLeft: () => <span style={{ fontSize: `${sizes.iconSize}px` }}>‹</span>,
              IconRight: () => <span style={{ fontSize: `${sizes.iconSize}px` }}>›</span>,
            }}
          />
        </div>
      </Card>

      {/* Tasks Section */}
      <div
        className="w-full space-y-4"
        style={{ maxWidth: `${Math.min(600, containerWidth || 600)}px` }}
      >
        <h3
          className="text-center font-semibold w-full"
          style={{ fontSize: `${sizes.headerFontSize}px` }}
        >
          {dateHeaderText}
        </h3>

        {tasksForSelectedDate.length === 0 ? (
          <Card
            className="rounded-2xl border-border border-dashed"
            style={{ padding: `${sizes.padding * 1.5}px` }}
          >
            <p
              className="text-center text-muted-foreground"
              style={{ fontSize: `${sizes.fontSize}px` }}
            >
              Нет задач на эту дату
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasksForSelectedDate.map((task) => (
              <Card
                key={task.id}
                className="rounded-2xl border-border hover:shadow-md transition-all cursor-pointer"
                style={{ padding: `${sizes.padding}px` }}
                onClick={() => onEditTask(task)}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task.id);
                    }}
                    className="mt-1"
                  >
                    {task.completed ? (
                      <CheckCircle2
                        className="text-primary"
                        style={{ width: `${sizes.iconSize}px`, height: `${sizes.iconSize}px` }}
                      />
                    ) : (
                      <Circle
                        className="text-muted-foreground"
                        style={{ width: `${sizes.iconSize}px`, height: `${sizes.iconSize}px` }}
                      />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                      style={{ fontSize: `${sizes.fontSize}px` }}
                    >
                      {task.title}
                    </h4>
                    {task.description && (
                      <p
                        className="text-muted-foreground mt-1"
                        style={{ fontSize: `${sizes.fontSize * 0.9}px` }}
                      >
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        className={priorityColors[task.priority]}
                        style={{
                          fontSize: `${sizes.badgeFontSize}px`,
                          padding: `${sizes.padding * 0.25}px ${sizes.padding * 0.5}px`
                        }}
                      >
                        {task.priority === "critical" && "Критично"}
                        {task.priority === "high" && "Высокий"}
                        {task.priority === "medium" && "Средний"}
                        {task.priority === "low" && "Низкий"}
                      </Badge>
                      {task.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="rounded-full"
                          style={{
                            fontSize: `${sizes.badgeFontSize}px`,
                            padding: `${sizes.padding * 0.25}px ${sizes.padding * 0.5}px`
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
