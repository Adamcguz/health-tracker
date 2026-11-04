import { useLiveQuery } from 'dexie-react-hooks'
import PageShell from '../components/PageShell'
import FinishLineTrack from '../components/FinishLineTrack'
import TrendChart from '../components/TrendChart'
import WeeklyRecap from '../components/WeeklyRecap'
import { db, getTargetsAsOf } from '../db/db'
import { getWeekCardio, getWeekSteps } from '../db/activityDb'
import { getExerciseNames, getExerciseSessions, getWeekStrengthDays } from '../db/strengthDb'
import { getDailyCaloriesForRange, getMealsForDate, getTodayMeals } from '../db/foodDb'
import { ageFromBirthDate, toLocalDateString } from '../lib/date'
import { DEFAULT_CARDIO_MIN_WEEK, DEFAULT_STRENGTH_DAYS_WEEK } from '../lib/config'
import { cardioMinuteContribution } from '../lib/activity'
import { bmr, tdee } from '../lib/targets'
import { daysBetween, projectFinishLine } from '../lib/finishLine'
import { FOOD_GROUP_KEYS, compareToTarget, sumCalories, sumGroups, sumProtein } from '../lib/nutrition'
import { detectPRs } from '../lib/strength'

export default function Summary() {
  const data = useLiveQuery(async () => {
    const profile = await db.profile.get(1)
    if (!profile) return undefined

    const today = toLocalDateString(new Date())
    const yesterday = toLocalDateString(new Date(Date.now() - 86_400_000))

    const weighIns = await db.weighIns.orderBy('date').toArray()
    const startWeightLb = weighIns[0]?.weightLb ?? profile.currentWeightLb
    const trendWeightLb = weighIns[weighIns.length - 1]?.trendWeightLb ?? profile.currentWeightLb

    const tdeeValue = tdee(
      bmr({ weightLb: profile.currentWeightLb, heightIn: profile.heightIn, age: ageFromBirthDate(profile.birthDate), sex: profile.sex }),
      profile.activityLevel,
    )
    const last7Calories = await getDailyCaloriesForRange(7)
    const loggedCaloriesByDay = last7Calories.filter((d) => d.calories > 0).map((d) => d.calories)

    const trendPoints = weighIns.map((w) => ({ date: w.date, trendWeightLb: w.trendWeightLb }))

    const todayProjection = projectFinishLine({
      currentWeightLb: trendWeightLb,
      goalWeightLb: profile.goalWeightLb,
      weighInCount: weighIns.length,
      trendPoints,
      tdee: tdeeValue,
      loggedCaloriesByDay,
      asOfDate: today,
    })
    const yesterdayWeighIns = weighIns.filter((w) => w.date <= yesterday)
    const yesterdayProjection = projectFinishLine({
      currentWeightLb: yesterdayWeighIns[yesterdayWeighIns.length - 1]?.trendWeightLb ?? profile.currentWeightLb,
      goalWeightLb: profile.goalWeightLb,
      weighInCount: yesterdayWeighIns.length,
      trendPoints: trendPoints.filter((p) => p.date <= yesterday),
      tdee: tdeeValue,
      loggedCaloriesByDay: last7Calories.filter((d) => d.date <= yesterday && d.calories > 0).map((d) => d.calories),
      asOfDate: yesterday,
    })
    const deltaDays =
      todayProjection.projectedDate && yesterdayProjection.projectedDate
        ? daysBetween(yesterdayProjection.projectedDate, todayProjection.projectedDate)
        : null

    const todayMeals = await getTodayMeals()
    const todayItems = todayMeals.filter((m) => m.status === 'logged').flatMap((m) => m.items)
    const todayTargets = await getTargetsAsOf(today)
    const caloriesEatenToday = sumCalories(todayItems)
    const caloriesLeft = todayTargets ? todayTargets.calories - caloriesEatenToday : null

    const waterEntries = await db.water.where('date').equals(today).toArray()
    const todayWaterOz = waterEntries.reduce((s, e) => s + e.oz, 0)
    const todaySteps = (await db.steps.where('date').equals(today).first())?.steps ?? 0

    const mealSlotStatus = (['breakfast', 'lunch', 'dinner'] as const).map((slot) => todayMeals.find((m) => m.slot === slot)?.status)
    const snackLogged = todayMeals.some((m) => m.slot === 'snack' && m.status === 'logged')
    const loggedDots = [...mealSlotStatus.map((s) => s === 'logged' || s === 'skipped'), snackLogged]

    // Eating progress (last 7 days)
    let daysOnCalorieTarget = 0
    let groupAdherenceSum = 0
    let adherenceDaysCounted = 0
    let proteinSum = 0
    let proteinDaysCounted = 0
    for (let i = 0; i < 7; i++) {
      const date = toLocalDateString(new Date(Date.now() - i * 86_400_000))
      const meals = await getMealsForDate(date)
      const items = meals.filter((m) => m.status === 'logged').flatMap((m) => m.items)
      if (items.length === 0) continue
      const targets = await getTargetsAsOf(date)
      if (!targets) continue
      const cal = sumCalories(items)
      if (compareToTarget(cal, targets.calories) === 'on-target') daysOnCalorieTarget++

      const groups = sumGroups(items)
      const onTargetCount = FOOD_GROUP_KEYS.filter(
        (g) => compareToTarget(groups[g.key], targets.foodGroups[g.key]) !== 'short',
      ).length
      groupAdherenceSum += onTargetCount / FOOD_GROUP_KEYS.length
      adherenceDaysCounted++

      proteinSum += sumProtein(items)
      proteinDaysCounted++
    }
    const groupAdherencePct = adherenceDaysCounted > 0 ? Math.round((groupAdherenceSum / adherenceDaysCounted) * 100) : null
    const proteinAvg = proteinDaysCounted > 0 ? Math.round(proteinSum / proteinDaysCounted) : null

    // Workout progress
    const weekCardio = await getWeekCardio()
    const cardioMinutes = weekCardio.reduce((s, c) => s + cardioMinuteContribution(c.minutes, c.intensity), 0)
    const strengthDays = (await getWeekStrengthDays()).length
    const weekSteps = await getWeekSteps()
    const stepsAvg = weekSteps.length > 0 ? Math.round(weekSteps.reduce((s, e) => s + e.steps, 0) / weekSteps.length) : 0

    const exerciseNames = await getExerciseNames()
    const recentPRs: string[] = []
    for (const name of exerciseNames) {
      const sessions = await getExerciseSessions(name)
      const latest = sessions[sessions.length - 1]
      if (latest && latest.date >= toLocalDateString(new Date(Date.now() - 6 * 86_400_000))) {
        if (detectPRs(sessions).length > 0) recentPRs.push(name)
      }
    }

    return {
      profile,
      startWeightLb,
      trendWeightLb,
      todayProjection,
      deltaDays,
      caloriesLeft,
      todayTargetsCalories: todayTargets?.calories ?? null,
      todayWaterOz,
      todayWaterTargetOz: todayTargets?.waterOz ?? null,
      todaySteps,
      stepsTarget: profile.stepsTarget,
      loggedDots,
      daysOnCalorieTarget,
      groupAdherencePct,
      proteinAvg,
      cardioMinutes,
      strengthDays,
      stepsAvg,
      recentPRs,
    }
  }, [])

  if (!data) {
    return (
      <PageShell title="Summary">
        <p>Loading…</p>
      </PageShell>
    )
  }

  return (
    <PageShell title="Summary">
      <div className="space-y-4">
        <FinishLineTrack
          startWeightLb={data.startWeightLb}
          trendWeightLb={data.trendWeightLb}
          goalWeightLb={data.profile.goalWeightLb}
          plannedDate={data.profile.plannedFinishDate}
          projectedDate={data.todayProjection.projectedDate}
          deltaDays={data.deltaDays}
          reason={data.todayProjection.reason}
        />

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Today at a glance</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Calories left" value={data.caloriesLeft !== null ? `${data.caloriesLeft}` : '—'} />
            <Stat
              label="Water"
              value={data.todayWaterTargetOz !== null ? `${data.todayWaterOz}/${data.todayWaterTargetOz} oz` : `${data.todayWaterOz} oz`}
            />
            <Stat label="Steps" value={`${data.todaySteps.toLocaleString()}/${data.stepsTarget.toLocaleString()}`} />
            <div>
              <div className="text-xs text-slate-500">Meals logged</div>
              <div className="mt-1 flex gap-1">
                {data.loggedDots.map((done, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Eating progress (7 days)</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="On target" value={`${data.daysOnCalorieTarget}/7 days`} />
            <Stat label="Food groups" value={data.groupAdherencePct !== null ? `${data.groupAdherencePct}%` : '—'} />
            <Stat label="Protein avg" value={data.proteinAvg !== null ? `${data.proteinAvg} g` : '—'} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Workout progress (this week)</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Cardio" value={`${data.cardioMinutes}/${DEFAULT_CARDIO_MIN_WEEK} min`} />
            <Stat label="Strength" value={`${data.strengthDays}/${DEFAULT_STRENGTH_DAYS_WEEK} days`} />
            <Stat label="Steps avg" value={data.stepsAvg.toLocaleString()} />
          </div>
          {data.recentPRs.length > 0 && (
            <p className="mt-2 text-xs text-amber-400">🏅 Recent PRs: {data.recentPRs.join(', ')}</p>
          )}
        </div>

        <TrendChart goalWeightLb={data.profile.goalWeightLb} />

        <WeeklyRecap />
      </div>
    </PageShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-100">{value}</div>
    </div>
  )
}
