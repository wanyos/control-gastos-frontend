import { vi } from 'vitest'

// Raw API payloads for the review tests (feature 15), shaped like
// gastos-backend/docs/api-contract.md → GET /api/movements and GET /api/categories.
// They stay raw JSON: the tests push them through the service, which is what
// proves the boundary checks.

const BANKINTER = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const N26 = {
  id: 2,
  iban: 'DE89370400440532013000',
  bank: 'n26',
  alias: 'n26 ···3000',
  type: 'checking',
}

export const FOOD = { id: 1, name: 'Food', kind: 'expense', parentId: null }
export const GROCERIES = { id: 2, name: 'Groceries', kind: 'expense', parentId: 1 }
export const SALARY = { id: 4, name: 'Salary', kind: 'income', parentId: null }

const base = {
  currency: 'EUR',
  note: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  transferId: null,
  createdAt: '2026-08-06T18:30:00.000Z',
  updatedAt: '2026-08-06T18:30:00.000Z',
}

/** An expense with a category. */
export const EXPENSE = {
  ...base,
  id: 10,
  type: 'expense',
  bookingDate: '2026-07-31',
  valueDate: '2026-07-31',
  amount: '45.37',
  description: 'CAFETERÍA CENTRAL',
  balanceAfter: '9954.63',
  accountId: 1,
  account: BANKINTER,
  categoryId: 1,
  category: FOOD,
  daySequence: 2,
}

/** An income with no category and no balance in the file. */
export const INCOME = {
  ...base,
  id: 11,
  type: 'income',
  bookingDate: '2026-07-30',
  valueDate: '2026-07-30',
  amount: '1200.00',
  description: 'NOMINA JULIO',
  balanceAfter: null,
  accountId: 2,
  account: N26,
  categoryId: null,
  category: null,
  daySequence: null,
}

/** A neutral movement: amount 0, neither income nor expense. */
export const NEUTRAL = {
  ...base,
  id: 12,
  type: 'neutral',
  bookingDate: '2026-08-02',
  valueDate: '2026-08-02',
  amount: '0.00',
  description: 'AJUSTE DE SALDO',
  balanceAfter: '9954.63',
  accountId: 1,
  account: BANKINTER,
  categoryId: null,
  category: null,
  daySequence: 1,
}

const TOTALS = { income: '1200.00', expense: '845.37', net: '354.63' }
const ZERO_TOTALS = { income: '0.00', expense: '0.00', net: '0.00' }

/**
 * A page of 3, deliberately NOT sorted by date: the list must keep the order the
 * API sent, never re-sort it.
 */
export const PAGE_OF_THREE = {
  movements: [EXPENSE, INCOME, NEUTRAL],
  pagination: { page: 1, pageSize: 100, total: 132, totalPages: 2 },
  totals: TOTALS,
}

/** A valid filter with no matches: 200, not an error. */
export const EMPTY_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
  totals: ZERO_TOTALS,
}

/** Page 2 of a 132-movement queue: 32 rows. */
export const PAGE_TWO = {
  movements: Array.from({ length: 32 }, (_item, index) => ({
    ...EXPENSE,
    id: 200 + index,
    description: `RECIBO ${index + 1}`,
  })),
  pagination: { page: 2, pageSize: 100, total: 132, totalPages: 2 },
  totals: TOTALS,
}

/** What the sidebar count asks for: one movement, the real total in `pagination`. */
export const COUNT_PAGE = {
  movements: [EXPENSE],
  pagination: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
  totals: TOTALS,
}

/** `GET /api/categories`: two roots with their children. */
export const CATEGORY_TREE = [
  {
    id: 1,
    name: 'Food',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [
      {
        id: 2,
        name: 'Groceries',
        kind: 'expense',
        parentId: 1,
        createdAt: '2026-08-06T18:31:00.000Z',
        children: [],
      },
      {
        id: 3,
        name: 'Restaurants',
        kind: 'expense',
        parentId: 1,
        createdAt: '2026-08-06T18:32:00.000Z',
        children: [],
      },
    ],
  },
  {
    id: 4,
    name: 'Salary',
    kind: 'income',
    parentId: null,
    createdAt: '2026-08-06T18:33:00.000Z',
    children: [],
  },
]

/** The same movement as the PATCH gives it back: only `categoryId`/`status` move. */
export const changed = (raw: object, changes: Record<string, unknown>): object => ({
  ...raw,
  ...changes,
})

/** The shape of `PATCH /api/movements`: what changed, and the movements already changed. */
export const bulkResult = (movements: object[]): object => ({
  updated: movements.length,
  movements,
})

/** The backend's own error bodies, in Spanish as the real ones. */
export const VALIDATION_ERROR_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'La página solicitada está más allá de la última con coincidencias',
}
export const NOT_FOUND_BODY = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'La cuenta 99 no existe',
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

