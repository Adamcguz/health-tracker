import type { FoodGroupContribution, MealItem } from '../db/types'

export const ZERO_GROUPS: FoodGroupContribution = {
  fruitCups: 0,
  vegetableCups: 0,
  grainsOzEq: 0,
  grainsWholeOzEq: 0,
  proteinOzEq: 0,
  dairyCups: 0,
}

export function sumGroups(items: MealItem[]): FoodGroupContribution {
  return items.reduce(
    (sum, item) => ({
      fruitCups: sum.fruitCups + item.groups.fruitCups,
      vegetableCups: sum.vegetableCups + item.groups.vegetableCups,
      grainsOzEq: sum.grainsOzEq + item.groups.grainsOzEq,
      grainsWholeOzEq: sum.grainsWholeOzEq + item.groups.grainsWholeOzEq,
      proteinOzEq: sum.proteinOzEq + item.groups.proteinOzEq,
      dairyCups: sum.dairyCups + item.groups.dairyCups,
    }),
    { ...ZERO_GROUPS },
  )
}

export function sumCalories(items: MealItem[]): number {
  return items.reduce((sum, i) => sum + i.kcal, 0)
}

export function sumProtein(items: MealItem[]): number {
  return items.reduce((sum, i) => sum + i.proteinG, 0)
}

export function hasFlag(items: MealItem[], flag: 'added-sugar' | 'high-sodium'): boolean {
  return items.some((i) => i.flags.includes(flag))
}

export type GroupStatus = 'short' | 'on-target' | 'over'

/** Within ±10% of target counts as "on target" (PRD: calorie days judged within ±10%). */
export function compareToTarget(actual: number, target: number, tolerance: number = 0.1): GroupStatus {
  if (target <= 0) return 'on-target'
  if (actual < target * (1 - tolerance)) return 'short'
  if (actual > target * (1 + tolerance)) return 'over'
  return 'on-target'
}

/** The 5 MyPlate groups shared by both meal-item totals and target patterns (targets omit grainsWholeOzEq). */
export interface FoodGroupTotals {
  fruitCups: number
  vegetableCups: number
  grainsOzEq: number
  proteinOzEq: number
  dairyCups: number
}

export interface FoodGroupKey {
  key: keyof FoodGroupTotals
  label: string
}

export const FOOD_GROUP_KEYS: FoodGroupKey[] = [
  { key: 'fruitCups', label: 'Fruit' },
  { key: 'vegetableCups', label: 'Vegetables' },
  { key: 'grainsOzEq', label: 'Grains' },
  { key: 'proteinOzEq', label: 'Protein foods' },
  { key: 'dairyCups', label: 'Dairy' },
]

/** PRD end-of-day takeaways: 2-3 plain-language lines about the biggest misses. */
export function generateTakeaways(params: {
  actualGroups: FoodGroupTotals
  targetGroups: FoodGroupTotals
  caloriesActual: number
  caloriesTarget: number
}): string[] {
  const takeaways: string[] = []

  const calStatus = compareToTarget(params.caloriesActual, params.caloriesTarget)
  if (calStatus === 'over') {
    takeaways.push(
      `Calories were ${Math.round(params.caloriesActual - params.caloriesTarget)} over target today.`,
    )
  } else if (calStatus === 'short') {
    takeaways.push(
      `${Math.round(params.caloriesTarget - params.caloriesActual)} calories under target today.`,
    )
  }

  const shortfalls = FOOD_GROUP_KEYS.map((g) => ({
    ...g,
    actual: params.actualGroups[g.key],
    target: params.targetGroups[g.key],
    deficit: params.targetGroups[g.key] - params.actualGroups[g.key],
  }))
    .filter((g) => g.deficit > 0.1)
    .sort((a, b) => b.deficit - a.deficit)

  for (const g of shortfalls.slice(0, 2)) {
    const unit = g.key === 'grainsOzEq' || g.key === 'proteinOzEq' ? 'oz-eq' : 'cups'
    takeaways.push(`No ${g.label.toLowerCase()} today — you were ${g.deficit.toFixed(1)} ${unit} short.`)
  }

  if (takeaways.length === 0) {
    takeaways.push('Every target was on track today — nice work.')
  }

  return takeaways.slice(0, 3)
}
