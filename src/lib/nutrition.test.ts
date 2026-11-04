import { describe, expect, it } from 'vitest'
import type { MealItem } from '../db/types'
import { ZERO_GROUPS, compareToTarget, generateTakeaways, hasFlag, sumCalories, sumGroups, sumProtein } from './nutrition'

function item(overrides: Partial<MealItem> = {}): MealItem {
  return {
    name: 'Test food',
    portion: '1 cup',
    kcal: 100,
    proteinG: 5,
    groups: { ...ZERO_GROUPS },
    flags: [],
    ...overrides,
  }
}

describe('sumCalories / sumProtein', () => {
  it('sums across items', () => {
    const items = [item({ kcal: 100, proteinG: 5 }), item({ kcal: 250, proteinG: 20 })]
    expect(sumCalories(items)).toBe(350)
    expect(sumProtein(items)).toBe(25)
  })
})

describe('sumGroups', () => {
  it('sums each food group field across items', () => {
    const items = [
      item({ groups: { ...ZERO_GROUPS, fruitCups: 1, vegetableCups: 0.5 } }),
      item({ groups: { ...ZERO_GROUPS, fruitCups: 0.5, dairyCups: 1 } }),
    ]
    const total = sumGroups(items)
    expect(total.fruitCups).toBe(1.5)
    expect(total.vegetableCups).toBe(0.5)
    expect(total.dairyCups).toBe(1)
  })
})

describe('hasFlag', () => {
  it('finds a flag across items', () => {
    const items = [item({ flags: [] }), item({ flags: ['high-sodium'] })]
    expect(hasFlag(items, 'high-sodium')).toBe(true)
    expect(hasFlag(items, 'added-sugar')).toBe(false)
  })
})

describe('compareToTarget', () => {
  it('is short below -10%', () => {
    expect(compareToTarget(89, 100)).toBe('short')
  })

  it('is on-target within ±10%', () => {
    expect(compareToTarget(90, 100)).toBe('on-target')
    expect(compareToTarget(100, 100)).toBe('on-target')
    expect(compareToTarget(110, 100)).toBe('on-target')
  })

  it('is over above +10%', () => {
    expect(compareToTarget(111, 100)).toBe('over')
  })
})

describe('generateTakeaways', () => {
  it('praises a fully on-track day', () => {
    const groups = { ...ZERO_GROUPS, fruitCups: 2, vegetableCups: 2.5, grainsOzEq: 6, proteinOzEq: 5.5, dairyCups: 3 }
    const takeaways = generateTakeaways({
      actualGroups: groups,
      targetGroups: groups,
      caloriesActual: 2000,
      caloriesTarget: 2000,
    })
    expect(takeaways).toEqual(['Every target was on track today — nice work.'])
  })

  it('flags an over-calorie day and the biggest group shortfalls', () => {
    const actual = { ...ZERO_GROUPS, vegetableCups: 0, fruitCups: 0.5 }
    const target = { ...ZERO_GROUPS, vegetableCups: 2.5, fruitCups: 2 }
    const takeaways = generateTakeaways({
      actualGroups: actual,
      targetGroups: target,
      caloriesActual: 2700,
      caloriesTarget: 2000,
    })
    expect(takeaways[0]).toContain('700')
    expect(takeaways.some((t) => t.includes('vegetables'))).toBe(true)
    expect(takeaways.length).toBeLessThanOrEqual(3)
  })
})
