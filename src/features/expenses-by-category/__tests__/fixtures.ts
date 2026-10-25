// Test data for the spending by category (feature 37). The shape is the contract's
// (`GET /api/expenses-by-category`); every value is invented: no real shop, no real
// description, no real account.

import { vi } from 'vitest'

export const EXPENSES_PATH = '/api/expenses-by-category'

interface RawMovement {
  id: number
  bookingDate: string
  description: string
  amount: string
  accountId: number
}

interface RawCategory {
  id: number
  name: string
  parentId: number | null
  isFixed: boolean
}

interface RawLine {
  category: RawCategory | null
  amount: string
  comparedAmount: string
  difference: string
  change: string | null
  monthlyAmount: string | null
  movements: RawMovement[]
}

interface RawGroup {
  amount: string
  comparedAmount: string
  difference: string
  lines: RawLine[]
}

export interface RawExpenses {
  period: { month: string | null; year: string | null; from: string; to: string; months: number }
  compared: { from: string; to: string; months: number }
  compare: string
  amount: string
  comparedAmount: string
  difference: string
  fixed: RawGroup
  variable: RawGroup
}

const movement = (
  id: number,
  bookingDate: string,
  amount: string,
  description: string,
): RawMovement => ({ id, bookingDate, description, amount, accountId: 1 })

const vivienda = (): RawCategory => ({ id: 3, name: 'Vivienda', parentId: null, isFixed: true })
const combustible = (): RawCategory => ({
  id: 21,
  name: 'Combustible',
  parentId: 4,
  isFixed: false,
})
const restaurantes = (): RawCategory => ({
  id: 9,
  name: 'Restaurantes',
  parentId: null,
  isFixed: false,
})

/**
 * The contract's example (`?month=2026-09`): one fixed line, three variable ones, of
 * which the one with no category is new and `Restaurantes` is gone. It adds up.
 */
export function rawMonth(): RawExpenses {
  return {
    period: { month: '2026-09', year: null, from: '2026-09-01', to: '2026-09-30', months: 1 },
    compared: { from: '2026-08-01', to: '2026-08-31', months: 1 },
    compare: 'previous-month',
    amount: '714.20',
    comparedAmount: '688.34',
    difference: '25.86',
    fixed: {
      amount: '612.37',
      comparedAmount: '612.37',
      difference: '0.00',
      lines: [
        {
          category: vivienda(),
          amount: '612.37',
          comparedAmount: '612.37',
          difference: '0.00',
          change: null,
          monthlyAmount: null,
          movements: [movement(1802, '2026-09-01', '612.37', 'RECIBO /ALQUILER FICTICIO')],
        },
      ],
    },
    variable: {
      amount: '101.83',
      comparedAmount: '75.97',
      difference: '25.86',
      lines: [
        {
          category: combustible(),
          amount: '87.46',
          comparedAmount: '52.16',
          difference: '35.30',
          change: null,
          monthlyAmount: null,
          movements: [
            movement(1847, '2026-09-24', '39.63', 'ESTACION SERVICIO INVENTADA'),
            movement(1771, '2026-09-12', '47.83', 'ESTACION SERVICIO INVENTADA'),
          ],
        },
        {
          category: null,
          amount: '14.37',
          comparedAmount: '0.00',
          difference: '14.37',
          change: 'new',
          monthlyAmount: null,
          movements: [movement(1819, '2026-09-08', '14.37', 'COMPRA SIN CATEGORIA INVENTADA')],
        },
        {
          category: restaurantes(),
          amount: '0.00',
          comparedAmount: '23.81',
          difference: '-23.81',
          change: 'gone',
          monthlyAmount: null,
          movements: [],
        },
      ],
    },
  }
}

/** One charge a month of the same amount, newest first: what a year of a bill looks like. */
const everyMonth = (
  lastId: number,
  year: string,
  day: string,
  amount: string,
  description: string,
): RawMovement[] =>
  Array.from({ length: 12 }, (_, i) =>
    movement(lastId - i, `${year}-${String(12 - i).padStart(2, '0')}-${day}`, amount, description),
  )

