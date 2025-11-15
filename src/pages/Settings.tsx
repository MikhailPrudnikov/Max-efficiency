import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Focus,
  Calendar,
  Palette,
  ChevronRight,
} from "lucide-react";
import { settingsAPI } from "@/lib/api";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

const Settings = () => {
  const { user: authUser, isAuthenticated, isLoading } = useUser();
  const [settings, setSettings] = useState({
    focus_mode: false,
    calendar_view: "month",
  });
  const [loading, setLoading] = useState(true);

  const interests = ["разработка", "спорт", "чтение", "путешествия"];

  const displayName = authUser
    ? `${authUser.first_name} ${authUser.last_name}`.trim() || 'Пользователь'
    : 'Гость';

  const username = authUser?.username
    ? `@${authUser.username}`
    : '';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      if (data.settings) {
        setSettings({
          focus_mode: data.settings.focus_mode,
          calendar_view: data.settings.calendar_view,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFocusMode = async (enabled: boolean) => {
    try {
      await settingsAPI.update({ focus_mode: enabled });
      setSettings({ ...settings, focus_mode: enabled });
      toast.success('Режим фокусировки ' + (enabled ? 'включен' : 'выключен'));
    } catch (error) {
      console.error('Failed to update focus mode:', error);
      toast.error('Не удалось обновить режим фокусировки');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan/5 via-blue/5 to-purple/5">
      <div className="container max-w-screen-xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Настройки</h1>
          <p className="text-muted-foreground mt-1">
            Персонализируйте ваш опыт использования
          </p>
        </div>

        {/* Profile Section */}
        <Card className="p-6 rounded-2xl border-border">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={authUser?.photo_url} />
              <AvatarFallback className="text-2xl bg-gradient-to-r from-cyan to-purple text-white">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {!isAuthenticated && (
                  <Badge variant="outline" className="ml-2">Гостевой режим</Badge>
                )}
              </div>
              {username && <p className="text-muted-foreground">{username}</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                {interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="rounded-full">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Фокусировка */}
        <Card className="p-6 rounded-2xl border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-pink/10">
              <Focus className="w-5 h-5 text-pink" />
            </div>
            <div>
              <h3 className="font-semibold">Фокусировка</h3>
              <p className="text-sm text-muted-foreground">
                Управление уведомлениями и режимом фокуса
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="do-not-disturb">Не беспокоить</Label>
              <Switch id="do-not-disturb" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="antispam">Антиспам уведомлений</Label>
              <Switch id="antispam" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="focus-mode">Автоматический режим фокуса</Label>
              <Switch id="focus-mode" />
            </div>
          </div>

        </Card>


        {/* Внешний вид */}
        <Card className="p-6 rounded-2xl border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-purple/10">
              <Palette className="w-5 h-5 text-purple" />
            </div>
            <div>
              <h3 className="font-semibold">Внешний вид</h3>
              <p className="text-sm text-muted-foreground">
                Настройте тему и оформление
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Тема оформления</Label>
              <ThemeSwitcher />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
