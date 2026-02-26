import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- PDR math (duplicated from src/lib/pdr.ts for Deno) ---
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
  return (tw[matchType] ?? 0.5) * (confirmed ? 1.0 : 0.2) * Math.exp(-0.1 * monthsAgo);
}
function calcReliability(rd: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - rd / 1.5) * 100)));
}
function determinePDRPhase(mc: number, rd: number): string {
  if (mc < 5) return "calibrating";
  if (mc < 20 || rd > 0.9) return "provisional";
  return "established";
}
function calibratePDR(matches: Array<{ opponentR: number; sActual: number }>): number {
  let r = 3.0;
  for (let i = 0; i < 100; i++) {
    let gradient = 0;
    for (const m of matches) {
      const E = 1 / (1 + Math.pow(10, (m.opponentR - r) / 4));
      gradient += m.sActual - E;
    }
    r += 0.15 * gradient;
    r = Math.min(8.0, Math.max(2.0, r));
    if (Math.abs(gradient) < 0.0001) break;
  }
  return Math.round(r * 100) / 100;
}
function updatePDR(
  r: number, rd: number, sigma: number,
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
  const newR = Math.min(8.0, Math.max(2.0, r + newRD * newRD * delta_sum));
  return { r: newR, rd: newRD, sigma: newSigma };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "submission_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch submission
    const { data: sub, error: subErr } = await supabase
      .from("match_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), { status: 404, headers: corsHeaders });
    }
    if (sub.rating_processed) {
      return new Response(JSON.stringify({ message: "Already processed" }), { headers: corsHeaders });
    }

    const playerIds = [sub.team_a_player1, sub.team_a_player2, sub.team_b_player1, sub.team_b_player2];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, pdr_rating, pdr_rd, pdr_sigma, pdr_phase, pdr_matches_count")
      .in("user_id", playerIds);

    if (!profiles || profiles.length < 4) {
      return new Response(JSON.stringify({ error: "Could not find all player profiles" }), { status: 400, headers: corsHeaders });
    }

    const profileMap: Record<string, any> = {};
    for (const p of profiles) profileMap[p.user_id] = p;

    // Parse scores
    const sets = [
      { a: sub.set1_a, b: sub.set1_b },
      { a: sub.set2_a, b: sub.set2_b },
    ];
    if (sub.set3_a != null && sub.set3_b != null) {
      sets.push({ a: sub.set3_a, b: sub.set3_b });
    }
    const setsWonA = sets.filter((s: any) => s.a > s.b).length;
    const setsPlayed = sets.length;
    const gamesWonA = sets.reduce((sum: number, s: any) => sum + s.a, 0);
    const gamesWonB = sets.reduce((sum: number, s: any) => sum + s.b, 0);
    const totalGames = gamesWonA + gamesWonB;

    const sActualA = calcActualScore(setsWonA, setsPlayed, gamesWonA, totalGames);
    const sActualB = calcActualScore(setsPlayed - setsWonA, setsPlayed, gamesWonB, totalGames);

    const monthsAgo = (Date.now() - new Date(sub.played_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const weight = calcMatchWeight(sub.match_type, sub.status === "confirmed", monthsAgo);

    // Process each player
    const teamA = [sub.team_a_player1, sub.team_a_player2];
    const teamB = [sub.team_b_player1, sub.team_b_player2];

    for (const playerId of playerIds) {
      const p = profileMap[playerId];
      const isTeamA = teamA.includes(playerId);
      const opponents = isTeamA ? teamB : teamA;
      const sActual = isTeamA ? sActualA : sActualB;

      const opponentAvgR = opponents.reduce((sum: number, id: string) => sum + (profileMap[id].pdr_rating ?? 3.0), 0) / 2;
      const opponentAvgRD = opponents.reduce((sum: number, id: string) => sum + (profileMap[id].pdr_rd ?? 1.5), 0) / 2;

      const newMatchCount = (p.pdr_matches_count ?? 0) + 1;
      let newR: number, newRD: number, newSigma: number;

      if (p.pdr_phase === "calibrating" && newMatchCount >= 5) {
        // Fetch all confirmed matches for calibration
        const { data: allSubs } = await supabase
          .from("match_submissions")
          .select("*")
          .or(`team_a_player1.eq.${playerId},team_a_player2.eq.${playerId},team_b_player1.eq.${playerId},team_b_player2.eq.${playerId}`)
          .in("status", ["confirmed", "pending"])
          .eq("rating_processed", false);

        const calibrationMatches = (allSubs || []).map((s: any) => {
          const isA = s.team_a_player1 === playerId || s.team_a_player2 === playerId;
          const opps = isA ? [s.team_b_player1, s.team_b_player2] : [s.team_a_player1, s.team_a_player2];
          const oppR = opps.reduce((sum: number, id: string) => sum + (profileMap[id]?.pdr_rating ?? 3.0), 0) / 2;
          const sSets = [{ a: s.set1_a, b: s.set1_b }, { a: s.set2_a, b: s.set2_b }];
          if (s.set3_a != null && s.set3_b != null) sSets.push({ a: s.set3_a, b: s.set3_b });
          const sw = sSets.filter((ss: any) => isA ? ss.a > ss.b : ss.b > ss.a).length;
          const sp = sSets.length;
          const gw = sSets.reduce((sum: number, ss: any) => sum + (isA ? ss.a : ss.b), 0);
          const tg = sSets.reduce((sum: number, ss: any) => sum + ss.a + ss.b, 0);
          return { opponentR: oppR, sActual: calcActualScore(sw, sp, gw, tg) };
        });

        // Add current match
        calibrationMatches.push({ opponentR: opponentAvgR, sActual: sActual });
        newR = calibratePDR(calibrationMatches);
        // After calibration, do one Glicko-2 update
        const result = updatePDR(newR, 1.2, 0.06, [{
          opponentR: opponentAvgR, opponentRD: opponentAvgRD, sActual, weight
        }]);
        newR = result.r;
        newRD = result.rd;
        newSigma = result.sigma;
      } else {
        const currentR = p.pdr_rating ?? 3.0;
        const currentRD = p.pdr_rd ?? 1.5;
        const currentSigma = p.pdr_sigma ?? 0.06;
        const result = updatePDR(currentR, currentRD, currentSigma, [{
          opponentR: opponentAvgR, opponentRD: opponentAvgRD, sActual, weight
        }]);
        newR = result.r;
        newRD = result.rd;
        newSigma = result.sigma;
      }

      const oldR = p.pdr_rating ?? newR;
      const ratingChange = Math.round((newR - oldR) * 100) / 100;
      const newPhase = determinePDRPhase(newMatchCount, newRD);

      await supabase.from("profiles").update({
        pdr_rating: Math.round(newR * 100) / 100,
        pdr_rd: Math.round(newRD * 1000) / 1000,
        pdr_sigma: Math.round(newSigma * 10000) / 10000,
        pdr_phase: newPhase,
        pdr_matches_count: newMatchCount,
        pdr_last_match_at: new Date().toISOString(),
        pdr_reliability: calcReliability(newRD),
      }).eq("user_id", playerId);

      await supabase.from("rating_history").insert({
        player_id: playerId,
        rating_after: Math.round(newR * 100) / 100,
        rd_after: Math.round(newRD * 1000) / 1000,
        match_id: submission_id,
        rating_change: ratingChange,
      });
    }

    // Mark as processed
    await supabase.from("match_submissions").update({ rating_processed: true }).eq("id", submission_id);

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
