import { db } from './db'
import type {
  AnalysisLogEntry,
  CardioEntry,
  FoodLibraryItem,
  MealEntry,
  Profile,
  Routine,
  StepsEntry,
  StrengthSet,
  TargetsRecord,
  WaterEntry,
  WeighIn,
} from './types'

export const BACKUP_VERSION = 1

export interface BackupData {
  version: number
  exportedAt: string
  profile: Profile[]
  targets: TargetsRecord[]
  weighIns: WeighIn[]
  water: WaterEntry[]
  steps: StepsEntry[]
  cardio: CardioEntry[]
  strengthSets: StrengthSet[]
  routines: Routine[]
  meals: MealEntry[]
  foodsLibrary: FoodLibraryItem[]
  analysisLog: AnalysisLogEntry[]
}

export async function exportBackup(): Promise<BackupData> {
  const [profile, targets, weighIns, water, steps, cardio, strengthSets, routines, meals, foodsLibrary, analysisLog] =
    await Promise.all([
      db.profile.toArray(),
      db.targets.toArray(),
      db.weighIns.toArray(),
      db.water.toArray(),
      db.steps.toArray(),
      db.cardio.toArray(),
      db.strengthSets.toArray(),
      db.routines.toArray(),
      db.meals.toArray(),
      db.foodsLibrary.toArray(),
      db.analysisLog.toArray(),
    ])

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    targets,
    weighIns,
    water,
    steps,
    cardio,
    strengthSets,
    routines,
    meals,
    foodsLibrary,
    analysisLog,
  }
}

export function isBackupData(value: unknown): value is BackupData {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const arrayFields = [
    'profile',
    'targets',
    'weighIns',
    'water',
    'steps',
    'cardio',
    'strengthSets',
    'routines',
    'meals',
    'foodsLibrary',
    'analysisLog',
  ]
  return typeof v.version === 'number' && arrayFields.every((f) => Array.isArray(v[f]))
}

/** Replaces all local data with the backup's contents. */
export async function importBackup(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [db.profile, db.targets, db.weighIns, db.water, db.steps, db.cardio, db.strengthSets, db.routines, db.meals, db.foodsLibrary, db.analysisLog],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.targets.clear(),
        db.weighIns.clear(),
        db.water.clear(),
        db.steps.clear(),
        db.cardio.clear(),
        db.strengthSets.clear(),
        db.routines.clear(),
        db.meals.clear(),
        db.foodsLibrary.clear(),
        db.analysisLog.clear(),
      ])
      await Promise.all([
        db.profile.bulkAdd(data.profile),
        db.targets.bulkAdd(data.targets),
        db.weighIns.bulkAdd(data.weighIns),
        db.water.bulkAdd(data.water),
        db.steps.bulkAdd(data.steps),
        db.cardio.bulkAdd(data.cardio),
        db.strengthSets.bulkAdd(data.strengthSets),
        db.routines.bulkAdd(data.routines),
        db.meals.bulkAdd(data.meals),
        db.foodsLibrary.bulkAdd(data.foodsLibrary),
        db.analysisLog.bulkAdd(data.analysisLog),
      ])
    },
  )
}
