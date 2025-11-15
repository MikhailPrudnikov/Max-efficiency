import { Calendar, Briefcase, Search, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Calendar, label: "Календарь", path: "/" },
  { icon: Briefcase, label: "Workspace", path: "/workspace" },
  { icon: Search, label: "Поиск", path: "/search" },
  { icon: Settings, label: "Настройки", path: "/settings" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-20 sm:h-24 md:h-28 max-w-screen-xl mx-auto px-1 sm:px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all hover:bg-muted/50 flex-1"
            activeClassName="text-primary"
          >
            <item.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            <span className="text-[0.55rem] sm:text-[0.6rem] md:text-xs font-medium truncate max-w-[3rem] sm:max-w-[4rem] md:max-w-[6rem]">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
