export default function WaterRing({ oz, targetOz, glassOz }: { oz: number; targetOz: number; glassOz: number }) {
  const pct = targetOz > 0 ? Math.min(1, oz / targetOz) : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct)
  const glassesRemaining = Math.max(0, Math.ceil((targetOz - oz) / glassOz))

  return (
    <div className="flex items-center gap-5">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div>
        <div className="text-2xl font-semibold text-slate-50">
          {oz} <span className="text-base font-normal text-slate-400">/ {targetOz} oz</span>
        </div>
        <div className="text-sm text-slate-400">
          {glassesRemaining === 0 ? 'Target hit' : `${glassesRemaining} glass${glassesRemaining === 1 ? '' : 'es'} to go`}
        </div>
      </div>
    </div>
  )
}