/**
 * The same screen asked as a year (`?year=2025`), with `monthlyAmount` on every line.
 * Fixed 7348.44 + variable 1515.70 = 8864.14, against 8788.12 in 2024.
 */
export function rawYear(): RawExpenses {
  return {
    period: { month: null, year: '2025', from: '2025-01-01', to: '2025-12-31', months: 12 },
    compared: { from: '2024-01-01', to: '2024-12-31', months: 12 },
    compare: 'previous-year',
    amount: '8864.14',
    comparedAmount: '8788.12',
    difference: '76.02',
    fixed: {
      amount: '7348.44',
      comparedAmount: '7200.00',
      difference: '148.44',
      lines: [
        {
          category: vivienda(),
          amount: '7348.44',
          comparedAmount: '7200.00',
          difference: '148.44',
          change: null,
          monthlyAmount: '612.37',
          movements: everyMonth(1290, '2025', '01', '612.37', 'RECIBO /ALQUILER FICTICIO'),
        },
      ],
    },
    variable: {
      amount: '1515.70',
      comparedAmount: '1588.12',
      difference: '-72.42',
      lines: [
        {
          category: combustible(),
          amount: '1471.20',
          comparedAmount: '1302.40',
          difference: '168.80',
          change: null,
          monthlyAmount: '122.60',
          movements: everyMonth(1250, '2025', '14', '122.60', 'ESTACION SERVICIO INVENTADA'),
        },
        {
          category: null,
          amount: '44.50',
          comparedAmount: '0.00',
          difference: '44.50',
          change: 'new',
          monthlyAmount: '3.71',
          movements: [
            movement(1233, '2025-11-21', '9.98', 'COMPRA SIN CATEGORIA INVENTADA'),
            movement(1187, '2025-07-03', '20.15', 'PAGO TARJETA SIN CATEGORIA FICTICIO'),
            movement(1102, '2025-02-17', '14.37', 'COMPRA SIN CATEGORIA INVENTADA'),
          ],
        },
        {
          category: restaurantes(),
          amount: '0.00',
          comparedAmount: '285.72',
          difference: '-285.72',
          change: 'gone',
          monthlyAmount: '0.00',
          movements: [],
        },
      ],
    },
  }
}

/** A period with no spending on either side: every figure `0.00`, no lines. */
export function rawEmpty(): RawExpenses {
  const group = (): RawGroup => ({
    amount: '0.00',
    comparedAmount: '0.00',
    difference: '0.00',
    lines: [],
  })
  return {
    period: { month: '2026-09', year: null, from: '2026-09-01', to: '2026-09-30', months: 1 },
    compared: { from: '2026-08-01', to: '2026-08-31', months: 1 },
    compare: 'previous-month',
    amount: '0.00',
    comparedAmount: '0.00',
    difference: '0.00',
    fixed: group(),
    variable: group(),
  }
}

/** The month without the line with no category: 612.37 + 87.46 = 699.83. */
export function rawAllCategorized(): RawExpenses {
  const raw = rawMonth()
  raw.variable.lines = raw.variable.lines.filter((line) => line.category !== null)
  raw.variable.amount = '87.46'
  raw.variable.difference = '11.49'
  raw.amount = '699.83'
  raw.difference = '11.49'
  return raw
}

/** The groups add up to the root, but `fixed.amount` is not the sum of its lines. */
export function rawFixedNotAddingUp(): RawExpenses {
  const raw = rawMonth()
  raw.fixed.amount = '612.38'
  raw.amount = '714.21'
  return raw
}

/** The backend's 400 body, with the contract's shape. */
export const VALIDATION_ERROR_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'querystring/month must match pattern',
}

export const SERVER_ERROR_BODY = {
  statusCode: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error interno del servidor',
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
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
    if (method !== 'GET' || url.pathname !== EXPENSES_PATH) {
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