type Answer = () => Promise<Response>

export const json =
  (body: unknown, status = 200): Answer =>
  () =>
    Promise.resolve(jsonResponse(body, { status }))

export const networkDown: Answer = () => Promise.reject(new TypeError('Failed to fetch'))

/** A response that only arrives when the test says so. */
export function deferred() {
  let resolve: (response: Response) => void = () => {}
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { answer: () => promise, resolve }
}

export interface ApiCall {
  method: string
  path: string
  query: URLSearchParams
  /** The parsed JSON body of a write, undefined for a read (feature 16). */
  body?: unknown
  /** Only the headers the caller set; `undefined` for a read. */
  contentType?: string
}

const readBody = (init?: RequestInit): unknown => {
  if (typeof init?.body !== 'string') return undefined
  try {
    return JSON.parse(init.body)
  } catch {
    return init.body
  }
}

const readContentType = (init?: RequestInit): string | undefined =>
  new Headers(init?.headers).get('Content-Type') ?? undefined

/**
 * Mocks the HTTP boundary and records every call: `movements` may be a single
 * answer or a function of the querystring, so a test can reply per page, and
 * `patch` answers both `PATCH /api/movements` and `PATCH /api/movements/:id`.
 */
export function mockApi(answers: {
  movements?: Answer | ((query: URLSearchParams) => Promise<Response>)
  categories?: Answer
  patch?: Answer | ((call: ApiCall) => Promise<Response>)
}) {
  const calls: ApiCall[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const call: ApiCall = {
      method,
      path: url.pathname,
      query: url.searchParams,
      body: readBody(init),
      contentType: readContentType(init),
    }
    calls.push(call)
    if (method === 'PATCH' && url.pathname.startsWith('/api/movements') && answers.patch) {
      return answers.patch(call)
    }
    if (url.pathname === '/api/movements' && method === 'GET' && answers.movements) {
      return answers.movements(url.searchParams)
    }
    if (url.pathname === '/api/categories' && answers.categories) {
      return answers.categories()
    }
    return Promise.reject(new TypeError(`unexpected ${method} ${url.pathname}`))
  })
  return {
    calls,
    spy,
    /** Querystrings of the movement GETs, in order. */
    movementQueries: () =>
      calls
        .filter((call) => call.path === '/api/movements' && call.method === 'GET')
        .map((call) => call.query.toString()),
    /** The writes, in order. */
    patches: () => calls.filter((call) => call.method === 'PATCH'),
    count: (path: string) => calls.filter((call) => call.path === path).length,
  }
}

export const MOVEMENTS = '/api/movements'
export const CATEGORIES = '/api/categories'

const CATEGORY_BY_ID: Record<number, object> = { 1: FOOD, 2: GROCERIES, 4: SALARY }

type Row = Record<string, unknown>

/**
 * A small fake of the queue for the action tests (feature 16): the GET answers with
 * the movements still pending, and the PATCH applies exactly what the contract
 * allows and gives the changed movements back. So the refresh that follows an action
 * tells the truth instead of resurrecting a movement that was just confirmed.
 * It always answers page 1: paging out of range has its own test.
 */
export function fakeQueue(seed: readonly object[] = [EXPENSE, INCOME, NEUTRAL], total = 132) {
  const rows = new Map<number, Row>(
    seed.map((row) => [(row as { id: number }).id, { ...row } as Row]),
  )

  const applyChanges = (row: Row, body: Row): Row => {
    if ('categoryId' in body) {
      const categoryId = body.categoryId as number | null
      row.categoryId = categoryId
      row.category = categoryId === null ? null : (CATEGORY_BY_ID[categoryId] ?? null)
    }
    if (body.status !== undefined) row.status = body.status
    return { ...row }
  }

  return {
    rows,
    movements: (query: URLSearchParams): Promise<Response> => {
      const pending = [...rows.values()].filter((row) => row.status === 'pending_review')
      const size = Number(query.get('pageSize') ?? 100)
      const count = total - (rows.size - pending.length)
      return Promise.resolve(
        jsonResponse({
          movements: size === 1 ? pending.slice(0, 1) : pending,
          pagination: {
            page: 1,
            pageSize: size,
            total: count,
            totalPages: Math.max(1, Math.ceil(count / size)),
          },
          totals: TOTALS,
        }),
      )
    },
    patch: (call: ApiCall): Promise<Response> => {
      const body = (call.body ?? {}) as Row
      const bulk = Array.isArray(body.ids)
      const ids = bulk ? (body.ids as number[]) : [Number(call.path.split('/').pop())]
      const changedRows = ids.flatMap((id) => {
        const row = rows.get(id)
        return row ? [applyChanges(row, body)] : []
      })
      return Promise.resolve(
        jsonResponse(
          bulk ? { updated: changedRows.length, movements: changedRows } : changedRows[0],
        ),
      )
    },
  }
}
