import Dexie, { type Table } from 'dexie'
import type { Profile, TargetsRecord } from './types'

export class HealthTrackerDB extends Dexie {
  profile!: Table<Profile, number>
  targets!: Table<TargetsRecord, number>

  constructor() {
    super('health-tracker')
    this.version(1).stores({
      profile: 'id',
      targets: '++id, date',
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

export async function saveTargets(record: Omit<TargetsRecord, 'id'>): Promise<number> {
  return db.targets.add(record as TargetsRecord)
}
