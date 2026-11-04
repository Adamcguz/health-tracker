import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db/db'
import { addDays, toLocalDateString } from '../lib/date'

type Range = '4w' | '3m' | 'all'

const RANGE_DAYS: Record<Range, number | null> = { '4w': 28, '3m': 90, all: null }

export default function TrendChart({ goalWeightLb }: { goalWeightLb: number }) {
  const [range, setRange] = useState<Range>('4w')
  const weighIns = useLiveQuery(() => db.weighIns.orderBy('date').toArray(), [])

  if (!weighIns) return null

  const days = RANGE_DAYS[range]
  const cutoff = days ? toLocalDateString(addDays(new Date(), -days)) : null
  const filtered = cutoff ? weighIns.filter((w) => w.date >= cutoff) : weighIns

  const data = filtered.map((w) => ({ date: w.date, trend: Math.round(w.trendWeightLb * 10) / 10, actual: w.weightLb }))

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Weight trend</h2>
        <div className="flex gap-1">
          {(['4w', '3m', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-2 py-0.5 text-xs ${
                range === r ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              {r === '4w' ? '4 weeks' : r === '3m' ? '3 months' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Log a weigh-in to see your trend.</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', fontSize: 12 }} />
              <ReferenceLine y={goalWeightLb} stroke="#10b981" strokeDasharray="4 4" />
              <Scatter dataKey="actual" fill="#475569" />
              <Line type="monotone" dataKey="trend" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
