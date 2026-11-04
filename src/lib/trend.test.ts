import { describe, expect, it } from 'vitest'
import { computeTrendWeight } from './trend'

describe('computeTrendWeight', () => {
  it('seeds the trend at the first weigh-in', () => {
    expect(computeTrendWeight(null, 200)).toBe(200)
  })

  it('applies the standard 7-day EMA alpha (0.25)', () => {
    // alpha = 2/(7+1) = 0.25
    expect(computeTrendWeight(200, 196)).toBeCloseTo(199, 5) // 0.25*196 + 0.75*200
  })

  it('smooths a one-day spike toward the prior trend rather than jumping to it', () => {
    const trend = computeTrendWeight(190, 195)
    expect(trend).toBeGreaterThan(190)
    expect(trend).toBeLessThan(195)
  })

  it('converges toward a constant actual weight over repeated entries', () => {
    let trend: number | null = null
    for (let i = 0; i < 30; i++) {
      trend = computeTrendWeight(trend, 180)
    }
    expect(trend).toBeCloseTo(180, 5)
  })
})
