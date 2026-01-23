import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "./SkillBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Image, Clock } from "lucide-react";
import { format } from "date-fns";

interface HostRequestCardProps {
  request: {
    id: string;
    user_id: string;
    status: "pending" | "accepted" | "rejected";
    note: string | null;
    payment_screenshot_url: string | null;
    payment_status: string;
    payment_due_at: string | null;
    profiles: {
      name: string;
      avatar_url: string | null;
      skill_level: "beginner" | "intermediate" | "advanced";
    } | null;
  };
  gameId: string;
  paymentMode: "pay_to_join" | "confirm_first";
  onUpdate: () => void;
}

export function HostRequestCard({ request, gameId, paymentMode, onUpdate }: HostRequestCardProps) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  const handleAction = async (action: "accepted" | "rejected") => {
    setLoading(action === "accepted" ? "accept" : "reject");

    const updateData: Record<string, unknown> = { status: action };

    // For confirm_first mode, set payment deadline when accepting
    if (action === "accepted" && paymentMode === "confirm_first") {
      updateData.payment_status = "pending";
      // Set payment due 48h before game (this should ideally use game date_time)
      // For now, set it to 48h from now as a placeholder
      const deadlineDate = new Date();
      deadlineDate.setHours(deadlineDate.getHours() + 48);
      updateData.payment_due_at = deadlineDate.toISOString();
    }

    if (action === "accepted" && paymentMode === "pay_to_join") {
      updateData.payment_status = "verified";
    }

    const { error } = await supabase
      .from("join_requests")
      .update(updateData)
      .eq("id", request.id);

    if (error) {
      toast.error("Failed to update request");
      setLoading(null);
      return;
    }

    if (action === "accepted") {
      await supabase.from("game_players").insert({
        game_id: gameId,
        user_id: request.user_id,
      });
    }

    toast.success(action === "accepted" ? "Player accepted!" : "Request rejected");
    onUpdate();
    setLoading(null);
  };

  const handleVerifyPayment = async () => {
    setLoading("accept");
    const { error } = await supabase
      .from("join_requests")
      .update({ payment_status: "verified" })
      .eq("id", request.id);

    if (error) {
      toast.error("Failed to verify payment");
    } else {
      toast.success("Payment verified!");
      onUpdate();
    }
    setLoading(null);
  };

  const getStatusBadge = () => {
    if (request.status === "rejected") {
      return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    }
    if (request.status === "accepted") {
      if (request.payment_status === "verified") {
        return <Badge className="bg-success/10 text-success border-0 text-xs">Confirmed</Badge>;
      }
      if (request.payment_status === "submitted") {
        return <Badge className="bg-primary/10 text-primary border-0 text-xs">Payment Pending</Badge>;
      }
      if (request.payment_status === "pending") {
        return <Badge className="bg-warning/10 text-warning border-0 text-xs">Awaiting Payment</Badge>;
      }
    }
    return null;
  };

  const showPaymentVerification = request.status === "accepted" && 
    request.payment_status === "submitted" && 
    request.payment_screenshot_url;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={request.profiles?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {request.profiles?.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{request.profiles?.name}</p>
            {request.profiles?.skill_level && (
              <SkillBadge level={request.profiles.skill_level} size="sm" />
            )}
            {getStatusBadge()}
          </div>
          {request.note && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.note}</p>
          )}
        </div>
      </div>

      {/* Payment Screenshot */}
      {request.payment_screenshot_url && (
        <a
          href={request.payment_screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
        >
          <Image className="w-4 h-4 text-primary" />
          <span>View payment proof</span>
        </a>
      )}

      {/* Pending Payment Warning for confirm_first */}
      {request.status === "accepted" && 
       paymentMode === "confirm_first" && 
       request.payment_status === "pending" && 
       request.payment_due_at && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/10 text-sm">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-warning">
            Payment due by {format(new Date(request.payment_due_at), "EEE, MMM d")}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {request.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => handleAction("rejected")}
            disabled={loading !== null}
          >
            <X className="w-4 h-4 mr-1.5" />
            Decline
          </Button>
          <Button
            size="sm"
            variant="hero"
            className="flex-1"
            onClick={() => handleAction("accepted")}
            disabled={loading !== null}
          >
            <Check className="w-4 h-4 mr-1.5" />
            {loading === "accept" ? "..." : paymentMode === "pay_to_join" ? "Confirm" : "Accept"}
          </Button>
        </div>
      )}

      {/* Verify Payment Button */}
      {showPaymentVerification && (
        <Button
          size="sm"
          variant="success"
          className="w-full"
          onClick={handleVerifyPayment}
          disabled={loading !== null}
        >
          <Check className="w-4 h-4 mr-1.5" />
          {loading === "accept" ? "Verifying..." : "Verify Payment"}
        </Button>
      )}
    </div>
  );
}
