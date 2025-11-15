import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { UserProvider } from "./contexts/UserContext";
import { MainLayout } from "./components/layout/MainLayout";
import { LoadingScreen } from "./components/LoadingScreen";
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Challenges from "./pages/workspace/Challenges";
import Statistics from "./pages/workspace/Statistics";
import Business from "./pages/workspace/Business";

import Settings from "./pages/Settings";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/workspace" element={<Workspace />} />
                  <Route path="/workspace/challenges" element={<Challenges />} />
                  <Route path="/workspace/challenges/:id" element={<Challenges />} />
                  <Route path="/workspace/statistics" element={<Statistics />} />
                  <Route path="/workspace/business" element={<Business />} />
                  
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/search" element={<Search />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
