import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileActionButtonsProps {
  currentUserId: string;
  targetUserId: string;
  friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  friendshipId: string | null;
  loading: boolean;
  onFriendshipChange: () => void;
}

export function ProfileActionButtons({
  currentUserId,
  targetUserId,
  friendshipStatus,
  friendshipId,
  loading,
  onFriendshipChange,
}: ProfileActionButtonsProps) {
  const navigate = useNavigate();

  const handleMessage = async () => {
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .or(
        `and(user_1_id.eq.${currentUserId},user_2_id.eq.${targetUserId}),and(user_1_id.eq.${targetUserId},user_2_id.eq.${currentUserId})`
      )
      .limit(1)
      .maybeSingle();

    if (existing) {
      navigate(`/messages/${existing.id}`);
    } else {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({ user_1_id: currentUserId, user_2_id: targetUserId })
        .select("id")
        .single();
      if (newChat) navigate(`/messages/${newChat.id}`);
    }
  };

  const handleAddFriend = async () => {
    const { error } = await supabase.from("friendships").insert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
    } as any);
    if (error) {
      toast.error("Failed to send friend request");
    } else {
      toast.success("Friend request sent!");
      onFriendshipChange();
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      toast.error("Failed to remove friend");
    } else {
      toast("Friend removed");
      onFriendshipChange();
    }
  };

  return (
    <div className="flex gap-2">
      {friendshipStatus === "none" && (
        <Button
          size="sm"
          variant="hero"
          className="flex-1 text-xs h-9 gap-1.5"
          onClick={handleAddFriend}
          disabled={loading}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Friend
        </Button>
      )}
      {friendshipStatus === "pending_sent" && (
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-9 gap-1.5"
          disabled
        >
          <UserCheck className="w-3.5 h-3.5" />
          Request Sent
        </Button>
      )}
      {friendshipStatus === "pending_received" && (
        <Button
          size="sm"
          variant="hero"
          className="flex-1 text-xs h-9 gap-1.5"
          onClick={handleAddFriend}
          disabled={loading}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Accept
        </Button>
      )}
      {friendshipStatus === "accepted" && (
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-9 gap-1.5 text-muted-foreground"
          onClick={handleRemoveFriend}
          disabled={loading}
        >
          <UserX className="w-3.5 h-3.5" />
          Friends
        </Button>
      )}
      <Button
        size="sm"
        variant={friendshipStatus === "none" ? "outline" : "hero"}
        className="flex-1 text-xs h-9 gap-1.5"
        onClick={handleMessage}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Message
      </Button>
    </div>
  );
}
