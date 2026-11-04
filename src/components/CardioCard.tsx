import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { getWeekCardio, logCardio } from '../db/activityDb'
import { DEFAULT_CARDIO_MIN_WEEK } from '../lib/config'
import { cardioMinuteContribution, type CardioIntensity } from '../lib/activity'

const TYPES = ['Walk', 'Run', 'Bike', 'Swim', 'Elliptical', 'Other']

export default function CardioCard() {
  const [type, setType] = useState('Walk')
  const [minutes, setMinutes] = useState('')
  const [intensity, setIntensity] = useState<CardioIntensity>('moderate')
  const [saving, setSaving] = useState(false)
  const weekEntries = useLiveQuery(() => getWeekCardio(), [])

  const weekMinutes =
    weekEntries?.reduce((sum, e) => sum + cardioMinuteContribution(e.minutes, e.intensity), 0) ?? 0
  const pct = Math.min(1, weekMinutes / DEFAULT_CARDIO_MIN_WEEK)

  async function handleSave() {
    const mins = Number(minutes)
    if (!mins || mins <= 0) return
    setSaving(true)
    await logCardio(type, mins, intensity)
    setMinutes('')
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="mb-3 text-xs text-slate-400">
        {weekMinutes} / {DEFAULT_CARDIO_MIN_WEEK} moderate-equivalent min this week
      </p>

      <div className="space-y-2">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="Minutes"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <select
            className="input"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as CardioIntensity)}
          >
            <option value="moderate">Moderate</option>
            <option value="vigorous">Vigorous (2x)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !minutes}
          className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          Log cardio
        </button>
      </div>
    </div>
  )
}
