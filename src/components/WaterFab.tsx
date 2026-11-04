import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db, logWater, undoLastWaterEntry } from '../db/db'

const QUICK_SIZES = [8, 12, 16, 24]
const LONG_PRESS_MS = 500

export default function WaterFab() {
  const profile = useLiveQuery(() => db.profile.get(1))
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ oz: number; entryId: number } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!profile) return null
  const glassOz = profile.glassOz

  async function log(oz: number) {
    const entryId = await logWater(oz)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ oz, entryId })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  async function handleUndo() {
    if (!toast) return
    await undoLastWaterEntry(toast.entryId)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }

  function startPress() {
    longPressFired.current = false
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setMenuOpen(true)
    }, LONG_PRESS_MS)
  }

  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    if (!longPressFired.current) {
      void log(glassOz)
    }
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function handleCustom() {
    const input = window.prompt('Custom amount (oz)')
    const oz = Number(input)
    setMenuOpen(false)
    if (input && !Number.isNaN(oz) && oz > 0) {
      void log(oz)
    }
  }

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-end bg-black/40 p-4 pb-32"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {QUICK_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  void log(size)
                }}
                className="rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-100 shadow-lg"
              >
                {size} oz
              </button>
            ))}
            <button
              type="button"
              onClick={handleCustom}
              className="rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-100 shadow-lg"
            >
              Custom…
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg">
          <span>+{toast.oz} oz logged</span>
          <button type="button" onClick={handleUndo} className="font-semibold text-emerald-400">
            Undo
          </button>
        </div>
      )}

      <button
        type="button"
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={cancelPress}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-2xl text-white shadow-lg active:scale-95"
        aria-label={`Add ${glassOz} oz of water (long-press for other sizes)`}
      >
        💧
      </button>
    </>
  )
}
