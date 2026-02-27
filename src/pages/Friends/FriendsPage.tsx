import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FriendCard } from "@/components/friends/FriendCard";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Search, Users, Clock, UserPlus, Sparkles, MapPin, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { CZECH_REGIONS } from "@/lib/regions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "friends" | "requests" | "players";

interface PlayerResult {
  user_id: string;
  name: string;
  avatar_url: string | null;
  skill_level: number;
  pdr_rating: number | null;
  friend_code: string | null;
  region: string | null;
}

export default function PlayersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const myProfile = useUserProfile();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    acceptRequest,
    rejectRequest,
    removeFriend,
    sendRequest,
    loading,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "friends"
  );
  const [friendsFilter, setFriendsFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Players tab state
  const [regionFilter, setRegionFilter] = useState<string>("__mine__");
  const [regionalPlayers, setRegionalPlayers] = useState<PlayerResult[]>([]);
  const [suggestions, setSuggestions] = useState<PlayerResult[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  const isFriendCode = (s: string) => /^[A-Z0-9]{6}$/i.test(s.replace("#", ""));

  const existingIds = new Set([
    ...(user ? [user.id] : []),
    ...friends.map((f) => f.profile.user_id),
    ...incomingRequests.map((f) => f.profile.user_id),
    ...outgoingRequests.map((f) => f.profile.user_id),
  ]);

  // Fetch discovery data when Players tab is active
  useEffect(() => {
    if (activeTab !== "players" || !user) return;
    fetchDiscovery();
  }, [activeTab, user?.id, regionFilter, myProfile?.region]);

  const getEffectiveRegion = () => {
    if (regionFilter === "__mine__") return myProfile?.region || null;
    if (regionFilter === "__all__") return null;
    return regionFilter;
  };

  const fetchDiscovery = async () => {
    if (!user) return;
    setDiscoveryLoading(true);

    const effectiveRegion = getEffectiveRegion();

    // Regional players
    let query = supabase
      .from("profiles")
      .select("user_id, name, avatar_url, skill_level, pdr_rating, friend_code, region")
      .neq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (effectiveRegion) {
      query = query.eq("region", effectiveRegion);
    }

    const { data: regional } = await query;
    setRegionalPlayers(
      ((regional || []) as PlayerResult[]).filter((p) => !existingIds.has(p.user_id))
    );

    // Club-based suggestions
    const { data: userClubs } = await supabase
      .from("club_followers")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    const clubIds = userClubs?.map((c) => c.club_id) || [];
    let suggestedProfiles: PlayerResult[] = [];

    if (clubIds.length > 0) {
      const { data: clubMembers } = await supabase
        .from("club_followers")
        .select("user_id")
        .in("club_id", clubIds)
        .eq("status", "active")
        .neq("user_id", user.id)
        .limit(30);

      const memberIds = [...new Set(clubMembers?.map((m) => m.user_id) || [])];
      const filteredIds = memberIds.filter((id) => !existingIds.has(id));

      if (filteredIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, skill_level, pdr_rating, friend_code, region")
          .in("user_id", filteredIds.slice(0, 10));

        suggestedProfiles = (profiles || []) as PlayerResult[];
      }
    }

    setSuggestions(suggestedProfiles);
    setDiscoveryLoading(false);
  };

  const handleSearch = async (query?: string) => {
    const q = query ?? searchQuery;
    if (!q.trim() || !user) return;
    setSearching(true);
    const trimmed = q.trim().replace("#", "");

    let dbQuery = supabase
      .from("profiles")
      .select("user_id, name, avatar_url, skill_level, pdr_rating, friend_code, region")
      .neq("user_id", user.id);

    if (isFriendCode(trimmed)) {
      dbQuery = dbQuery.eq("friend_code", trimmed.toUpperCase());
    } else {
      dbQuery = dbQuery.ilike("name", `%${trimmed}%`).limit(20);
    }

    const { data } = await dbQuery;

    setSearchResults(
      ((data || []) as PlayerResult[]).filter((p) => !existingIds.has(p.user_id))
    );
    setSearching(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const filteredFriends = friendsFilter
    ? friends.filter((f) =>
        f.profile.name.toLowerCase().includes(friendsFilter.toLowerCase())
      )
    : friends;

  // Compute stats
  const totalFriends = friends.length;

  const tabs: { value: Tab; label: string; icon: any; count?: number; dot?: boolean }[] = [
    { value: "friends", label: "Friends", icon: Users, count: totalFriends },
    {
      value: "requests",
      label: "Requests",
      icon: Clock,
      count: incomingRequests.length + outgoingRequests.length,
      dot: incomingRequests.length > 0,
    },
    { value: "players", label: "Players", icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-5 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Header */}
          <div className="mb-5">
            <h1 className="font-display text-2xl font-bold mb-1">Players</h1>
            <p className="text-xs text-muted-foreground">
              {totalFriends} {totalFriends === 1 ? "friend" : "friends"}
              {incomingRequests.length > 0 && (
                <span> · {incomingRequests.length} pending</span>
              )}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-muted/50 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-md transition-colors relative",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 px-1.5 text-[10px] rounded-full",
                      tab.dot && activeTab !== tab.value
                        ? "bg-destructive text-destructive-foreground"
                        : activeTab === tab.value
                          ? "bg-primary/15 text-primary"
                          : "bg-muted-foreground/15"
                    )}
                  >
                    {tab.count}
                  </Badge>
                )}
                {tab.dot && activeTab !== tab.value && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-destructive" />
                )}
              </button>
            ))}
          </div>

          {/* ── Friends Tab ────────────────────────────────────── */}
          {activeTab === "friends" && (
            <div className="space-y-3">
              {friends.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter friends..."
                    value={friendsFilter}
                    onChange={(e) => setFriendsFilter(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              )}

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[72px] bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-sm mb-1">No friends yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Find players from the Players tab
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("players")} className="gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    Find players
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredFriends.map((f) => (
                    <FriendCard
                      key={f.id}
                      userId={f.profile.user_id}
                      name={f.profile.name}
                      avatarUrl={f.profile.avatar_url}
                      skillLevel={f.profile.skill_level}
                      pdrRating={f.profile.pdr_rating}
                      region={f.profile.region !== myProfile?.region ? f.profile.region : undefined}
                      variant="friend"
                      onRemove={() => removeFriend(f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Requests Tab ───────────────────────────────────── */}
          {activeTab === "requests" && (
            <div className="space-y-5">
              {incomingRequests.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Received
                  </p>
                  <div className="space-y-1.5">
                    {incomingRequests.map((f) => (
                      <FriendCard
                        key={f.id}
                        userId={f.profile.user_id}
                        name={f.profile.name}
                        avatarUrl={f.profile.avatar_url}
                        skillLevel={f.profile.skill_level}
                        pdrRating={f.profile.pdr_rating}
                        region={f.profile.region}
                        variant="incoming"
                        onAccept={() => acceptRequest(f.id)}
                        onReject={() => rejectRequest(f.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Sent
                  </p>
                  <div className="space-y-1.5">
                    {outgoingRequests.map((f) => (
                      <FriendCard
                        key={f.id}
                        userId={f.profile.user_id}
                        name={f.profile.name}
                        avatarUrl={f.profile.avatar_url}
                        skillLevel={f.profile.skill_level}
                        pdrRating={f.profile.pdr_rating}
                        region={f.profile.region}
                        variant="outgoing"
                        onReject={() => rejectRequest(f.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-sm mb-1">No pending requests</p>
                  <p className="text-xs text-muted-foreground">
                    Friend requests will appear here
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Players Tab ───────────────────────────────────── */}
          {activeTab === "players" && (
            <div className="space-y-5">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or player ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 h-11"
                    autoFocus
                  />
                </div>
                <Button
                  variant="hero"
                  onClick={() => handleSearch()}
                  disabled={searching || !searchQuery.trim()}
                  className="h-11 px-5"
                >
                  Search
                </Button>
              </div>

              {/* Filters row */}
              {!searchQuery.trim() && (
                <div className="flex gap-2 flex-wrap">
                  <Select value={regionFilter} onValueChange={setRegionFilter}>
                    <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs gap-1 rounded-full border-border">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__mine__">
                        {myProfile?.region ? `My Region (${myProfile.region})` : "My Region"}
                      </SelectItem>
                      <SelectItem value="__all__">All Regions</SelectItem>
                      {CZECH_REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Search results */}
              {searchQuery.trim() ? (
                <div className="space-y-1.5">
                  {searching ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-[72px] bg-muted rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <FriendCard
                        key={p.user_id}
                        userId={p.user_id}
                        name={p.name}
                        avatarUrl={p.avatar_url}
                        skillLevel={p.skill_level}
                        pdrRating={p.pdr_rating}
                        region={p.region}
                        variant="search"
                        onAdd={() => {
                          sendRequest(p.user_id);
                          setSearchResults((prev) =>
                            prev.filter((r) => r.user_id !== p.user_id)
                          );
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground mb-1">No players found</p>
                      <p className="text-xs text-muted-foreground/60">
                        Try searching by their 6-character player ID instead
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Discovery sections */
                <div className="space-y-6">
                  {/* Regional players */}
                  {discoveryLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[72px] bg-muted rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {regionalPlayers.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Players in {getEffectiveRegion() || "all regions"}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {regionalPlayers.map((p) => (
                              <FriendCard
                                key={p.user_id}
                                userId={p.user_id}
                                name={p.name}
                                avatarUrl={p.avatar_url}
                                skillLevel={p.skill_level}
                                pdrRating={p.pdr_rating}
                                region={p.region}
                                variant="search"
                                onAdd={() => {
                                  sendRequest(p.user_id);
                                  setRegionalPlayers((prev) =>
                                    prev.filter((r) => r.user_id !== p.user_id)
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Players you may know
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {suggestions.map((p) => (
                              <FriendCard
                                key={p.user_id}
                                userId={p.user_id}
                                name={p.name}
                                avatarUrl={p.avatar_url}
                                skillLevel={p.skill_level}
                                pdrRating={p.pdr_rating}
                                region={p.region}
                                variant="search"
                                subtitle="From your clubs"
                                onAdd={() => {
                                  sendRequest(p.user_id);
                                  setSuggestions((prev) =>
                                    prev.filter((r) => r.user_id !== p.user_id)
                                  );
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {regionalPlayers.length === 0 && suggestions.length === 0 && (
                        <div className="text-center py-10">
                          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                            <UserPlus className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <p className="font-semibold text-sm mb-1">Find new players</p>
                          <p className="text-xs text-muted-foreground">
                            Search by name or their 6-character player ID
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
