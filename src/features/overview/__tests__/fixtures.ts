import { vi } from 'vitest'

import type { MonthFigures, PeriodTotals } from '../types'

// The month at a glance (feature 25) against the REAL monthly figures, read from
// `GET /api/movements` on 2026-10-02. Only figures: the three totals and the count of
// each month. No description, no name, no account of the real base is in here.

type Figures = readonly [income: string, expense: string, net: string, count: number]

const REAL: Record<string, Figures> = {
  '2024-01': ['3337.42', '1509.59', '1827.83', 65],
  '2024-02': ['2122.41', '1074.93', '1047.48', 34],
  '2024-03': ['53622.12', '821.44', '52800.68', 50],
  '2025-03': ['4002.93', '8147.47', '-4144.54', 53],
  '2025-04': ['1993.36', '6314.44', '-4321.08', 53],
  '2025-05': ['2254.36', '2573.59', '-319.23', 59],
  '2025-06': ['4249.94', '2371.53', '1878.41', 34],
  '2025-07': ['2212.66', '11527.15', '-9314.49', 42],
  '2025-08': ['2346.16', '10941.80', '-8595.64', 34],
  '2025-09': ['3910.73', '2352.42', '1558.31', 36],
  '2025-10': ['2151.95', '2819.35', '-667.40', 38],
  '2025-11': ['2150.66', '2062.95', '87.71', 31],
  '2025-12': ['5044.85', '3115.81', '1929.04', 49],
  '2026-01': ['3114.10', '1892.53', '1221.57', 35],
  '2026-02': ['2050.19', '1874.57', '175.62', 28],
  '2026-03': ['4392.47', '2532.16', '1860.31', 34],
  '2026-04': ['2536.07', '4396.54', '-1860.47', 42],
  '2026-05': ['7204.68', '4827.26', '2377.42', 49],
  '2026-06': ['5144.33', '5085.22', '59.11', 83],
  '2026-07': ['2785.90', '4096.05', '-1310.15', 93],
  '2026-08': ['2590.26', '4003.89', '-1413.63', 70],
  '2026-09': ['161.82', '966.84', '-805.02', 28],
}

/** Spending with no category of the months the tests look at: amount and count, real. */
const REAL_UNCATEGORIZED: Record<string, readonly [amount: string, count: number]> = {
  '2024-01': ['1100.04', 50],
  '2024-02': ['894.71', 27],
  '2026-01': ['1622.70', 21],
  '2026-03': ['2125.82', 14],
  '2026-08': ['3036.33', 48],
  '2026-09': ['625.71', 14],
}

/** The newest movement of the whole base on 2026-10-02, out of 1.607. */
export const LATEST = '2026-09-11'
const BASE_TOTAL = 1607

const EMPTY: Figures = ['0.00', '0.00', '0.00', 0]

/** A month's figures as the service hands them over; a month with no data is empty. */
export function figuresOf(month: string): MonthFigures {
  const [income, expense, net, movementCount] = REAL[month] ?? EMPTY
  return { month, totals: { income, expense, net }, movementCount }
}

/** Figures made up for the cases the real base does not have. */
export function fabricated(
  month: string,
  income: string,
  expense: string,
  net: string,
  movementCount = 5,
): MonthFigures {
  return { month, totals: { income, expense, net }, movementCount }
}

/** A raw movement with every field of the contract and nothing real in it. */
const rawMovement = (bookingDate: string): Record<string, unknown> => ({
  id: 1,
  type: 'expense',
  bookingDate,
  valueDate: bookingDate,
  amount: '1.00',
  description: 'MOVEMENT',
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: { id: 1, iban: 'ES00', bank: 'bank', alias: 'bank ···0000', type: 'checking' },
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'confirmed',
  excludedFromTotals: false,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-09-12T18:30:00.000Z',
  updatedAt: '2026-09-12T18:30:00.000Z',
})

/** A raw page of `GET /api/movements?pageSize=1`. */
export function rawPage(
  totals: { income: string; expense: string; net: string },
  total: number,
  bookingDate?: string,
): Record<string, unknown> {
  return {
    movements: bookingDate === undefined ? [] : [rawMovement(bookingDate)],
    pagination: { page: 1, pageSize: 1, total, totalPages: total },
    totals,
  }
}

/** What the backend answers to a month with no filters. */
export function rawMonthPage(month: string): Record<string, unknown> {
  const { totals, movementCount } = figuresOf(month)
  return rawPage(totals, movementCount, movementCount > 0 ? `${month}-01` : undefined)
}

