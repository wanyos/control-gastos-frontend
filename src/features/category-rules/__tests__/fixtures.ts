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

/** One element of `categorizedMovements`: an expense one rule sent to Supermercado. */
export const categorizedMovement = (
  movementId: number,
  description: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  movementId,
  description,
  bookingDate: '2026-08-11',
  amount: '41.37',
  type: 'expense',
  categoryId: 4,
  categoryName: 'Supermercado',
  rules: [{ ruleId: 3, matchText: 'sintetico colmado' }],
  ...overrides,
})

/** The first of the list: two rules of the same category matched it. */
export const TWO_RULES_MOVEMENT = categorizedMovement(198, 'COMPRA SINTETICO COLMADO NORTE', {
  rules: [
    { ruleId: 3, matchText: 'sintetico colmado' },
    { ruleId: 12, matchText: 'colmado norte' },
  ],
})

/** The second: an income, so its amount is painted without a sign. */
export const INCOME_MOVEMENT = categorizedMovement(203, 'ABONO SINTETICO TALLER EJEMPLO', {
  bookingDate: '2026-08-12',
  amount: '1318.64',
  type: 'income',
  categoryId: 9,
  categoryName: 'Nomina',
  rules: [{ ruleId: 9, matchText: 'taller ejemplo' }],
})

/** Twelve, as many as `categorized` says, by `movementId` ascending as the API sends them. */
export const TWELVE_CATEGORIZED = [
  TWO_RULES_MOVEMENT,
  INCOME_MOVEMENT,
  ...Array.from({ length: 10 }, (_item, index) =>
    categorizedMovement(204 + index, `RECIBO SINTETICO SUMINISTRO ${index + 1}`, {
      bookingDate: `2026-08-${13 + index}`,
      amount: `${17 + index * 3}.${String(29 + index * 7).padStart(2, '0')}`,
      categoryId: 6,
      categoryName: 'Suministros',
      rules: [{ ruleId: 8, matchText: 'sintetico suministro' }],
    }),
  ),
]

export const APPLY_OK = {
  categorized: 12,
  categorizedMovements: TWELVE_CATEGORIZED,
  conflictCount: 1,
  conflicts: [conflict(210, 'PAGO SINTETICO EJEMPLO')],
  unmatched: 5,
}

// ─── Since feature 33: what a POST or a PATCH of a rule moved, and the suggestions ──

/** The `categorization` of a pass that moved nothing. */
export const NOTHING_MOVED = {
  categorized: 0,
  categorizedMovements: [],
  conflictCount: 0,
  conflicts: [],
  unmatched: 0,
}

/** The answer of a POST or a PATCH: the rule at the root and what its pass moved. */
export const saved = (
  raw: Record<string, unknown>,
  categorization: Record<string, unknown> = NOTHING_MOVED,
): Record<string, unknown> => ({ ...raw, categorization })

export const EDUCATION = { id: 12, name: 'Educación', kind: 'expense', parentId: null }

/** The rule a suggestion becomes: `academia ficticia norte` → Educación. */
export const ACADEMY_RULE = rule(31, 'academia ficticia norte', EDUCATION)

/** The three movements creating it moved, as `categorizedMovements` lists them. */
export const ACADEMY_MOVED = [405, 437, 466].map((movementId, index) =>
  categorizedMovement(movementId, 'RECIBO /Academia Ficticia Norte', {
    bookingDate: `2026-0${7 + index}-01`,
    amount: '48.50',
    categoryId: 12,
    categoryName: 'Educación',
    rules: [{ ruleId: 31, matchText: 'academia ficticia norte' }],
  }),
)

/** `POST /api/category-rules` 201 with `categorization` (feature 33). */
export const ACADEMY_CREATED = saved(ACADEMY_RULE, {
  categorized: 3,
  categorizedMovements: ACADEMY_MOVED,
  conflictCount: 0,
  conflicts: [],
  unmatched: 214,
})

