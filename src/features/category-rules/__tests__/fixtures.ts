import { vi } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

// Raw API payloads for the rules tests (feature 17), shaped like
// gastos-backend/docs/api-contract.md → /api/category-rules. They stay raw JSON:
// the tests push them through the service, which is what proves the boundary checks.

export const SUPERMARKET = { id: 4, name: 'Supermercado', kind: 'expense', parentId: null }
export const UTILITIES = { id: 6, name: 'Suministros', kind: 'expense', parentId: null }
export const SALARY = { id: 9, name: 'Nomina', kind: 'income', parentId: null }

export const rule = (
  id: number,
  matchText: string,
  category: object = SUPERMARKET,
): Record<string, unknown> => ({
  id,
  matchText,
  categoryId: (category as { id: number }).id,
  category,
  createdAt: '2026-09-06T10:00:00.000Z',
  updatedAt: '2026-09-06T10:00:00.000Z',
})

export const MERCADONA = rule(7, 'mercadona')
export const IBERDROLA = rule(8, 'iberdrola', UTILITIES)
export const NOMINA = rule(9, 'nomina', SALARY)

export const THREE_RULES = [MERCADONA, IBERDROLA, NOMINA]

/** `GET /api/categories`: two expense roots (one with children) and one income root. */
export const CATEGORY_TREE = [
  {
    id: 4,
    name: 'Supermercado',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [
      {
        id: 5,
        name: 'Fruteria',
        kind: 'expense',
        parentId: 4,
        createdAt: '2026-08-06T18:31:00.000Z',
        children: [],
      },
    ],
  },
  {
    id: 6,
    name: 'Suministros',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:32:00.000Z',
    children: [],
  },
  {
    id: 9,
    name: 'Nomina',
    kind: 'income',
    parentId: null,
    createdAt: '2026-08-06T18:33:00.000Z',
    children: [],
  },
]

export const conflict = (movementId: number, description: string): Record<string, unknown> => ({
  movementId,
  description,
  bookingDate: '2026-08-14',
  matches: [
    { ruleId: 3, matchText: 'sintetico', categoryId: 4, categoryName: 'Supermercado' },
    { ruleId: 9, matchText: 'ejemplo', categoryId: 6, categoryName: 'Suministros' },
  ],
})

export const APPLY_OK = {
  categorized: 12,
  conflictCount: 1,
  conflicts: [conflict(210, 'PAGO SINTETICO EJEMPLO')],
  unmatched: 5,
}

/** The backend's own error bodies, in Spanish as the real ones. */
export const CONFLICT_BODY = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Ya existe una regla con el texto «mercadona»',
}
export const NOT_FOUND_BODY = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'La categoría 99 no existe',
}
export const VALIDATION_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'El texto debe tener al menos 3 caracteres tras normalizar',
}

/** The Spanish sentences no message of ours may ever contain. */
export const BACKEND_MESSAGES = [
  CONFLICT_BODY.message,
  NOT_FOUND_BODY.message,
  VALIDATION_BODY.message,
]

export const httpError = (status: number, body: { code: string; message: string }): ApiError =>
  new ApiError(`HTTP ${status}: ${body.message}`, API_HTTP, { status, apiCode: body.code })

export const networkError = (): ApiError =>
  new ApiError('Network request failed: /api/category-rules', API_NETWORK)

export const unreadable = (): ValidationError =>
  new ValidationError('POST /api/category-rules: response is not an object')

export interface Call {
  path: string
  method: string
  body?: unknown
  contentType?: string
}

type Answer = (call: Call) => Promise<unknown>

/**
 * A fake HTTP client that records every call. Nothing touches `fetch`: these tests
 * exercise the service and the store, and a request must never leave (C6).
 */
export function fakeClient(answers: Record<string, Answer | undefined> = {}) {
  const calls: Call[] = []
  const client = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(
    async (path, init) => {
      const call: Call = {
        path,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        contentType: new Headers(init?.headers).get('Content-Type') ?? undefined,
      }
      calls.push(call)
      const key = `${call.method} ${call.path.split('?')[0] ?? ''}`
      const answer = answers[key] ?? answers[call.method]
      if (!answer) throw new Error(`unexpected ${key}`)
      return answer(call)
    },
  )
  return {
    client: client as unknown as <T>(path: string, init?: RequestInit) => Promise<T>,
    calls,
    of: (path: string) => calls.filter((call) => call.path.split('?')[0] === path),
    count: (path: string) => calls.filter((call) => call.path.split('?')[0] === path).length,
  }
}

export const jsonOf = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

/**
 * Mocks the HTTP boundary for the screen tests and records every call. Anything not
 * routed here is rejected, so a request the screen should never make shows up as a
 * failure instead of going anywhere.
 */
export function mockFetch(answers: {
  categories?: () => Promise<Response>
  /** GET and POST of /api/category-rules. */
  rules?: () => Promise<Response>
  /** PATCH and DELETE of /api/category-rules/:id. */
  rule?: () => Promise<Response>
  apply?: () => Promise<Response>
}) {
  const calls: Call[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const call: Call = {
      path: url.pathname,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      contentType: new Headers(init?.headers).get('Content-Type') ?? undefined,
    }
    calls.push(call)
    if (url.pathname === '/api/categories' && answers.categories) return answers.categories()
    if (url.pathname === '/api/category-rules/apply' && answers.apply) return answers.apply()
    if (url.pathname === '/api/category-rules' && answers.rules) return answers.rules()
    if (url.pathname.startsWith('/api/category-rules/') && answers.rule) return answers.rule()
    return Promise.reject(new TypeError(`unexpected ${call.method} ${call.path}`))
  })
  return {
    calls,
    count: (path: string) => calls.filter((call) => call.path === path).length,
    touchedMovements: () => calls.some((call) => call.path.startsWith('/api/movements')),
  }
}

export const answer =
  (body: unknown): Answer =>
  () =>
    Promise.resolve(body)
export const rejectWith =
  (error: unknown): Answer =>
  () =>
    Promise.reject(error)

/** A response that only arrives when the test says so. */
export function deferred<T = unknown>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { answer: (() => promise) as Answer, resolve }
}
