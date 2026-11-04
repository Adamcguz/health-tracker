import type { FoodGroupContribution, MealItem } from '../db/types'

export interface AnalysisResult {
  needsClarification: boolean
  clarificationQuestion: string | null
  clarificationOptions: string[] | null
  items: MealItem[]
}

function isFoodGroupContribution(value: unknown): value is FoodGroupContribution {
  if (typeof value !== 'object' || value === null) return false
  const keys: (keyof FoodGroupContribution)[] = [
    'fruitCups',
    'vegetableCups',
    'grainsOzEq',
    'grainsWholeOzEq',
    'proteinOzEq',
    'dairyCups',
  ]
  return keys.every((k) => typeof (value as Record<string, unknown>)[k] === 'number')
}

function isMealItem(value: unknown): value is MealItem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' &&
    typeof v.portion === 'string' &&
    typeof v.kcal === 'number' &&
    typeof v.proteinG === 'number' &&
    isFoodGroupContribution(v.groups) &&
    Array.isArray(v.flags) &&
    v.flags.every((f) => f === 'added-sugar' || f === 'high-sodium')
  )
}

function parseAnalysisResult(data: unknown): AnalysisResult {
  if (typeof data !== 'object' || data === null) throw new Error('Malformed analysis response')
  const v = data as Record<string, unknown>
  const items = Array.isArray(v.items) ? v.items.filter(isMealItem) : []
  return {
    needsClarification: Boolean(v.needsClarification),
    clarificationQuestion: typeof v.clarificationQuestion === 'string' ? v.clarificationQuestion : null,
    clarificationOptions: Array.isArray(v.clarificationOptions) ? (v.clarificationOptions as string[]) : null,
    items,
  }
}

export class WorkerNotConfiguredError extends Error {}
export class AnalysisRequestError extends Error {}

/** Calls the Cloudflare Worker's Claude proxy. Throws on any failure — callers fall back to "needs-analysis". */
export async function analyzeMealText(text: string): Promise<AnalysisResult> {
  const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined
  if (!workerUrl) {
    throw new WorkerNotConfiguredError('VITE_WORKER_URL is not configured')
  }

  const response = await fetch(`${workerUrl.replace(/\/$/, '')}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new AnalysisRequestError(`Worker returned ${response.status}: ${body}`)
  }

  const data = await response.json()
  return parseAnalysisResult(data)
}

export function isWorkerConfigured(): boolean {
  return Boolean(import.meta.env.VITE_WORKER_URL)
}
