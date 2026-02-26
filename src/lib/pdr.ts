// PDR — Padel Dynamic Rating (Glicko-2 adapted for padel)

export interface Tier {
  name: string;
  color: string;
  min: number;
  max: number;
}

export function getTier(rating: number): Tier {
  if (rating < 2.5) return { name: 'Beginner', color: '#8B9DC3', min: 2.0, max: 2.5 };
  if (rating < 3.0) return { name: 'Novice', color: '#4CAF50', min: 2.5, max: 3.0 };
  if (rating < 3.5) return { name: 'Intermediate', color: '#2196F3', min: 3.0, max: 3.5 };
  if (rating < 4.0) return { name: 'Intermediate+', color: '#00BCD4', min: 3.5, max: 4.0 };
  if (rating < 4.5) return { name: 'Advanced', color: '#9C27B0', min: 4.0, max: 4.5 };
  if (rating < 5.0) return { name: 'Advanced+', color: '#FF9800', min: 4.5, max: 5.0 };
  if (rating < 6.0) return { name: 'Expert', color: '#F44336', min: 5.0, max: 6.0 };
  if (rating < 7.0) return { name: 'Elite', color: '#FFD700', min: 6.0, max: 7.0 };
  return { name: 'Pro', color: '#FF6B00', min: 7.0, max: 8.0 };
}

export function getNextTier(rating: number): Tier | null {
  const tiers: Tier[] = [
    { name: 'Beginner', color: '#8B9DC3', min: 2.0, max: 2.5 },
    { name: 'Novice', color: '#4CAF50', min: 2.5, max: 3.0 },
    { name: 'Intermediate', color: '#2196F3', min: 3.0, max: 3.5 },
    { name: 'Intermediate+', color: '#00BCD4', min: 3.5, max: 4.0 },
    { name: 'Advanced', color: '#9C27B0', min: 4.0, max: 4.5 },
    { name: 'Advanced+', color: '#FF9800', min: 4.5, max: 5.0 },
    { name: 'Expert', color: '#F44336', min: 5.0, max: 6.0 },
    { name: 'Elite', color: '#FFD700', min: 6.0, max: 7.0 },
    { name: 'Pro', color: '#FF6B00', min: 7.0, max: 8.0 },
  ];
  const current = getTier(rating);
  const idx = tiers.findIndex((t) => t.name === current.name);
  return idx < tiers.length - 1 ? tiers[idx + 1] : null;
}

// --- Padel Performance Score ---
export function calcActualScore(
  setsWonA: number,
  setsPlayed: number,
  gamesWonA: number,
  totalGames: number
): number {
  if (setsPlayed === 0 || totalGames === 0) return 0.5;
  const setScore = setsWonA / setsPlayed;
  const gameScore = gamesWonA / totalGames;
  return 0.6 * setScore + 0.4 * gameScore;
}

export function parseSetScores(
  set1a: number, set1b: number,
  set2a: number, set2b: number,
  set3a: number | null, set3b: number | null
) {
  const sets = [
    { a: set1a, b: set1b },
    { a: set2a, b: set2b },
  ];
  if (set3a != null && set3b != null) {
    sets.push({ a: set3a, b: set3b });
  }
  const setsWonA = sets.filter((s) => s.a > s.b).length;
  const setsPlayed = sets.length;
  const gamesWonA = sets.reduce((sum, s) => sum + s.a, 0);
  const totalGames = sets.reduce((sum, s) => sum + s.a + s.b, 0);
  return { setsWonA, setsPlayed, gamesWonA, totalGames };
}

// --- Team Helpers ---
export function teamRating(r1: number, r2: number): number {
  return (r1 + r2) / 2;
}

export function teamRD(rd1: number, rd2: number): number {
  return Math.sqrt((rd1 * rd1 + rd2 * rd2) / 2);
}

// --- Glicko-2 functions ---
export function gFactor(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * rd * rd) / (Math.PI * Math.PI));
}

export function expectedScore(rA: number, rB: number, rdB: number): number {
  return 1 / (1 + Math.pow(10, (-gFactor(rdB) * (rA - rB)) / 4));
}

// --- Volatility Multiplier ---
// Big swings early to find true level fast, small adjustments once established
export const VOLATILITY_MULTIPLIER = (matchCount: number): number => {
  if (matchCount <= 5)  return 1.8;
  if (matchCount <= 10) return 1.4;
  if (matchCount <= 20) return 1.0;
  if (matchCount <= 50) return 0.7;
  return 0.4;
};

// --- Full Rating Update (Glicko-2 with volatility multiplier) ---
export function updatePDR(
  r: number, rd: number, sigma: number,
  matchCount: number,
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

  // Apply volatility multiplier: big swings early, small later
  const rawDelta = newRD * newRD * delta_sum;
  const scaledR = r + rawDelta * VOLATILITY_MULTIPLIER(matchCount);
  const newR = Math.min(8.0, Math.max(2.0, scaledR));

  return { r: newR, rd: newRD, sigma: newSigma };
}

