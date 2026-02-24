import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, ConversationType } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, ArrowLeft, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "match" | "court" | "dm";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "match", label: "Matches" },
  { key: "court", label: "Courts" },
  { key: "dm", label: "DMs" },
];

export default function InboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchResults, setSearchResults] = useState<{ user_id: string; name: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  const filtered = conversations
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
    const existing = conversations.find((c) => c.type === "dm" && c.chatId);
    // Check existing DM chats
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

  const handleConversationClick = (convo: typeof conversations[0]) => {
    if (convo.type === "match" && convo.gameId) {
      navigate(`/messages/game/${convo.gameId}`);
    } else if (convo.chatId) {
      navigate(`/messages/${convo.chatId}`);
    }
  };

  const getTypeBadge = (type: ConversationType) => {
    switch (type) {
      case "match":
        return (
          <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 border shrink-0 font-semibold">
            Match
          </Badge>
        );
      case "court":
        return (
          <Badge className="text-[9px] h-4 px-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 border shrink-0 font-semibold">
            Court
          </Badge>
        );
      default:
        return null;
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <div className="container max-w-2xl py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl font-bold">Messages</h1>
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
              const count = tab.key === "all"
                ? conversations.length
                : conversations.filter((c) => c.type === tab.key).length;
              const isActive = activeFilter === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1.5 text-[10px]",
                      isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search results (users to start new convos) */}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">
                {activeFilter === "all" ? "No messages yet" : `No ${activeFilter} conversations`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeFilter === "all"
                  ? "Start a conversation!"
                  : "Nothing here yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleConversationClick(convo)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left",
                    convo.unreadCount > 0 && "bg-muted/30"
                  )}
                >
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
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {getTypeBadge(convo.type)}
                      <p className={cn(
                        "text-sm truncate",
                        convo.unreadCount > 0 ? "font-bold" : "font-medium"
                      )}>
                        {convo.title}
                      </p>
                    </div>
                    {convo.contextLabel && (
                      <p className="text-[10px] text-muted-foreground truncate -mt-0.5 mb-0.5">
                        {convo.contextLabel}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs truncate",
                        convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {convo.lastMessageSenderName && `${convo.lastMessageSenderName}: `}
                        {convo.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>

                  {/* Right side: timestamp + unread */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {convo.lastMessageAt && convo.lastMessage && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                    {convo.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                        {convo.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
