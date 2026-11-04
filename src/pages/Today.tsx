import { useLiveQuery } from 'dexie-react-hooks'
import PageShell from '../components/PageShell'
import { db } from '../db/db'

export default function Today() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const targets = useLiveQuery(() => db.targets.orderBy('date').last())

  if (!targets || !profile) {
    return (
      <PageShell title="Today">
        <p>Loading your targets…</p>
      </PageShell>
    )
  }

  return (
    <PageShell title="Today">
      <div className="space-y-4">
        <Card>
          <CardTitle>Calories</CardTitle>
          <div className="text-3xl font-semibold text-slate-50">{targets.calories} kcal</div>
          {targets.flooredApplied && (
            <p className="mt-1 text-xs text-amber-400">
              Held at the safe calorie floor for your profile — your pace was slowed to protect it.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Protein</CardTitle>
          <div className="text-2xl font-semibold text-slate-50">{targets.proteinG} g</div>
        </Card>

        <Card>
          <CardTitle>Food groups (servings/day)</CardTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Row label="Fruit" value={`${targets.foodGroups.fruitCups} cups`} />
            <Row label="Vegetables" value={`${targets.foodGroups.vegetableCups} cups`} />
            <Row label="Grains" value={`${targets.foodGroups.grainsOzEq} oz-eq`} />
            <Row label="Protein foods" value={`${targets.foodGroups.proteinOzEq} oz-eq`} />
            <Row label="Dairy" value={`${targets.foodGroups.dairyCups} cups`} />
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Added sugar under {targets.addedSugarLimitG}g · sodium under {targets.sodiumLimitMg}mg
          </p>
        </Card>

        <Card>
          <CardTitle>Water</CardTitle>
          <div className="text-2xl font-semibold text-slate-50">
            {targets.waterOz} oz <span className="text-sm font-normal text-slate-400">({targets.waterGlasses} glasses)</span>
          </div>
        </Card>

        <Card>
          <CardTitle>Exercise</CardTitle>
          <dl className="space-y-1 text-sm">
            <Row label="Cardio" value={`${targets.cardioMinWeek} min/week`} />
            <Row label="Strength" value={`${targets.strengthDaysWeek} days/week`} />
            <Row label="Steps" value={`${targets.stepsDay.toLocaleString()}/day`} />
          </dl>
        </Card>

        <Card>
          <CardTitle>Profile</CardTitle>
          <dl className="space-y-1 text-sm">
            <Row label="Current weight" value={`${profile.currentWeightLb} lb`} />
            <Row label="Goal weight" value={`${profile.goalWeightLb} lb`} />
            <Row label="Pace" value={profile.pace} />
          </dl>
        </Card>
      </div>
    </PageShell>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">{children}</div>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h2>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-200 capitalize">{value}</dd>
    </div>
  )
}
