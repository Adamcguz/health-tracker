/** Local YYYY-MM-DD so a "day" always means the device's local day, never UTC. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function ageFromBirthDate(birthDate: string, asOf: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = asOf.getFullYear() - y
  const hasHadBirthdayThisYear =
    asOf.getMonth() + 1 > m || (asOf.getMonth() + 1 === m && asOf.getDate() >= d)
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}
