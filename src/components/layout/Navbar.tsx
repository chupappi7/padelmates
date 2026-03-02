import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Plus, Trophy, CalendarCheck, LogOut, User, Bell, Inbox, Building2, Users } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useConversations } from "@/hooks/useConversations";
import { NotificationPanel } from "@/components/layout/NotificationPanel";
import { HostTypeModal } from "@/components/games/HostTypeModal";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon.png";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { totalUnread: unreadMessages } = useConversations();
  const [showHostModal, setShowHostModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const desktopNavLinks = [
    { href: "/clubs", label: "Clubs", icon: Building2 },
    { href: "/my-matches", label: "My Matches", icon: CalendarCheck },
    { href: "/elo", label: "PDR", icon: Trophy },
  ];

  const IconButton = ({ icon: Icon, badge, onClick }: { icon: any; badge?: number; onClick: () => void }) => (
    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" onClick={onClick}>
      <Icon className="w-5 h-5 text-muted-foreground" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Button>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="flex items-center -gap-1">
            <img src={logoIcon} alt="PadelMates" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl -mr-1" />
            <span className="font-display font-bold text-lg sm:text-xl text-foreground">Padel<span className="text-primary">Mates</span></span>
          </Link>

          {/* Desktop Navigation — mirrors mobile bottom tab bar */}
          <div className="hidden md:flex items-center gap-1">
            {user && desktopNavLinks.map((link) => {
              const isActive = link.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-1">
            {user ? (
              <>
                <IconButton icon={Users} onClick={() => navigate("/friends")} />
                <IconButton icon={Inbox} badge={unreadMessages} onClick={() => navigate("/messages")} />
                <NotificationPanel>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </NotificationPanel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt="Profile" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48" align="end" forceMount>
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="hero" size="sm" onClick={() => navigate("/login")} className="text-xs h-8 px-3">
                Sign In
              </Button>
            )}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <IconButton icon={Users} onClick={() => navigate("/friends")} />
                <IconButton icon={Inbox} badge={unreadMessages} onClick={() => navigate("/messages")} />
                <NotificationPanel>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </NotificationPanel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt="Profile" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button variant="hero" onClick={() => navigate("/signup")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
      <HostTypeModal open={showHostModal} onOpenChange={setShowHostModal} />
    </>
  );
}
