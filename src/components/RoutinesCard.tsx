import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { deleteRoutine, getExerciseNames, getRoutines, saveRoutine } from '../db/strengthDb'
import { COMMON_EXERCISES } from '../lib/exerciseLibrary'

export default function RoutinesCard({ onPickExercise }: { onPickExercise: (name: string) => void }) {
  const routines = useLiveQuery(() => getRoutines(), []) ?? []
  const loggedNames = useLiveQuery(() => getExerciseNames(), []) ?? []
  const allNames = Array.from(new Set([...loggedNames, ...COMMON_EXERCISES]))

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  function toggle(ex: string) {
    setSelected((s) => (s.includes(ex) ? s.filter((x) => x !== ex) : [...s, ex]))
  }

  async function handleSave() {
    if (!name || selected.length === 0) return
    await saveRoutine(name, selected)
    setCreating(false)
    setName('')
    setSelected([])
  }

  return (
    <div>
      {routines.length === 0 && !creating && <p className="text-sm text-slate-400">No saved routines yet.</p>}

      <div className="space-y-3">
        {routines.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-700 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-100">{r.name}</span>
              <button type="button" onClick={() => deleteRoutine(r.id!)} className="text-xs text-slate-500">
                Delete
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.exercises.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onPickExercise(ex)}
                  className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {creating ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            className="input"
            placeholder="Routine name (e.g. Day A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {allNames.map((ex) => (
              <label key={ex} className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={selected.includes(ex)} onChange={() => toggle(ex)} />
                {ex}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950">
              Save routine
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-slate-700 py-2 text-sm text-slate-300"
        >
          + New routine
        </button>
      )}
    </div>
  )
}
