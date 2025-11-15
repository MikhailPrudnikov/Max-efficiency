import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-20">
      <div className="pt-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};
