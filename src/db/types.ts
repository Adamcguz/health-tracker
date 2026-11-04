import type { ActivityLevel, FoodGroupServings, Pace, Sex } from '../lib/config'

export interface Profile {
  id: 1 // singleton row
  heightIn: number
  currentWeightLb: number
  birthDate: string // YYYY-MM-DD
  sex: Sex
  activityLevel: ActivityLevel
  goalWeightLb: number
  pace: Pace
  glassOz: number
  stepsTarget: number
  reminderTimes: { breakfast: string; lunch: string; dinner: string; snacks: string }
  createdAt: string
}

export interface TargetsRecord {
  id?: number
  date: string // YYYY-MM-DD, the date these targets took effect
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

export interface WeighIn {
  id?: number
  date: string // YYYY-MM-DD
  weightLb: number
  trendWeightLb: number
}

export interface WaterEntry {
  id?: number
  date: string // YYYY-MM-DD
  timestamp: number // epoch ms, for ordering/undo within a day
  oz: number
}
