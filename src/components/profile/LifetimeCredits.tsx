import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCreditLabel } from "@/lib/creditTypes";

interface LifetimeCreditsProps {
  userId: string;
}

export function LifetimeCredits({ userId }: LifetimeCreditsProps) {
  const [credits, setCredits] = useState<{ id: string; credit_type: string }[]>([]);

  useEffect(() => {
    supabase
      .from("match_credits")
      .select("id, credit_type")
      .eq("receiver_id", userId)
      .then(({ data }) => setCredits((data as any[]) || []));
  }, [userId]);

  if (credits.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credits</h3>
      <div className="flex flex-wrap gap-1.5">
        {credits.map(c => (
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
}