/** What it answers to the month's spending with no category. */
export function rawUncategorizedPage(month: string): Record<string, unknown> {
  const [amount, count] = REAL_UNCATEGORIZED[month] ?? ['0.00', 0]
  const net = amount === '0.00' ? '0.00' : `-${amount}`
  return rawPage({ income: '0.00', expense: amount, net }, count)
}

/** The newest movement of the base: the list with no filters, one row. */
export function rawLatestPage(latest: string | null = LATEST): Record<string, unknown> {
  return latest === null
    ? rawPage({ income: '0.00', expense: '0.00', net: '0.00' }, 0)
    : rawPage({ income: '0.00', expense: '0.00', net: '0.00' }, BASE_TOTAL, latest)
}

/**
 * What the backend adds up over the complete months of the 24 that end in `LATEST`
 * (feature 26): the 18 months of `REAL` from 2025-03 to 2026-08, added up apart. The
 * five months before them have no figures here, so they count as empty.
 */
export const PERIOD: PeriodTotals = {
  from: '2024-10',
  to: '2026-08',
  totals: { income: '60135.60', expense: '80934.73', net: '-20799.13' },
  movementCount: 863,
}
const PERIOD_FROM = '2024-10-01'
const PERIOD_TO = '2026-08-31'

/** What it answers to the whole range of `PERIOD`: its newest movement and the sums. */
export function rawPeriodPage(): Record<string, unknown> {
  return rawPage(PERIOD.totals, PERIOD.movementCount, PERIOD_TO)
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

/** The backend's own error body, in Spanish as the real one. */
export const SERVER_ERROR_BODY = {
  statusCode: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error interno del servidor',
}

/** A response that only arrives when the test says so. */
export function deferred() {
  let resolve: (response: Response) => void = () => {}
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { answer: () => promise, resolve }
}

/** Which of the reads a querystring is. `period`: `from` and `to` in different months. */
export type ReadKind = 'latest' | 'month' | 'uncategorized' | 'period'

export interface Read {
  kind: ReadKind
  /** `2026-08`; empty for the latest read; the month of `from` for a period. */
  month: string
  query: URLSearchParams
}

export function readOf(query: URLSearchParams): Read {
  const month = (query.get('from') ?? '').slice(0, 7)
  if (query.get('from') === null) return { kind: 'latest', month, query }
  const to = query.get('to')
  if (to !== null && to.slice(0, 7) !== month) return { kind: 'period', month, query }
  return { kind: query.get('uncategorized') === 'true' ? 'uncategorized' : 'month', month, query }
}

export interface ApiCall {
  method: string
  path: string
  search: string
  read: Read
}

/**
 * Mocks the HTTP boundary with the real figures and records every call. Nothing may
 * leave for real: jsdom's origin is the backend's, so any path other than
 * `GET /api/movements` is rejected here. `override` answers a read differently
 * (a failure, a deferred answer); returning undefined leaves the default. The only
 * period it answers is `PERIOD`: any other range is rejected, so a period worked out
 * wrong cannot pass in silence.
 */
export function mockBackend(
  override: (read: Read) => Promise<Response> | undefined = () => undefined,
  latest: string | null = LATEST,
) {
  const calls: ApiCall[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const read = readOf(url.searchParams)
    calls.push({ method, path: url.pathname, search: url.searchParams.toString(), read })
    if (method !== 'GET' || url.pathname !== '/api/movements') {
      return Promise.reject(new TypeError(`unexpected ${method} ${url.pathname}`))
    }
    const special = override(read)
    if (special) return special
    if (read.kind === 'latest') return json(rawLatestPage(latest))()
    if (read.kind === 'uncategorized') return json(rawUncategorizedPage(read.month))()
    if (read.kind === 'period') {
      const from = read.query.get('from')
      const to = read.query.get('to')
      return from === PERIOD_FROM && to === PERIOD_TO
        ? json(rawPeriodPage())()
        : Promise.reject(new TypeError(`unexpected period ${from} to ${to}`))
    }
    return json(rawMonthPage(read.month))()
  })
  return {
    calls,
    spy,
    searches: () => calls.map((call) => call.search),
    methods: () => [...new Set(calls.map((call) => call.method))],
    paths: () => [...new Set(calls.map((call) => call.path))],
    /** The months asked for with no filters, in order. */
    months: () => calls.filter((call) => call.read.kind === 'month').map((call) => call.read.month),
    count: (kind: ReadKind) => calls.filter((call) => call.read.kind === kind).length,
  }
}
