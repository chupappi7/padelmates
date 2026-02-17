import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FriendCard } from "@/components/friends/FriendCard";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "friends" | "requests" | "search";

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends, incomingRequests, outgoingRequests, acceptRequest, rejectRequest, removeFriend, sendRequest, loading } = useFriends();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const isFriendCode = (s: string) => /^[A-Z0-9]{6}$/i.test(s);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    const trimmed = searchQuery.trim();

    let query = supabase
      .from("profiles")
      .select("user_id, name, avatar_url, skill_level")
      .neq("user_id", user.id);

    if (isFriendCode(trimmed)) {
      query = query.eq("friend_code", trimmed.toUpperCase());
    } else {
      query = query.ilike("name", `%${trimmed}%`).limit(20);
    }

    const { data } = await query;

    // Filter out existing friends and pending requests
    const existingIds = new Set([
      ...friends.map(f => f.profile.user_id),
      ...incomingRequests.map(f => f.profile.user_id),
      ...outgoingRequests.map(f => f.profile.user_id),
    ]);

    setSearchResults((data || []).filter(p => !existingIds.has(p.user_id)));
    setSearching(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const tabs: { value: Tab; label: string; icon: any; count?: number }[] = [
    { value: "friends", label: "Friends", icon: Users, count: friends.length },
    { value: "requests", label: "Requests", icon: Clock, count: incomingRequests.length },
    { value: "search", label: "Find", icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 className="font-display text-2xl font-bold mb-6">Friends</h1>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                className="h-9 text-xs gap-1.5"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1 h-5 px-1.5 text-[10px] rounded-full",
                      activeTab === tab.value
                        ? "bg-background/20 text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No friends yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab("search")}>
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Find players
                  </Button>
                </div>
              ) : (
                friends.map((f) => (
                  <FriendCard
                    key={f.id}
                    name={f.profile.name}
                    avatarUrl={f.profile.avatar_url}
                    skillLevel={f.profile.skill_level}
                    variant="friend"
                    onRemove={() => removeFriend(f.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              {incomingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incoming</p>
                  {incomingRequests.map((f) => (
                    <FriendCard
                      key={f.id}
                      name={f.profile.name}
                      avatarUrl={f.profile.avatar_url}
                      skillLevel={f.profile.skill_level}
                      variant="incoming"
                      onAccept={() => acceptRequest(f.id)}
                      onReject={() => rejectRequest(f.id)}
                    />
                  ))}
                </div>
              )}
              {outgoingRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</p>
                  {outgoingRequests.map((f) => (
                    <FriendCard
                      key={f.id}
                      name={f.profile.name}
                      avatarUrl={f.profile.avatar_url}
                      skillLevel={f.profile.skill_level}
                      variant="outgoing"
                      onReject={() => rejectRequest(f.id)}
                    />
                  ))}
                </div>
              )}
              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === "search" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or friend code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 h-11"
                  />
                </div>
                <Button variant="hero" onClick={handleSearch} disabled={searching} className="h-11">
                  Search
                </Button>
              </div>

              <div className="space-y-2">
                {searchResults.map((p) => (
                  <FriendCard
                    key={p.user_id}
                    name={p.name}
                    avatarUrl={p.avatar_url}
                    skillLevel={p.skill_level}
                    variant="search"
                    onAdd={() => {
                      sendRequest(p.user_id);
                      setSearchResults(prev => prev.filter(r => r.user_id !== p.user_id));
                    }}
                  />
                ))}
                {searchResults.length === 0 && searchQuery && !searching && (
                  <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
