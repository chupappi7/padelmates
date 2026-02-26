import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Search } from "lucide-react";

interface PlayerSelectorProps {
  label: string;
  selectedIds: string[];
  onSelect: (player: { id: string; user_id: string; name: string; elo_rating: number; avatar_url: string | null }) => void;
  onRemove: (userId: string) => void;
  max: number;
  excludeIds?: string[];
}

export function PlayerSelector({ label, selectedIds, onSelect, onRemove, max, excludeIds = [] }: PlayerSelectorProps) {
  const [search, setSearch] = useState("");

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles-elo"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, name, elo_rating, avatar_url");
      return data || [];
    },
  });

  const filtered = allProfiles.filter(
    (p: any) =>
      !selectedIds.includes(p.user_id) &&
      !excludeIds.includes(p.user_id) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPlayers = allProfiles.filter((p: any) => selectedIds.includes(p.user_id));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      
      {/* Selected chips */}
      <div className="flex flex-wrap gap-1.5">
        {selectedPlayers.map((p: any) => (
          <div key={p.user_id} className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full pl-1 pr-2 py-0.5 text-xs font-medium">
            <Avatar className="w-5 h-5">
              <AvatarImage src={p.avatar_url || ""} />
              <AvatarFallback className="text-[8px]">{p.name[0]}</AvatarFallback>
            </Avatar>
            {p.name}
            <span className="text-muted-foreground">({p.elo_rating})</span>
            <button onClick={() => onRemove(p.user_id)} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      {selectedIds.length < max && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {search.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filtered.slice(0, 8).map((p: any) => (
                <button
                  key={p.user_id}
                  onClick={() => { onSelect(p); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={p.avatar_url || ""} />
                    <AvatarFallback className="text-[9px]">{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>{p.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{p.elo_rating}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No players found</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
