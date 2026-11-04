import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import PageShell from '../components/PageShell'
import { db, saveProfile, saveTargets } from '../db/db'
import { ACTIVITY_LEVELS, type ActivityLevel, type Pace, type Sex } from '../lib/config'
import { ageFromBirthDate, toLocalDateString } from '../lib/date'
import { computeDailyTargets } from '../lib/targets'

export default function Settings() {
  const profile = useLiveQuery(() => db.profile.get(1))

  const [heightIn, setHeightIn] = useState(0)
  const [currentWeightLb, setCurrentWeightLb] = useState(0)
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [goalWeightLb, setGoalWeightLb] = useState(0)
  const [pace, setPace] = useState<Pace>('steady')
  const [glassOz, setGlassOz] = useState(8)
  const [stepsTarget, setStepsTarget] = useState(8000)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (!profile) return
    setHeightIn(profile.heightIn)
    setCurrentWeightLb(profile.currentWeightLb)
    setBirthDate(profile.birthDate)
    setSex(profile.sex)
    setActivityLevel(profile.activityLevel)
    setGoalWeightLb(profile.goalWeightLb)
    setPace(profile.pace)
    setGlassOz(profile.glassOz)
    setStepsTarget(profile.stepsTarget)
  }, [profile])

  if (!profile) {
    return (
      <PageShell title="Settings">
        <p>Loading…</p>
      </PageShell>
    )
  }

  async function handleSave() {
    setStatus('saving')
    await saveProfile({
      heightIn,
      currentWeightLb,
      birthDate,
      sex,
      activityLevel,
      goalWeightLb,
      pace,
      glassOz,
      stepsTarget,
      reminderTimes: profile!.reminderTimes,
      createdAt: profile!.createdAt,
    })

    const targets = computeDailyTargets({
      currentWeightLb,
      goalWeightLb,
      heightIn,
      age: ageFromBirthDate(birthDate),
      sex,
      activityLevel,
      pace,
      glassOz,
      stepsTarget,
    })
    await saveTargets({ date: toLocalDateString(new Date()), ...targets })

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <PageShell title="Settings">
      <div className="space-y-5">
        <Field label="Height (inches)">
          <input type="number" className="input" value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} />
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
          <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </Field>
        <Field label="Sex">
          <select className="input" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Activity level">
          <select
            className="input"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
          >
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Goal weight (lb)">
          <input
            type="number"
            className="input"
            value={goalWeightLb}
            onChange={(e) => setGoalWeightLb(Number(e.target.value))}
          />
        </Field>
        <Field label="Pace">
          <select className="input" value={pace} onChange={(e) => setPace(e.target.value as Pace)}>
            <option value="slow">Slow</option>
            <option value="steady">Steady</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </Field>
        <Field label="Glass size (oz)">
          <input type="number" className="input" value={glassOz} onChange={(e) => setGlassOz(Number(e.target.value))} />
        </Field>
        <Field label="Steps target">
          <input
            type="number"
            className="input"
            value={stepsTarget}
            onChange={(e) => setStepsTarget(Number(e.target.value))}
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        className="mt-6 w-full rounded-lg bg-emerald-500 py-3 font-medium text-slate-950 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save and recalculate targets'}
      </button>

      <p className="mt-4 text-xs text-slate-500">
        Targets are general estimates, not medical advice — check with a doctor before big diet or
        training changes.
      </p>
    </PageShell>
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
