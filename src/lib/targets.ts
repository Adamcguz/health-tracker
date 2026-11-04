import {
  ACTIVITY_FACTORS,
  ADDED_SUGAR_PCT_CALORIES_MAX,
  CALORIE_FLOOR,
  DEFAULT_CARDIO_MIN_WEEK,
  DEFAULT_STEPS_TARGET,
  DEFAULT_STRENGTH_DAYS_WEEK,
  FOOD_GROUP_TABLE,
  KCAL_PER_LB,
  MAX_LB_LOSS_PER_WEEK,
  MAX_PCT_BODYWEIGHT_LOSS_PER_WEEK,
  PACE_RATES_LB_PER_WEEK,
  PROTEIN_G_PER_LB_GOAL_WEIGHT,
  SODIUM_MG_MAX,
  WATER_MIN_OZ,
  WATER_OZ_PER_30MIN_EXERCISE,
  WATER_OZ_PER_LB_BODYWEIGHT,
  type ActivityLevel,
  type FoodGroupServings,
  type Pace,
  type Sex,
} from './config'
import { addDays, toLocalDateString } from './date'

export function heightInToCm(heightIn: number): number {
  return heightIn * 2.54
}

export function weightLbToKg(weightLb: number): number {
  return weightLb * 0.45359237
}

/** BMI 18.5-24.9 healthy weight range for a given height, in lb. */
export function healthyWeightRangeLb(heightIn: number): { minLb: number; maxLb: number } {
  const minLb = (18.5 * heightIn * heightIn) / 703
  const maxLb = (24.9 * heightIn * heightIn) / 703
  return { minLb: Math.round(minLb), maxLb: Math.round(maxLb) }
}

/** Suggested goal weight at the midpoint of the healthy BMI range (BMI 22). */
export function suggestGoalWeightLb(heightIn: number): number {
  return Math.round((22 * heightIn * heightIn) / 703)
}

/** Mifflin-St Jeor resting calories. */
export function bmr(params: { weightLb: number; heightIn: number; age: number; sex: Sex }): number {
  const kg = weightLbToKg(params.weightLb)
  const cm = heightInToCm(params.heightIn)
  const sexConstant = params.sex === 'male' ? 5 : -161
  return 10 * kg + 6.25 * cm - 5 * params.age + sexConstant
}

export function tdee(bmrValue: number, activityLevel: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[activityLevel]
}

/** The weekly loss cap: lesser of 1% body weight and 2 lb. */
export function maxWeeklyLossLb(currentWeightLb: number): number {
  return Math.min(MAX_LB_LOSS_PER_WEEK, currentWeightLb * MAX_PCT_BODYWEIGHT_LOSS_PER_WEEK)
}

/** A pace's target rate, capped by the weekly loss guardrail. */
export function clampPaceRateLbPerWeek(pace: Pace, currentWeightLb: number): number {
  return Math.min(PACE_RATES_LB_PER_WEEK[pace], maxWeeklyLossLb(currentWeightLb))
}

export interface CalorieTargetResult {
  calories: number
  /** The rate actually achieved by this target, after the calorie floor (if it applied). */
  actualRateLbPerWeek: number
  flooredApplied: boolean
}

/** Daily calorie target, floored at 1,500 kcal (male) / 1,200 kcal (female). */
export function calorieTarget(params: {
  tdee: number
  rateLbPerWeek: number
  sex: Sex
}): CalorieTargetResult {
  const dailyDeficit = (params.rateLbPerWeek * KCAL_PER_LB) / 7
  const rawTarget = params.tdee - dailyDeficit
  const floor = CALORIE_FLOOR[params.sex]

  if (rawTarget < floor) {
    const actualDailyDeficit = params.tdee - floor
    const actualRateLbPerWeek = Math.max(0, (actualDailyDeficit * 7) / KCAL_PER_LB)
    return { calories: Math.round(floor), actualRateLbPerWeek, flooredApplied: true }
  }

  return { calories: Math.round(rawTarget), actualRateLbPerWeek: params.rateLbPerWeek, flooredApplied: false }
}

export function proteinTargetG(goalWeightLb: number): number {
  return Math.round(goalWeightLb * PROTEIN_G_PER_LB_GOAL_WEIGHT)
}

/** Nearest MyPlate food-group row to the given calorie target. */
export function foodGroupTargets(calories: number): FoodGroupServings {
  let nearest = FOOD_GROUP_TABLE[0]
  let smallestDiff = Math.abs(calories - nearest.calories)
  for (const row of FOOD_GROUP_TABLE) {
    const diff = Math.abs(calories - row.calories)
    if (diff < smallestDiff) {
      nearest = row
      smallestDiff = diff
    }
  }
  return nearest.servings
}

export function addedSugarLimitG(calories: number): number {
  // 4 kcal per gram of sugar.
  return Math.round((calories * ADDED_SUGAR_PCT_CALORIES_MAX) / 4)
}

