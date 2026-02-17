import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, UserPlus, CalendarCheck, Megaphone, LogIn, LogOut, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

function NotificationItem({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const navigate = useNavigate();
  const Icon = iconMap[n.type];

  return (
    <button
      onClick={() => {
        if (n.link) navigate(n.link);
        onClose();
      }}
      className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colorMap[n.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{n.title}</p>
        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {new Date(n.created_at).toLocaleDateString()}
        </p>
      </div>
    </button>
  );
}

function NotificationList({ notifications, loading, onClose }: { notifications: AppNotification[]; loading: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const items = notifications.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0.5 p-1">
        {items.map((n) => (
          <NotificationItem key={n.id} n={n} onClose={onClose} />
        ))}
      </div>
      <button
        onClick={() => { navigate("/notifications"); onClose(); }}
        className="block w-full text-center text-sm font-medium text-primary hover:underline py-3 border-t border-border"
      >
        See all notifications
      </button>
    </>
  );
}

export function NotificationPanel({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { notifications, loading } = useNotifications();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader>
            <DrawerTitle>Notifications</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-auto px-2 pb-4">
            <NotificationList notifications={notifications} loading={loading} onClose={() => setOpen(false)} />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <ScrollArea className="max-h-[350px]">
          <NotificationList notifications={notifications} loading={loading} onClose={() => setOpen(false)} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
