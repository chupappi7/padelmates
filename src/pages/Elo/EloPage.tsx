import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsTab } from "@/components/elo/StatsTab";
import { SubmitScoreTab } from "@/components/elo/SubmitScoreTab";
import { ForecastTab } from "@/components/elo/ForecastTab";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function EloPage() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, elo_rating")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-lg font-bold">{profile?.name || "Player"}</h2>
          <div className="text-4xl font-black text-primary">
            {profile?.elo_rating ?? 1200}
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">ELO Rating</p>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="submit">Submit</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
          <TabsContent value="submit">
            <SubmitScoreTab />
          </TabsContent>
          <TabsContent value="forecast">
            <ForecastTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
