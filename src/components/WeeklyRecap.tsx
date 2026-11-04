import { useLiveQuery } from 'dexie-react-hooks'
import { db, getTargetsAsOf } from '../db/db'
import { getMealsForDate } from '../db/foodDb'
import { addDays, ageFromBirthDate, toLocalDateString } from '../lib/date'
import { cardioMinuteContribution } from '../lib/activity'
import { DEFAULT_CARDIO_MIN_WEEK, DEFAULT_STRENGTH_DAYS_WEEK } from '../lib/config'
import { compareToTarget, sumCalories } from '../lib/nutrition'
import { projectFinishLine, daysBetween } from '../lib/finishLine'
import { bmr, tdee } from '../lib/targets'

export default function WeeklyRecap() {
  const isMonday = new Date().getDay() === 1

  const recap = useLiveQuery(async () => {
    if (!isMonday) return undefined
    const profile = await db.profile.get(1)
    if (!profile) return undefined

    // Previous Mon..Sun (today is this Monday, so "last week" ended yesterday).
    const lastWeekEnd = toLocalDateString(addDays(new Date(), -1))
    const lastWeekStart = toLocalDateString(addDays(new Date(), -7))

    let waterHitDays = 0
    let calorieOnTargetDays = 0
    let daysWithData = 0
    for (let i = 1; i <= 7; i++) {
      const date = toLocalDateString(addDays(new Date(), -i))
      const targets = await getTargetsAsOf(date)
      if (!targets) continue
      const waterEntries = await db.water.where('date').equals(date).toArray()
      const waterOz = waterEntries.reduce((s, e) => s + e.oz, 0)
      if (waterOz >= targets.waterOz) waterHitDays++

      const meals = await getMealsForDate(date)
      const items = meals.filter((m) => m.status === 'logged').flatMap((m) => m.items)
      if (items.length > 0) {
        daysWithData++
        if (compareToTarget(sumCalories(items), targets.calories) === 'on-target') calorieOnTargetDays++
      }
    }

    const strengthDaysLastWeek = new Set(
      (await db.strengthSets.toArray()).filter((s) => s.date >= lastWeekStart && s.date <= lastWeekEnd).map((s) => s.date),
    ).size
    const cardioLastWeek = (await db.cardio.toArray()).filter((c) => c.date >= lastWeekStart && c.date <= lastWeekEnd)
    const cardioMinutes = cardioLastWeek.reduce((s, c) => s + cardioMinuteContribution(c.minutes, c.intensity), 0)

    const wins: string[] = []
    const misses: string[] = []

    if (waterHitDays >= 5) wins.push(`Hit your water target ${waterHitDays}/7 days`)
    else misses.push(`Only hit water target ${waterHitDays}/7 days`)

    if (daysWithData > 0) {
      if (calorieOnTargetDays >= 5) wins.push(`On calorie target ${calorieOnTargetDays}/7 days`)
      else misses.push(`On calorie target just ${calorieOnTargetDays}/7 days`)
    }

    if (strengthDaysLastWeek >= DEFAULT_STRENGTH_DAYS_WEEK) wins.push(`Hit your ${DEFAULT_STRENGTH_DAYS_WEEK}-day strength goal`)
    else misses.push(`${strengthDaysLastWeek}/${DEFAULT_STRENGTH_DAYS_WEEK} strength days`)

    if (cardioMinutes >= DEFAULT_CARDIO_MIN_WEEK) wins.push(`${cardioMinutes} cardio minutes — goal hit`)
    else misses.push(`${cardioMinutes}/${DEFAULT_CARDIO_MIN_WEEK} cardio minutes`)

    const weighIns = await db.weighIns.orderBy('date').toArray()
    const tdeeValue = tdee(
      bmr({ weightLb: profile.currentWeightLb, heightIn: profile.heightIn, age: ageFromBirthDate(profile.birthDate), sex: profile.sex }),
      profile.activityLevel,
    )
    const startProjection = projectFinishLine({
      currentWeightLb: weighIns.find((w) => w.date <= lastWeekStart)?.trendWeightLb ?? profile.currentWeightLb,
      goalWeightLb: profile.goalWeightLb,
      weighInCount: weighIns.filter((w) => w.date <= lastWeekStart).length,
      trendPoints: weighIns.filter((w) => w.date <= lastWeekStart).map((w) => ({ date: w.date, trendWeightLb: w.trendWeightLb })),
      tdee: tdeeValue,
      loggedCaloriesByDay: [],
      asOfDate: lastWeekStart,
    })
    const endProjection = projectFinishLine({
      currentWeightLb: weighIns.find((w) => w.date <= lastWeekEnd)?.trendWeightLb ?? profile.currentWeightLb,
      goalWeightLb: profile.goalWeightLb,
      weighInCount: weighIns.filter((w) => w.date <= lastWeekEnd).length,
      trendPoints: weighIns.filter((w) => w.date <= lastWeekEnd).map((w) => ({ date: w.date, trendWeightLb: w.trendWeightLb })),
      tdee: tdeeValue,
      loggedCaloriesByDay: [],
      asOfDate: lastWeekEnd,
    })
    const finishLineDelta =
      startProjection.projectedDate && endProjection.projectedDate
        ? daysBetween(startProjection.projectedDate, endProjection.projectedDate)
        : null

    return { wins, misses, finishLineDelta }
  }, [isMonday])

  if (!isMonday || !recap) return null

  return (
    <div className="rounded-xl border border-emerald-600/40 bg-emerald-500/5 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">Weekly recap</h2>
      <ul className="mb-2 space-y-1 text-sm">
        {recap.wins.map((w, i) => (
          <li key={`win-${i}`} className="text-slate-200">
            ✅ {w}
          </li>
        ))}
        {recap.misses.map((m, i) => (
          <li key={`miss-${i}`} className="text-slate-400">
            ⚪ {m}
          </li>
        ))}
      </ul>
      {recap.finishLineDelta !== null && (
        <p className="text-xs text-slate-400">
          Finish line moved {recap.finishLineDelta > 0 ? `+${recap.finishLineDelta}` : recap.finishLineDelta} days this week.
        </p>
      )}
    </div>
  )
}
