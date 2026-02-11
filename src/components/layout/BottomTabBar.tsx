import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, Users, User, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { path: "/", label: "Matches", icon: Home },
  { path: "/clubs", label: "Clubs", icon: Users },
  { path: "/games/create", label: "Host", icon: Plus, alwaysPrimary: true },
  { path: "/my-matches", label: "My Matches", icon: CalendarCheck },
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div
        className="grid grid-cols-5 items-end"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center pt-2 pb-1"
            >
              <tab.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  tab.alwaysPrimary || isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-0.5 transition-colors",
                  tab.alwaysPrimary || isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
