import { describe, expect, it } from 'vitest'
import {
  averageDailyDeficit,
  daysBetween,
  linearSlopeLbPerDay,
  projectFinishLine,
  trendSlopeRateLbPerWeek,
  type TrendPoint,
} from './finishLine'

describe('linearSlopeLbPerDay', () => {
  it('returns null with fewer than 2 points', () => {
    expect(linearSlopeLbPerDay([{ date: '2026-01-01', trendWeightLb: 200 }])).toBeNull()
  })

  it('computes a clean downward slope', () => {
    const points: TrendPoint[] = [
      { date: '2026-01-01', trendWeightLb: 200 },
      { date: '2026-01-08', trendWeightLb: 198 },
      { date: '2026-01-15', trendWeightLb: 196 },
    ]
    // Losing 2lb every 7 days = -2/7 lb/day
    expect(linearSlopeLbPerDay(points)).toBeCloseTo(-2 / 7, 5)
  })

  it('is near zero for a flat trend', () => {
    const points: TrendPoint[] = [
      { date: '2026-01-01', trendWeightLb: 200 },
      { date: '2026-01-08', trendWeightLb: 200.1 },
      { date: '2026-01-15', trendWeightLb: 199.9 },
    ]
    expect(linearSlopeLbPerDay(points)).toBeCloseTo(0, 1)
  })
})

describe('trendSlopeRateLbPerWeek', () => {
  it('converts a downward slope to a positive lb/week loss rate', () => {
    const points: TrendPoint[] = [
      { date: '2026-01-01', trendWeightLb: 200 },
      { date: '2026-01-21', trendWeightLb: 196 },
    ]
    const rate = trendSlopeRateLbPerWeek(points, '2026-01-21')
    expect(rate).toBeCloseTo((4 / 20) * 7, 5)
  })

  it('ignores points outside the trailing window', () => {
    const points: TrendPoint[] = [
      { date: '2025-01-01', trendWeightLb: 300 }, // ancient outlier
      { date: '2026-01-01', trendWeightLb: 200 },
      { date: '2026-01-21', trendWeightLb: 196 },
    ]
    const rate = trendSlopeRateLbPerWeek(points, '2026-01-21')
    expect(rate).toBeCloseTo((4 / 20) * 7, 5)
  })
})

describe('averageDailyDeficit', () => {
  it('averages tdee minus eaten calories across logged days', () => {
    expect(averageDailyDeficit({ tdee: 2500, loggedCaloriesByDay: [2000, 2200] })).toBe(2500 - 2100)
  })

  it('returns null with no logged days', () => {
    expect(averageDailyDeficit({ tdee: 2500, loggedCaloriesByDay: [] })).toBeNull()
  })
})

describe('projectFinishLine', () => {
  it('uses the calorie-estimate method under the weigh-in threshold', () => {
    const result = projectFinishLine({
      currentWeightLb: 220,
      goalWeightLb: 180,
      weighInCount: 2,
      trendPoints: [],
      tdee: 2800,
      loggedCaloriesByDay: [2300, 2300, 2300],
      asOfDate: '2026-01-01',
    })
    expect(result.method).toBe('calorie-estimate')
    expect(result.projectedDate).not.toBeNull()
    expect(result.rateLbPerWeek).toBeCloseTo((500 * 7) / 3500, 5)
  })

  it('reports no-projection when no calories are logged early on', () => {
    const result = projectFinishLine({
      currentWeightLb: 220,
      goalWeightLb: 180,
      weighInCount: 1,
      trendPoints: [],
      tdee: 2800,
      loggedCaloriesByDay: [],
      asOfDate: '2026-01-01',
    })
    expect(result.method).toBe('no-projection')
    expect(result.projectedDate).toBeNull()
  })

  it('switches to the trend-slope method at/above the weigh-in threshold', () => {
    const trendPoints: TrendPoint[] = [
      { date: '2025-12-11', trendWeightLb: 220 },
      { date: '2026-01-01', trendWeightLb: 214 },
    ]
    const result = projectFinishLine({
      currentWeightLb: 214,
      goalWeightLb: 180,
      weighInCount: 9,
      trendPoints,
      tdee: 2800,
      loggedCaloriesByDay: [2300],
      asOfDate: '2026-01-01',
    })
    expect(result.method).toBe('trend-slope')
    expect(result.rateLbPerWeek).toBeGreaterThan(0)
  })

  it('reports no-projection when the trend is flat or rising', () => {
    const trendPoints: TrendPoint[] = [
      { date: '2025-12-11', trendWeightLb: 214 },
      { date: '2026-01-01', trendWeightLb: 215 },
    ]
    const result = projectFinishLine({
      currentWeightLb: 215,
      goalWeightLb: 180,
      weighInCount: 9,
      trendPoints,
      tdee: 2800,
      loggedCaloriesByDay: [],
      asOfDate: '2026-01-01',
    })
    expect(result.method).toBe('no-projection')
    expect(result.reason).toContain('flat or rising')
  })
})

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-05')).toBe(4)
    expect(daysBetween('2026-01-05', '2026-01-01')).toBe(-4)
  })
})
