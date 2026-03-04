import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";
import { getCreditLabel } from "@/lib/creditTypes";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

export function ProfileCreditsTab({ userId }: { userId: string }) {
  const [credits, setCredits] = useState<{ id: string; credit_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("match_credits")
      .select("id, credit_type")
      .eq("receiver_id", userId)
      .then(({ data }) => {
        setCredits((data as any[]) || []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 bg-[#E2E8F0] rounded-2xl animate-pulse" />
        <div className="h-20 bg-[#E2E8F0] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const grouped: Record<string, number> = {};
  credits.forEach(c => {
    grouped[c.credit_type] = (grouped[c.credit_type] || 0) + 1;
  });

  if (credits.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
          <Award className="w-6 h-6 text-[#CBD5E1]" />
        </div>
        <p className="text-sm font-semibold text-[#94A3B8]" style={{ fontFamily: SPACE }}>No credits yet</p>
        <p className="text-xs text-[#CBD5E1] mt-1">Credits are earned from other players after matches</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-[#14b8a6]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: SPACE }}>{credits.length}</p>
            <p className="text-[10px] text-[#94A3B8] -mt-0.5">Total Credits</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#0F172A]"
              >
                {getCreditLabel(type)}
                {count > 1 && (
                  <span className="text-[10px] text-[#14b8a6] font-bold">×{count}</span>
                )}
              </span>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">All Credits</p>
        <div className="flex flex-wrap gap-1.5">
          {credits.map(c => (
            <span
              key={c.id}
              className="px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#0F172A]"
            >
              {getCreditLabel(c.credit_type)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
