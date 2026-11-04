import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, recordWeighIn } from '../db/db'

export default function WeighInCard() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const lastWeighIn = useLiveQuery(() => db.weighIns.orderBy('date').last())
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  if (!profile) return null

  async function handleSave() {
    const weightLb = Number(weight)
    if (!weightLb || weightLb <= 0) return
    setSaving(true)
    await recordWeighIn(weightLb)
    setWeight('')
    setSaving(false)
  }

  return (
    <div>
      {lastWeighIn ? (
        <p className="mb-2 text-sm text-slate-400">
          Trend weight: <span className="text-slate-200">{lastWeighIn.trendWeightLb.toFixed(1)} lb</span> · last
          weigh-in {lastWeighIn.date}: {lastWeighIn.weightLb} lb
        </p>
      ) : (
        <p className="mb-2 text-sm text-slate-400">No weigh-ins yet. Best 3 mornings a week (Mon/Wed/Fri), before eating.</p>
      )}
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder={`${profile.currentWeightLb}`}
          className="input"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !weight}
          className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Log weight'}
        </button>
      </div>
    </div>
  )
}
