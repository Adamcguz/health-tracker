export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'
export type Pace = 'slow' | 'steady' | 'aggressive'

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'very_active', label: 'Very active', description: 'Hard exercise 6-7 days/week' },
  { value: 'extra_active', label: 'Extra active', description: 'Very hard exercise or physical job' },
]

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
}

export const CALORIE_FLOOR: Record<Sex, number> = {
  male: 1500,
  female: 1200,
}

export const KCAL_PER_LB = 3500

export const PACE_RATES_LB_PER_WEEK: Record<Pace, number> = {
  slow: 0.5,
  steady: 1,
  aggressive: 2,
}

export const PACE_LABELS: Record<Pace, string> = {
  slow: 'Slow & steady',
  steady: 'Steady (recommended)',
  aggressive: 'Aggressive',
}

export const MAX_PCT_BODYWEIGHT_LOSS_PER_WEEK = 0.01
export const MAX_LB_LOSS_PER_WEEK = 2

export const PROTEIN_G_PER_LB_GOAL_WEIGHT = 0.7

export const WATER_OZ_PER_LB_BODYWEIGHT = 0.5
export const WATER_MIN_OZ = 64
export const WATER_OZ_PER_30MIN_EXERCISE = 12
export const DEFAULT_GLASS_OZ = 8

export const DEFAULT_STEPS_TARGET = 8000
export const DEFAULT_CARDIO_MIN_WEEK = 150
export const DEFAULT_STRENGTH_DAYS_WEEK = 3

export const ADDED_SUGAR_PCT_CALORIES_MAX = 0.1
export const SODIUM_MG_MAX = 2300

export interface FoodGroupServings {
  fruitCups: number
  vegetableCups: number
  grainsOzEq: number
  proteinOzEq: number
  dairyCups: number
}

/**
 * USDA MyPlate daily food group patterns by calorie level (2020-2025 Dietary
 * Guidelines). Verified against myplate.gov-sourced worksheets for the 1,600
 * and 2,400 calorie rows on 2026-11-04.
 */
export const FOOD_GROUP_TABLE: { calories: number; servings: FoodGroupServings }[] = [
  { calories: 1600, servings: { fruitCups: 1.5, vegetableCups: 2, grainsOzEq: 5, proteinOzEq: 5, dairyCups: 3 } },
  { calories: 1800, servings: { fruitCups: 1.5, vegetableCups: 2.5, grainsOzEq: 6, proteinOzEq: 5, dairyCups: 3 } },
  { calories: 2000, servings: { fruitCups: 2, vegetableCups: 2.5, grainsOzEq: 6, proteinOzEq: 5.5, dairyCups: 3 } },
  { calories: 2200, servings: { fruitCups: 2, vegetableCups: 3, grainsOzEq: 7, proteinOzEq: 6, dairyCups: 3 } },
  { calories: 2400, servings: { fruitCups: 2, vegetableCups: 3, grainsOzEq: 8, proteinOzEq: 6.5, dairyCups: 3 } },
  { calories: 2600, servings: { fruitCups: 2, vegetableCups: 3.5, grainsOzEq: 9, proteinOzEq: 6.5, dairyCups: 3 } },
]
