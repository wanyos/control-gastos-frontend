// Test data of the table of own accounts (feature 36). Every value is made up: names,
// texts and forms of the name are invented, and the account numbers are all zeros, so
// none of them passes the IBAN check. The banks are real names: the screen shows banks.

import { vi } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

const STAMP = '2026-10-20T09:15:02.000Z'

interface RawRow {
  id: number
  name: string
  bank: string
  accountNumber: string | null
  type: string
  openedAt: string | null
  closedAt: string | null
  texts: string[]
}

/** One row as the contract sends it, with the two stamps the screen does not read. */
export const rawRow = (row: RawRow): Record<string, unknown> => ({
  ...row,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const number = (last: number): string => `ES00 0000 0000 0000 0000 ${String(last).padStart(4, '0')}`

/**
 * Twelve rows in the order of the contract (`bank`, then `name`, then `id`): the six
 * types, three rows with no texts (ids 12, 9, 8), two with no number (ids 7, 12) and
 * one closed (id 5).
 */
export const TWELVE_ROWS: RawRow[] = [
  {
    id: 3,
    name: 'Cuenta inventada uno',
    bank: 'Bankinter',
    accountNumber: number(1),
    type: 'checking',
    openedAt: '2019-04-02',
    closedAt: null,
    texts: ['Cuenta Inventada Uno'],
  },
  {
    id: 7,
    name: 'Hucha inventada',
    bank: 'Bankinter',
    accountNumber: null,
    type: 'savings',
    openedAt: null,
    closedAt: null,
    texts: ['Hucha inventada', 'Bankinter'],
  },
  {
    id: 12,
    name: 'Monedero inventado',
    bank: 'Criptan',
    accountNumber: null,
    type: 'crypto',
    openedAt: '2026-10-01',
    closedAt: null,
    texts: [],
  },
  {
    id: 5,
    name: 'Cuenta inventada dos',
    bank: 'ING',
    accountNumber: number(2),
    type: 'checking',
    openedAt: '2015-09-14',
    closedAt: '2024-06-30',
    texts: ['Cuenta Inventada Dos'],
  },
  {
    id: 9,
    name: 'Naranja inventada',
    bank: 'ING',
    accountNumber: number(3),
    type: 'savings',
    openedAt: null,
    closedAt: null,
    texts: [],
  },
  {
    id: 2,
    name: 'Cartera indexada inventada',
    bank: 'MyInvestor',
    accountNumber: number(4),
    type: 'investment',
    openedAt: '2024-03-11',
    closedAt: null,
    texts: ['Cartera Indexada Inventada', 'MyInvestor'],
  },
  {
    id: 10,
    name: 'Deposito inventado',
    bank: 'MyInvestor',
    accountNumber: number(5),
    type: 'deposit',
    openedAt: '2025-01-15',
    closedAt: null,
    texts: ['Deposito Inventado 12M'],
  },
  {
    id: 6,
    name: 'Cuenta inventada tres',
    bank: 'N26',
    accountNumber: number(6),
    type: 'checking',
    openedAt: '2021-07-19',
    closedAt: null,
    texts: ['N26 Inventada'],
  },
  {
    id: 8,
    name: 'Cuenta inventada cuatro',
    bank: 'Openbank',
    accountNumber: number(7),
    type: 'checking',
    openedAt: '2018-02-27',
    closedAt: null,
    texts: [],
  },
  {
    id: 11,
    name: 'Bolsillo inventado',
    bank: 'Revolut',
    accountNumber: number(8),
    type: 'other',
    openedAt: '2022-11-03',
    closedAt: null,
    texts: ['Bolsillo Inventado'],
  },
  {
    id: 1,
    name: 'Cartera inventada',
    bank: 'Trade Republic',
    accountNumber: number(9),
    type: 'investment',
    openedAt: '2023-05-08',
    closedAt: null,
    texts: ['Cartera Inventada', 'Trade Republic'],
  },
  {
    id: 4,
    name: 'Remunerada inventada',
    bank: 'Trade Republic',
    accountNumber: number(10),
    type: 'savings',
    openedAt: '2023-05-08',
    closedAt: null,
    texts: ['Remunerada Inventada'],
  },
]

/** A fresh copy of the twelve rows, so a test can change one without touching the rest. */
export const rows = (): RawRow[] => TWELVE_ROWS.map((row) => ({ ...row, texts: [...row.texts] }))

/** The body of `GET /api/own-accounts` for the given rows (the twelve by default). */
export const rawOwnAccounts = (list: RawRow[] = rows()) => ({ ownAccounts: list.map(rawRow) })

export const rawEmptyOwnAccounts = () => ({ ownAccounts: [] })

/** The row the tests add: a new account at Criptan. */
export const NEW_ROW: RawRow = {
  id: 13,
  name: 'Monedero inventado dos',
  bank: 'Criptan',
  accountNumber: null,
  type: 'crypto',
  openedAt: '2026-10-21',
  closedAt: null,
  texts: ['Monedero Inventado Dos'],
}

/** The twelve rows with the new one in the place the backend would put it. */
export const rowsWithNew = (): RawRow[] => {
  const list = rows()
  list.splice(3, 0, { ...NEW_ROW, texts: [...NEW_ROW.texts] })
  return list
}

/** The twelve rows with one of them replaced by `changes`. */
export const rowsWith = (id: number, changes: Partial<RawRow>): RawRow[] =>
  rows().map((row) => (row.id === id ? { ...row, ...changes } : row))

export const rowOf = (id: number): RawRow => {
  const row = TWELVE_ROWS.find((one) => one.id === id)
  if (!row) throw new Error(`no row ${id}`)
  return { ...row, texts: [...row.texts] }
}

/** `GET /api/own-accounts/holder-names`, in alphabetical order as the contract says. */
export const HOLDER_NAMES = { names: ['Inventado Titular', 'Titular Inventado'] }

/** The backend's own error bodies, in Spanish as the real ones. */
export const VALIDATION_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'El texto debe tener al menos 3 caracteres tras normalizar',
}
export const NOT_FOUND_BODY = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'No existe la cuenta propia 99',
}
export const SERVER_ERROR_BODY = {
  statusCode: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error interno del servidor',
}

