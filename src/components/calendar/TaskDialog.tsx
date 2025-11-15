import { useState, useEffect, useRef } from "react";
import { Task } from "@/pages/Index";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Plus, Upload, FileIcon, ZoomIn, Download } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: any) => void;
  task?: Task;
};

export const TaskDialog = ({ open, onOpenChange, onSave, task }: TaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [subtasks, setSubtasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [callLink, setCallLink] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDeadline(task.deadline);
      setPriority(task.priority);
      setTags(task.tags);
      setSubtasks(task.subtasks || []);
      setCallLink(task.callLink || "");
      setAttachments(task.attachments || []);
    } else {
      resetForm();
    }
  }, [task, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline(undefined);
    setPriority("medium");
    setTags([]);
    setNewTag("");
    setSubtasks([]);
    setNewSubtask("");
    setCallLink("");
    setAttachments([]);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Convert deadline to end of day in local timezone (23:59:59)
    // This matches the bot's behavior and ensures consistent deadline times
    let processedDeadline = deadline;
    if (deadline) {
      const deadlineDate = new Date(deadline);
      deadlineDate.setHours(23, 59, 59, 999);
      processedDeadline = deadlineDate;
    }

    const taskData = {
      ...(task || {}),
      title: title.trim(),
      description: description.trim(),
      deadline: processedDeadline,
      priority,
      tags,
      subtasks,
      callLink: callLink.trim(),
      attachments,
    };

    onSave(taskData);
    resetForm();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([
        ...subtasks,
        { id: Date.now().toString(), text: newSubtask.trim(), completed: false },
      ]);
      setNewSubtask("");
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const newAttachments: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`Файл "${file.name}" слишком большой (максимум 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          newAttachments.push(result);
          setAttachments((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileNameFromDataUrl = (dataUrl: string, index: number) => {
    try {
      const matches = dataUrl.match(/^data:(.+);base64,/);
      const mimeType = matches?.[1] || "application/octet-stream";
      const extension = mimeType.split("/")[1] || "file";
      return `Файл ${index + 1}.${extension}`;
    } catch {
      return `Файл ${index + 1}`;
    }
  };

  const isImageFile = (dataUrl: string) => {
    return dataUrl.startsWith("data:image/");
  };

  const handleDownloadFile = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Редактировать задачу" : "Новая задача"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название задачи"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Добавьте описание"
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дедлайн</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-xl"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "d MMM yyyy", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    locale={ru}
                    className="rounded-xl pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="critical">Критичный</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тэги</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTag()}
                placeholder="Добавить тэг"
                className="rounded-xl"
              />
              <Button type="button" onClick={addTag} size="icon" className="rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full pr-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Подзадачи</Label>
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Добавить подзадачу"
                className="rounded-xl"
              />
              <Button type="button" onClick={addSubtask} size="icon" className="rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtask(subtask.id)}
                    className="rounded"
                  />
                  <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                    {subtask.text}
                  </span>
                  <button onClick={() => removeSubtask(subtask.id)} className="ml-auto">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callLink">Ссылка на звонок</Label>
            <Input
              id="callLink"
              value={callLink}
              onChange={(e) => setCallLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Вложения</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              variant="outline"
              className="w-full rounded-xl"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Прикрепить файл
            </Button>
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-border bg-card"
                  >
                    {isImageFile(attachment) ? (
                      <div className="aspect-square relative">
                        <img
                          src={attachment}
                          alt={getFileNameFromDataUrl(attachment, index)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={() => setPreviewFile(attachment)}
                            type="button"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={() => handleDownloadFile(attachment, getFileNameFromDataUrl(attachment, index))}
                            type="button"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-square flex flex-col items-center justify-center p-4 bg-muted/30">
                        <FileIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-center truncate w-full px-2">
                          {getFileNameFromDataUrl(attachment, index)}
                        </span>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleDownloadFile(attachment, getFileNameFromDataUrl(attachment, index))}
                            type="button"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 rounded-full"
                            onClick={() => removeAttachment(index)}
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="rounded-xl">
            {task ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </DialogContent>

      {/* Fullscreen Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-background/20 hover:bg-background/40 text-white rounded-full"
              onClick={() => setPreviewFile(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            {previewFile && isImageFile(previewFile) && (
              <img
                src={previewFile}
                alt="Предпросмотр"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 rounded-full"
              onClick={() => {
                if (previewFile) {
                  const index = attachments.indexOf(previewFile);
                  handleDownloadFile(previewFile, getFileNameFromDataUrl(previewFile, index));
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
