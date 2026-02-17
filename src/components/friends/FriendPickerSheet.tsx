import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/games/SkillBadge";
import { Search, Plus, UserPlus } from "lucide-react";
import { useFriends, type FriendProfile } from "@/hooks/useFriends";

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

  const selectedUserIds = selected
    .filter((p): p is { name: string; user_id: string } => typeof p === "object")
    .map((p) => p.user_id);

  const filteredFriends = friends.filter((f) => {
    if (selectedUserIds.includes(f.profile.user_id)) return false;
    if (!search) return true;
    return f.profile.name.toLowerCase().includes(search.toLowerCase());
  });

  const addFriend = (profile: FriendProfile) => {
    if (selected.length >= maxSlots) return;
    onSelect([...selected, { name: profile.name, user_id: profile.user_id }]);
  };

  const addGuest = () => {
    const name = guestName.trim();
    if (!name || selected.length >= maxSlots) return;
    onSelect([...selected, name]);
    setGuestName("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left">Add Players</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Search friends */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Friends list */}
          {filteredFriends.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Your Friends</p>
              {filteredFriends.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addFriend(f.profile)}
                  disabled={selected.length >= maxSlots}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                >
                  <Avatar className="h-9 w-9">
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
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {friends.length === 0 && !search && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends yet. Add friends from the Friends page!
            </p>
          )}

          {filteredFriends.length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends match "{search}"
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or add a guest</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Guest name input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type a guest name..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
              className="h-11 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addGuest}
              disabled={!guestName.trim() || selected.length >= maxSlots}
              className="h-11 px-4"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>

          {selected.length >= maxSlots && (
            <p className="text-xs text-muted-foreground text-center">All slots filled</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
