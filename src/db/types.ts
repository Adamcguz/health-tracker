import type { ActivityLevel, FoodGroupServings, Pace, Sex } from '../lib/config'
import type { CardioIntensity } from '../lib/activity'

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

export interface StepsEntry {
  id?: number
  date: string // YYYY-MM-DD, one entry per day
  steps: number
}

export interface CardioEntry {
  id?: number
  date: string
  type: string
  minutes: number
  intensity: CardioIntensity
}

export interface StrengthSet {
  id?: number
  date: string
  sessionId: string
  exercise: string
  setIndex: number
  weightLb: number
  reps: number
  e1RM: number
}

export interface Routine {
  id?: number
  name: string
  exercises: string[]
}