// --- Calibration ---
export function calibratePDR(
  matches: Array<{ opponentR: number; sActual: number }>
): number {
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

// --- Match Weight ---
export function calcMatchWeight(
  matchType: string,
  confirmedByOpponent: boolean,
  monthsAgo: number
): number {
  const typeWeights: Record<string, number> = {
    tournament: 1.5,
    club: 1.0,
    americano: 0.75,
    casual: 0.5,
  };
  const base = typeWeights[matchType] ?? 0.5;
  const confirmation = confirmedByOpponent ? 1.0 : 0.2;
  const decay = Math.exp(-0.08 * monthsAgo);
  return base * confirmation * decay;
}

// --- Recalibration weight (nightly job) ---
export function recalibrationWeight(monthsAgo: number): number {
  return Math.exp(-0.08 * monthsAgo);
}

// --- Reliability & Phase ---
export function calcReliability(rd: number): number {
  return Math.max(0, Math.min(100, Math.round((1 - rd / 1.5) * 100)));
}

export function determinePDRPhase(matchCount: number, rd: number): string {
  if (matchCount < 5 || rd > 1.1) return 'calibrating';
  if (matchCount < 20 || rd > 0.9) return 'provisional';
  return 'established';
}

// --- Inactivity Decay ---
// If player has not played in the last 30 days, grow their RD
export function applyInactivityDecay(rd: number, sigma: number): number {
  return Math.min(Math.sqrt(rd * rd + sigma * sigma), 1.5);
}

// --- Display helpers ---
export function formatPDR(rating: number | null, phase: string): string {
  if (phase === 'calibrating' || rating == null) return 'NR';
  const formatted = rating.toFixed(2);
  if (phase === 'provisional') return `~${formatted}`;
  return formatted;
}

export function formatPDRChange(change: number): { text: string; color: string } {
  if (change >= 0) return { text: `+${change.toFixed(2)}`, color: 'hsl(175, 84%, 32%)' };
  return { text: change.toFixed(2), color: 'hsl(28, 95%, 55%)' };
}

// --- Score Validation ---
export function isValidSetScore(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || a > 7 || b < 0 || b > 7) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 7 && (lo === 5 || lo === 6)) return true;
  if (hi === 6 && lo <= 4) return true;
  return false;
}

// --- Forecast ---
export function forecastPDR(
  team1Ratings: [number, number],
  team1RDs: [number, number],
  team2Ratings: [number, number],
  team2RDs: [number, number],
  matchCounts?: [number, number, number, number]
) {
  const avgR1 = teamRating(team1Ratings[0], team1Ratings[1]);
  const avgR2 = teamRating(team2Ratings[0], team2Ratings[1]);
  const avgRD1 = teamRD(team1RDs[0], team1RDs[1]);
  const avgRD2 = teamRD(team2RDs[0], team2RDs[1]);

  const e1 = expectedScore(avgR1, avgR2, avgRD2);

  const defaultMC = 20; // default match count for forecast if not provided
  const mc = matchCounts || [defaultMC, defaultMC, defaultMC, defaultMC];

  const t1IfWin = team1Ratings.map((r, i) => {
    const result = updatePDR(r, team1RDs[i], 0.06, mc[i], [{ opponentR: avgR2, opponentRD: avgRD2, sActual: 0.85, weight: 1.0 }]);
    return Math.round((result.r - r) * 100) / 100;
  });
  const t1IfLose = team1Ratings.map((r, i) => {
    const result = updatePDR(r, team1RDs[i], 0.06, mc[i], [{ opponentR: avgR2, opponentRD: avgRD2, sActual: 0.17, weight: 1.0 }]);
    return Math.round((result.r - r) * 100) / 100;
  });
  const t2IfWin = team2Ratings.map((r, i) => {
    const result = updatePDR(r, team2RDs[i], 0.06, mc[i + 2], [{ opponentR: avgR1, opponentRD: avgRD1, sActual: 0.85, weight: 1.0 }]);
    return Math.round((result.r - r) * 100) / 100;
  });
  const t2IfLose = team2Ratings.map((r, i) => {
    const result = updatePDR(r, team2RDs[i], 0.06, mc[i + 2], [{ opponentR: avgR1, opponentRD: avgRD1, sActual: 0.17, weight: 1.0 }]);
    return Math.round((result.r - r) * 100) / 100;
  });

  return {
    team1WinProb: Math.round(e1 * 100),
    team2WinProb: Math.round((1 - e1) * 100),
    team1IfWin: t1IfWin,
    team1IfLose: t1IfLose,
    team2IfWin: t2IfWin,
    team2IfLose: t2IfLose,
  };
}
