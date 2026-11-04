import { describe, expect, it } from 'vitest'
import { computeE1RM, detectPRs, detectStall, sessionBestE1RM, sessionTopSetWeight, sessionVolume } from './strength'

describe('computeE1RM (Epley)', () => {
  it('equals the weight itself at 1 rep', () => {
    expect(computeE1RM(225, 1)).toBeCloseTo(225 * (1 + 1 / 30), 5)
  })

  it('increases with more reps at the same weight', () => {
    expect(computeE1RM(100, 10)).toBeGreaterThan(computeE1RM(100, 5))
  })
})

describe('sessionVolume', () => {
  it('sums weight times reps across sets', () => {
    expect(
      sessionVolume([
        { weightLb: 135, reps: 10 },
        { weightLb: 145, reps: 8 },
      ]),
    ).toBe(135 * 10 + 145 * 8)
  })
})

describe('sessionTopSetWeight / sessionBestE1RM', () => {
  it('finds the heaviest set and the best e1RM', () => {
    const sets = [
      { weightLb: 135, reps: 10 },
      { weightLb: 155, reps: 5 },
    ]
    expect(sessionTopSetWeight(sets)).toBe(155)
    expect(sessionBestE1RM(sets)).toBeCloseTo(Math.max(computeE1RM(135, 10), computeE1RM(155, 5)), 5)
  })
})

describe('detectPRs', () => {
  it('flags a best-e1RM PR when the latest session beats every prior one', () => {
    const history = [
      { date: '2026-10-01', sets: [{ weightLb: 100, reps: 10 }] },
      { date: '2026-10-08', sets: [{ weightLb: 110, reps: 10 }] },
    ]
    const records = detectPRs(history)
    expect(records.some((r) => r.type === 'best-e1rm')).toBe(true)
  })

  it('flags a heaviest-weight-for-reps PR at a specific rep count', () => {
    const history = [
      { date: '2026-10-01', sets: [{ weightLb: 185, reps: 5 }] },
      { date: '2026-10-08', sets: [{ weightLb: 195, reps: 5 }] },
    ]
    const records = detectPRs(history)
    expect(records).toContainEqual({ type: 'heaviest-weight-for-reps', reps: 5, weightLb: 195 })
  })

  it('reports no PRs when the latest session is weaker than history', () => {
    const history = [
      { date: '2026-10-01', sets: [{ weightLb: 200, reps: 5 }] },
      { date: '2026-10-08', sets: [{ weightLb: 150, reps: 5 }] },
    ]
    expect(detectPRs(history)).toEqual([])
  })

  it('treats the very first session as a PR (nothing prior to beat)', () => {
    const history = [{ date: '2026-10-01', sets: [{ weightLb: 100, reps: 5 }] }]
    const records = detectPRs(history)
    expect(records.some((r) => r.type === 'best-e1rm')).toBe(true)
  })

  it('dedupes identical sets at the same rep count into a single PR record', () => {
    const history = [
      {
        date: '2026-10-01',
        sets: [
          { weightLb: 135, reps: 10 },
          { weightLb: 135, reps: 10 },
          { weightLb: 135, reps: 10 },
        ],
      },
    ]
    const records = detectPRs(history)
    const weightPRs = records.filter((r) => r.type === 'heaviest-weight-for-reps')
    expect(weightPRs).toHaveLength(1)
    expect(weightPRs[0]).toEqual({ type: 'heaviest-weight-for-reps', reps: 10, weightLb: 135 })
  })
})

describe('detectStall', () => {
  it('is false with fewer than windowSize+1 sessions', () => {
    const history = [
      { date: '1', sets: [{ weightLb: 100, reps: 5 }] },
      { date: '2', sets: [{ weightLb: 100, reps: 5 }] },
      { date: '3', sets: [{ weightLb: 100, reps: 5 }] },
    ]
    expect(detectStall(history)).toBe(false)
  })

  it('flags a stall when 3 sessions in a row fail to beat the baseline', () => {
    const history = [
      { date: '1', sets: [{ weightLb: 100, reps: 5 }] }, // baseline
      { date: '2', sets: [{ weightLb: 95, reps: 5 }] },
      { date: '3', sets: [{ weightLb: 100, reps: 5 }] },
      { date: '4', sets: [{ weightLb: 98, reps: 5 }] },
    ]
    expect(detectStall(history)).toBe(true)
  })

  it('is not a stall when the most recent session improves', () => {
    const history = [
      { date: '1', sets: [{ weightLb: 100, reps: 5 }] },
      { date: '2', sets: [{ weightLb: 95, reps: 5 }] },
      { date: '3', sets: [{ weightLb: 98, reps: 5 }] },
      { date: '4', sets: [{ weightLb: 105, reps: 5 }] },
    ]
    expect(detectStall(history)).toBe(false)
  })
})
