import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  const isUUID = gameId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);

  useEffect(() => {
    if (!gameId) return;

    const resolve = async () => {
      if (isUUID) {
        // Verify game exists then redirect
        const { data } = await supabase
          .from("games")
          .select("id")
          .eq("id", gameId)
          .maybeSingle();

        if (data) {
          navigate(`/games/${data.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
      } else {
        // Resolve slug to real ID
        const { data } = await supabase
          .from("games")
          .select("id")
          .eq("slug", gameId)
          .maybeSingle();

        if (data) {
          navigate(`/games/${data.id}`, { replace: true });
        } else {
          setNotFound(true);
        }
      }
    };

    resolve();
  }, [gameId]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <img src={logoIcon} alt="Padelmates" className="w-12 h-12 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Match not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This match may have been cancelled or doesn't exist.</p>
        <Button onClick={() => navigate("/")} variant="outline">Go to Padelmates</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
