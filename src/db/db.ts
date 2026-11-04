import Dexie, { type Table } from 'dexie'
import { computeDailyTargets } from '../lib/targets'
import { computeTrendWeight } from '../lib/trend'
import { toLocalDateString } from '../lib/date'
import { ageFromBirthDate } from '../lib/date'
import type {
  CardioEntry,
  Profile,
  Routine,
  StepsEntry,
  StrengthSet,
  TargetsRecord,
  WaterEntry,
  WeighIn,
} from './types'

export class HealthTrackerDB extends Dexie {
  profile!: Table<Profile, number>
  targets!: Table<TargetsRecord, number>
  weighIns!: Table<WeighIn, number>
  water!: Table<WaterEntry, number>
  steps!: Table<StepsEntry, number>
  cardio!: Table<CardioEntry, number>
  strengthSets!: Table<StrengthSet, number>
  routines!: Table<Routine, number>

  constructor() {
    super('health-tracker')
    this.version(1).stores({
      profile: 'id',
      targets: '++id, date',
    })
    this.version(2).stores({
      profile: 'id',
      targets: '++id, date',
      weighIns: '++id, date',
      water: '++id, date, timestamp',
    })
    this.version(3).stores({
      profile: 'id',
      targets: '++id, date',
      weighIns: '++id, date',
      water: '++id, date, timestamp',
      steps: '++id, &date',
      cardio: '++id, date',
      strengthSets: '++id, date, sessionId, exercise',
      routines: '++id, &name',
    })
  }
}

export const db = new HealthTrackerDB()

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get(1)
}

export async function saveProfile(profile: Omit<Profile, 'id'>): Promise<void> {
  await db.profile.put({ ...profile, id: 1 })
}

export async function getLatestTargets(): Promise<TargetsRecord | undefined> {
  return db.targets.orderBy('date').last()
}

/** The targets in effect on a given date (the latest record on or before it). */
export async function getTargetsAsOf(date: string): Promise<TargetsRecord | undefined> {
  return db.targets.where('date').belowOrEqual(date).last()
}

export async function saveTargets(record: Omit<TargetsRecord, 'id'>): Promise<number> {
  return db.targets.add(record as TargetsRecord)
}

export async function logWater(oz: number): Promise<number> {
  const date = toLocalDateString(new Date())
  return db.water.add({ date, timestamp: Date.now(), oz })
}

export async function undoLastWaterEntry(entryId: number): Promise<void> {
  await db.water.delete(entryId)
}

export async function getTodayWaterOz(): Promise<number> {
  const date = toLocalDateString(new Date())
  const entries = await db.water.where('date').equals(date).toArray()
  return entries.reduce((sum, e) => sum + e.oz, 0)
}

/**
 * Records a weigh-in, updates the 7-day trend weight, sets it as the
 * profile's current weight, and recalculates every target from it
 * (PRD Feature 1, item 10: "Recalculate all targets after each weigh-in").
 */
export async function recordWeighIn(weightLb: number): Promise<void> {
  const profile = await getProfile()
  if (!profile) throw new Error('Cannot record a weigh-in before onboarding is complete')

  const lastWeighIn = await db.weighIns.orderBy('date').last()
  const trendWeightLb = computeTrendWeight(lastWeighIn?.trendWeightLb ?? null, weightLb)
  const date = toLocalDateString(new Date())

  await db.weighIns.add({ date, weightLb, trendWeightLb })

  const updatedProfile: Omit<Profile, 'id'> = { ...profile, currentWeightLb: weightLb }
  await saveProfile(updatedProfile)

  const targets = computeDailyTargets({
    currentWeightLb: weightLb,
    goalWeightLb: profile.goalWeightLb,
    heightIn: profile.heightIn,
    age: ageFromBirthDate(profile.birthDate),
    sex: profile.sex,
    activityLevel: profile.activityLevel,
    pace: profile.pace,
    glassOz: profile.glassOz,
    stepsTarget: profile.stepsTarget,
  })
  await saveTargets({ date, ...targets })
}
