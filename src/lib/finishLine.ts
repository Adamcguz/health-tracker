import { projectedFinishDate } from './targets'
import { toLocalDateString } from './date'

export interface TrendPoint {
  date: string
  trendWeightLb: number
}

/** 3x/week weigh-in cadence × 3 weeks, per the PRD's "under 3 weeks of weigh-ins" threshold. */
export const EARLY_STAGE_WEIGH_IN_THRESHOLD = 9
export const TREND_SLOPE_WINDOW_DAYS = 21
export const FLAT_TREND_WINDOW_DAYS = 14

/** Least-squares slope in lb/day. Positive means weight is rising. */
export function linearSlopeLbPerDay(points: TrendPoint[]): number | null {
  if (points.length < 2) return null

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const t0 = Date.parse(sorted[0].date)
  const xs = sorted.map((p) => (Date.parse(p.date) - t0) / 86_400_000) // days since first point
  const ys = sorted.map((p) => p.trendWeightLb)

  const n = xs.length
  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY)
    denominator += (xs[i] - meanX) ** 2
  }

  if (denominator === 0) return 0
  return numerator / denominator
}

export function pointsWithinWindow(points: TrendPoint[], asOfDate: string, windowDays: number): TrendPoint[] {
  const asOf = Date.parse(asOfDate)
  const cutoff = asOf - windowDays * 86_400_000
  return points.filter((p) => {
    const t = Date.parse(p.date)
    return t <= asOf && t >= cutoff
  })
}

/** lb/week rate of loss from the trend-weight slope over the trailing window (positive = losing). */
export function trendSlopeRateLbPerWeek(points: TrendPoint[], asOfDate: string): number | null {
  const windowed = pointsWithinWindow(points, asOfDate, TREND_SLOPE_WINDOW_DAYS)
  const slopePerDay = linearSlopeLbPerDay(windowed)
  if (slopePerDay === null) return null
  return -slopePerDay * 7
}

export function averageDailyDeficit(params: { tdee: number; loggedCaloriesByDay: number[] }): number | null {
  if (params.loggedCaloriesByDay.length === 0) return null
  const avgEaten = params.loggedCaloriesByDay.reduce((s, c) => s + c, 0) / params.loggedCaloriesByDay.length
  return params.tdee - avgEaten
}

export type ProjectionMethod = 'calorie-estimate' | 'trend-slope' | 'no-projection'

export interface FinishLineResult {
  method: ProjectionMethod
  projectedDate: string | null
  rateLbPerWeek: number | null
  reason: string
}

export function projectFinishLine(params: {
  currentWeightLb: number
  goalWeightLb: number
  weighInCount: number
  trendPoints: TrendPoint[]
  tdee: number
  loggedCaloriesByDay: number[]
  asOfDate?: string
}): FinishLineResult {
  const asOfDate = params.asOfDate ?? toLocalDateString(new Date())

  if (params.weighInCount < EARLY_STAGE_WEIGH_IN_THRESHOLD) {
    const deficit = averageDailyDeficit({ tdee: params.tdee, loggedCaloriesByDay: params.loggedCaloriesByDay })
    if (deficit === null) {
      return { method: 'no-projection', projectedDate: null, rateLbPerWeek: null, reason: 'No calories logged yet' }
    }
    const rateLbPerWeek = (deficit * 7) / 3500
    if (rateLbPerWeek <= 0) {
      return {
        method: 'no-projection',
        projectedDate: null,
        rateLbPerWeek,
        reason: 'Average calories logged are at or above maintenance',
      }
    }
    return {
      method: 'calorie-estimate',
      projectedDate: projectedFinishDate({
        currentWeightLb: params.currentWeightLb,
        goalWeightLb: params.goalWeightLb,
        rateLbPerWeek,
        startDate: new Date(asOfDate),
      }),
      rateLbPerWeek,
      reason: `Estimated from logged calories: ${rateLbPerWeek.toFixed(1)} lb/week`,
    }
  }

  const rateLbPerWeek = trendSlopeRateLbPerWeek(params.trendPoints, asOfDate)
  if (rateLbPerWeek === null) {
    return { method: 'no-projection', projectedDate: null, rateLbPerWeek: null, reason: 'Not enough weigh-in data yet' }
  }
  if (rateLbPerWeek <= 0) {
    return {
      method: 'no-projection',
      projectedDate: null,
      rateLbPerWeek,
      reason: `Trend weight has been flat or rising over the last ${FLAT_TREND_WINDOW_DAYS} days`,
    }
  }
  return {
    method: 'trend-slope',
    projectedDate: projectedFinishDate({
      currentWeightLb: params.currentWeightLb,
      goalWeightLb: params.goalWeightLb,
      rateLbPerWeek,
      startDate: new Date(asOfDate),
    }),
    rateLbPerWeek,
    reason: `From your trend-weight slope: ${rateLbPerWeek.toFixed(1)} lb/week`,
  }
}

export function daysBetween(dateA: string, dateB: string): number {
  return Math.round((Date.parse(dateB) - Date.parse(dateA)) / 86_400_000)
}
