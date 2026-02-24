import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; name: string; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  const filtered = conversations.filter((c) =>
    c.otherUserName.toLowerCase().includes(search.toLowerCase())
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

    // Check if chat already exists
    const existing = conversations.find((c) => c.otherUserId === otherUserId);
    if (existing) {
      navigate(`/messages/${existing.chatId}`);
      return;
    }

    // Create new chat
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_1_id: user.id, user_2_id: otherUserId })
      .select()
      .single();

    if (data && !error) {
      navigate(`/messages/${data.id}`);
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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations or find users..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search results (users to start new convos) */}
          {search.length >= 2 && searchResults.length > 0 && (
            <div className="mb-4 space-y-1">
              <p className="text-xs text-muted-foreground px-1 mb-2">Start a conversation</p>
              {searchResults
                .filter((r) => !conversations.some((c) => c.otherUserId === r.user_id))
                .map((result) => (
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
              <h3 className="font-display font-semibold text-lg mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((convo) => (
                <button
                  key={convo.chatId}
                  onClick={() => navigate(`/messages/${convo.chatId}`)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left",
                    convo.unreadCount > 0 && "bg-muted/30"
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={convo.otherUserAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {convo.otherUserName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        convo.unreadCount > 0 ? "font-bold" : "font-medium"
                      )}>
                        {convo.otherUserName}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {convo.lastMessageAt && formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-xs truncate",
                        convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {convo.lastMessageSenderId === user?.id && "You: "}
                        {convo.lastMessage || "No messages yet"}
                      </p>
                      {convo.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
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
