import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./SkillBadge";
import { Check, X, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
  loadingAction?: string | null;
}

type FilterType = "all" | "requests";

export function ParticipantsTab({
  isHost,
  hostIsPlaying,
  hostProfile,
  requests,
  maxPlayers,
  onAcceptRequest,
  onRejectRequest,
  loadingAction,
}: ParticipantsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const confirmedPlayers = requests.filter((r) => r.status === "accepted");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const hostCount = hostIsPlaying ? 1 : 0;
  const totalConfirmed = confirmedPlayers.length + hostCount;
  const emptySlots = Math.max(0, maxPlayers - totalConfirmed);

  const showConfirmed = activeFilter === "all";
  const showRequests = activeFilter === "all" || activeFilter === "requests";

  return (
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
              />
            )}

            {/* Confirmed players */}
            {confirmedPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                name={player.profiles?.name || "Player"}
                avatarUrl={player.profiles?.avatar_url || null}
                skillLevel={player.profiles?.skill_level}
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

      {/* Pending Requests Section (Host Only) */}
      {showRequests && isHost && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⏳</span>
            <h3 className="text-sm font-semibold">Join Requests</h3>
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
      {!hostIsPlaying && confirmedPlayers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No players yet. Be the first to join!</p>
        </div>
      )}
    </div>
  );
}

// Compact player card component
function PlayerCard({
  name,
  avatarUrl,
  skillLevel,
  isHost,
}: {
  name: string;
  avatarUrl: string | null;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  isHost?: boolean;
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
    </div>
  );
}
