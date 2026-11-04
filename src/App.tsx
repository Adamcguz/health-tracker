import { Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import Food from './pages/Food'
import Workouts from './pages/Workouts'
import Summary from './pages/Summary'
import Settings from './pages/Settings'

export default function App() {
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
