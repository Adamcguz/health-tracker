import { useLiveQuery } from 'dexie-react-hooks'
import { db, getTargetsAsOf } from '../db/db'
import { getMealsForDate } from '../db/foodDb'
import { addDays, toLocalDateString } from '../lib/date'
import {
  FOOD_GROUP_KEYS,
  compareToTarget,
  generateTakeaways,
  hasFlag,
  sumCalories,
  sumGroups,
  sumProtein,
} from '../lib/nutrition'
import type { MealItem } from '../db/types'

async function loggedItemsForDate(date: string): Promise<MealItem[]> {
  const meals = await getMealsForDate(date)
  return meals.filter((m) => m.status === 'logged').flatMap((m) => m.items)
}

export default function EndOfDayReport() {
  const today = toLocalDateString(new Date())
  const profile = useLiveQuery(() => db.profile.get(1))

  const report = useLiveQuery(async () => {
    const targets = await getTargetsAsOf(today)
    if (!targets) return undefined
    const items = await loggedItemsForDate(today)
    const actualGroups = sumGroups(items)
    const caloriesActual = sumCalories(items)
    const proteinActual = sumProtein(items)
    const takeaways = generateTakeaways({
      actualGroups,
      targetGroups: targets.foodGroups,
      caloriesActual,
      caloriesTarget: targets.calories,
    })
    return {
      targets,
      actualGroups,
      caloriesActual,
      proteinActual,
      addedSugar: hasFlag(items, 'added-sugar'),
      highSodium: hasFlag(items, 'high-sodium'),
      takeaways,
    }
  }, [today])

  const weekShortfalls = useLiveQuery(async () => {
    const counts: Record<string, number> = {}
    for (const g of FOOD_GROUP_KEYS) counts[g.key] = 0
    for (let i = 0; i < 7; i++) {
      const date = toLocalDateString(addDays(new Date(), -i))
      const targets = await getTargetsAsOf(date)
      if (!targets) continue
      const items = await loggedItemsForDate(date)
      const actual = sumGroups(items)
      for (const g of FOOD_GROUP_KEYS) {
        if (compareToTarget(actual[g.key], targets.foodGroups[g.key]) === 'short') {
          counts[g.key]++
        }
      }
    }
    return counts
  }, [today])

  if (!profile || !report) return null

  const calStatus = compareToTarget(report.caloriesActual, report.targets.calories)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Today's report</h2>

      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm text-slate-300">Calories</span>
        <span className={`text-sm font-medium ${calStatus === 'over' ? 'text-amber-400' : 'text-slate-100'}`}>
          {report.caloriesActual} / {report.targets.calories} kcal
        </span>
      </div>

      <div className="mb-3 space-y-1">
        {FOOD_GROUP_KEYS.map((g) => {
          const status = compareToTarget(report.actualGroups[g.key], report.targets.foodGroups[g.key])
          return (
            <div key={g.key} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{g.label}</span>
              <span
                className={
                  status === 'short' ? 'text-amber-400' : status === 'over' ? 'text-sky-400' : 'text-emerald-400'
                }
              >
                {status === 'short' ? 'Short' : status === 'over' ? 'Over' : 'On target'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-400">Protein</span>
        <span className="text-slate-100">
          {report.proteinActual.toFixed(0)} / {report.targets.proteinG} g
        </span>
      </div>

      {(report.addedSugar || report.highSodium) && (
        <p className="mb-3 text-xs text-amber-400">
          {report.addedSugar ? 'Added sugar flagged. ' : ''}
          {report.highSodium ? 'High sodium flagged.' : ''}
        </p>
      )}

      <ul className="mb-4 space-y-1 text-sm text-slate-300">
        {report.takeaways.map((t, i) => (
          <li key={i}>• {t}</li>
        ))}
      </ul>

      {weekShortfalls && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Most often short, last 7 days
          </h3>
          <div className="space-y-1">
            {FOOD_GROUP_KEYS.filter((g) => weekShortfalls[g.key] > 0)
              .sort((a, b) => weekShortfalls[b.key] - weekShortfalls[a.key])
              .map((g) => (
                <div key={g.key} className="flex justify-between text-xs text-slate-400">
                  <span>{g.label}</span>
                  <span>{weekShortfalls[g.key]}/7 days</span>
                </div>
              ))}
            {FOOD_GROUP_KEYS.every((g) => weekShortfalls[g.key] === 0) && (
              <p className="text-xs text-slate-500">No recurring shortfalls this week.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
