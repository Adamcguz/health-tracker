import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import PageShell from '../components/PageShell'
import MealCard from '../components/MealCard'
import MealEntryPanel from '../components/MealEntryPanel'
import EndOfDayReport from '../components/EndOfDayReport'
import { db } from '../db/db'
import { getTodayMeals } from '../db/foodDb'
import type { MealSlot } from '../db/types'

const MAIN_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

function minutesNow(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function minutesFromTimeString(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function Food() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const todayMeals = useLiveQuery(() => getTodayMeals(), [])
  const [addingSnack, setAddingSnack] = useState(false)

  if (!profile || !todayMeals) {
    return (
      <PageShell title="Food">
        <p>Loading…</p>
      </PageShell>
    )
  }

  const entryBySlot = (slot: MealSlot) => todayMeals.find((m) => m.slot === slot)
  const snackEntries = todayMeals.filter((m) => m.slot === 'snack')

  // PRD: on launch, jump to the most recent unlogged check-in whose reminder time has passed.
  const dueSlot = MAIN_SLOTS.find((slot) => {
    const reminderKey = slot as 'breakfast' | 'lunch' | 'dinner'
    const dueMinutes = minutesFromTimeString(profile.reminderTimes[reminderKey])
    return !entryBySlot(slot) && minutesNow() >= dueMinutes
  })

  return (
    <PageShell title="Food">
      <div className="space-y-4">
        {MAIN_SLOTS.map((slot) => (
          <MealCard key={slot} slot={slot} entry={entryBySlot(slot)} initiallyOpen={slot === dueSlot} />
        ))}

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-100">Snacks</h2>
          {snackEntries.length === 0 && <p className="text-xs text-slate-400">None logged yet today.</p>}
          <ul className="mb-2 space-y-1">
            {snackEntries.map((s) => (
              <li key={s.id} className="text-sm text-slate-300">
                {s.rawText || '(snack)'}
              </li>
            ))}
          </ul>
          {addingSnack ? (
            <MealEntryPanel slot="snack" onDone={() => setAddingSnack(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAddingSnack(true)}
              className="rounded-lg border border-dashed border-slate-700 px-3 py-1.5 text-sm text-slate-300"
            >
              + Add snack
            </button>
          )}
        </div>

        <EndOfDayReport />
      </div>
    </PageShell>
  )
}
