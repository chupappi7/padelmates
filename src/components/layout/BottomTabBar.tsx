import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const leftTabs = [
  { path: "/", label: "Matches", icon: Home },
  { path: "/clubs", label: "Clubs", icon: Users },
];

const rightTabs = [
  { path: "/profile", label: "Profile", icon: User },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const renderTab = (tab: { path: string; label: string; icon: typeof Home }) => {
    const isActive = tab.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(tab.path);

    return (
      <button
        key={tab.path}
        onClick={() => navigate(tab.path)}
        className="flex flex-col items-center justify-center pt-2 pb-1 flex-1"
      >
        <tab.icon
          className={cn(
            "w-5 h-5 transition-colors",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span
          className={cn(
            "text-[10px] mt-0.5 transition-colors",
            isActive ? "text-primary font-semibold" : "text-muted-foreground"
          )}
        >
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border">
      <div
        className="flex items-end justify-around px-2"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {leftTabs.map(renderTab)}

        {/* Center Host FAB */}
        <button
          onClick={() => navigate("/games/create")}
          className="flex flex-col items-center justify-center -mt-5 flex-1"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Plus className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-medium text-primary mt-0.5">Host</span>
        </button>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
