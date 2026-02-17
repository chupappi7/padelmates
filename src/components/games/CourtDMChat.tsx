import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface DMMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  profiles?: Profile | null;
}

interface InterestedUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: boolean;
}

interface CourtDMChatProps {
  gameId: string;
  currentUserId: string;
  hostId: string;
  isHost: boolean;
  interestedUserIds: string[];
}

export function CourtDMChat({ gameId, currentUserId, hostId, isHost, interestedUserIds }: CourtDMChatProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(isHost ? null : hostId);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [interestedUsers, setInterestedUsers] = useState<InterestedUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For host: fetch list of interested users with last message preview
  useEffect(() => {
    if (!isHost) return;
    fetchInterestedUsers();
  }, [isHost, interestedUserIds]);

  const fetchInterestedUsers = async () => {
    if (interestedUserIds.length === 0) {
      setInterestedUsers([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", interestedUserIds);

    // Get last message for each conversation
    const users: InterestedUser[] = [];
    for (const uid of interestedUserIds) {
      const profile = profiles?.find(p => p.user_id === uid);
      const { data: lastMsg } = await supabase
        .from("court_messages")
        .select("message, created_at")
        .eq("game_id", gameId)
        .or(`and(sender_id.eq.${uid},recipient_id.eq.${hostId}),and(sender_id.eq.${hostId},recipient_id.eq.${uid})`)
        .order("created_at", { ascending: false })
        .limit(1);

      users.push({
        user_id: uid,
        name: profile?.name || "Unknown",
        avatar_url: profile?.avatar_url || null,
        lastMessage: lastMsg?.[0]?.message,
        lastMessageAt: lastMsg?.[0]?.created_at,
      });
    }

    // Sort by last message time (most recent first), users without messages last
    users.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    setInterestedUsers(users);
    setLoading(false);
  };

  // Fetch DM messages for the selected conversation
  useEffect(() => {
    if (!selectedUserId) return;
    fetchMessages();

    const otherUserId = isHost ? selectedUserId : hostId;
    const channel = supabase
      .channel(`court-dm-${gameId}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "court_messages", filter: `game_id=eq.${gameId}` },
        (payload: any) => {
          const msg = payload.new;
          // Only add if it's part of this conversation
          const isRelevant =
            (msg.sender_id === currentUserId && msg.recipient_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.recipient_id === currentUserId);
          if (isRelevant) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId, gameId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedUserId) return;
    const otherUserId = isHost ? selectedUserId : hostId;

    const { data } = await supabase
      .from("court_messages")
      .select("*")
      .eq("game_id", gameId)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });
      setMessages(data.map(m => ({ ...m, profiles: profileMap[m.sender_id] || null })));
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    const otherUserId = isHost ? selectedUserId : hostId;

    const { error } = await supabase.from("court_messages").insert({
      game_id: gameId,
      sender_id: currentUserId,
      recipient_id: otherUserId,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
      fetchMessages();
      if (isHost) fetchInterestedUsers(); // update preview
    }
  };

  // Host: show conversation list
  if (isHost && !selectedUserId) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : interestedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">No interested users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {interestedUsers.map(u => (
              <button
                key={u.user_id}
                onClick={() => setSelectedUserId(u.user_id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  {u.lastMessage ? (
                    <p className="text-xs text-muted-foreground truncate">{u.lastMessage}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No messages yet – tap to chat</p>
                  )}
                </div>
                {u.lastMessageAt && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(u.lastMessageAt), "h:mm a")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // DM conversation view
  const otherUserName = isHost
    ? interestedUsers.find(u => u.user_id === selectedUserId)?.name || "User"
    : "Host";

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden" style={{ height: "100%" }}>
      {/* Header with back button (host only) */}
      {isHost && (
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <button
            onClick={() => setSelectedUserId(null)}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">{otherUserName}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length > 0 ? (
          messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.sender_id === currentUserId && "flex-row-reverse")}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {msg.profiles?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[75%]", msg.sender_id === currentUserId && "text-right")}>
                <p className="text-[11px] text-muted-foreground mb-0.5">
                  <span className="font-medium">{msg.profiles?.name}</span>
                  <span className="ml-1.5">{format(new Date(msg.created_at), "h:mm a")}</span>
                </p>
                <div className={cn(
                  "inline-block px-3 py-2 rounded-2xl text-sm",
                  msg.sender_id === currentUserId
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">Start chatting about this court</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-border">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          className="text-sm h-10"
        />
        <Button onClick={handleSend} size="icon" className="h-10 w-10 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
