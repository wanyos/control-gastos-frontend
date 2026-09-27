import { vi } from 'vitest'

// Raw API payloads for the statement tests (feature 19), shaped like
// gastos-backend/docs/api-contract.md → GET /api/movements. They stay raw JSON: the
// tests push them through `parseMovementPage`, which is what proves the boundary.

const BANKINTER = {
  id: 1,
  iban: 'ES9820385778983000760236',
  bank: 'bankinter',
  alias: 'bankinter ···0236',
  type: 'checking',
}

const MYINVESTOR = {
  id: 2,
  iban: 'ES6301289999990123456789',
  bank: 'myinvestor',
  alias: 'myinvestor ···6789',
  type: 'checking',
}

export const FOOD = { id: 1, name: 'Food', kind: 'expense', parentId: null }
export const SALARY = { id: 4, name: 'Salary', kind: 'income', parentId: null }

const base = {
  currency: 'EUR',
  note: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'confirmed',
  transferId: null,
  balanceAfter: null,
  daySequence: 1,
  createdAt: '2026-09-12T18:30:00.000Z',
  updatedAt: '2026-09-12T18:30:00.000Z',
}

/** A raw movement of the month, as the API sends it. */
export const movement = (raw: Record<string, unknown>): Record<string, unknown> => ({
  ...base,
  accountId: 1,
  account: BANKINTER,
  categoryId: null,
  category: null,
  ...raw,
})

/** An expense with a category and a balance in the file (which must NOT be painted). */
export const EXPENSE = movement({
  id: 10,
  type: 'expense',
  bookingDate: '2026-09-11',
  valueDate: '2026-09-11',
  amount: '45.37',
  description: 'CAFETERÍA CENTRAL',
  balanceAfter: '9954.63',
  categoryId: 1,
  category: FOOD,
  daySequence: 2,
})

/** Same day as EXPENSE: the two share one day header. */
export const EXPENSE_SAME_DAY = movement({
  id: 11,
  type: 'expense',
  bookingDate: '2026-09-11',
  valueDate: '2026-09-11',
  amount: '12.00',
  description: 'COMPRA SUPERMERCADO',
  daySequence: 1,
})

/** An income with no category, an older day. */
export const INCOME = movement({
  id: 12,
  type: 'income',
  bookingDate: '2026-09-04',
  valueDate: '2026-09-04',
  amount: '1200.00',
  description: 'NOMINA SEPTIEMBRE',
  categoryId: 4,
  category: SALARY,
  accountId: 2,
  account: MYINVESTOR,
})

/** A paired transfer: visible in the list, out of the month's figures (R10). */
export const TRANSFER = movement({
  id: 13,
  type: 'expense',
  bookingDate: '2026-09-02',
  valueDate: '2026-09-02',
  amount: '500.00',
  description: 'TRANSFERENCIA A MYINVESTOR',
  transferId: 'tr_2026_09_02_1',
  accountId: 2,
  account: MYINVESTOR,
})

/** A neutral movement: neither income nor expense. */
export const NEUTRAL = movement({
  id: 14,
  type: 'neutral',
  bookingDate: '2026-09-02',
  valueDate: '2026-09-02',
  amount: '0.00',
  description: 'AJUSTE DE SALDO',
})

/**
 * The month's figures. They deliberately do NOT match the sum of the movements
 * below: they are the backend's, over the whole month, and the screen never
 * recomputes them (R5).
 */
export const TOTALS = { income: '57949.11', expense: '59096.42', net: '-1147.31' }
const ZERO_TOTALS = { income: '0.00', expense: '0.00', net: '0.00' }

/** September 2026 in one page: four days, in the order the API sent them. */
export const MONTH_PAGE = {
  movements: [EXPENSE, EXPENSE_SAME_DAY, INCOME, TRANSFER, NEUTRAL],
  pagination: { page: 1, pageSize: 200, total: 5, totalPages: 1 },
  totals: TOTALS,
}

/** Another month, so a test can tell one answer from the other. */
export const OTHER_MONTH_PAGE = {
  movements: [
    movement({
      id: 20,
      type: 'expense',
      bookingDate: '2026-08-14',
      valueDate: '2026-08-14',
      amount: '99.99',
      description: 'PAGO TARJETA',
    }),
  ],
  pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
  totals: { income: '10.00', expense: '99.99', net: '-89.99' },
}

/** A valid month with no matches: 200 with `total: 0`, not an error. */
export const EMPTY_MONTH_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 200, total: 0, totalPages: 0 },
  totals: ZERO_TOTALS,
}

/** A month that does not fit in one page: 412 movements over two pages. */
export const BIG_MONTH_PAGE_ONE = {
  movements: [EXPENSE, INCOME],
  pagination: { page: 1, pageSize: 200, total: 412, totalPages: 2 },
  totals: TOTALS,
}