/** The same 201 whose pass broke halfway: one movement moved, and the error. */
export const ACADEMY_UNFINISHED = saved(ACADEMY_RULE, {
  categorized: 1,
  categorizedMovements: ACADEMY_MOVED.slice(0, 1),
  conflictCount: 0,
  conflicts: [],
  unmatched: 214,
  error: { code: 'RULES_PASS_FAILED', message: 'La pasada se cortó a mitad' },
})

const suggestedMovement = (
  movementId: number,
  description: string,
  bookingDate: string,
  amount: string,
): Record<string, unknown> => ({ movementId, description, bookingDate, amount })

/** `GET /api/category-rules/suggestions`: three, one of income, one with manual matches. */
export const SUPERMARKET_SUGGESTION = {
  matchText: 'supermercado inventado',
  kind: 'expense',
  movementCount: 4,
  movements: [
    suggestedMovement(412, 'SUPERMERCADO INVENTADO 4521', '2026-07-03', '23.87'),
    suggestedMovement(418, 'SUPERMERCADO INVENTADO 0087', '2026-07-11', '41.06'),
    suggestedMovement(433, 'SUPERMERCADO INVENTADO 4521', '2026-08-02', '17.39'),
    suggestedMovement(451, 'SUPERMERCADO INVENTADO 4521', '2026-08-19', '36.72'),
  ],
  manualMatches: 2,
}

export const ACADEMY_SUGGESTION = {
  matchText: 'academia ficticia norte',
  kind: 'expense',
  movementCount: 3,
  movements: [
    suggestedMovement(405, 'RECIBO /Academia Ficticia Norte', '2026-07-01', '48.50'),
    suggestedMovement(437, 'RECIBO /Academia Ficticia Norte', '2026-08-01', '48.50'),
    suggestedMovement(466, 'RECIBO /Academia Ficticia Norte', '2026-09-01', '48.50'),
  ],
  manualMatches: 0,
}

export const COOPERATIVE_SUGGESTION = {
  matchText: 'cooperativa sintetica',
  kind: 'income',
  movementCount: 3,
  movements: [
    suggestedMovement(409, 'ABONO /Cooperativa Sintetica 07', '2026-07-02', '126.35'),
    suggestedMovement(440, 'ABONO /Cooperativa Sintetica 08', '2026-08-04', '118.90'),
    suggestedMovement(468, 'ABONO /Cooperativa Sintetica 09', '2026-09-03', '131.12'),
  ],
  manualMatches: 0,
}

export const SUGGESTIONS = [SUPERMARKET_SUGGESTION, ACADEMY_SUGGESTION, COOPERATIVE_SUGGESTION]

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
  /** GET /api/movements: the count of the match preview (feature 18). */
  movements?: (url: URL) => Promise<Response>
  /** GET /api/category-rules/suggestions (feature 33). Defaults to an empty list. */
  suggestions?: () => Promise<Response>
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
    if (url.pathname === '/api/movements' && answers.movements) return answers.movements(url)
    if (url.pathname === '/api/category-rules/apply' && answers.apply) return answers.apply()
    if (url.pathname === '/api/category-rules/suggestions') {
      return answers.suggestions ? answers.suggestions() : jsonOf([])
    }
    if (url.pathname === '/api/category-rules' && answers.rules) return answers.rules()
    if (url.pathname.startsWith('/api/category-rules/') && answers.rule) return answers.rule()
    return Promise.reject(new TypeError(`unexpected ${call.method} ${call.path}`))
  })
  return {
    calls,
    count: (path: string) => calls.filter((call) => call.path === path).length,
    touchedMovements: () => calls.some((call) => call.path.startsWith('/api/movements')),
    /**
     * A movement was WRITTEN. Since feature 18 the rule dialog reads
     * `GET /api/movements` to count what a text would match, so «did not touch a
     * movement» is now about the method, not about the path.
     */
    wroteMovements: () =>
      calls.some((call) => call.path.startsWith('/api/movements') && call.method !== 'GET'),
    movements: () => calls.filter((call) => call.path.startsWith('/api/movements')),
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

// ─── The match preview (feature 18) ─────────────────────────────────────────
// Raw `GET /api/movements` payloads, shaped like the contract. They stay raw JSON:
// the tests push them through `@/shared/movements`, which is what proves the
// boundary checks. Declared here, not imported from the review tests: the rules
// feature does not depend on the review feature (design.md §1).

const ACCOUNT = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

/** A pending expense with no category: exactly what the preview asks about. */
export const movement = (
  id: number,
  description: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  type: 'expense',
  bookingDate: '2026-07-31',
  valueDate: '2026-07-31',
  amount: '45.37',
  description,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: ACCOUNT,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  excludedFromTotals: false,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-08-06T18:30:00.000Z',
  updatedAt: '2026-08-06T18:30:00.000Z',
  deposit: null,
  ownership: null,
  ...overrides,
})

