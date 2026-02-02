import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./SkillBadge";
import { ParticipantStatusBadge, getParticipantStatus } from "./ParticipantStatusBadge";
import { Check, X, Users, AlertTriangle, Upload, Clock, Coins, Eye, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Profile {
  name: string;
  avatar_url: string | null;
  skill_level?: "beginner" | "intermediate" | "advanced";
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: "pending" | "accepted" | "rejected";
  note: string | null;
  payment_screenshot_url: string | null;
  payment_status: string;
  payment_due_at: string | null;
  profiles: Profile | null;
}

interface ParticipantsTabProps {
  isHost: boolean;
  hostIsPlaying: boolean;
  hostProfile: Profile | null;
  requests: JoinRequest[];
  maxPlayers: number;
  currentUserId?: string;
  userRequest?: JoinRequest | null;
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onVerifyPayment: (requestId: string) => void;
  onUploadPayment?: () => void;
  loadingAction?: string | null;
}

type FilterType = "all" | "awaiting" | "requests";

export function ParticipantsTab({
  isHost,
  hostIsPlaying,
  hostProfile,
  requests,
  maxPlayers,
  currentUserId,
  userRequest,
  onAcceptRequest,
  onRejectRequest,
  onVerifyPayment,
  onUploadPayment,
  loadingAction,
}: ParticipantsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewingProof, setViewingProof] = useState<{ url: string; name: string } | null>(null);
  const [loadingProof, setLoadingProof] = useState<string | null>(null);

  const handleViewProof = async (filePath: string, playerName: string) => {
    setLoadingProof(filePath);
    try {
      const { data, error } = await supabase.storage
        .from("payment-screenshots")
        .createSignedUrl(filePath, 60 * 5); // 5 minutes expiry
      
      if (error || !data?.signedUrl) {
        console.error("Failed to get signed URL:", error);
        return;
      }
      
      setViewingProof({ url: data.signedUrl, name: playerName });
    } finally {
      setLoadingProof(null);
    }
  };
  const confirmedPlayers = requests.filter(
    (r) => r.status === "accepted" && r.payment_status === "verified"
  );
  const awaitingPayment = requests.filter(
    (r) => r.status === "accepted" && r.payment_status !== "verified"
  );
  const pendingRequests = requests.filter((r) => r.status === "pending");

  // Calculate counts
  const hostCount = hostIsPlaying ? 1 : 0;
  const totalConfirmed = confirmedPlayers.length + hostCount;
  const totalPlayers = totalConfirmed + awaitingPayment.length;
  const emptySlots = Math.max(0, maxPlayers - totalPlayers);

  // Check if current user is awaiting payment
  const isUserAwaitingPayment = userRequest?.status === "accepted" && 
    userRequest?.payment_status !== "verified";
  const isPaymentOverdue = userRequest?.payment_due_at && 
    new Date(userRequest.payment_due_at) < new Date();

  // Determine which sections to show based on filter
  const showConfirmed = activeFilter === "all";
  const showAwaiting = activeFilter === "all" || activeFilter === "awaiting";
  const showRequests = activeFilter === "all" || activeFilter === "requests";

  return (
    <>
    <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Proof - {viewingProof?.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {viewingProof && (
            <img
              src={viewingProof.url}
              alt="Payment proof"
              className="w-full rounded-lg max-h-[60vh] object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
          className="h-8 text-xs shrink-0"
        >
          All
        </Button>
        
        {awaitingPayment.length > 0 && (
          <Button
            variant={activeFilter === "awaiting" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("awaiting")}
            className={cn(
              "h-8 text-xs shrink-0 gap-1.5",
              activeFilter !== "awaiting" && "border-warning/30 text-warning hover:bg-warning/10"
            )}
          >
            <Coins className="w-3.5 h-3.5" />
            Awaiting Payment
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1 h-5 px-1.5 text-[10px] rounded-full",
                activeFilter === "awaiting" 
                  ? "bg-background/20 text-primary-foreground" 
                  : "bg-warning/20 text-warning"
              )}
            >
              {awaitingPayment.length}
            </Badge>
          </Button>
        )}
        
        {isHost && pendingRequests.length > 0 && (
          <Button
            variant={activeFilter === "requests" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("requests")}
            className="h-8 text-xs shrink-0 gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Requests
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1 h-5 px-1.5 text-[10px] rounded-full",
                activeFilter === "requests" 
                  ? "bg-background/20 text-primary-foreground" 
                  : "bg-muted"
              )}
            >
              {pendingRequests.length}
            </Badge>
          </Button>
        )}
      </div>
      {/* User Awaiting Payment Banner */}
      {isUserAwaitingPayment && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl border",
          isPaymentOverdue 
            ? "bg-destructive/10 border-destructive/20" 
            : "bg-warning/10 border-warning/20"
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5 shrink-0",
            isPaymentOverdue ? "text-destructive" : "text-warning"
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-sm font-medium",
              isPaymentOverdue ? "text-destructive" : "text-warning"
            )}>
              {isPaymentOverdue ? "Payment Overdue!" : "You've been accepted!"}
            </p>
            <p className="text-xs opacity-80">
              {userRequest?.payment_due_at
                ? `Upload payment ${isPaymentOverdue ? "ASAP" : `before ${format(new Date(userRequest.payment_due_at), "EEE, MMM d")}`} to confirm your spot.`
                : "Upload payment to confirm your spot."}
            </p>
          </div>
          {onUploadPayment && (
            <Button size="sm" variant="outline" onClick={onUploadPayment} className="shrink-0">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload
            </Button>
          )}
        </div>
      )}

      {/* Confirmed Players Section */}
      {showConfirmed && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✅</span>
            <h3 className="text-sm font-semibold">Confirmed Players</h3>
            <Badge variant="outline" className="rounded-full text-xs ml-auto">
              {totalConfirmed}/{maxPlayers}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {/* Host */}
            {hostIsPlaying && hostProfile && (
              <PlayerCard
                name={hostProfile.name}
                avatarUrl={hostProfile.avatar_url}
                skillLevel={hostProfile.skill_level}
                isHost
                statusBadge={<ParticipantStatusBadge status="confirmed_paid" />}
              />
            )}
            
            {/* Confirmed players */}
            {confirmedPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                name={player.profiles?.name || "Player"}
                avatarUrl={player.profiles?.avatar_url || null}
                skillLevel={player.profiles?.skill_level}
                statusBadge={<ParticipantStatusBadge status="confirmed_paid" />}
              />
            ))}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-muted/20 border border-dashed border-border/50 rounded-lg min-h-[80px]"
              >
                <div className="h-8 w-8 rounded-full bg-muted/40 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
                <p className="text-[10px] text-muted-foreground/60">Open</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awaiting Payment Section */}
      {showAwaiting && awaitingPayment.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">💸</span>
            <h3 className="text-sm font-semibold">Accepted – Awaiting Payment</h3>
            <Badge variant="outline" className="rounded-full text-xs ml-auto bg-warning/10 text-warning border-warning/20">
              {awaitingPayment.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {awaitingPayment.map((player) => {
              const status = getParticipantStatus(
                player.status,
                player.payment_status,
                player.payment_due_at
              );
              
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {player.profiles?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.profiles?.name}</p>
                    <ParticipantStatusBadge status={status} />
                  </div>
                  
                  {/* Host actions */}
                  {isHost && player.payment_status === "submitted" && player.payment_screenshot_url && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewProof(player.payment_screenshot_url!, player.profiles?.name || "Player")}
                        disabled={loadingProof === player.payment_screenshot_url}
                        className="h-8"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {loadingProof === player.payment_screenshot_url ? "Loading..." : "View"}
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => onVerifyPayment(player.id)}
                        disabled={loadingAction === player.id}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Confirm
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending Requests Section (Host Only) */}
      {showRequests && isHost && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⏳</span>
            <h3 className="text-sm font-semibold">Join Requests (Pending)</h3>
            <Badge variant="outline" className="rounded-full text-xs ml-auto">
              {pendingRequests.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {request.profiles?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{request.profiles?.name}</p>
                    {request.profiles?.skill_level && (
                      <SkillBadge level={request.profiles.skill_level} size="sm" />
                    )}
                  </div>
                  {request.note && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{request.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRejectRequest(request.id)}
                    disabled={loadingAction === request.id}
                    className="h-8 px-2.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => onAcceptRequest(request.id)}
                    disabled={loadingAction === request.id}
                    className="h-8"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hostIsPlaying && confirmedPlayers.length === 0 && awaitingPayment.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No players yet. Be the first to join!</p>
        </div>
      )}
    </div>
    </>
  );
}

// Compact player card component
function PlayerCard({
  name,
  avatarUrl,
  skillLevel,
  isHost,
  statusBadge,
}: {
  name: string;
  avatarUrl: string | null;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  isHost?: boolean;
  statusBadge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-card border border-border rounded-lg text-center">
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isHost && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
            <Check className="w-2 h-2" />
          </div>
        )}
      </div>
      <p className="text-[11px] font-medium truncate w-full max-w-full">{name}</p>
      {isHost && (
        <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
          Host
        </Badge>
      )}
      {statusBadge}
    </div>
  );
}
