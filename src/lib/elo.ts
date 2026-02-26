const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRating(current: number, actual: number, expected: number): number {
  return Math.round(current + K * (actual - expected));
}

export function calculateDoubles(
  team1Ratings: [number, number],
  team2Ratings: [number, number],
  team1Won: boolean
) {
  const avgT1 = (team1Ratings[0] + team1Ratings[1]) / 2;
  const avgT2 = (team2Ratings[0] + team2Ratings[1]) / 2;

  const e1 = expectedScore(avgT1, avgT2);
  const e2 = expectedScore(avgT2, avgT1);

  const actual1 = team1Won ? 1 : 0;
  const actual2 = team1Won ? 0 : 1;

  return {
    team1: team1Ratings.map((r) => ({
      old: r,
      new: newRating(r, actual1, e1),
      change: newRating(r, actual1, e1) - r,
    })),
    team2: team2Ratings.map((r) => ({
      old: r,
      new: newRating(r, actual2, e2),
      change: newRating(r, actual2, e2) - r,
    })),
    team1WinProb: e1,
    team2WinProb: e2,
  };
}

export function forecastDoubles(
  team1Ratings: [number, number],
  team2Ratings: [number, number]
) {
  const avgT1 = (team1Ratings[0] + team1Ratings[1]) / 2;
  const avgT2 = (team2Ratings[0] + team2Ratings[1]) / 2;

  const e1 = expectedScore(avgT1, avgT2);
  const e2 = expectedScore(avgT2, avgT1);

  const t1WinChanges = team1Ratings.map((r) => newRating(r, 1, e1) - r);
  const t1LoseChanges = team1Ratings.map((r) => newRating(r, 0, e1) - r);
  const t2WinChanges = team2Ratings.map((r) => newRating(r, 1, e2) - r);
  const t2LoseChanges = team2Ratings.map((r) => newRating(r, 0, e2) - r);

  return {
    team1WinProb: Math.round(e1 * 100),
    team2WinProb: Math.round(e2 * 100),
    team1IfWin: t1WinChanges,
    team1IfLose: t1LoseChanges,
    team2IfWin: t2WinChanges,
    team2IfLose: t2LoseChanges,
  };
}
