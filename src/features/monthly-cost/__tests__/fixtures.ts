// Test data for what a month costs (feature 32). The shape is the contract's
// (`GET /api/recurring-expenses`); every value is invented: no person, no real shop,
// no real account number.

import { vi } from 'vitest'

/** The 12 complete months before October 2026, oldest first. */
export const PERIOD_MONTHS = [
  '2025-10',
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
] as const

/** The contract's `months` of a group: the 12 months, with what was spent in each. */
function monthsOf(spent: Record<string, string> = {}) {
  return PERIOD_MONTHS.map((month) => ({ month, amount: spent[month] ?? '0.00' }))
}

interface RawCategory {
  id: number
  name: string
  parentId: number | null
}

const category = (raw: RawCategory | null): RawCategory | null => raw

const charge = (
  id: number,
  accountId: number,
  bookingDate: string,
  amount: string,
  description: string,
) => ({
  id,
  accountId,
  bookingDate,
  amount,
  description,
})

/**
 * A response that adds up: bills 228.02, people 118.50 and variable 9.53 give the
 * monthly total 356.05. The bills come as the contract sends them, from the most to the
 * least expensive a month, and the last two had no charges in the period.
 */
export function rawRecurringExpenses() {
  return {
    period: { from: '2025-10-01', to: '2026-09-30', months: [...PERIOD_MONTHS] },
    monthlyTotal: '356.05',
    bills: [
      {
        key: 'comunidad vecinos',
        name: 'RECIBO /COMUNIDAD VECINOS INVENTADA',
        periodicity: 'monthly',
        usualAmount: '143.59',
        count: 26,
        lastDate: '2026-09-02',
        lastMonth: '2026-09',
        lastMonthAmount: '147.00',
        previousMonth: '2026-08',
        previousMonthAmount: '143.59',
        change: '3.41',
        hasIncreased: true,
        monthlyCost: '147.00',
        movements: [
          charge(4107, 1, '2026-09-02', '147.00', 'RECIBO /COMUNIDAD VECINOS INVENTADA'),
          charge(3958, 1, '2026-08-03', '143.59', 'RECIBO /COMUNIDAD VECINOS INVENTADA'),
        ],
      },
      {
        key: 'telefonia ficticia',
        name: 'RECIBO /TELEFONIA FICTICIA 0347',
        periodicity: 'monthly',
        usualAmount: '37.68',
        count: 14,
        lastDate: '2026-09-21',
        lastMonth: '2026-09',
        lastMonthAmount: '37.68',
        previousMonth: '2026-08',
        previousMonthAmount: '37.68',
        change: '0.00',
        hasIncreased: false,
        monthlyCost: '37.68',
        movements: [
          charge(4152, 2, '2026-09-21', '37.68', 'RECIBO /TELEFONIA FICTICIA 0347'),
          charge(3991, 2, '2026-08-21', '37.68', 'RECIBO /TELEFONIA FICTICIA 0347'),
        ],
      },
      {
        key: 'gimnasio inventado',
        name: 'RECIB. GIMNASIO INVENTADO CUOTA',
        periodicity: 'twice_monthly',
        usualAmount: '26.90',
        count: 22,
        lastDate: '2026-09-16',
        lastMonth: '2026-09',
        lastMonthAmount: '26.90',
        previousMonth: '2026-08',
        previousMonthAmount: '28.90',
        change: '-2.00',
        hasIncreased: false,
        monthlyCost: '26.90',
        movements: [
          charge(4139, 1, '2026-09-16', '13.45', 'RECIB. GIMNASIO INVENTADO CUOTA'),
          charge(4106, 1, '2026-09-01', '13.45', 'RECIB. GIMNASIO INVENTADO CUOTA'),
          charge(3977, 1, '2026-08-17', '14.45', 'RECIB. GIMNASIO INVENTADO CUOTA'),
        ],
      },
      {
        key: 'seguro hogar',
        name: 'RECIBO /SEGURO HOGAR FICTICIO',
        periodicity: 'annual',
        usualAmount: '187.37',
        count: 2,
        lastDate: '2025-11-03',
        lastMonth: '2025-11',
        lastMonthAmount: '197.29',
        previousMonth: '2024-11',
        previousMonthAmount: '187.37',
        change: '9.92',
        hasIncreased: true,
        monthlyCost: '16.44',
        movements: [
          charge(812, 1, '2025-11-03', '197.29', 'RECIBO /SEGURO HOGAR FICTICIO'),
          charge(344, 1, '2024-11-04', '187.37', 'RECIBO /SEGURO HOGAR FICTICIO'),
        ],
      },
      {
        key: 'academia idiomas',
        name: 'RECIBO /ACADEMIA IDIOMAS INVENTADA',
        periodicity: 'once',
        usualAmount: '41.93',
        count: 1,
        lastDate: '2024-06-12',
        lastMonth: '2024-06',
        lastMonthAmount: '41.93',
        previousMonth: null,
        previousMonthAmount: null,
        change: null,
        hasIncreased: false,
        monthlyCost: '0.00',
        movements: [charge(129, 1, '2024-06-12', '41.93', 'RECIBO /ACADEMIA IDIOMAS INVENTADA')],
      },
      {
        key: 'revista ficticia',
        name: 'RECIBO /REVISTA FICTICIA SUSCRIPCION',
        periodicity: 'every_six_months',
        usualAmount: '18.75',
        count: 3,
        lastDate: '2025-03-14',
        lastMonth: '2025-03',
        lastMonthAmount: '18.75',
        previousMonth: '2024-09',
        previousMonthAmount: '18.75',
        change: '0.00',
        hasIncreased: false,
        monthlyCost: '0.00',
        movements: [
          charge(611, 2, '2025-03-14', '18.75', 'RECIBO /REVISTA FICTICIA SUSCRIPCION'),
          charge(402, 2, '2024-09-13', '18.75', 'RECIBO /REVISTA FICTICIA SUSCRIPCION'),
          charge(187, 2, '2024-03-15', '18.75', 'RECIBO /REVISTA FICTICIA SUSCRIPCION'),
        ],
      },
    ],
    transfersToPeople: {
      months: monthsOf({ '2025-12': '1307.60', '2026-08': '114.40' }),
      monthlyCost: '118.50',
      movements: [
        charge(4011, 2, '2026-08-14', '114.40', 'BIZUM PERSONA INVENTADA'),
        charge(2876, 1, '2025-12-19', '1307.60', 'TRANSFERENCIA PERSONA FICTICIA'),
      ],
    },
    variable: [
      {
        category: category({ id: 21, name: 'Combustible', parentId: 4 }),
        months: monthsOf({ '2026-07': '52.16', '2026-09': '47.83' }),
        monthlyCost: '8.33',
        movements: [
          charge(4121, 2, '2026-09-12', '47.83', 'ESTACION SERVICIO INVENTADA'),
          charge(3880, 2, '2026-07-05', '52.16', 'ESTACION SERVICIO INVENTADA'),
        ],
      },
      {
        category: category(null),
        months: monthsOf({ '2026-01': '14.37' }),
        monthlyCost: '1.20',
        movements: [charge(3019, 1, '2026-01-19', '14.37', 'COMPRA SIN CATEGORIA INVENTADA')],
      },
    ],
  }
}

