import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, UserPlus, CalendarCheck, Megaphone, LogIn, LogOut, Inbox, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const iconMap: Record<AppNotification["type"], typeof Bell> = {
  friend_request: UserPlus,
  game_confirmed: CalendarCheck,
  announcement: Megaphone,
  game_join: LogIn,
  game_leave: LogOut,
  game_request: Inbox,
};

const colorMap: Record<AppNotification["type"], string> = {
  friend_request: "bg-primary/10 text-primary",
  game_confirmed: "bg-secondary/10 text-secondary",
  announcement: "bg-accent/50 text-accent-foreground",
  game_join: "bg-primary/10 text-primary",
  game_leave: "bg-destructive/10 text-destructive",
  game_request: "bg-warning/10 text-warning",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const Icon = iconMap[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markAsRead(n);
                      if (n.link) navigate(n.link);
                    }}
                    className={cn(
                      "w-full text-left flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors relative",
                      n.link && "cursor-pointer",
                      !n.read && "bg-primary/5 border-primary/20"
                    )}
                  >
                    {!n.read && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colorMap[n.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      {n.type !== "game_join" && n.type !== "game_leave" && (
                        <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium text-muted-foreground")}>{n.title}</p>
                      )}
                      <p className={cn("text-xs", n.type === "game_join" || n.type === "game_leave" ? (!n.read ? "font-medium text-foreground" : "text-muted-foreground") : "text-muted-foreground truncate")}>{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
