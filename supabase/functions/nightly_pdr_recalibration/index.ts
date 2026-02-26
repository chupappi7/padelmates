import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- PDR math (duplicated for Deno edge function) ---

function gFactor(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * rd * rd) / (Math.PI * Math.PI));
}

function expectedScore(rA: number, rB: number, rdB: number): number {
  return 1 / (1 + Math.pow(10, (-gFactor(rdB) * (rA - rB)) / 4));
}

function calcActualScore(setsWonA: number, setsPlayed: number, gamesWonA: number, totalGames: number): number {
  if (setsPlayed === 0 || totalGames === 0) return 0.5;
  return 0.6 * (setsWonA / setsPlayed) + 0.4 * (gamesWonA / totalGames);
}

function calcMatchWeight(matchType: string, confirmed: boolean, monthsAgo: number): number {
  const tw: Record<string, number> = { tournament: 1.5, club: 1.0, americano: 0.75, casual: 0.5 };
  return (tw[matchType] ?? 0.5) * (confirmed ? 1.0 : 0.2) * Math.exp(-0.08 * monthsAgo);
}

function recalibrationWeight(monthsAgo: number): number {
  return Math.exp(-0.08 * monthsAgo);
}

function volatilityMultiplier(matchCount: number): number {
  if (matchCount <= 5) return 1.8;
  if (matchCount <= 10) return 1.4;
  if (matchCount <= 20) return 1.0;
  if (matchCount <= 50) return 0.7;
  return 0.4;
}

function calcReliability(rd: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - rd / 1.5) * 100)));
}

function determinePDRPhase(mc: number, rd: number): string {
  if (mc < 5 || rd > 1.1) return "calibrating";
  if (mc < 20 || rd > 0.9) return "provisional";
  return "established";
}

function applyInactivityDecay(rd: number, sigma: number): number {
  return Math.min(Math.sqrt(rd * rd + sigma * sigma), 1.5);
}

function updatePDR(
  r: number, rd: number, sigma: number, matchCount: number,
  matches: Array<{ opponentR: number; opponentRD: number; sActual: number; weight: number }>
): { r: number; rd: number; sigma: number } {
  const tau = 0.5;
  let d2_inv = 0, delta_sum = 0;
  for (const m of matches) {
    const g = gFactor(m.opponentRD);
    const E = expectedScore(r, m.opponentR, m.opponentRD);
    d2_inv += m.weight * g * g * E * (1 - E);
    delta_sum += m.weight * g * (m.sActual - E);
  }
  if (d2_inv === 0) return { r, rd, sigma };
  const d2 = 1 / d2_inv;
  const delta = d2 * delta_sum;
  const a = Math.log(sigma * sigma);
  const phi = rd;
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + d2 + tau * tau) {
    B = Math.log(delta * delta - phi * phi - d2);
  } else {
    let k = 1;
    while (a - k * tau < 0) k++;
    B = a - k * tau;
  }
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - d2 - ex);
    const den = 2 * Math.pow(phi * phi + d2 + ex, 2);
    return num / den - (x - a) / (tau * tau);
  };
  let fA = f(A), fB = f(B);
  let iterations = 0;
  while (Math.abs(B - A) > 0.000001 && iterations < 100) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) { A = B; fA = fB; } else { fA = fA / 2; }
    B = C; fB = fC;
    iterations++;
  }
  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newRD = Math.max(0.08, 1 / Math.sqrt(1 / (phiStar * phiStar) + d2_inv));
  const rawDelta = newRD * newRD * delta_sum;
  const scaledR = r + rawDelta * volatilityMultiplier(matchCount);
  const newR = Math.min(8.0, Math.max(2.0, scaledR));
  return { r: newR, rd: newRD, sigma: newSigma };
}

