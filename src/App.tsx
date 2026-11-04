import { useLiveQuery } from 'dexie-react-hooks'
import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import Food from './pages/Food'
import Workouts from './pages/Workouts'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import { db } from './db/db'

export default function App() {
  const profiles = useLiveQuery(() => db.profile.toArray())

  if (profiles === undefined) {
    return <div className="min-h-screen bg-slate-950" />
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/food" element={<Food />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
