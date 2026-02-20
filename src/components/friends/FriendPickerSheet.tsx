import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { Search, UserPlus, Users, Check } from "lucide-react";
import { useFriends, type FriendProfile } from "@/hooks/useFriends";
import { cn } from "@/lib/utils";

export type PrefilledPlayer = string | { name: string; user_id: string };

interface FriendPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: PrefilledPlayer[];
  onSelect: (players: PrefilledPlayer[]) => void;
  maxSlots: number;
}

export function FriendPickerSheet({ open, onOpenChange, selected, onSelect, maxSlots }: FriendPickerSheetProps) {
  const { friends } = useFriends();
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");

  const spotsUsed = selected.length;
  const isFull = spotsUsed >= maxSlots;

  const selectedUserIds = selected
    .filter((p): p is { name: string; user_id: string } => typeof p === "object")
    .map((p) => p.user_id);

  const filteredFriends = friends.filter((f) => {
    if (!search) return true;
    return f.profile.name.toLowerCase().includes(search.toLowerCase());
  });

  const isAdded = (userId: string) => selectedUserIds.includes(userId);

  const addFriend = (profile: FriendProfile) => {
    if (isFull || isAdded(profile.user_id)) return;
    onSelect([...selected, { name: profile.name, user_id: profile.user_id }]);
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name || isFull) return;
    onSelect([...selected, name]);
    setGuestName("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-left text-base">Add Players</SheetTitle>
          </SheetHeader>

          {/* Slot indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[...Array(maxSlots)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i < spotsUsed
                      ? isFull ? "w-5 bg-warning" : "w-5 bg-primary"
                      : "w-5 bg-muted"
                  )}
                />
              ))}
            </div>
            <span className={cn(
              "text-xs font-medium transition-colors",
              isFull ? "text-warning" : "text-muted-foreground"
            )}>
              {isFull ? "All spots filled" : `${spotsUsed} of ${maxSlots} spots used`}
            </span>
          </div>

          {/* Full state amber banner */}
          {isFull && (
            <div className="mt-3 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs text-warning font-medium">All spots filled — remove a player to swap</p>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Friends list */}
          {friends.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-0.5">
                Your Friends ({friends.length})
              </p>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                {filteredFriends.map((f, idx) => {
                  const added = isAdded(f.profile.user_id);
                  return (
                    <div
                      key={f.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors",
                        idx < filteredFriends.length - 1 && "border-b border-border/40",
                        added ? "bg-success/5" : isFull ? "opacity-50" : "hover:bg-accent/50"
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={f.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {f.profile.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{f.profile.name}</span>
                          <SkillBadge level={f.profile.skill_level} size="sm" />
                        </div>
                      </div>
                      {added ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-success shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addFriend(f.profile)}
                          disabled={isFull}
                          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredFriends.length === 0 && search && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">No match for "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No friends empty state */}
          {friends.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No friends added yet</p>
              <p className="text-xs text-muted-foreground/70">Add friends from the Friends tab</p>
            </div>
          )}

          {/* Guest divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or add a guest</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Guest input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type a guest name..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
              disabled={isFull}
              className="h-10 flex-1"
            />
            <button
              type="button"
              onClick={addGuest}
              disabled={!guestName.trim() || isFull}
              className="h-10 px-4 rounded-xl border-2 border-input flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Safe bottom padding for notched devices */}
        <div className="pb-6 safe-bottom" />
      </SheetContent>
    </Sheet>
  );
}
