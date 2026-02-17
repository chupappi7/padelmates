import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatGameContext } from "@/lib/formatGameContext";

interface JoinRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  userId: string;
  hostId?: string;
  gameTitle?: string;
  gameLocation?: string;
  gameDateTime?: string;
  onSuccess: () => void;
}

export function JoinRequestModal({
  open,
  onOpenChange,
  gameId,
  userId,
  hostId,
  gameTitle,
  gameLocation,
  gameDateTime,
  onSuccess,
}: JoinRequestModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);

    const { error } = await supabase.from("join_requests").insert({
      game_id: gameId,
      user_id: userId,
      payment_status: "not_required",
    });

    if (error) {
      toast.error("Failed to send join request");
      setSubmitting(false);
      return;
    }

    // Notify host
    if (hostId && hostId !== userId) {
      const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", userId).single();
      const ctx = gameLocation && gameDateTime ? ` | ${formatGameContext(gameLocation, gameDateTime)}` : "";
      await supabase.from("notifications").insert({
        user_id: hostId,
        type: "game_request",
        title: "Join Request",
        message: `${profile?.name || "Someone"} wants to join "${gameTitle || "your game"}"${ctx}`,
        link: `/games/${gameId}`,
      });
    }

    toast.success("Request sent – waiting for host approval");
    onOpenChange(false);
    onSuccess();
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Request to Join</DialogTitle>
          <DialogDescription>
            Send a join request to the host. You'll be notified once they respond.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="hero"
            className="flex-1"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
