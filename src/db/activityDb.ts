import { db } from './db'
import { toLocalDateString } from '../lib/date'
import { isDateInRange, weekRange, type CardioIntensity } from '../lib/activity'

export async function logSteps(steps: number, date: string = toLocalDateString(new Date())): Promise<void> {
  const existing = await db.steps.where('date').equals(date).first()
  if (existing) {
    await db.steps.update(existing.id!, { steps })
  } else {
    await db.steps.add({ date, steps })
  }
}

export async function getStepsForDate(date: string): Promise<number> {
  const entry = await db.steps.where('date').equals(date).first()
  return entry?.steps ?? 0
}

export async function logCardio(type: string, minutes: number, intensity: CardioIntensity): Promise<void> {
  await db.cardio.add({ date: toLocalDateString(new Date()), type, minutes, intensity })
}

export async function getWeekSteps(): Promise<{ date: string; steps: number }[]> {
  const range = weekRange()
  const all = await db.steps.toArray()
  return all.filter((e) => isDateInRange(e.date, range)).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getWeekCardio(): Promise<{ date: string; type: string; minutes: number; intensity: CardioIntensity }[]> {
  const range = weekRange()
  const all = await db.cardio.toArray()
  return all.filter((e) => isDateInRange(e.date, range))
}