/** The Spanish sentences no message of ours may ever contain. */
export const BACKEND_MESSAGES = [
  VALIDATION_BODY.message,
  NOT_FOUND_BODY.message,
  SERVER_ERROR_BODY.message,
]

export const httpError = (status: number, body: { code: string; message: string }): ApiError =>
  new ApiError(`HTTP ${status}: ${body.message}`, API_HTTP, { status, apiCode: body.code })

export const networkError = (): ApiError =>
  new ApiError('Network request failed: /api/own-accounts', API_NETWORK)

export const unreadable = (): ValidationError =>
  new ValidationError('GET /api/own-accounts: response is not an object')

// ─── A fake HTTP client, for the service and the store ──────────────────────

export interface Call {
  path: string
  method: string
  body?: unknown
  contentType?: string
}

type Answer = (call: Call) => Promise<unknown>

/**
 * A fake HTTP client that records every call. Nothing touches `fetch`: a request must
 * never leave. Each key (`METHOD /path`, or just `METHOD`) holds a list of answers,
 * used in order; the last one repeats.
 */
export function fakeClient(answers: Record<string, Answer | Answer[] | undefined> = {}) {
  const calls: Call[] = []
  const used = new Map<string, number>()
  const client = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(
    async (path, init) => {
      const call: Call = {
        path,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        contentType: new Headers(init?.headers).get('Content-Type') ?? undefined,
      }
      calls.push(call)
      const exact = `${call.method} ${call.path}`
      const key = answers[exact] ? exact : call.method
      const list = answers[key]
      if (!list) throw new Error(`unexpected ${exact}`)
      const options = Array.isArray(list) ? list : [list]
      const index = used.get(key) ?? 0
      used.set(key, index + 1)
      const answer = options[Math.min(index, options.length - 1)]
      if (!answer) throw new Error(`no answer for ${exact}`)
      return answer(call)
    },
  )
  return {
    client: client as unknown as <T>(path: string, init?: RequestInit) => Promise<T>,
    calls,
    of: (method: string, path: string) =>
      calls.filter((call) => call.method === method && call.path === path),
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

// ─── The HTTP boundary, for the screen ──────────────────────────────────────

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Reply = () => Promise<Response>

export const json =
  (body: unknown, status = 200): Reply =>
  () =>
    Promise.resolve(jsonResponse(body, status))

export const networkDown: Reply = () => Promise.reject(new TypeError('Failed to fetch'))

/**
 * Mocks `fetch` for the screen tests and records every call. Routes are `METHOD /path`;
 * `PATCH /api/own-accounts/:id` matches any id. Each route holds its replies in order
 * (the last one repeats). Anything not routed is rejected, so a request the screen
 * should never make shows up as a failure instead of going anywhere.
 */
export function mockFetch(routes: Record<string, Reply[]>) {
  const calls: Call[] = []
  const used = new Map<string, number>()
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const call: Call = {
      path: url.pathname,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      contentType: new Headers(init?.headers).get('Content-Type') ?? undefined,
    }
    calls.push(call)
    const route = /^\/api\/own-accounts\/\d+$/.test(url.pathname)
      ? `${call.method} /api/own-accounts/:id`
      : `${call.method} ${url.pathname}`
    const replies = routes[route]
    if (!replies || replies.length === 0) {
      return Promise.reject(new TypeError(`unexpected ${call.method} ${call.path}`))
    }
    const index = used.get(route) ?? 0
    used.set(route, index + 1)
    const reply = replies[Math.min(index, replies.length - 1)]
    return reply ? reply() : Promise.reject(new TypeError('no reply prepared'))
  })
  return {
    calls,
    of: (method: string, path: string) =>
      calls.filter((call) => call.method === method && call.path === path),
    writes: () => calls.filter((call) => call.method !== 'GET'),
  }
}
