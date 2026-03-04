import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./SkillBadge";
import { Check, X, Users, Clock, ShieldCheck, RefreshCw, Plus, DollarSign, CheckCircle2, Star, UserMinus, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  showJoinInSlot?: boolean;
  joinLabel?: string;
  onJoinFromSlot?: () => void;
  allowSubstitutions?: boolean;
  showSubstituteJoin?: boolean;
  onJoinAsSubstitute?: () => void;
  /** Callback to add a new admin (e.g. open a friend picker) */
  onAddAdmin?: () => void;
  /** Whether this is a request_and_pay game */
  isRequestAndPay?: boolean;
  /** Callback when host confirms a player's payment */
  onConfirmPayment?: (requestId: string) => void;
  /** Callback to remove a confirmed player */
  onRemovePlayer?: (userId: string) => void;
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
  onAddAdmin,
  isRequestAndPay,
  onConfirmPayment,
  onRemovePlayer,
}: ParticipantsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Merge accepted requests and direct players (dedup by user_id)
  const acceptedUserIds = new Set(requests.filter(r => r.status === "accepted").map(r => r.user_id));
  const directPlayers = players.filter(p => !acceptedUserIds.has(p.user_id) && p.user_id !== (hostProfile ? undefined : undefined));
  
  // Organizers: host + admins
  const adminPlayers = players.filter(p => p.role === "admin");
  const adminFromRequests = requests.filter(r => r.status === "accepted" && players.find(p => p.user_id === r.user_id && p.role === "admin"));
  const organizers: { name: string; avatarUrl: string | null; userId?: string; isHost?: boolean }[] = [];
  if (hostProfile) {
    organizers.push({ name: hostProfile.name, avatarUrl: hostProfile.avatar_url, userId: hostUserId, isHost: true });
  }
  adminPlayers.forEach(ap => {
    const req = requests.find(r => r.user_id === ap.user_id && r.status === "accepted");
    const prof = req?.profiles || ap.profiles;
    if (prof && ap.user_id !== hostUserId) {
      organizers.push({ name: prof.name, avatarUrl: prof.avatar_url, userId: ap.user_id });
    }
  });
  
  const confirmedFromRequests = requests.filter((r) => r.status === "accepted");
  const awaitingPayment = isRequestAndPay
    ? confirmedFromRequests.filter(r => r.payment_status === "awaiting_payment")
    : [];
  const paymentConfirmed = isRequestAndPay
    ? confirmedFromRequests.filter(r => r.payment_status === "confirmed" || r.payment_status === "not_required")
    : confirmedFromRequests;
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const prefilledCount = prefilledPlayers.filter(p => {
    const name = typeof p === "string" ? p : p.name;
    return name.trim();
  }).length;
  const hostCount = hostIsPlaying ? 1 : 0;
  const totalConfirmed = (isRequestAndPay ? paymentConfirmed.length : confirmedFromRequests.length) + directPlayers.length + hostCount + prefilledCount;
  const emptySlots = Math.max(0, maxPlayers - totalConfirmed - awaitingPayment.length);

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
                  ? "bg-destructive/80 text-destructive-foreground"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {pendingRequests.length}
            </Badge>
          </Button>
        )}
      </div>

      {/* Organizers Section */}
      {showConfirmed && organizers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Organizers</h3>
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            {organizers.map((org, i) => (
              <OrganizerAvatar
                key={org.userId || i}
                name={org.name}
                avatarUrl={org.avatarUrl}
                userId={org.userId}
                isHost={org.isHost}
              />
            ))}
            {isHost && onAddAdmin && (
              <button
                onClick={onAddAdmin}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-border group-hover:border-primary/50 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">Add</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Confirmed Players Section */}
      {showConfirmed && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
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
            {paymentConfirmed.map((request) => {
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
                  canRemove={canManage}
                  onRemove={onRemovePlayer ? () => onRemovePlayer(request.user_id) : undefined}
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
                canRemove={canManage}
                onRemove={onRemovePlayer ? () => onRemovePlayer(player.user_id) : undefined}
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

      {/* Awaiting Payment Section (Request & Pay only) */}
      {showConfirmed && isRequestAndPay && awaitingPayment.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-semibold">Awaiting Payment</h3>
            <Badge variant="outline" className="rounded-full text-xs ml-auto bg-warning/10 text-warning border-warning/20">
              {awaitingPayment.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {awaitingPayment.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 bg-card border border-warning/20 rounded-xl"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-warning/10 text-warning font-semibold text-sm">
                    {request.profiles?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{request.profiles?.name}</p>
                    <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/20 shrink-0">
                      Awaiting Payment
                    </Badge>
                  </div>
                  {request.payment_due_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Due by {new Date(request.payment_due_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {canManage && onConfirmPayment && (
                  <Button
                    size="sm"
                    variant="hero"
                    onClick={() => onConfirmPayment(request.id)}
                    disabled={loadingAction === request.id}
                    className="h-8"
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    Confirm
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests Section (Host Only) */}
      {showRequests && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
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


      {/* Substitution Section */}
      {allowSubstitutions && showConfirmed && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
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
  canRemove,
  onRemove,
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
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const showMenu = !isHost && ((showRoleToggle && onToggleRole) || (canRemove && onRemove));

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30",
        userId && "cursor-pointer hover:bg-muted/50 transition-colors"
      )}
      onClick={userId ? () => navigate(`/user/${userId}`) : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 ring-1 ring-foreground/10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {(isHost || isAdmin) && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
            <ShieldCheck className="w-2 h-2" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-sm font-medium truncate">{name}</p>
        {isHost && (
          <span className="text-[9px] font-semibold text-primary shrink-0">Host</span>
        )}
        {isAdmin && !isHost && (
          <span className="text-[9px] font-semibold text-primary shrink-0">Admin</span>
        )}
        {isGuest && (
          <Badge variant="outline" className="rounded-full text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border-border shrink-0">
            Guest
          </Badge>
        )}
        {skillLevel && (
          <div className="shrink-0">
            <SkillBadge level={skillLevel} size="sm" />
          </div>
        )}
      </div>
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {showRoleToggle && onToggleRole && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleRole(); }}>
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                {isAdmin ? "Remove Admin" : "Make Admin"}
              </DropdownMenuItem>
            )}
            {canRemove && onRemove && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="w-3.5 h-3.5 mr-2" />
                Kick
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Organizer avatar displayed side-by-side
function OrganizerAvatar({
  name,
  avatarUrl,
  userId,
  isHost,
}: {
  name: string;
  avatarUrl: string | null;
  userId?: string;
  isHost?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <button
      onClick={userId ? () => navigate(`/user/${userId}`) : undefined}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="relative">
        <Avatar className="h-12 w-12 ring-1 ring-foreground/10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
          <ShieldCheck className="w-2.5 h-2.5" />
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors max-w-[60px] truncate">
        {name.split(" ")[0]}
      </span>
    </button>
  );
}
