import { Link, useNavigate } from "react-router-dom";
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
import { Home, Plus, Users, Calendar, LogOut, User, Bell, MessageCircle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "@/components/layout/NotificationPanel";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { href: "/games", label: "Find Games", icon: Calendar },
    { href: "/clubs", label: "Clubs", icon: Users },
  ];

  const IconButton = ({ icon: Icon, badge, onClick }: { icon: any; badge?: number; onClick: () => void }) => (
    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full" onClick={onClick}>
      <Icon className="w-5 h-5 text-muted-foreground" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Button>
  );

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container flex items-center justify-between h-14 md:h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-base sm:text-lg">🎾</span>
          </div>
          <span className="font-display font-bold text-lg sm:text-xl text-foreground">Padel<span className="text-primary">Hub</span></span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-1">
          {user ? (
            <>
              <IconButton icon={MessageCircle} onClick={() => navigate("/messages")} />
              <NotificationPanel>
                <IconButton icon={Bell} badge={unreadCount} onClick={() => {}} />
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
              <IconButton icon={MessageCircle} onClick={() => navigate("/messages")} />
              <NotificationPanel>
                <IconButton icon={Bell} badge={unreadCount} onClick={() => {}} />
              </NotificationPanel>
              <Button variant="hero" size="sm" onClick={() => navigate("/games/create")}>
                <Plus className="w-4 h-4" />
                Host Game
              </Button>
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
                  <DropdownMenuItem onClick={() => navigate("/my-games")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    My Games
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
  );
}
