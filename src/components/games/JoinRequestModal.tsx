import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JoinRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  userId: string;
  onSuccess: () => void;
}

export function JoinRequestModal({
  open,
  onOpenChange,
  gameId,
  userId,
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