/** The contract's empty answer: nothing counts as spending in the period. */
export function rawEmptyRecurringExpenses() {
  return {
    period: { from: '2025-10-01', to: '2026-09-30', months: [...PERIOD_MONTHS] },
    monthlyTotal: '0.00',
    bills: [],
    transfersToPeople: { months: monthsOf(), monthlyCost: '0.00', movements: [] },
    variable: [],
  }
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

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
  return { promise, resolve }
}

export interface ApiCall {
  method: string
  path: string
  search: string
  body: unknown
}

/**
 * Mocks the HTTP boundary only: the real client runs. Each request takes the next
 * answer of the list (the last one repeats); a request to any other path, or with any
 * other method, is rejected and written down.
 */
export function mockBackend(answers: Array<() => Promise<Response>>) {
  const calls: ApiCall[] = []
  let next = 0
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    calls.push({ method, path: url.pathname, search: url.search, body: init?.body })
    if (method !== 'GET' || url.pathname !== '/api/recurring-expenses') {
      return Promise.reject(new TypeError(`unexpected ${method} ${url.pathname}`))
    }
    const answer = answers[Math.min(next, answers.length - 1)]
    next++
    return answer ? answer() : Promise.reject(new TypeError('no answer prepared'))
  })
  return { calls, spy }
}

export const json =
  (body: unknown, status = 200) =>
  (): Promise<Response> =>
    Promise.resolve(jsonResponse(body, { status }))

export const networkDown = (): Promise<Response> => Promise.reject(new TypeError('Failed to fetch'))