export const MOVEMENT_TOTALS = { income: '0.00', expense: '45.37', net: '-45.37' }

/** A page of `GET /api/movements` with `total` free of the size of `movements`. */
export const movementPage = (
  movements: Record<string, unknown>[],
  total = movements.length,
): Record<string, unknown> => ({
  movements,
  pagination: { page: 1, pageSize: 5, total, totalPages: Math.ceil(total / 5) },
  totals: MOVEMENT_TOTALS,
})

// ─── The preview of a rule that does not exist yet (feature 34) ─────────────
// `GET /api/category-rules/preview`: the same `categorization` the POST would answer,
// with `ruleId: null` for the rule not created yet. Invented, shaped like the contract.

/** Two movements the new rule `academia ficticia norte` → Educación would move. */
export const PREVIEW_NEW_RULE_MOVED = [
  categorizedMovement(437, 'RECIBO /Academia Ficticia Norte', {
    bookingDate: '2026-08-01',
    amount: '48.50',
    categoryId: 12,
    categoryName: 'Educación',
    rules: [{ ruleId: null, matchText: 'academia ficticia norte' }],
  }),
  categorizedMovement(466, 'RECIBO /Academia Ficticia Norte', {
    bookingDate: '2026-09-01',
    amount: '52.75',
    categoryId: 12,
    categoryName: 'Educación',
    rules: [{ ruleId: null, matchText: 'academia ficticia norte' }],
  }),
]

/** One the request would move too, but by another rule that was pending (not the new one). */
export const PREVIEW_OTHER_RULE_MOVED = categorizedMovement(471, 'COMPRA SINTETICO COLMADO SUR', {
  bookingDate: '2026-09-04',
  amount: '19.84',
  rules: [{ ruleId: 3, matchText: 'sintetico colmado' }],
})

/** 200 with two movements of the new rule and one of another rule. */
export const PREVIEW_TWO = {
  matchText: 'academia ficticia norte',
  categoryId: 12,
  categorization: {
    categorized: 3,
    categorizedMovements: [...PREVIEW_NEW_RULE_MOVED, PREVIEW_OTHER_RULE_MOVED],
    conflictCount: 0,
    conflicts: [],
    unmatched: 211,
  },
}

/** 200 where the new rule would move nothing (another rule's pending one still moves). */
export const PREVIEW_NONE = {
  matchText: 'academia ficticia norte',
  categoryId: 12,
  categorization: {
    categorized: 1,
    categorizedMovements: [PREVIEW_OTHER_RULE_MOVED],
    conflictCount: 0,
    conflicts: [],
    unmatched: 213,
  },
}

/** 200 for a text typed in the question: one movement of the new rule. */
export const previewOf = (
  matchText: string,
  moved: Record<string, unknown>[],
  categoryId = 12,
): Record<string, unknown> => ({
  matchText,
  categoryId,
  categorization: {
    categorized: moved.length,
    categorizedMovements: moved,
    conflictCount: 0,
    conflicts: [],
    unmatched: 200,
  },
})

/** The 409 body of the preview: a rule with that normalized text already exists. */
export const PREVIEW_TAKEN_BODY = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Ya existe una regla con el texto «academia ficticia norte»',
}
