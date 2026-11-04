export interface Env {
  RATE_LIMIT: KVNamespace
  ALLOWED_ORIGIN: string
  DAILY_ANALYSIS_LIMIT: string
  ANTHROPIC_API_KEY: string
}

const MODEL = 'claude-haiku-5-5'

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a personal health tracker. Given a free-text description of a meal, estimate its nutrition.

Respond with ONLY valid JSON (no markdown fences, no prose) matching exactly this shape:
{
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "clarificationOptions": string[] | null,
  "items": [
    {
      "name": string,
      "portion": string,
      "kcal": number,
      "proteinG": number,
      "groups": {
        "fruitCups": number,
        "vegetableCups": number,
        "grainsOzEq": number,
        "grainsWholeOzEq": number,
        "proteinOzEq": number,
        "dairyCups": number
      },
      "flags": string[]
    }
  ]
}

Rules:
- Only set needsClarification true when a portion is genuinely ambiguous and would change the estimate a lot (e.g. "a bowl of cereal" with no size). In that case set clarificationQuestion (e.g. "How big was the bowl?"), clarificationOptions to exactly ["Small", "Medium", "Large"], and items to [].
- Otherwise make a reasonable estimate from typical portions. needsClarification is false, clarificationQuestion and clarificationOptions are null.
- groups uses USDA MyPlate units: cups for fruit/vegetables/dairy, oz-equivalent for grains and protein foods. grainsWholeOzEq is the whole-grain portion of grainsOzEq (0 if refined).
- flags is a subset of ["added-sugar", "high-sodium"], only when genuinely notable for that item.
- One entry in "items" per distinct food, not per ingredient.
- Numbers only, no units inside number fields.`

function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

function todayKey(): string {
  return `analyses:${new Date().toISOString().slice(0, 10)}`
}

async function checkAndIncrementRateLimit(env: Env): Promise<{ ok: boolean; count: number }> {
  const key = todayKey()
  const limit = Number(env.DAILY_ANALYSIS_LIMIT) || 30
  const current = Number((await env.RATE_LIMIT.get(key)) ?? '0')
  if (current >= limit) return { ok: false, count: current }
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 })
  return { ok: true, count: current + 1 }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = fenced ? fenced[1] : trimmed
  return JSON.parse(jsonText)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    const url = new URL(request.url)
    if (url.pathname !== '/analyze' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found' }, env, 404)
    }

    let body: { text?: string }
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, env, 400)
    }

    const text = body.text?.trim()
    if (!text) {
      return jsonResponse({ error: 'Missing "text"' }, env, 400)
    }

    const rateLimit = await checkAndIncrementRateLimit(env)
    if (!rateLimit.ok) {
      return jsonResponse(
        { error: 'Daily analysis limit reached. Log this meal as text for now and it can be re-analyzed tomorrow.' },
        env,
        429,
      )
    }

    try {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: text }],
        }),
      })

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text()
        return jsonResponse({ error: `Claude API error: ${errText}` }, env, 502)
      }

      const data = (await anthropicResponse.json()) as { content: { type: string; text?: string }[] }
      const textBlock = data.content.find((b) => b.type === 'text')
      if (!textBlock?.text) {
        return jsonResponse({ error: 'No text in Claude response' }, env, 502)
      }

      const parsed = extractJson(textBlock.text)
      return jsonResponse(parsed, env)
    } catch (err) {
      return jsonResponse({ error: `Analysis failed: ${(err as Error).message}` }, env, 500)
    }
  },
}
