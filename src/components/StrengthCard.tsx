import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExerciseNames, getLastSession, logStrengthSession, getWeekStrengthDays, type SetInput } from '../db/strengthDb'
import { COMMON_EXERCISES } from '../lib/exerciseLibrary'
import { DEFAULT_STRENGTH_DAYS_WEEK } from '../lib/config'

export default function StrengthCard({ initialExercise }: { initialExercise?: string }) {
  const loggedNames = useLiveQuery(() => getExerciseNames(), []) ?? []
  const weekDays = useLiveQuery(() => getWeekStrengthDays(), [])
  const [query, setQuery] = useState('')
  const [exercise, setExercise] = useState<string | null>(initialExercise ?? null)
  const [sets, setSets] = useState<SetInput[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initialExercise) return
    setExercise(initialExercise)
    getLastSession(initialExercise).then((last) => {
      if (last) setSets(last.map((s) => ({ ...s })))
    })
  }, [initialExercise])

  const allNames = Array.from(new Set([...loggedNames, ...COMMON_EXERCISES]))
  const matches = query ? allNames.filter((n) => n.toLowerCase().includes(query.toLowerCase())) : []

  function selectExercise(name: string) {
    setExercise(name)
    setQuery('')
    setSets([])
  }

  function addSet(weightLb = 0, reps = 0) {
    setSets((s) => [...s, { weightLb, reps }])
  }

  function updateSet(index: number, field: keyof SetInput, value: number) {
    setSets((s) => s.map((set, i) => (i === index ? { ...set, [field]: value } : set)))
  }

  function removeSet(index: number) {
    setSets((s) => s.filter((_, i) => i !== index))
  }

  function copyLastSet() {
    if (sets.length === 0) return
    addSet(sets[sets.length - 1].weightLb, sets[sets.length - 1].reps)
  }

  async function repeatLastSession() {
    if (!exercise) return
    const last = await getLastSession(exercise)
    if (last) setSets(last.map((s) => ({ ...s })))
  }

  async function handleSave() {
    if (!exercise || sets.length === 0) return
    setSaving(true)
    await logStrengthSession(
      exercise,
      sets.filter((s) => s.weightLb > 0 && s.reps > 0),
    )
    setSaving(false)
    setExercise(null)
    setSets([])
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        {weekDays?.length ?? 0} / {DEFAULT_STRENGTH_DAYS_WEEK} strength days this week
        {weekDays && weekDays.length > 0 && (
          <span className="ml-2">{weekDays.map(() => '●').join(' ')}</span>
        )}
      </p>

      {!exercise ? (
        <div>
          <input
            type="text"
            className="input"
            placeholder="Search or add an exercise…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {matches.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectExercise(name)}
                  className="block w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200"
                >
                  {name}
                </button>
              ))}
              {!matches.some((m) => m.toLowerCase() === query.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => selectExercise(query)}
                  className="block w-full rounded-lg border border-dashed border-emerald-600 px-3 py-2 text-left text-sm text-emerald-400"
                >
                  Add "{query}"
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-100">{exercise}</h3>
              <Link to={`/workouts/${encodeURIComponent(exercise)}`} className="text-xs text-sky-400">
                View progress →
              </Link>
            </div>
            <button type="button" onClick={() => setExercise(null)} className="text-xs text-slate-400">
              Change
            </button>
          </div>

          <div className="space-y-2">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs text-slate-500">{i + 1}</span>
                <input
                  type="number"
                  className="input"
                  placeholder="lb"
                  value={set.weightLb || ''}
                  onChange={(e) => updateSet(i, 'weightLb', Number(e.target.value))}
                />
                <span className="text-slate-500">×</span>
                <input
                  type="number"
                  className="input"
                  placeholder="reps"
                  value={set.reps || ''}
                  onChange={(e) => updateSet(i, 'reps', Number(e.target.value))}
                />
                <button type="button" onClick={() => removeSet(i)} className="text-slate-500">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => addSet()} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
              + Add set
            </button>
            <button type="button" onClick={copyLastSet} disabled={sets.length === 0} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40">
              Copy last set
            </button>
            <button type="button" onClick={repeatLastSession} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
              Repeat last session
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || sets.length === 0}
            className="mt-4 w-full rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save session'}
          </button>
        </div>
      )}
    </div>
  )
}