/** Page 2 of that month: the figures are the same, they belong to the month (R13). */
export const BIG_MONTH_PAGE_TWO = {
  movements: [
    movement({
      id: 30,
      type: 'expense',
      bookingDate: '2026-09-01',
      valueDate: '2026-09-01',
      amount: '7.50',
      description: 'RECIBO AGUA',
    }),
  ],
  pagination: { page: 2, pageSize: 200, total: 412, totalPages: 2 },
  totals: TOTALS,
}

/** The backend's own error body, in Spanish as the real one. */
export const VALIDATION_ERROR_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'El parámetro «from» no es una fecha válida',
}

/** The five accounts that fill the account select (feature 20), as the API sends them. */
export const ACCOUNTS = [
  {
    id: 1,
    iban: 'ES9820385778983000760236',
    bank: 'bankinter',
    alias: 'bankinter ···0236',
    type: 'checking',
    balance: '9954.63',
  },
  {
    id: 2,
    iban: 'ES6301289999990123456789',
    bank: 'myinvestor',
    alias: 'myinvestor ···6789',
    type: 'checking',
    balance: '3206.28',
  },
]

/** The category tree that fills the category select, one level deep. */
export const CATEGORIES = [
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
    ],
  },
  {
    id: 4,
    name: 'Salary',
    kind: 'income',
    parentId: null,
    createdAt: '2026-08-06T18:32:00.000Z',
    children: [],
  },
]

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
  /** The body exactly as it travelled, so a test can read it letter by letter (R1). */
  rawBody?: string
  contentType?: string
}

/**
 * Mocks the HTTP boundary and records every call, so a test can assert both the
 * querystring and that no call ever uses a method other than GET (C1).
 */
export function mockApi(answers: {
  movements?: Answer | ((query: URLSearchParams) => Promise<Response>)
  /** Feature 20: the two lists that fill the filter selects. Default to the fixtures. */
  accounts?: Answer
  categories?: Answer
  /** Feature 21: `PATCH /api/movements/:id`, the only write of this screen. */
  patch?: Answer | ((id: number, body: unknown) => Promise<Response>)
  /** Feature 21: `POST /api/category-rules`, the rule born from a line (R16). */
  createRule?: Answer
}) {
  const calls: ApiCall[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const rawBody = typeof init?.body === 'string' ? init.body : undefined
    const headers = new Headers(init?.headers)
    calls.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      rawBody,
      contentType: headers.get('Content-Type') ?? undefined,
    })
    if (method === 'PATCH' && PATCH_ONE.test(url.pathname) && answers.patch) {
      const id = Number(url.pathname.split('/').at(-1))
      return answers.patch(id, rawBody === undefined ? undefined : JSON.parse(rawBody))
    }
    if (url.pathname === '/api/category-rules' && method === 'POST' && answers.createRule) {
      return answers.createRule()
    }
    if (url.pathname === '/api/movements' && method === 'GET' && answers.movements) {
      return answers.movements(url.searchParams)
    }
    if (url.pathname === '/api/accounts' && method === 'GET') {
      return (answers.accounts ?? json(ACCOUNTS))()
    }
    if (url.pathname === '/api/categories' && method === 'GET') {
      return (answers.categories ?? json(CATEGORIES))()
    }
    return Promise.reject(new TypeError(`unexpected ${method} ${url.pathname}`))
  })
  return {
    calls,
    spy,
    /** Querystrings of the movement GETs, in order. */
    queries: () =>
      calls.filter((call) => call.path === MOVEMENTS).map((call) => call.query.toString()),
    methods: () => [...new Set(calls.map((call) => call.method))],
    /** The writes, in order: path and the body as it travelled (feature 21). */
    patches: () => calls.filter((call) => call.method === 'PATCH'),
  }
}

export const MOVEMENTS = '/api/movements'

const PATCH_ONE = /^\/api\/movements\/\d+$/

/** The same movement with some fields changed, as the PATCH answers it (feature 21). */
export const changed = (
  raw: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> => ({ ...raw, ...patch, updatedAt: '2026-09-27T10:00:00.000Z' })

/** A pending movement, so a test can tell it from the confirmed ones of the month. */
export const PENDING_EXPENSE = movement({
  id: 15,
  type: 'expense',
  bookingDate: '2026-09-11',
  valueDate: '2026-09-11',
  amount: '20.00',
  description: 'PAGO PENDIENTE',
  status: 'pending_review',
  daySequence: 3,
})

export const GROCERIES = { id: 2, name: 'Groceries', kind: 'expense', parentId: 1 }

/** The rule `POST /api/category-rules` answers with (feature 21, R16). */
export const CREATED_RULE = {
  id: 71,
  matchText: 'cafeteria central',
  categoryId: 2,
  category: GROCERIES,
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
}

/** The backend's own 404 body, in Spanish as the real one. */
export const NOT_FOUND_BODY = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'No existe el movimiento 10',
}
