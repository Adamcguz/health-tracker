import { useState } from 'react'
import MealEntryPanel from './MealEntryPanel'
import type { MealEntry, MealSlot } from '../db/types'
import { sumCalories } from '../lib/nutrition'

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function MealCard({
  slot,
  entry,
  initiallyOpen = false,
}: {
  slot: MealSlot
  entry: MealEntry | undefined
  initiallyOpen?: boolean
}) {
  const [open, setOpen] = useState(initiallyOpen)

  const status = entry?.status
  const statusLabel =
    status === 'logged'
      ? `${sumCalories(entry!.items)} kcal`
      : status === 'skipped'
        ? 'Skipped'
        : status === 'needs-analysis'
          ? 'Needs analysis'
          : 'Not logged'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-sm font-medium text-slate-100">{SLOT_LABELS[slot]}</h2>
          <p
            className={`text-xs ${
              status === 'logged' ? 'text-emerald-400' : status === 'skipped' ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {statusLabel}
          </p>
        </div>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>

      {open && <MealEntryPanel slot={slot} existingEntry={entry} onDone={() => setOpen(false)} />}
    </div>
  )
}
