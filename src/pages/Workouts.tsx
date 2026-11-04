import { useState } from 'react'
import PageShell from '../components/PageShell'
import StepsCard from '../components/StepsCard'
import CardioCard from '../components/CardioCard'
import StrengthCard from '../components/StrengthCard'
import RoutinesCard from '../components/RoutinesCard'

export default function Workouts() {
  const [pickedExercise, setPickedExercise] = useState<{ name: string; nonce: number } | undefined>(undefined)

  return (
    <PageShell title="Workouts">
      <div className="space-y-4">
        <Card title="Steps">
          <StepsCard />
        </Card>

        <Card title="Cardio">
          <CardioCard />
        </Card>

        <Card title="Strength">
          <StrengthCard key={pickedExercise?.nonce} initialExercise={pickedExercise?.name} />
        </Card>

        <Card title="Routines">
          <RoutinesCard onPickExercise={(name) => setPickedExercise({ name, nonce: Date.now() })} />
        </Card>
      </div>
    </PageShell>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </div>
  )
}
