import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { deleteMeal, getFoodsLibrary, getYesterdaySlotItems, logAnalysisCall, saveMeal } from '../db/foodDb'
import { analyzeMealText, AnalysisRequestError, WorkerNotConfiguredError } from '../lib/mealAnalysis'
import type { FoodLibraryItem, MealEntry, MealItem, MealSlot } from '../db/types'

type Mode = 'start' | 'clarify' | 'review'

export default function MealEntryPanel({
  slot,
  existingEntry,
  onDone,
}: {
  slot: MealSlot
  existingEntry?: MealEntry
  onDone: () => void
}) {
  const [mode, setMode] = useState<Mode>(existingEntry?.status === 'logged' ? 'review' : 'start')
  const [rawText, setRawText] = useState(existingEntry?.status !== 'skipped' ? (existingEntry?.rawText ?? '') : '')
  const [clarification, setClarification] = useState<{ question: string; options: string[] } | null>(null)
  const [items, setItems] = useState<MealItem[]>(existingEntry?.items ?? [])
  const [analyzing, setAnalyzing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const yesterdayItems = useLiveQuery(() => getYesterdaySlotItems(slot), [slot])
  const library = useLiveQuery(() => getFoodsLibrary(), []) ?? []

  async function runAnalysis(text: string) {
    setAnalyzing(true)
    setNotice(null)
    try {
      const result = await analyzeMealText(text)
      await logAnalysisCall()
      if (result.needsClarification && result.clarificationQuestion && result.clarificationOptions) {
        setClarification({ question: result.clarificationQuestion, options: result.clarificationOptions })
        setMode('clarify')
      } else {
        setItems(result.items)
        setMode('review')
      }
    } catch (err) {
      if (err instanceof WorkerNotConfiguredError || err instanceof AnalysisRequestError || err instanceof TypeError) {
        await saveMeal({ id: existingEntry?.id, slot, rawText: text, status: 'needs-analysis', items: [] })
        setNotice('Saved as text — AI analysis isn\'t set up or reachable yet. You can re-analyze later.')
        setTimeout(onDone, 1500)
      } else {
        setNotice('Something went wrong analyzing this meal. Try again or skip.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  function handleClarify(option: string) {
    setClarification(null)
    void runAnalysis(`${rawText} (${option.toLowerCase()} portion)`)
  }

  function updateItem(index: number, field: 'kcal' | 'proteinG', value: number) {
    setItems((s) => s.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  function removeItem(index: number) {
    setItems((s) => s.filter((_, i) => i !== index))
  }

  function addLibraryItem(libItem: FoodLibraryItem) {
    setItems((s) => [
      ...s,
      {
        name: libItem.name,
        portion: libItem.portion,
        kcal: libItem.kcal,
        proteinG: libItem.proteinG,
        groups: libItem.groups,
        flags: [],
      },
    ])
  }

  async function useYesterday() {
    if (!yesterdayItems) return
    setItems(yesterdayItems.map((i) => ({ ...i })))
    setRawText('(same as yesterday)')
    setMode('review')
  }

  async function handleSave() {
    await saveMeal({ id: existingEntry?.id, slot, rawText: rawText || '(saved meal)', status: 'logged', items })
    onDone()
  }

  async function handleSkip() {
    await saveMeal({ id: existingEntry?.id, slot, rawText: '', status: 'skipped', items: [] })
    onDone()
  }

  async function handleDelete() {
    if (!existingEntry?.id) return
    if (!window.confirm('Delete this entry?')) return
    await deleteMeal(existingEntry.id)
    onDone()
  }

  if (mode === 'clarify' && clarification) {
    return (
      <div className="mt-2 rounded-lg border border-slate-700 p-3">
        <p className="mb-2 text-sm text-slate-200">{clarification.question}</p>
        <div className="flex gap-2">
          {clarification.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleClarify(opt)}
              className="rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (mode === 'review') {
    return (
      <div className="mt-2 space-y-2 rounded-lg border border-slate-700 p-3">
        {items.length === 0 && <p className="text-sm text-slate-400">No items — add one below or save empty.</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="flex-1">
              <div className="text-slate-200">{item.name}</div>
              <div className="text-xs text-slate-500">{item.portion}</div>
            </div>
            <input
              type="number"
              className="input w-16"
              value={item.kcal}
              onChange={(e) => updateItem(i, 'kcal', Number(e.target.value))}
            />
            <span className="text-xs text-slate-500">kcal</span>
            <input
              type="number"
              className="input w-14"
              value={item.proteinG}
              onChange={(e) => updateItem(i, 'proteinG', Number(e.target.value))}
            />
            <span className="text-xs text-slate-500">g pro</span>
            <button type="button" onClick={() => removeItem(i)} className="text-slate-500">
              ✕
            </button>
          </div>
        ))}

        {library.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-slate-500">Add from your foods:</p>
            <div className="flex flex-wrap gap-1.5">
              {library.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addLibraryItem(f)}
                  className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
                >
                  + {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={handleSave} className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950">
            Save
          </button>
          {existingEntry?.id !== undefined && (
            <button type="button" onClick={() => void handleDelete()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-red-400">
              Delete
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-slate-700 p-3">
      {notice && <p className="text-xs text-amber-400">{notice}</p>}
      <textarea
        className="input min-h-20"
        placeholder="e.g. 2 eggs, toast with butter, coffee with milk"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!rawText || analyzing}
          onClick={() => void runAnalysis(rawText)}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
        {yesterdayItems && yesterdayItems.length > 0 && (
          <button type="button" onClick={() => void useYesterday()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">
            Same as yesterday
          </button>
        )}
        {library.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setItems([])
              setMode('review')
            }}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"
          >
            Pick saved meal
          </button>
        )}
        <button type="button" onClick={() => void handleSkip()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400">
          Skipped this meal
        </button>
        {existingEntry?.id !== undefined && (
          <button type="button" onClick={() => void handleDelete()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-red-400">
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
