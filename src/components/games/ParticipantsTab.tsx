import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./SkillBadge";
import { Check, X, Users, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  name: string;
  avatar_url: string | null;
  skill_level?: number;
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

interface Player {
  id: string;
  user_id: string;
  role: string;
  profiles: Profile | null;
}

interface ParticipantsTabProps {
  isHost: boolean;
  canManage: boolean;
  hostIsPlaying: boolean;
  hostProfile: Profile | null;
  hostUserId?: string;
  requests: JoinRequest[];
  players: Player[];
  maxPlayers: number;
  currentUserId?: string;
  userRequest?: JoinRequest | null;
  prefilledPlayers?: (string | { name: string; user_id: string })[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onToggleRole: (playerId: string, currentRole: string) => void;
  loadingAction?: string | null;
  /** Show a join/request button in the first empty slot */
  showJoinInSlot?: boolean;
  joinLabel?: string;
  onJoinFromSlot?: () => void;
  /** Substitution support */
  allowSubstitutions?: boolean;
  showSubstituteJoin?: boolean;
  onJoinAsSubstitute?: () => void;
}

type FilterType = "all" | "requests";

export function ParticipantsTab({
  isHost,
  canManage,
  hostIsPlaying,
  hostProfile,
  hostUserId,
  requests,
  players,
  maxPlayers,
  prefilledPlayers = [],
  onAcceptRequest,
  onRejectRequest,
  onToggleRole,
  loadingAction,
  showJoinInSlot,
  joinLabel,
  onJoinFromSlot,
  allowSubstitutions,
  showSubstituteJoin,
  onJoinAsSubstitute,
}: ParticipantsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Merge accepted requests and direct players (dedup by user_id)
  const acceptedUserIds = new Set(requests.filter(r => r.status === "accepted").map(r => r.user_id));
  const directPlayers = players.filter(p => !acceptedUserIds.has(p.user_id) && p.user_id !== (hostProfile ? undefined : undefined));
  
  const confirmedFromRequests = requests.filter((r) => r.status === "accepted");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const prefilledCount = prefilledPlayers.filter(p => {
    const name = typeof p === "string" ? p : p.name;
    return name.trim();
  }).length;
  const hostCount = hostIsPlaying ? 1 : 0;
  const totalConfirmed = confirmedFromRequests.length + directPlayers.length + hostCount + prefilledCount;
  const emptySlots = Math.max(0, maxPlayers - totalConfirmed);

  const showConfirmed = activeFilter === "all";
  const showRequests = activeFilter === "all" || activeFilter === "requests";
  const showRequestsSection = pendingRequests.length > 0;

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

        {pendingRequests.length > 0 && (
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

          <div className="space-y-1.5">
            {/* Host */}
            {hostIsPlaying && hostProfile && (
              <PlayerCard
                name={hostProfile.name}
                avatarUrl={hostProfile.avatar_url}
                skillLevel={hostProfile.skill_level}
                userId={hostUserId}
                isHost
              />
            )}

            {/* Confirmed players from requests */}
            {confirmedFromRequests.map((request) => {
              const matchingPlayer = players.find(p => p.user_id === request.user_id);
              return (
                <PlayerCard
                  key={request.id}
                  name={request.profiles?.name || "Player"}
                  avatarUrl={request.profiles?.avatar_url || null}
                  skillLevel={request.profiles?.skill_level}
                  userId={request.user_id}
                  role={matchingPlayer?.role}
                  showRoleToggle={isHost}
                  onToggleRole={matchingPlayer ? () => onToggleRole(matchingPlayer.id, matchingPlayer.role) : undefined}
                />
              );
            })}

            {/* Direct join players */}
            {directPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                name={player.profiles?.name || "Player"}
                avatarUrl={player.profiles?.avatar_url || null}
                skillLevel={player.profiles?.skill_level}
                userId={player.user_id}
                role={player.role}
                showRoleToggle={isHost}
                onToggleRole={() => onToggleRole(player.id, player.role)}
              />
            ))}

            {/* Pre-filled guest players */}
            {prefilledPlayers.filter(p => {
              const name = typeof p === "string" ? p : p.name;
              return name.trim();
            }).map((player, i) => {
              const name = typeof player === "string" ? player : player.name;
              const isLinked = typeof player === "object" && player.user_id;
              return (
                <PlayerCard
                  key={`guest-${i}`}
                  name={name}
                  avatarUrl={null}
                  userId={isLinked ? (player as { name: string; user_id: string }).user_id : undefined}
                  isGuest={!isLinked}
                />
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              i === 0 && showJoinInSlot && onJoinFromSlot ? (
                <button
                  key="join-slot"
                  onClick={onJoinFromSlot}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors w-full text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">{joinLabel || "Join"}</p>
                </button>
              ) : (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/10 border border-dashed border-border/30"
                >
                  <div className="h-8 w-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                    <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground/50">Open spot</p>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests Section (Host Only) */}
      {showRequests && pendingRequests.length > 0 && (
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
                {canManage && (
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
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hostIsPlaying && confirmedFromRequests.length === 0 && directPlayers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No players yet. Be the first to join!</p>
        </div>
      )}

      {/* Substitution Section */}
      {allowSubstitutions && showConfirmed && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔄</span>
            <h3 className="text-sm font-semibold">Substitutions</h3>
          </div>
          {emptySlots <= 0 && showSubstituteJoin && onJoinAsSubstitute ? (
            <button
              onClick={onJoinAsSubstitute}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60 transition-colors w-full text-left"
            >
              <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <RefreshCw className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-foreground">Join as Substitute</p>
                <p className="text-[11px] text-muted-foreground">Available if a player drops out</p>
              </div>
            </button>
          ) : emptySlots > 0 ? (
            <p className="text-xs text-muted-foreground px-1">Substitutions available once all spots are filled.</p>
          ) : (
            <p className="text-xs text-muted-foreground px-1">No substitution spots requested yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

// Compact player row component
function PlayerCard({
  name,
  avatarUrl,
  skillLevel,
  userId,
  isHost,
  isGuest,
  role,
  showRoleToggle,
  onToggleRole,
}: {
  name: string;
  avatarUrl: string | null;
  skillLevel?: number;
  userId?: string;
  isHost?: boolean;
  isGuest?: boolean;
  role?: string;
  showRoleToggle?: boolean;
  onToggleRole?: () => void;
}) {
  const isAdmin = role === "admin";
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30",
        userId && "cursor-pointer hover:bg-muted/50 transition-colors"
      )}
      onClick={userId ? () => navigate(`/user/${userId}`) : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8">
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
        {isAdmin && !isHost && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-accent text-accent-foreground rounded-full p-0.5">
            <ShieldCheck className="w-2 h-2" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-sm font-medium truncate">{name}</p>
        {isHost && (
          <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
            Host
          </Badge>
        )}
        {isAdmin && !isHost && (
          <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20 shrink-0">
            Admin
          </Badge>
        )}
        {isGuest && (
          <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0">
            Guest
          </Badge>
        )}
        {showRoleToggle && !isHost && onToggleRole && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleRole(); }}
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {isAdmin ? "Remove admin" : "Make admin"}
          </button>
        )}
      </div>
      {skillLevel && (
        <div className="ml-auto shrink-0">
          <SkillBadge level={skillLevel} size="sm" />
        </div>
      )}
    </div>
  );
}
