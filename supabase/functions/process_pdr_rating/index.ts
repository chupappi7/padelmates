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
  return (tw[matchType] ?? 0.5) * (confirmed ? 1.0 : 0.2) * Math.exp(-0.08 * monthsAgo);
}
function calcReliability(rd: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - rd / 1.5) * 100)));
}
function determinePDRPhase(mc: number, rd: number): string {
  if (mc < 5 || rd > 1.1) return "calibrating";
  if (mc < 20 || rd > 0.9) return "provisional";
  return "established";
}
function volatilityMultiplier(matchCount: number): number {
  if (matchCount <= 5) return 1.8;
  if (matchCount <= 10) return 1.4;
  if (matchCount <= 20) return 1.0;
  if (matchCount <= 50) return 0.7;
  return 0.4;
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

// --- Cold-start anchor logic ---
// A player is "anchored" if they've played against a provisional/established player
// NR-vs-NR matches get a dampening multiplier since neither rating is grounded
const NR_VS_NR_DAMPEN = 0.3; // 30% weight for floating matches

function isPlayerAnchored(profile: any): boolean {
  return profile.pdr_anchored === true || 
    profile.pdr_phase === "provisional" || 
    profile.pdr_phase === "established";
}

function calcAnchorWeight(playerAnchored: boolean, opponentsAnchored: boolean[]): number {
  const anyOpponentAnchored = opponentsAnchored.some(a => a);
  if (playerAnchored || anyOpponentAnchored) return 1.0; // grounded match
  return NR_VS_NR_DAMPEN; // both sides floating — dampen
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check: require valid user or service role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity (allow service role or authenticated user)
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const callerRole = claimsData?.claims?.role;
    const callerId = claimsData?.claims?.sub as string | undefined;

    // Service role calls (from nightly recalibration) are always allowed
    const isServiceRole = callerRole === "service_role";

    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "submission_id required" }), { status: 400, headers: corsHeaders });
    }

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

    // Verify caller is a participant (unless service role)
    if (!isServiceRole) {
      if (!callerId || !playerIds.includes(callerId)) {
        return new Response(JSON.stringify({ error: "Forbidden: only match participants can trigger processing" }), { status: 403, headers: corsHeaders });
      }
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, pdr_rating, pdr_internal_rating, pdr_rd, pdr_sigma, pdr_phase, pdr_matches_count, pdr_anchored")
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
    const baseWeight = calcMatchWeight(sub.match_type, sub.status === "confirmed", monthsAgo);

    const teamA = [sub.team_a_player1, sub.team_a_player2];
    const teamB = [sub.team_b_player1, sub.team_b_player2];

    // Determine anchor status for each team
    const teamAAnchored = teamA.map(id => isPlayerAnchored(profileMap[id]));
    const teamBAnchored = teamB.map(id => isPlayerAnchored(profileMap[id]));
    const anyAnchored = [...teamAAnchored, ...teamBAnchored].some(a => a);

    console.log(`[process_pdr] Anchor status: teamA=[${teamAAnchored}], teamB=[${teamBAnchored}], anyAnchored=${anyAnchored}`);

    for (const playerId of playerIds) {
      const p = profileMap[playerId];
      const isTeamA = teamA.includes(playerId);
      const opponents = isTeamA ? teamB : teamA;
      const sActual = isTeamA ? sActualA : sActualB;

      const opponentAvgR = opponents.reduce((sum: number, id: string) => sum + (profileMap[id].pdr_internal_rating ?? 3.0), 0) / 2;
      const opponentAvgRD = opponents.reduce((sum: number, id: string) => sum + (profileMap[id].pdr_rd ?? 1.5), 0) / 2;

      const currentInternalR = p.pdr_internal_rating ?? 3.0;
      const currentRD = p.pdr_rd ?? 1.5;
      const currentSigma = p.pdr_sigma ?? 0.06;
      const newMatchCount = (p.pdr_matches_count ?? 0) + 1;

      // Cold-start: dampen NR-vs-NR matches
      const opponentsAnchored = opponents.map((id: string) => isPlayerAnchored(profileMap[id]));
      const anchorWeight = calcAnchorWeight(isPlayerAnchored(p), opponentsAnchored);
      const weight = baseWeight * anchorWeight;

      let newInternalR: number, newRD: number, newSigma: number;

      if (p.pdr_phase === "calibrating" && newMatchCount >= 5) {
        // Calibration: fetch previous matches for this player
        const { data: allSubs } = await supabase
          .from("match_submissions")
          .select("*")
          .or(`team_a_player1.eq.${playerId},team_a_player2.eq.${playerId},team_b_player1.eq.${playerId},team_b_player2.eq.${playerId}`)
          .in("status", ["confirmed", "pending"])
          .eq("rating_processed", true);

        const calibrationMatches = (allSubs || []).map((s: any) => {
          const isA = s.team_a_player1 === playerId || s.team_a_player2 === playerId;
          const opps = isA ? [s.team_b_player1, s.team_b_player2] : [s.team_a_player1, s.team_a_player2];
          const oppR = opps.reduce((sum: number, id: string) => sum + (profileMap[id]?.pdr_internal_rating ?? 3.0), 0) / 2;
          const sSets = [{ a: s.set1_a, b: s.set1_b }, { a: s.set2_a, b: s.set2_b }];
          if (s.set3_a != null && s.set3_b != null) sSets.push({ a: s.set3_a, b: s.set3_b });
          const sw = sSets.filter((ss: any) => isA ? ss.a > ss.b : ss.b > ss.a).length;
          const sp = sSets.length;
          const gw = sSets.reduce((sum: number, ss: any) => sum + (isA ? ss.a : ss.b), 0);
          const tg = sSets.reduce((sum: number, ss: any) => sum + ss.a + ss.b, 0);
          return { opponentR: oppR, sActual: calcActualScore(sw, sp, gw, tg) };
        });

        calibrationMatches.push({ opponentR: opponentAvgR, sActual: sActual });
        newInternalR = calibratePDR(calibrationMatches);
        const result = updatePDR(newInternalR, 1.2, 0.06, newMatchCount, [{
          opponentR: opponentAvgR, opponentRD: opponentAvgRD, sActual, weight
        }]);
        newInternalR = result.r;
        newRD = result.rd;
        newSigma = result.sigma;
      } else {
        const result = updatePDR(currentInternalR, currentRD, currentSigma, newMatchCount, [{
          opponentR: opponentAvgR, opponentRD: opponentAvgRD, sActual, weight
        }]);
        newInternalR = result.r;
        newRD = result.rd;
        newSigma = result.sigma;
      }

      const newPhase = determinePDRPhase(newMatchCount, newRD);
      const roundedInternalR = Math.round(newInternalR * 100) / 100;

      const qualifiesForPublic = newMatchCount >= 5 && newRD < 1.1;
      const newPublicRating = qualifiesForPublic ? roundedInternalR : null;

      // Anchor propagation: if any opponent is anchored, this player becomes anchored
      const newAnchored = p.pdr_anchored || opponentsAnchored.some((a: boolean) => a);

      const oldPublicR = p.pdr_rating;
      const ratingChange = oldPublicR != null && newPublicRating != null
        ? Math.round((newPublicRating - oldPublicR) * 100) / 100
        : newPublicRating != null
          ? Math.round((newPublicRating - (p.pdr_internal_rating ?? 3.0)) * 100) / 100
          : Math.round((roundedInternalR - (p.pdr_internal_rating ?? 3.0)) * 100) / 100;

      await supabase.from("profiles").update({
        pdr_internal_rating: roundedInternalR,
        pdr_rating: newPublicRating,
        pdr_rd: Math.round(newRD * 1000) / 1000,
        pdr_sigma: Math.round(newSigma * 10000) / 10000,
        pdr_phase: newPhase,
        pdr_matches_count: newMatchCount,
        pdr_last_match_at: new Date().toISOString(),
        pdr_reliability: calcReliability(newRD),
        pdr_anchored: newAnchored,
      }).eq("user_id", playerId);

      await supabase.from("rating_history").insert({
        player_id: playerId,
        rating_after: newPublicRating ?? roundedInternalR,
        rd_after: Math.round(newRD * 1000) / 1000,
        internal_rating_after: roundedInternalR,
        match_id: submission_id,
        rating_change: ratingChange,
      });

      console.log(`[process_pdr] Player ${playerId}: r=${roundedInternalR}, anchored=${newAnchored}, phase=${newPhase}, anchorWeight=${anchorWeight}`);
    }

    // Mark as processed
    await supabase.from("match_submissions").update({ rating_processed: true }).eq("id", submission_id);

    return new Response(JSON.stringify({ success: true, anyAnchored }), { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
