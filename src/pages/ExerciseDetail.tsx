import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import PageShell from '../components/PageShell'
import { getExerciseSessions } from '../db/strengthDb'
import { detectPRs, detectStall, sessionBestE1RM, sessionTopSetWeight, sessionVolume } from '../lib/strength'

export default function ExerciseDetail() {
  const { exercise: encoded } = useParams<{ exercise: string }>()
  const exercise = decodeURIComponent(encoded ?? '')
  const sessions = useLiveQuery(() => getExerciseSessions(exercise), [exercise])

  if (!sessions) {
    return (
      <PageShell title={exercise}>
        <p>Loading…</p>
      </PageShell>
    )
  }

  if (sessions.length === 0) {
    return (
      <PageShell title={exercise}>
        <p className="text-slate-400">No sessions logged yet.</p>
        <Link to="/workouts" className="mt-3 inline-block text-sm text-sky-400">
          ← Back to Workouts
        </Link>
      </PageShell>
    )
  }

  const chartData = sessions.map((s) => ({
    date: s.date,
    e1RM: Math.round(sessionBestE1RM(s.sets) * 10) / 10,
  }))
  const latestPRs = detectPRs(sessions)
  const stalled = detectStall(sessions)

  return (
    <PageShell title={exercise}>
      <Link to="/workouts" className="mb-4 inline-block text-sm text-sky-400">
        ← Back to Workouts
      </Link>

      {latestPRs.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          🏅 New PR this session!{' '}
          {latestPRs.map((pr, i) => (
            <span key={i}>
              {pr.type === 'best-e1rm'
                ? `Best e1RM: ${pr.e1RM?.toFixed(1)} lb`
                : `${pr.weightLb} lb × ${pr.reps} reps`}
              {i < latestPRs.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      )}

      {stalled && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-300">
          No improvement in the last 3 sessions — consider a deload or changing rep range.
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Estimated 1RM over time
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', fontSize: 12 }} />
              <Line type="monotone" dataKey="e1RM" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Session history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-1">Date</th>
              <th className="pb-1">Top set</th>
              <th className="pb-1">e1RM</th>
              <th className="pb-1">Volume</th>
            </tr>
          </thead>
          <tbody>
            {[...sessions].reverse().map((s) => (
              <tr key={s.date} className="border-t border-slate-800">
                <td className="py-1.5 text-slate-300">{s.date}</td>
                <td className="py-1.5 text-slate-300">{sessionTopSetWeight(s.sets)} lb</td>
                <td className="py-1.5 text-slate-300">{sessionBestE1RM(s.sets).toFixed(1)} lb</td>
                <td className="py-1.5 text-slate-300">{sessionVolume(s.sets).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  )
}
