import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsTab } from "@/components/elo/StatsTab";
import { SubmitScoreTab } from "@/components/elo/SubmitScoreTab";
import { ForecastTab } from "@/components/elo/ForecastTab";
import { Navbar } from "@/components/layout/Navbar";

export default function EloPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-4">
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
