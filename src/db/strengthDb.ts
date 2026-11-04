import { db } from './db'
import { toLocalDateString } from '../lib/date'
import { computeE1RM, type SessionSummary } from '../lib/strength'
import { isDateInRange, weekRange } from '../lib/activity'
import type { StrengthSet } from './types'

export interface SetInput {
  weightLb: number
  reps: number
}

function newSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function logStrengthSession(exercise: string, sets: SetInput[]): Promise<void> {
  const date = toLocalDateString(new Date())
  const sessionId = newSessionId()
  const rows: StrengthSet[] = sets.map((s, i) => ({
    date,
    sessionId,
    exercise,
    setIndex: i,
    weightLb: s.weightLb,
    reps: s.reps,
    e1RM: computeE1RM(s.weightLb, s.reps),
  }))
  await db.strengthSets.bulkAdd(rows)
}

/** All logged exercise names, most recently used first. */
export async function getExerciseNames(): Promise<string[]> {
  const all = await db.strengthSets.orderBy('date').reverse().toArray()
  const seen = new Set<string>()
  const names: string[] = []
  for (const s of all) {
    if (!seen.has(s.exercise)) {
      seen.add(s.exercise)
      names.push(s.exercise)
    }
  }
  return names
}

/** Every session for an exercise, grouped by sessionId, oldest first. */
export async function getExerciseSessions(exercise: string): Promise<SessionSummary[]> {
  const rows = await db.strengthSets.where('exercise').equals(exercise).sortBy('setIndex')
  const bySession = new Map<string, StrengthSet[]>()
  for (const row of rows) {
    const group = bySession.get(row.sessionId) ?? []
    group.push(row)
    bySession.set(row.sessionId, group)
  }
  return Array.from(bySession.values())
    .map((group) => ({
      date: group[0].date,
      sets: group.map((s) => ({ weightLb: s.weightLb, reps: s.reps })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getLastSession(exercise: string): Promise<SetInput[] | undefined> {
  const sessions = await getExerciseSessions(exercise)
  return sessions.length > 0 ? sessions[sessions.length - 1].sets : undefined
}

export async function getWeekStrengthDays(): Promise<string[]> {
  const range = weekRange()
  const all = await db.strengthSets.toArray()
  const days = new Set(all.filter((s) => isDateInRange(s.date, range)).map((s) => s.date))
  return Array.from(days).sort()
}

export async function saveRoutine(name: string, exercises: string[]): Promise<void> {
  const existing = await db.routines.where('name').equals(name).first()
  if (existing) {
    await db.routines.update(existing.id!, { exercises })
  } else {
    await db.routines.add({ name, exercises })
  }
}

export async function getRoutines() {
  return db.routines.toArray()
}

export async function deleteRoutine(id: number): Promise<void> {
  await db.routines.delete(id)
}
