import { addDays, toLocalDateString } from './date'

export type CardioIntensity = 'moderate' | 'vigorous'

/** Vigorous minutes count double toward the weekly 150-moderate-minute goal. */
export function cardioMinuteContribution(minutes: number, intensity: CardioIntensity): number {
  return intensity === 'vigorous' ? minutes * 2 : minutes
}

/** The Monday..Sunday week (local dates) containing the given date. */
export function weekRange(date: Date = new Date()): { start: string; end: string } {
  const day = date.getDay() // 0=Sun..6=Sat
  const daysSinceMonday = (day + 6) % 7
  const start = addDays(date, -daysSinceMonday)
  const end = addDays(start, 6)
  return { start: toLocalDateString(start), end: toLocalDateString(end) }
}

export function isDateInRange(date: string, range: { start: string; end: string }): boolean {
  return date >= range.start && date <= range.end
}
