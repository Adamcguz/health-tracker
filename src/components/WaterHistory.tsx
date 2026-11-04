import { useLiveQuery } from 'dexie-react-hooks'
import { db, getTargetsAsOf } from '../db/db'
import { addDays, toLocalDateString } from '../lib/date'

interface DayResult {
  date: string
  oz: number
  targetOz: number
  hit: boolean
}

export default function WaterHistory() {
  const days = useLiveQuery(async () => {
    const results: DayResult[] = []
    for (let i = 6; i >= 0; i--) {
      const date = toLocalDateString(addDays(new Date(), -i))
      const entries = await db.water.where('date').equals(date).toArray()
      const oz = entries.reduce((sum, e) => sum + e.oz, 0)
      const targets = await getTargetsAsOf(date)
      const targetOz = targets?.waterOz ?? 64
      results.push({ date, oz, targetOz, hit: oz >= targetOz })
    }
    return results
  }, [])

  if (!days) return null

  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].hit) streak++
    else break
  }
  const avgOz = Math.round(days.reduce((sum, d) => sum + d.oz, 0) / days.length)

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-slate-400">
        <span>{streak}-day streak</span>
        <span>{avgOz} oz/day avg</span>
      </div>
      <div className="flex gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.oz}/${d.targetOz} oz`}
            className={`h-6 flex-1 rounded ${d.hit ? 'bg-sky-500' : 'bg-slate-700'}`}
          />
        ))}
      </div>
    </div>
  )
}
