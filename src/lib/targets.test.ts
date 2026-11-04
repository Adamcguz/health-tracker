import { describe, expect, it } from 'vitest'
import {
  addedSugarLimitG,
  bmr,
  calorieTarget,
  clampPaceRateLbPerWeek,
  computeDailyTargets,
  exerciseTargets,
  foodGroupTargets,
  healthyWeightRangeLb,
  heightInToCm,
  maxWeeklyLossLb,
  paceOptions,
  projectedFinishDate,
  proteinTargetG,
  suggestGoalWeightLb,
  tdee,
  waterTargetOz,
  weightLbToKg,
} from './targets'
import { toLocalDateString } from './date'

describe('unit conversions', () => {
  it('converts height inches to cm', () => {
    expect(heightInToCm(70)).toBeCloseTo(177.8, 1)
  })

  it('converts weight lb to kg', () => {
    expect(weightLbToKg(200)).toBeCloseTo(90.718, 2)
  })
})

describe('healthyWeightRangeLb', () => {
  it('computes BMI 18.5-24.9 range for a 70in height', () => {
    const { minLb, maxLb } = healthyWeightRangeLb(70)
    expect(minLb).toBe(129)
    expect(maxLb).toBe(174)
  })
})

describe('suggestGoalWeightLb', () => {
  it('suggests the BMI-22 midpoint weight', () => {
    expect(suggestGoalWeightLb(70)).toBe(Math.round((22 * 70 * 70) / 703))
  })
})

describe('bmr (Mifflin-St Jeor)', () => {
  it('matches the male formula', () => {
    // 200 lb, 70in, 30yo male
    const kg = weightLbToKg(200)
    const cm = heightInToCm(70)
    const expected = 10 * kg + 6.25 * cm - 5 * 30 + 5
    expect(bmr({ weightLb: 200, heightIn: 70, age: 30, sex: 'male' })).toBeCloseTo(expected, 5)
  })

  it('matches the female formula', () => {
    const kg = weightLbToKg(150)
    const cm = heightInToCm(64)
    const expected = 10 * kg + 6.25 * cm - 5 * 28 - 161
    expect(bmr({ weightLb: 150, heightIn: 64, age: 28, sex: 'female' })).toBeCloseTo(expected, 5)
  })

  it('female BMR is lower than an identical male profile (sex constant)', () => {
    const male = bmr({ weightLb: 180, heightIn: 68, age: 35, sex: 'male' })
    const female = bmr({ weightLb: 180, heightIn: 68, age: 35, sex: 'female' })
    expect(male - female).toBeCloseTo(166, 5) // 5 - (-161)
  })
})

describe('tdee', () => {
  it('scales BMR by the activity factor', () => {
    expect(tdee(1500, 'sedentary')).toBeCloseTo(1800, 5)
    expect(tdee(1500, 'moderate')).toBeCloseTo(2325, 5)
    expect(tdee(1500, 'extra_active')).toBeCloseTo(2850, 5)
  })
})

describe('maxWeeklyLossLb', () => {
  it('caps at 1% of body weight', () => {
    expect(maxWeeklyLossLb(150)).toBe(1.5)
  })

  it('caps at 2 lb/week for heavier bodies', () => {
    expect(maxWeeklyLossLb(300)).toBe(2)
  })
})

describe('clampPaceRateLbPerWeek', () => {
  it('leaves slow/steady untouched for an average body weight', () => {
    expect(clampPaceRateLbPerWeek('slow', 200)).toBe(0.5)
    expect(clampPaceRateLbPerWeek('steady', 200)).toBe(1)
  })

  it('clamps aggressive pace for a lighter body (1% cap below 2lb)', () => {
    expect(clampPaceRateLbPerWeek('aggressive', 150)).toBe(1.5)
  })
})

describe('calorieTarget', () => {
  it('subtracts the rate-based deficit from TDEE', () => {
    const result = calorieTarget({ tdee: 2500, rateLbPerWeek: 1, sex: 'male' })
    expect(result.calories).toBe(2000) // 2500 - 500
    expect(result.flooredApplied).toBe(false)
    expect(result.actualRateLbPerWeek).toBe(1)
  })

  it('floors male targets at 1500 kcal and reports the achievable rate', () => {
    const result = calorieTarget({ tdee: 1700, rateLbPerWeek: 1, sex: 'male' })
    expect(result.calories).toBe(1500)
    expect(result.flooredApplied).toBe(true)
    expect(result.actualRateLbPerWeek).toBeCloseTo(0.4, 5) // (1700-1500)*7/3500
  })

  it('floors female targets at 1200 kcal', () => {
    const result = calorieTarget({ tdee: 1600, rateLbPerWeek: 1, sex: 'female' })
    expect(result.calories).toBe(1200)
    expect(result.flooredApplied).toBe(true)
  })

  it('never reports a negative achievable rate when TDEE is already below the floor', () => {
    const result = calorieTarget({ tdee: 1300, rateLbPerWeek: 1, sex: 'male' })
    expect(result.calories).toBe(1500)
    expect(result.actualRateLbPerWeek).toBe(0)
  })
})

describe('proteinTargetG', () => {
  it('is 0.7g per lb of goal weight', () => {
    expect(proteinTargetG(180)).toBe(126)
  })
})

