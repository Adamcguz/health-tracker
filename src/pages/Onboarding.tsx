import { useMemo, useState } from 'react'
import { ACTIVITY_LEVELS, DEFAULT_GLASS_OZ, DEFAULT_STEPS_TARGET, type ActivityLevel, type Pace, type Sex } from '../lib/config'
import { ageFromBirthDate, toLocalDateString } from '../lib/date'
import { bmr, computeDailyTargets, healthyWeightRangeLb, paceOptions, suggestGoalWeightLb, tdee } from '../lib/targets'
import { saveProfile, saveTargets } from '../db/db'
import type { Profile } from '../db/types'

const DEFAULT_BIRTH_DATE = toLocalDateString(new Date(new Date().getFullYear() - 30, 0, 1))

export default function Onboarding() {
  const [heightIn, setHeightIn] = useState(68)
  const [currentWeightLb, setCurrentWeightLb] = useState(200)
  const [birthDate, setBirthDate] = useState(DEFAULT_BIRTH_DATE)
  const [sex, setSex] = useState<Sex>('male')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [goalWeightLb, setGoalWeightLb] = useState<number | null>(null)
  const [pace, setPace] = useState<Pace>('steady')
  const [saving, setSaving] = useState(false)

  const age = useMemo(() => ageFromBirthDate(birthDate), [birthDate])
  const healthyRange = useMemo(() => healthyWeightRangeLb(heightIn), [heightIn])
  const suggestedGoal = useMemo(() => suggestGoalWeightLb(heightIn), [heightIn])
  const effectiveGoal = goalWeightLb ?? suggestedGoal

  const tdeeValue = useMemo(() => {
    const bmrValue = bmr({ weightLb: currentWeightLb, heightIn, age, sex })
    return tdee(bmrValue, activityLevel)
  }, [currentWeightLb, heightIn, age, sex, activityLevel])

  const options = useMemo(
    () => paceOptions({ currentWeightLb, goalWeightLb: effectiveGoal, tdee: tdeeValue, sex }),
    [currentWeightLb, effectiveGoal, tdeeValue, sex],
  )

  async function handleFinish() {
    setSaving(true)
    const chosenOption = options.find((o) => o.pace === pace)
    const profile: Omit<Profile, 'id'> = {
      heightIn,
      currentWeightLb,
      birthDate,
      sex,
      activityLevel,
      goalWeightLb: effectiveGoal,
      pace,
      glassOz: DEFAULT_GLASS_OZ,
      stepsTarget: DEFAULT_STEPS_TARGET,
      reminderTimes: { breakfast: '09:00', lunch: '13:00', dinner: '19:00', snacks: '22:00' },
      createdAt: toLocalDateString(new Date()),
      plannedFinishDate: chosenOption?.finishDate ?? null,
    }
    await saveProfile(profile)

    const targets = computeDailyTargets({
      currentWeightLb,
      goalWeightLb: effectiveGoal,
      heightIn,
      age,
      sex,
      activityLevel,
      pace,
      glassOz: DEFAULT_GLASS_OZ,
      stepsTarget: DEFAULT_STEPS_TARGET,
    })
    await saveTargets({ date: toLocalDateString(new Date()), ...targets })

    setSaving(false)
  }

  return (
    <div className="min-h-full overflow-y-auto px-4 pb-10 pt-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-50">Let's set your targets</h1>
      <p className="mb-6 text-sm text-slate-400">
        A few stats, then we calculate your calorie, food group, water and exercise targets. These
        are general estimates &mdash; check with a doctor before big diet or training changes.
      </p>

      <div className="space-y-5">
        <Field label="Height (inches)">
          <input
            type="number"
            className="input"
            value={heightIn}
            onChange={(e) => setHeightIn(Number(e.target.value))}
          />
        </Field>

        <Field label="Current weight (lb)">
          <input
            type="number"
            className="input"
            value={currentWeightLb}
            onChange={(e) => setCurrentWeightLb(Number(e.target.value))}
          />
        </Field>

        <Field label="Birth date">
          <input
            type="date"
            className="input"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>

        <Field label="Sex (used in the calorie formula)">
          <div className="flex gap-2">
            {(['male', 'female'] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${
                  sex === s ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Activity level">
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setActivityLevel(level.value)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  activityLevel === level.value
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700'
                }`}
              >
                <div className="font-medium text-slate-100">{level.label}</div>
                <div className="text-xs text-slate-400">{level.description}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Goal weight (lb) — suggested ${suggestedGoal}, healthy range ${healthyRange.minLb}-${healthyRange.maxLb}`}>
          <input
            type="number"
            className="input"
            value={effectiveGoal}
            onChange={(e) => setGoalWeightLb(Number(e.target.value))}
          />
        </Field>

        <Field label="Pace">
          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.pace}
                type="button"
                onClick={() => setPace(option.pace)}
                className={`w-full rounded-lg border px-3 py-3 text-left ${
                  pace === option.pace ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-slate-100">{option.pace}</span>
                  <span className="text-sm text-slate-300">{option.rateLbPerWeek.toFixed(1)} lb/wk</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {option.calories} kcal/day
                  {option.finishDate ? ` · goal date ${option.finishDate}` : ''}
                  {option.flooredApplied ? ' · slowed to protect a safe calorie floor' : ''}
                </div>
              </button>
            ))}
          </div>
        </Field>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleFinish}
        className="mt-8 w-full rounded-lg bg-emerald-500 py-3 font-medium text-slate-950 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save and see my targets'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  )
}
