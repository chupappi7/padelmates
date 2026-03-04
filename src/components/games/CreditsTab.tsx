import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GiveCreditSheet } from "./GiveCreditSheet";
import { getCreditLabel } from "@/lib/creditTypes";

interface CreditsTabProps {
  gameId: string;
  endDateTime: string;
  players: { user_id: string; name: string; avatar_url: string | null }[];
  gameLocation: string;
  gameDate: string;
}

interface Credit {
  id: string;
  match_id: string;
  giver_id: string;
  receiver_id: string;
  credit_type: string;
  created_at: string;
}

export function CreditsTab({ gameId, endDateTime, players, gameLocation, gameDate }: CreditsTabProps) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const endTime = new Date(endDateTime).getTime();
  const now = Date.now();
  const windowEnd = endTime + 72 * 60 * 60 * 1000;
  const windowOpen = now < windowEnd;
  const hoursLeft = Math.max(0, Math.ceil((windowEnd - now) / (1000 * 60 * 60)));

  // IDs of players the current user already gave credits to
  const givenTo = credits.filter(c => c.giver_id === user?.id).map(c => c.receiver_id);
  const otherPlayers = players.filter(p => p.user_id !== user?.id);
  const allGiven = otherPlayers.length > 0 && otherPlayers.every(p => givenTo.includes(p.user_id));

  const fetchCredits = useCallback(async () => {
    const { data } = await supabase
      .from("match_credits")
      .select("*")
      .eq("match_id", gameId);
    setCredits((data as Credit[]) || []);
    setLoading(false);
  }, [gameId]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  // Group credits by receiver
  const creditsByReceiver: Record<string, Credit[]> = {};
  credits.forEach(c => {
    if (!creditsByReceiver[c.receiver_id]) creditsByReceiver[c.receiver_id] = [];
    creditsByReceiver[c.receiver_id].push(c);
  });

  // Credits received by current user
  const myReceivedCredits = credits.filter(c => c.receiver_id === user?.id);

  const handleGiveCredit = async (receiverId: string, creditType: string) => {
    if (!user) return;
    if (!windowOpen) {
      toast.error("The credit window for this match has closed.");
      return;
    }

    const { error } = await supabase.from("match_credits").insert({
      match_id: gameId,
      giver_id: user.id,
      receiver_id: receiverId,
      credit_type: creditType,
    } as any);

    if (error) {
      if (error.code === "23505") toast.error("You already gave a credit to this player");
      else toast.error("Failed to give credit");
      return;
    }

    // Notify receiver
    await supabase.from("notifications").insert({
      user_id: receiverId,
      type: "credit_received",
      title: "You got a credit!",
      message: `Someone gave you a ${getCreditLabel(creditType)} credit from ${gameLocation} on ${gameDate}.`,
      link: `/games/${gameId}`,
    });

    toast.success("Credit given!");
    fetchCredits();
  };

  if (loading) {
    return <div className="h-24 bg-muted rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Credits Earned (public) */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credits Earned</h3>
        {Object.keys(creditsByReceiver).length === 0 ? (
          <p className="text-sm text-muted-foreground">No credits given yet.</p>
        ) : (
          <div className="space-y-2.5">
            {Object.entries(creditsByReceiver).map(([receiverId, creds]) => {
              const player = players.find(p => p.user_id === receiverId);
              return (
                <div key={receiverId} className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium shrink-0">{player?.name || "Player"}</span>
                  <div className="flex flex-wrap gap-1">
                    {creds.map(c => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-full bg-muted text-[11px] font-semibold text-foreground"
                      >
                        {getCreditLabel(c.credit_type)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Your Credits (private) */}
      {myReceivedCredits.length > 0 && (
        <div className="bg-card border border-primary/20 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Credits</h3>
          <div className="space-y-1.5">
            {myReceivedCredits.map(c => {
              const giver = players.find(p => p.user_id === c.giver_id);
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="px-2.5 py-1 rounded-full bg-muted text-[11px] font-semibold">
                    {getCreditLabel(c.credit_type)}
                  </span>
                  <span className="text-muted-foreground text-xs">from {giver?.name || "Someone"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Give Credit button */}
      <div className="text-center space-y-1.5">
        {user && windowOpen && !allGiven && players.some(p => p.user_id === user.id) && (
          <>
            <Button variant="hero" onClick={() => setSheetOpen(true)}>
              Give a Credit
            </Button>
            <p className="text-xs text-muted-foreground">{hoursLeft}h left · {givenTo.length}/{otherPlayers.length} given</p>
          </>
        )}
        {allGiven && (
          <p className="text-sm font-medium text-muted-foreground">✓ All credits given</p>
        )}
        {!windowOpen && !allGiven && (
          <p className="text-sm text-muted-foreground">Credit window closed</p>
        )}
      </div>

      <GiveCreditSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        players={otherPlayers}
        onConfirm={handleGiveCredit}
        givenTo={givenTo}
      />
    </div>
  );
}
