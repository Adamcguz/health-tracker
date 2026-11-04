import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { getStepsForDate, getWeekSteps, logSteps } from '../db/activityDb'
import { toLocalDateString } from '../lib/date'

export default function StepsCard() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const today = toLocalDateString(new Date())
  const todaySteps = useLiveQuery(() => getStepsForDate(today), [today])
  const weekSteps = useLiveQuery(() => getWeekSteps(), [today])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (todaySteps !== undefined) setInput(todaySteps > 0 ? String(todaySteps) : '')
  }, [todaySteps])

  if (!profile) return null

  const target = profile.stepsTarget
  const pct = target > 0 ? Math.min(1, (todaySteps ?? 0) / target) : 0
  const weekAvg = weekSteps && weekSteps.length > 0 ? Math.round(weekSteps.reduce((s, e) => s + e.steps, 0) / weekSteps.length) : 0

  async function handleSave() {
    const steps = Number(input)
    if (!Number.isFinite(steps) || steps < 0) return
    setSaving(true)
    await logSteps(steps)
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="mb-3 flex justify-between text-xs text-slate-400">
        <span>{(todaySteps ?? 0).toLocaleString()} / {target.toLocaleString()} steps today</span>
        <span>{weekAvg.toLocaleString()} avg this week</span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          className="input"
          placeholder="Today's steps"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !input}
          className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  )
}
