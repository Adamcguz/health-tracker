import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import PageShell from '../components/PageShell'
import { db, saveProfile, saveTargets } from '../db/db'
import { exportBackup, importBackup, isBackupData } from '../db/backupDb'
import { getMonthAnalysisCount } from '../db/foodDb'
import { ACTIVITY_LEVELS, type ActivityLevel, type Pace, type Sex } from '../lib/config'
import { ageFromBirthDate, toLocalDateString } from '../lib/date'
import { isWorkerConfigured } from '../lib/mealAnalysis'
import { computeDailyTargets } from '../lib/targets'

export default function Settings() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const monthAnalysisCount = useLiveQuery(() => getMonthAnalysisCount(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)

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
      plannedFinishDate: profile!.plannedFinishDate,
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

  async function handleExport() {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-tracker-backup-${toLocalDateString(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupStatus('Backup downloaded.')
    setTimeout(() => setBackupStatus(null), 3000)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setBackupStatus('That file is not valid JSON.')
      return
    }
    if (!isBackupData(parsed)) {
      setBackupStatus('That file does not look like a Health Tracker backup.')
      return
    }
    if (!window.confirm('This replaces all data currently on this device with the backup. Continue?')) {
      return
    }
    await importBackup(parsed)
    setBackupStatus('Backup restored. Reloading…')
    setTimeout(() => window.location.reload(), 1000)
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

      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
        <p>AI food analysis: {isWorkerConfigured() ? 'connected' : 'not set up yet'}</p>
        <p>{monthAnalysisCount ?? 0} analyses this month</p>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Backup</h2>
        <p className="mb-2 text-xs text-slate-500">
          iOS can clear web-app storage, so back up regularly. A backup is a JSON file you can keep
          anywhere (email, iCloud Drive, etc.) and restore from on this or another device.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-200">
            Export backup
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-200"
          >
            Restore backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
        {backupStatus && <p className="mt-2 text-xs text-emerald-400">{backupStatus}</p>}
      </div>

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
