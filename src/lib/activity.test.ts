import { describe, expect, it } from 'vitest'
import { cardioMinuteContribution, isDateInRange, weekRange } from './activity'

describe('cardioMinuteContribution', () => {
  it('counts moderate minutes 1:1', () => {
    expect(cardioMinuteContribution(30, 'moderate')).toBe(30)
  })

  it('counts vigorous minutes double', () => {
    expect(cardioMinuteContribution(30, 'vigorous')).toBe(60)
  })
})

describe('weekRange', () => {
  it('returns Monday..Sunday for a mid-week date', () => {
    // Wed, 2026-11-04
    const { start, end } = weekRange(new Date(2026, 10, 4))
    expect(start).toBe('2026-11-02') // Monday
    expect(end).toBe('2026-11-08') // Sunday
  })

  it('returns the same week for the Monday itself', () => {
    const { start, end } = weekRange(new Date(2026, 10, 2))
    expect(start).toBe('2026-11-02')
    expect(end).toBe('2026-11-08')
  })

  it('returns the same week for the Sunday itself', () => {
    const { start, end } = weekRange(new Date(2026, 10, 8))
    expect(start).toBe('2026-11-02')
    expect(end).toBe('2026-11-08')
  })
})

describe('isDateInRange', () => {
  it('includes both endpoints', () => {
    const range = { start: '2026-11-02', end: '2026-11-08' }
    expect(isDateInRange('2026-11-02', range)).toBe(true)
    expect(isDateInRange('2026-11-08', range)).toBe(true)
    expect(isDateInRange('2026-11-05', range)).toBe(true)
    expect(isDateInRange('2026-11-09', range)).toBe(false)
    expect(isDateInRange('2026-11-01', range)).toBe(false)
  })
})