// --- Parse set scores from a submission row ---
function parseSubmissionScores(sub: any, playerId: string) {
  const isTeamA = sub.team_a_player1 === playerId || sub.team_a_player2 === playerId;
  const sets = [
    { a: sub.set1_a, b: sub.set1_b },
    { a: sub.set2_a, b: sub.set2_b },
  ];
  if (sub.set3_a != null && sub.set3_b != null) {
    sets.push({ a: sub.set3_a, b: sub.set3_b });
  }
  const setsPlayed = sets.length;
  const setsWon = sets.filter(s => isTeamA ? s.a > s.b : s.b > s.a).length;
  const gamesWon = sets.reduce((sum, s) => sum + (isTeamA ? s.a : s.b), 0);
  const totalGames = sets.reduce((sum, s) => sum + s.a + s.b, 0);
  return { sActual: calcActualScore(setsWon, setsPlayed, gamesWon, totalGames), isTeamA };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[nightly_pdr_recalibration] Starting...");

    // ── Step 1: Auto-expire pending submissions older than 72h ──
    const expiryCutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data: expiredSubs } = await supabase
      .from("match_submissions")
      .select("id")
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .eq("rating_processed", false);

    let autoExpiredCount = 0;
    if (expiredSubs && expiredSubs.length > 0) {
      // Process each expired match at 0.2x weight by marking confirmed and triggering rating
      for (const expired of expiredSubs) {
        // Leave status as pending (unconfirmed) — the process_pdr_rating function
        // already applies 0.2x weight when status !== "confirmed"
        // Just set rating_processed via calling the process function
        try {
          const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process_pdr_rating`;
          await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ submission_id: expired.id }),
          });
          autoExpiredCount++;
        } catch (e) {
          console.error(`[nightly] Failed to process expired submission ${expired.id}:`, e);
        }
      }
      console.log(`[nightly] Auto-processed ${autoExpiredCount} expired submissions at 0.2x weight`);
    }

    // ── Step 2: Fetch ALL confirmed/processed matches, sorted oldest first ──
    const { data: allMatches, error: matchErr } = await supabase
      .from("match_submissions")
      .select("*")
      .eq("rating_processed", true)
      .order("played_at", { ascending: true });

    if (matchErr) {
      console.error("[nightly] Failed to fetch matches:", matchErr);
      return new Response(JSON.stringify({ error: matchErr.message }), { status: 500, headers: corsHeaders });
    }

    if (!allMatches || allMatches.length === 0) {
      console.log("[nightly] No processed matches found. Nothing to recalibrate.");
      return new Response(JSON.stringify({ message: "No matches to recalibrate", autoExpired: autoExpiredCount }), { headers: corsHeaders });
    }

    // ── Step 3: Collect all unique player IDs ──
    const playerIdSet = new Set<string>();
    for (const m of allMatches) {
      playerIdSet.add(m.team_a_player1);
      playerIdSet.add(m.team_a_player2);
      playerIdSet.add(m.team_b_player1);
      playerIdSet.add(m.team_b_player2);
    }
    const allPlayerIds = [...playerIdSet];

    // Fetch current profiles for sigma and last_match_at
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, pdr_sigma, pdr_last_match_at, pdr_phase")
      .in("user_id", allPlayerIds);

    const originalProfiles: Record<string, { sigma: number; lastMatchAt: string | null; phase: string }> = {};
    for (const p of profilesData || []) {
      originalProfiles[p.user_id] = {
        sigma: p.pdr_sigma ?? 0.06,
        lastMatchAt: p.pdr_last_match_at,
        phase: p.pdr_phase ?? "calibrating",
      };
    }

    // ── Step 4: Reset all players to initial state in memory ──
    const state: Record<string, {
      r: number; rd: number; sigma: number; matchCount: number; lastMatchAt: string | null;
    }> = {};

    for (const id of allPlayerIds) {
      state[id] = {
        r: 3.0,
        rd: 1.5,
        sigma: originalProfiles[id]?.sigma ?? 0.06,
        matchCount: 0,
        lastMatchAt: null,
      };
    }

    // ── Step 5: Replay every match chronologically ──
    const now = new Date();
    for (const sub of allMatches) {
      const playedAt = new Date(sub.played_at);
      const monthsAgo = (now.getTime() - playedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const baseWeight = calcMatchWeight(sub.match_type, sub.status === "confirmed", monthsAgo);
      // Apply recalibration time decay on top
      const totalWeight = baseWeight * recalibrationWeight(monthsAgo);

      const teamAIds = [sub.team_a_player1, sub.team_a_player2];
      const teamBIds = [sub.team_b_player1, sub.team_b_player2];
      const allFour = [...teamAIds, ...teamBIds];

      // Parse scores
      const sets = [
        { a: sub.set1_a, b: sub.set1_b },
        { a: sub.set2_a, b: sub.set2_b },
      ];
      if (sub.set3_a != null && sub.set3_b != null) {
        sets.push({ a: sub.set3_a, b: sub.set3_b });
      }
      const setsPlayed = sets.length;
      const setsWonA = sets.filter(s => s.a > s.b).length;
      const gamesWonA = sets.reduce((sum, s) => sum + s.a, 0);
      const gamesWonB = sets.reduce((sum, s) => sum + s.b, 0);
      const totalGames = gamesWonA + gamesWonB;
      const sActualA = calcActualScore(setsWonA, setsPlayed, gamesWonA, totalGames);
      const sActualB = calcActualScore(setsPlayed - setsWonA, setsPlayed, gamesWonB, totalGames);

      // Update each player
      for (const pid of allFour) {
        const s = state[pid];
        const isTeamA = teamAIds.includes(pid);
        const opponents = isTeamA ? teamBIds : teamAIds;
        const sActual = isTeamA ? sActualA : sActualB;

        const opponentAvgR = opponents.reduce((sum, id) => sum + state[id].r, 0) / 2;
        const opponentAvgRD = opponents.reduce((sum, id) => sum + state[id].rd, 0) / 2;

        const result = updatePDR(s.r, s.rd, s.sigma, s.matchCount, [{
          opponentR: opponentAvgR,
          opponentRD: opponentAvgRD,
          sActual,
          weight: totalWeight,
        }]);

        s.r = result.r;
        s.rd = result.rd;
        s.sigma = result.sigma;
        s.matchCount++;
        s.lastMatchAt = sub.played_at;
      }
    }

    // ── Step 6: Apply inactivity decay for players inactive >30 days ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const id of allPlayerIds) {
      const s = state[id];
      if (s.lastMatchAt) {
        const lastPlayed = new Date(s.lastMatchAt);
        if (lastPlayed < thirtyDaysAgo) {
          s.rd = applyInactivityDecay(s.rd, s.sigma);
        }
      }
    }

    // ── Step 7: Write final ratings back to all profiles ──
    let updatedCount = 0;
    let phaseChanges = 0;

    for (const id of allPlayerIds) {
      const s = state[id];
      const roundedR = Math.round(s.r * 100) / 100;
      const newPhase = determinePDRPhase(s.matchCount, s.rd);
      const qualifiesForPublic = s.matchCount >= 5 && s.rd < 1.1;
      const newPublicRating = qualifiesForPublic ? roundedR : null;
      const newReliability = calcReliability(s.rd);

      const oldPhase = originalProfiles[id]?.phase ?? "calibrating";
      if (newPhase !== oldPhase) phaseChanges++;

      const { error: updateErr } = await supabase.from("profiles").update({
        pdr_internal_rating: roundedR,
        pdr_rating: newPublicRating,
        pdr_rd: Math.round(s.rd * 1000) / 1000,
        pdr_sigma: Math.round(s.sigma * 10000) / 10000,
        pdr_phase: newPhase,
        pdr_matches_count: s.matchCount,
        pdr_reliability: newReliability,
        pdr_last_match_at: s.lastMatchAt,
      }).eq("user_id", id);

      if (!updateErr) updatedCount++;
    }

    const summary = {
      success: true,
      matchesReplayed: allMatches.length,
      playersUpdated: updatedCount,
      phaseChanges,
      autoExpired: autoExpiredCount,
      timestamp: now.toISOString(),
    };

    console.log("[nightly_pdr_recalibration] Complete:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), { headers: corsHeaders });
  } catch (err) {
    console.error("[nightly_pdr_recalibration] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
