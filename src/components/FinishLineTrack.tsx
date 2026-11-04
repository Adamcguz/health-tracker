export default function FinishLineTrack({
  startWeightLb,
  trendWeightLb,
  goalWeightLb,
  plannedDate,
  projectedDate,
  deltaDays,
  reason,
}: {
  startWeightLb: number
  trendWeightLb: number
  goalWeightLb: number
  plannedDate: string | null
  projectedDate: string | null
  deltaDays: number | null
  reason: string
}) {
  const total = Math.max(1, startWeightLb - goalWeightLb)
  const progress = Math.min(1, Math.max(0, (startWeightLb - trendWeightLb) / total))

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Finish line</h2>

      <div className="relative mb-2 h-2 rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
        <div
          className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-emerald-400 bg-slate-900"
          style={{ left: `${progress * 100}%` }}
          title="You are here (trend weight)"
        />
      </div>
      <div className="mb-3 flex justify-between text-xs text-slate-400">
        <span>{startWeightLb} lb</span>
        <span>{goalWeightLb} lb</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">You are here</span>
          <span className="text-slate-100">{trendWeightLb.toFixed(1)} lb trend</span>
        </div>
        {plannedDate && (
          <div className="flex justify-between">
            <span className="text-slate-400">Planned date</span>
            <span className="text-slate-500">{plannedDate}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-400">Projected date</span>
          <span className="text-emerald-400">
            {projectedDate ?? 'No projection yet'}
            {deltaDays !== null && deltaDays !== 0 && (
              <span className={deltaDays > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {' '}
                ({deltaDays > 0 ? '+' : ''}
                {deltaDays}d)
              </span>
            )}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{reason}</p>
    </div>
  )
}