describe('foodGroupTargets', () => {
  it('returns the exact row for a listed calorie level', () => {
    expect(foodGroupTargets(2000)).toEqual({
      fruitCups: 2,
      vegetableCups: 2.5,
      grainsOzEq: 6,
      proteinOzEq: 5.5,
      dairyCups: 3,
    })
  })

  it('rounds to the nearest row for an in-between calorie level', () => {
    // 2090 is closer to 2000 than 2200
    expect(foodGroupTargets(2090).vegetableCups).toBe(2.5)
  })

  it('clamps to the lowest row below the table range', () => {
    expect(foodGroupTargets(1200)).toEqual(foodGroupTargets(1600))
  })

  it('clamps to the highest row above the table range', () => {
    expect(foodGroupTargets(3000)).toEqual(foodGroupTargets(2600))
  })
})

describe('addedSugarLimitG', () => {
  it('is under 10% of calories, at 4 kcal/g', () => {
    expect(addedSugarLimitG(2000)).toBe(50) // 2000*0.1/4
  })
})

describe('exerciseTargets', () => {
  it('defaults to 8000 steps/day, 150 cardio min/week, 3 strength days', () => {
    expect(exerciseTargets()).toEqual({ cardioMinWeek: 150, strengthDaysWeek: 3, stepsDay: 8000 })
  })

  it('honors a custom steps target', () => {
    expect(exerciseTargets(10000).stepsDay).toBe(10000)
  })
})

describe('waterTargetOz', () => {
  it('is half body weight in oz, minimum 64oz', () => {
    expect(waterTargetOz({ weightLb: 200, glassOz: 8 })).toEqual({ oz: 100, glasses: 13 })
    expect(waterTargetOz({ weightLb: 100, glassOz: 8 })).toEqual({ oz: 64, glasses: 8 })
  })

  it('adds 12oz per 30 minutes of same-day exercise', () => {
    expect(waterTargetOz({ weightLb: 200, exerciseMinutesToday: 45, glassOz: 8 }).oz).toBe(112) // 100 + 12 (one 30-min block)
    expect(waterTargetOz({ weightLb: 200, exerciseMinutesToday: 60, glassOz: 8 }).oz).toBe(124) // 100 + 24
  })
})

describe('projectedFinishDate', () => {
  it('projects forward from current to goal weight at the given rate', () => {
    const start = new Date(2026, 0, 1) // Jan 1, 2026
    const date = projectedFinishDate({
      currentWeightLb: 210,
      goalWeightLb: 200,
      rateLbPerWeek: 1,
      startDate: start,
    })
    // 10lb to lose at 1lb/week = 10 weeks = 70 days
    const expected = new Date(2026, 0, 1)
    expected.setDate(expected.getDate() + 70)
    expect(date).toBe(toLocalDateString(expected))
  })

  it('returns today when already at or below goal weight', () => {
    const start = new Date(2026, 0, 1)
    expect(
      projectedFinishDate({ currentWeightLb: 180, goalWeightLb: 180, rateLbPerWeek: 1, startDate: start }),
    ).toBe(toLocalDateString(start))
  })

  it('returns null when the rate cannot move toward the goal', () => {
    expect(
      projectedFinishDate({ currentWeightLb: 210, goalWeightLb: 200, rateLbPerWeek: 0 }),
    ).toBeNull()
  })
})

describe('paceOptions', () => {
  it('returns three options, calories descending as pace gets more aggressive', () => {
    const options = paceOptions({ currentWeightLb: 220, goalWeightLb: 180, tdee: 2800, sex: 'male' })
    expect(options.map((o) => o.pace)).toEqual(['slow', 'steady', 'aggressive'])
    expect(options[0].calories).toBeGreaterThan(options[1].calories)
    expect(options[1].calories).toBeGreaterThan(options[2].calories)
  })

  it('flags the floor and slows the achievable rate for a light, aggressive-pace body', () => {
    const options = paceOptions({ currentWeightLb: 130, goalWeightLb: 115, tdee: 1600, sex: 'female' })
    const aggressive = options.find((o) => o.pace === 'aggressive')!
    expect(aggressive.flooredApplied).toBe(true)
    expect(aggressive.calories).toBe(1200)
  })
})

describe('computeDailyTargets', () => {
  it('orchestrates every formula into one targets object', () => {
    const result = computeDailyTargets({
      currentWeightLb: 220,
      goalWeightLb: 180,
      heightIn: 70,
      age: 32,
      sex: 'male',
      activityLevel: 'moderate',
      pace: 'steady',
      glassOz: 8,
    })
    expect(result.calories).toBeGreaterThanOrEqual(1500)
    expect(result.proteinG).toBe(proteinTargetG(180))
    expect(result.foodGroups).toEqual(foodGroupTargets(result.calories))
    expect(result.waterOz).toBeGreaterThanOrEqual(64)
    expect(result.cardioMinWeek).toBe(150)
    expect(result.strengthDaysWeek).toBe(3)
    expect(result.stepsDay).toBe(8000)
  })

  it('applies the calorie floor for a small, low-activity, aggressive-pace profile', () => {
    const result = computeDailyTargets({
      currentWeightLb: 140,
      goalWeightLb: 120,
      heightIn: 62,
      age: 45,
      sex: 'female',
      activityLevel: 'sedentary',
      pace: 'aggressive',
      glassOz: 8,
    })
    expect(result.calories).toBe(1200)
    expect(result.flooredApplied).toBe(true)
  })
})
