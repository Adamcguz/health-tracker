/**
 * 7-day exponential moving average so a salty dinner or water swing doesn't
 * jerk the finish line around (PRD Feature 5).
 */
export function computeTrendWeight(
  previousTrendWeightLb: number | null,
  newWeightLb: number,
  periodDays: number = 7,
): number {
  if (previousTrendWeightLb === null) return newWeightLb
  const alpha = 2 / (periodDays + 1)
  return alpha * newWeightLb + (1 - alpha) * previousTrendWeightLb
}
