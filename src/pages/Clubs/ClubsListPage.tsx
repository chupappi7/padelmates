import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Plus, Search, Users, Calendar } from "lucide-react";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  owner_id: string;
  club_followers: { id: string }[];
  games: { id: string }[];
}

export default function ClubsListPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select(`
        *,
        club_followers(id),
        games(id)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClubs(data as Club[]);
    }
    setLoading(false);
  };

  const filteredClubs = clubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">Clubs</h1>
              <p className="text-muted-foreground">
                Join a club or create your own community
              </p>
            </div>
            {user && (
              <Button variant="hero" onClick={() => navigate("/clubs/create")}>
                <Plus className="w-4 h-4" />
                Create Club
              </Button>
            )}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="bg-card border border-border rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-14 w-14 rounded-xl">
                    <AvatarImage src={club.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg rounded-xl">
                      {club.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-lg mb-1">{club.name}</h3>
                    {club.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {club.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {club.club_followers?.length || 0} followers
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {club.games?.length || 0} games
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">No clubs found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Be the first to create a club!"}
            </p>
            {user && (
              <Button variant="hero" onClick={() => navigate("/clubs/create")}>
                <Plus className="w-4 h-4" />
                Create Club
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
