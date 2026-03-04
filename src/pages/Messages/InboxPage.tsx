import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, ConversationType, UnifiedConversation } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MessageCircle, ArrowLeft, Trophy, Archive, BellOff, Trash2, ArchiveRestore, MoreVertical, Pin, PinOff, VolumeX } from "lucide-react";
import { format, formatDistanceToNowStrict, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "match" | "court" | "dm";
type InboxTab = "active" | "archived";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "match", label: "Matches" },
  { key: "court", label: "Courts" },
  { key: "dm", label: "DMs" },
];

// ── Helpers ──────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (now.getFullYear() === date.getFullYear()) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

function formatPreviewText(message: string): string {
  if (!message) return "";
  if (message.startsWith("[image]")) return "📷 Photo";
  if (message.startsWith("[file]")) return "📎 Attachment";
  return message;
}

// ── Conversation Row ────────────────────────────────────────────────────
function ConversationRow({
  convo,
  inboxTab,
  onClick,
  onArchive,
  onUnarchive,
  onMute,
  onDelete,
  onPin,
}: {
  convo: UnifiedConversation;
  inboxTab: InboxTab;
  onClick: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onMute: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const isArchived = inboxTab === "archived";
  const hasUnread = convo.unreadCount > 0 && !isArchived;

  // Build preview line
  const previewText = formatPreviewText(convo.lastMessage);
  let previewLine = "";
  if (previewText) {
    const prefix = convo.lastMessageSenderName
      ? `${convo.lastMessageSenderName === "You" ? "You" : convo.lastMessageSenderName.split(" ")[0]}: `
      : "";
    previewLine = prefix + previewText;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors text-left",
        hasUnread && "bg-muted/30",
        isArchived && "opacity-70"
      )}
    >
      {/* Clickable area */}
      <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={onClick}>
        {/* Avatar */}
        {convo.type === "match" ? (
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={convo.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {convo.title.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {convo.prefs.pinned && (
                <Pin className="w-3 h-3 text-primary shrink-0 -rotate-45" />
              )}
              <p className={cn(
                "text-sm line-clamp-1",
                hasUnread ? "font-bold" : "font-medium"
              )}>
                {convo.title}
              </p>
              {convo.prefs.muted && (
                <VolumeX className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
            {/* Timestamp */}
            {convo.lastMessageAt && (
              <span className={cn(
                "text-[10px] shrink-0",
                hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {formatRelativeTime(convo.lastMessageAt)}
              </span>
            )}
          </div>

          {/* Context label for match/court (location only, no duplicate date) */}
          {convo.type === "match" && convo.contextLabel && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {convo.contextLabel}
            </p>
          )}

          {/* Last message preview */}
          {previewLine ? (
            <p className={cn(
              "text-xs line-clamp-1",
              hasUnread ? "text-foreground font-semibold" : "text-muted-foreground"
            )}>
              {previewLine}
            </p>
          ) : convo.type !== "match" ? (
            <p className="text-xs text-muted-foreground line-clamp-1">No messages yet</p>
          ) : null}
        </div>
      </button>

      {/* Right side: unread dot + menu */}
      <div className="flex items-center gap-1 shrink-0">
        {hasUnread && (
          <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onPin}>
              {convo.prefs.pinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onClick={onUnarchive}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onMute}>
              <BellOff className="mr-2 h-4 w-4" />
              {convo.prefs.muted ? "Unmute" : "Mute"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Main Inbox Page ─────────────────────────────────────────────────────
export default function InboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading, updatePreference } = useConversations();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [inboxTab, setInboxTab] = useState<InboxTab>("active");
  const [searchResults, setSearchResults] = useState<{ user_id: string; name: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isActive = (c: UnifiedConversation) =>
    !c.prefs.deleted && !c.prefs.archived && !c.autoArchived;
  const isArchived = (c: UnifiedConversation) =>
    !c.prefs.deleted && (c.prefs.archived || c.autoArchived);

  const visibleConversations = conversations
    .filter((c) => (inboxTab === "active" ? isActive(c) : isArchived(c)))
    .filter((c) => activeFilter === "all" || c.type === activeFilter)
    .filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.contextLabel || "").toLowerCase().includes(search.toLowerCase())
    );

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .ilike("name", `%${query}%`)
      .neq("user_id", user?.id || "")
      .limit(8);
    setSearchResults(data || []);
    setSearching(false);
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data: existingChat } = await supabase
      .from("chats")
      .select("id")
      .is("listing_id", null)
      .or(`and(user_1_id.eq.${user.id},user_2_id.eq.${otherUserId}),and(user_1_id.eq.${otherUserId},user_2_id.eq.${user.id})`)
      .maybeSingle();

    if (existingChat) {
      navigate(`/messages/${existingChat.id}`);
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .insert({ user_1_id: user.id, user_2_id: otherUserId })
      .select()
      .single();

    if (data && !error) {
      navigate(`/messages/${data.id}`);
    }
  };

  const handleConversationClick = (convo: UnifiedConversation) => {
    if (convo.type === "match" && convo.gameId) {
      navigate(`/messages/game/${convo.gameId}`);
    } else if (convo.chatId) {
      navigate(`/messages/${convo.chatId}`);
    }
  };

  const handleDelete = (convoId: string) => {
    setDeleteTarget(convoId);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await updatePreference(deleteTarget, { deleted: true });
      setDeleteTarget(null);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Sign in to view your messages.</p>
          <Button variant="hero" className="mt-4" onClick={() => navigate("/login")}>
            Sign In
          </Button>
        </div>
      </>
    );
  }

  const activeCount = conversations.filter(isActive).length;
  const archivedCount = conversations.filter(isArchived).length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <div className="container max-w-2xl py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Messages</h1>
          </div>

          {/* Active / Archived Tabs */}
          <div className="flex gap-1 mb-3 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setInboxTab("active")}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-md transition-colors",
                inboxTab === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active {activeCount > 0 && <span className="text-xs opacity-60">({activeCount})</span>}
            </button>
            <button
              onClick={() => setInboxTab("archived")}
              className={cn(
                "flex-1 py-2 text-sm font-semibold rounded-md transition-colors",
                inboxTab === "archived"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Archived {archivedCount > 0 && <span className="text-xs opacity-60">({archivedCount})</span>}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations or find users..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
            {filterTabs.map((tab) => {
              const pool = conversations.filter((c) =>
                inboxTab === "active" ? isActive(c) : isArchived(c)
              );
              const count = tab.key === "all" ? pool.length : pool.filter((c) => c.type === tab.key).length;
              const isActiveTab = activeFilter === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                    isActiveTab
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn("ml-1.5 text-[10px]", isActiveTab ? "text-primary-foreground/70" : "text-muted-foreground/60")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search results */}
          {search.length >= 2 && searchResults.length > 0 && (
            <div className="mb-4 space-y-1">
              <p className="text-xs text-muted-foreground px-1 mb-2">Start a conversation</p>
              {searchResults.map((result) => (
                <button
                  key={result.user_id}
                  onClick={() => startConversation(result.user_id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={result.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {result.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    <p className="text-xs text-muted-foreground">Tap to message</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Conversation list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                {inboxTab === "archived" ? (
                  <Archive className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">
                {inboxTab === "archived"
                  ? "No archived chats yet."
                  : activeFilter === "all"
                    ? "No active chats"
                    : `No ${activeFilter} conversations`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {inboxTab === "active" && activeFilter === "all"
                  ? "Join a game to start chatting! 🎾"
                  : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleConversations.map((convo) => (
                <ConversationRow
                  key={convo.id}
                  convo={convo}
                  inboxTab={inboxTab}
                  onClick={() => handleConversationClick(convo)}
                  onArchive={() => updatePreference(convo.id, { archived: true })}
                  onUnarchive={() => updatePreference(convo.id, { archived: false })}
                  onMute={() => updatePreference(convo.id, { muted: !convo.prefs.muted })}
                  onDelete={() => handleDelete(convo.id)}
                  onPin={() => updatePreference(convo.id, { pinned: !convo.prefs.pinned })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this chat from your inbox?</AlertDialogTitle>
            <AlertDialogDescription>
              Your match history and ratings data will be kept. This only removes the conversation from your view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