export function sodiumLimitMg(): number {
  return SODIUM_MG_MAX
}

export interface ExerciseTargets {
  cardioMinWeek: number
  strengthDaysWeek: number
  stepsDay: number
}

export function exerciseTargets(stepsTarget: number = DEFAULT_STEPS_TARGET): ExerciseTargets {
  return {
    cardioMinWeek: DEFAULT_CARDIO_MIN_WEEK,
    strengthDaysWeek: DEFAULT_STRENGTH_DAYS_WEEK,
    stepsDay: stepsTarget,
  }
}

export interface WaterTarget {
  oz: number
  glasses: number
}

export function waterTargetOz(params: {
  weightLb: number
  exerciseMinutesToday?: number
  glassOz: number
}): WaterTarget {
  const base = Math.max(WATER_MIN_OZ, params.weightLb * WATER_OZ_PER_LB_BODYWEIGHT)
  const bonus = Math.floor((params.exerciseMinutesToday ?? 0) / 30) * WATER_OZ_PER_30MIN_EXERCISE
  const oz = base + bonus
  return { oz: Math.round(oz), glasses: Math.ceil(oz / params.glassOz) }
}

/**
 * Projected finish date from a starting weight, goal weight and weekly rate.
 * Returns null when the rate can't move the weight toward the goal.
 */
export function projectedFinishDate(params: {
  currentWeightLb: number
  goalWeightLb: number
  rateLbPerWeek: number
  startDate?: Date
}): string | null {
  const remainingLb = params.currentWeightLb - params.goalWeightLb
  const startDate = params.startDate ?? new Date()

  if (remainingLb <= 0) return toLocalDateString(startDate)
  if (params.rateLbPerWeek <= 0) return null

  const weeksNeeded = remainingLb / params.rateLbPerWeek
  const daysNeeded = Math.ceil(weeksNeeded * 7)
  return toLocalDateString(addDays(startDate, daysNeeded))
}

export interface PaceOption {
  pace: Pace
  rateLbPerWeek: number
  calories: number
  flooredApplied: boolean
  finishDate: string | null
}

/** The three pace cards shown at onboarding, each capped by the loss guardrail and calorie floor. */
export function paceOptions(params: {
  currentWeightLb: number
  goalWeightLb: number
  tdee: number
  sex: Sex
}): PaceOption[] {
  return (['slow', 'steady', 'aggressive'] as Pace[]).map((pace) => {
    const requestedRate = clampPaceRateLbPerWeek(pace, params.currentWeightLb)
    const result = calorieTarget({ tdee: params.tdee, rateLbPerWeek: requestedRate, sex: params.sex })
    const finishDate = projectedFinishDate({
      currentWeightLb: params.currentWeightLb,
      goalWeightLb: params.goalWeightLb,
      rateLbPerWeek: result.actualRateLbPerWeek,
    })
    return {
      pace,
      rateLbPerWeek: result.actualRateLbPerWeek,
      calories: result.calories,
      flooredApplied: result.flooredApplied,
      finishDate,
    }
  })
}

export interface DailyTargets {
  calories: number
  proteinG: number
  foodGroups: FoodGroupServings
  addedSugarLimitG: number
  sodiumLimitMg: number
  waterOz: number
  waterGlasses: number
  cardioMinWeek: number
  strengthDaysWeek: number
  stepsDay: number
  flooredApplied: boolean
}

/** Orchestrates every Feature 1 formula into the full set of daily/weekly targets. */
export function computeDailyTargets(params: {
  currentWeightLb: number
  goalWeightLb: number
  heightIn: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
  pace: Pace
  glassOz: number
  stepsTarget?: number
  exerciseMinutesToday?: number
}): DailyTargets {
  const bmrValue = bmr({
    weightLb: params.currentWeightLb,
    heightIn: params.heightIn,
    age: params.age,
    sex: params.sex,
  })
  const tdeeValue = tdee(bmrValue, params.activityLevel)
  const rate = clampPaceRateLbPerWeek(params.pace, params.currentWeightLb)
  const calorieResult = calorieTarget({ tdee: tdeeValue, rateLbPerWeek: rate, sex: params.sex })
  const water = waterTargetOz({
    weightLb: params.currentWeightLb,
    exerciseMinutesToday: params.exerciseMinutesToday,
    glassOz: params.glassOz,
  })
  const exercise = exerciseTargets(params.stepsTarget)

  return {
    calories: calorieResult.calories,
    proteinG: proteinTargetG(params.goalWeightLb),
    foodGroups: foodGroupTargets(calorieResult.calories),
    addedSugarLimitG: addedSugarLimitG(calorieResult.calories),
    sodiumLimitMg: sodiumLimitMg(),
    waterOz: water.oz,
    waterGlasses: water.glasses,
    cardioMinWeek: exercise.cardioMinWeek,
    strengthDaysWeek: exercise.strengthDaysWeek,
    stepsDay: exercise.stepsDay,
    flooredApplied: calorieResult.flooredApplied,
  }
}
