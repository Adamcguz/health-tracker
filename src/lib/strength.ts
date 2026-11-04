export interface SetEntry {
  weightLb: number
  reps: number
}

/** Epley estimated one-rep max, lets different rep schemes be compared. */
export function computeE1RM(weightLb: number, reps: number): number {
  return weightLb * (1 + reps / 30)
}

export function sessionVolume(sets: SetEntry[]): number {
  return sets.reduce((sum, s) => sum + s.weightLb * s.reps, 0)
}

export function sessionTopSetWeight(sets: SetEntry[]): number {
  return sets.reduce((max, s) => Math.max(max, s.weightLb), 0)
}

export function sessionBestE1RM(sets: SetEntry[]): number {
  return sets.reduce((best, s) => Math.max(best, computeE1RM(s.weightLb, s.reps)), 0)
}

export interface SessionSummary {
  date: string
  sets: SetEntry[]
}

export interface PersonalRecord {
  type: 'heaviest-weight-for-reps' | 'best-e1rm'
  reps?: number
  weightLb?: number
  e1RM?: number
}

/**
 * Checks whether the most recent session (the last entry in `history`, which
 * must be sorted oldest to newest) set a PR against every prior session:
 * heaviest weight at a given rep count, or best e1RM overall.
 */
export function detectPRs(history: SessionSummary[]): PersonalRecord[] {
  const latest = history[history.length - 1]
  const prior = history.slice(0, -1)
  const records: PersonalRecord[] = []

  const priorBestE1RM = prior.reduce((best, s) => Math.max(best, sessionBestE1RM(s.sets)), 0)
  const latestBestE1RM = sessionBestE1RM(latest.sets)
  if (latestBestE1RM > priorBestE1RM) {
    records.push({ type: 'best-e1rm', e1RM: latestBestE1RM })
  }

  const latestHeaviestByReps = new Map<number, number>()
  for (const set of latest.sets) {
    latestHeaviestByReps.set(set.reps, Math.max(latestHeaviestByReps.get(set.reps) ?? 0, set.weightLb))
  }

  for (const [reps, weightLb] of latestHeaviestByReps) {
    const priorHeaviestAtReps = prior.reduce((max, s) => {
      const atReps = s.sets.filter((x) => x.reps === reps).reduce((m, x) => Math.max(m, x.weightLb), 0)
      return Math.max(max, atReps)
    }, 0)
    if (weightLb > priorHeaviestAtReps) {
      records.push({ type: 'heaviest-weight-for-reps', reps, weightLb })
    }
  }

  return records
}

/**
 * True when neither top-set weight nor best e1RM has improved over the last
 * `windowSize` sessions (PRD: "flag a stall when an exercise hasn't improved
 * in 3 sessions"). Needs at least windowSize+1 sessions to compare against.
 */
export function detectStall(history: SessionSummary[], windowSize: number = 3): boolean {
  if (history.length < windowSize + 1) return false

  const recent = history.slice(-windowSize)
  const baseline = history[history.length - windowSize - 1]
  const baselineE1RM = sessionBestE1RM(baseline.sets)
  const baselineTopWeight = sessionTopSetWeight(baseline.sets)

  return recent.every((session) => {
    return sessionBestE1RM(session.sets) <= baselineE1RM && sessionTopSetWeight(session.sets) <= baselineTopWeight
  })
}
