import { db } from './db'
import { toLocalDateString, addDays } from '../lib/date'
import type { FoodLibraryItem, MealEntry, MealItem, MealSlot, MealStatus } from './types'

export async function getMealsForDate(date: string): Promise<MealEntry[]> {
  return db.meals.where('date').equals(date).sortBy('loggedAt')
}

export async function getTodayMeals(): Promise<MealEntry[]> {
  return getMealsForDate(toLocalDateString(new Date()))
}

/** The single logged/skipped entry for a non-snack slot today, if any. */
export async function getTodaySlotEntry(slot: MealSlot): Promise<MealEntry | undefined> {
  const date = toLocalDateString(new Date())
  return db.meals.where({ date, slot }).first()
}

export async function getYesterdaySlotItems(slot: MealSlot): Promise<MealItem[] | undefined> {
  const yesterday = toLocalDateString(addDays(new Date(), -1))
  const entry = await db.meals.where({ date: yesterday, slot }).first()
  return entry?.status === 'logged' ? entry.items : undefined
}

async function upsertFoodsLibrary(items: MealItem[]): Promise<void> {
  for (const item of items) {
    const existing = await db.foodsLibrary.where('name').equals(item.name).first()
    if (existing) {
      await db.foodsLibrary.update(existing.id!, { timesUsed: existing.timesUsed + 1 })
    } else {
      await db.foodsLibrary.add({
        name: item.name,
        portion: item.portion,
        kcal: item.kcal,
        proteinG: item.proteinG,
        groups: item.groups,
        timesUsed: 1,
      })
    }
  }
}

export async function getFoodsLibrary(): Promise<FoodLibraryItem[]> {
  const all = await db.foodsLibrary.toArray()
  return all.sort((a, b) => b.timesUsed - a.timesUsed)
}

/**
 * Saves a meal entry. With `id`, updates that exact entry (used to edit an
 * existing snack). Otherwise, non-snack slots upsert the single entry for
 * today; snacks add a new entry since several are allowed per day.
 */
export async function saveMeal(params: {
  id?: number
  slot: MealSlot
  rawText: string
  status: MealStatus
  items: MealItem[]
}): Promise<void> {
  const date = toLocalDateString(new Date())
  const entry: MealEntry = {
    date,
    slot: params.slot,
    rawText: params.rawText,
    status: params.status,
    items: params.items,
    loggedAt: Date.now(),
  }

  if (params.id !== undefined) {
    await db.meals.put({ ...entry, id: params.id })
  } else if (params.slot === 'snack') {
    await db.meals.add(entry)
  } else {
    const existing = await db.meals.where({ date, slot: params.slot }).first()
    if (existing) {
      await db.meals.put({ ...entry, id: existing.id })
    } else {
      await db.meals.add(entry)
    }
  }

  if (params.status === 'logged' && params.items.length > 0) {
    await upsertFoodsLibrary(params.items)
  }
}

export async function deleteMeal(id: number): Promise<void> {
  await db.meals.delete(id)
}

export async function logAnalysisCall(): Promise<void> {
  await db.analysisLog.add({ date: toLocalDateString(new Date()) })
}

export async function getMonthAnalysisCount(): Promise<number> {
  const prefix = toLocalDateString(new Date()).slice(0, 7) // YYYY-MM
  const all = await db.analysisLog.toArray()
  return all.filter((e) => e.date.startsWith(prefix)).length
}

/** Calories actually logged ("logged" status only) per day, most recent `days` days including today. */
export async function getDailyCaloriesForRange(days: number): Promise<{ date: string; calories: number }[]> {
  const results: { date: string; calories: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = toLocalDateString(addDays(new Date(), -i))
    const meals = await getMealsForDate(date)
    const calories = meals
      .filter((m) => m.status === 'logged')
      .flatMap((m) => m.items)
      .reduce((sum, item) => sum + item.kcal, 0)
    results.push({ date, calories })
  }
  return results
}
