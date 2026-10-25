import { describe, it, expect, afterEach, vi } from 'vitest'

import type { HttpClient } from '@/services/http'
import { ApiError, API_HTTP, ValidationError } from '@/shared/errors'

import {
  EXPENSES_BY_CATEGORY_PATH,
  expensesQueryString,
  getExpensesByCategory,
  parseExpensesByCategory,
} from '../service'
import {
  VALIDATION_ERROR_BODY,
  json,
  mockBackend,
  rawEmpty,
  rawFixedNotAddingUp,
  rawMonth,
  rawYear,
} from './fixtures'

describe('expenses-by-category service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks a month with its comparison and a year without one, with no method and no body', async () => {
    expect(
      expensesQueryString({ mode: 'month', month: '2026-09', compare: 'previous-month' }),
    ).toBe('month=2026-09&compare=previous-month')
    expect(expensesQueryString({ mode: 'year', year: '2025' })).toBe('year=2025')

    const { calls, spy } = mockBackend([json(rawMonth()), json(rawYear())])

    await getExpensesByCategory({
      mode: 'month',
      month: '2026-09',
      compare: 'same-month-last-year',
    })
    await getExpensesByCategory({ mode: 'year', year: '2025' })

    expect(calls).toEqual([
      {
        method: 'GET',
        path: EXPENSES_BY_CATEGORY_PATH,
        search: '?month=2026-09&compare=same-month-last-year',
        body: undefined,
      },
      { method: 'GET', path: EXPENSES_BY_CATEGORY_PATH, search: '?year=2025', body: undefined },
    ])
    for (const [, init] of spy.mock.calls) {
      expect(init?.method).toBeUndefined()
      expect(init?.body).toBeUndefined()
    }

    // An injected client gets the path with its query, and nothing else.
    const asked: unknown[][] = []
    const client: HttpClient = <T>(...args: [string, RequestInit?]): Promise<T> => {
      asked.push(args)
      return Promise.resolve(rawYear() as T)
    }
    await getExpensesByCategory({ mode: 'year', year: '2025' }, client)
    expect(asked).toEqual([[`${EXPENSES_BY_CATEGORY_PATH}?year=2025`]])
  })

  it('maps every field of the response', () => {
    const read = parseExpensesByCategory(rawMonth())

    expect(read.period).toEqual({
      month: '2026-09',
      year: null,
      from: '2026-09-01',
      to: '2026-09-30',
      months: 1,
    })
    expect(read.compared).toEqual({ from: '2026-08-01', to: '2026-08-31', months: 1 })
    expect(read.compare).toBe('previous-month')
    expect([read.amount, read.comparedAmount, read.difference]).toEqual([
      '714.20',
      '688.34',
      '25.86',
    ])
    expect(read.fixed).toEqual({
      amount: '612.37',
      comparedAmount: '612.37',
      difference: '0.00',
      lines: [
        {
          category: { id: 3, name: 'Vivienda', parentId: null, isFixed: true },
          amount: '612.37',
          comparedAmount: '612.37',
          difference: '0.00',
          change: null,
          monthlyAmount: null,
          movements: [
            {
              id: 1802,
              bookingDate: '2026-09-01',
              description: 'RECIBO /ALQUILER FICTICIO',
              amount: '612.37',
              accountId: 1,
            },
          ],
        },
      ],
    })
    // The lines keep the backend's order, the one with no category included.
    expect(
      read.variable.lines.map((line) => [
        line.category?.name ?? null,
        line.change,
        line.difference,
      ]),
    ).toEqual([
      ['Combustible', null, '35.30'],
      [null, 'new', '14.37'],
      ['Restaurantes', 'gone', '-23.81'],
    ])
    expect(read.variable.lines[0]?.category?.parentId).toBe(4)
    expect(read.variable.lines[0]?.movements.map((movement) => movement.id)).toEqual([1847, 1771])
    expect(read.variable.lines[2]?.movements).toEqual([])

    const year = parseExpensesByCategory(rawYear())
    expect(year.period).toEqual({
      month: null,
      year: '2025',
      from: '2025-01-01',
      to: '2025-12-31',
      months: 12,
    })
    expect(year.compare).toBe('previous-year')
    expect(year.variable.lines.map((line) => line.monthlyAmount)).toEqual([
      '122.60',
      '3.71',
      '0.00',
    ])

    const empty = parseExpensesByCategory(rawEmpty())
    expect(empty.fixed).toEqual({
      amount: '0.00',
      comparedAmount: '0.00',
      difference: '0.00',
      lines: [],
    })
  })

  it('rejects a response whose groups do not add up to the total', () => {
    const root = rawMonth()
    root.amount = '714.21'
    expect(() => parseExpensesByCategory(root)).toThrow(ValidationError)
    expect(() => parseExpensesByCategory(root)).toThrow(
      'fixed and variable do not add up to amount',
    )

    expect(() => parseExpensesByCategory(rawFixedNotAddingUp())).toThrow(
      'fixed.lines do not add up to fixed.amount',
    )

    const variable = rawMonth()
    variable.variable.lines[0]!.amount = '87.47'
    expect(() => parseExpensesByCategory(variable)).toThrow(
      'variable.lines do not add up to variable.amount',
    )

    // The compared figures and the differences are shown as they come: not checked.
    const compared = rawMonth()
    compared.comparedAmount = '1.00'
    compared.fixed.difference = '9.99'
    expect(parseExpensesByCategory(compared).comparedAmount).toBe('1.00')
  })

  it('rejects a response that does not have the contract shape', async () => {
    const cases: Array<[(raw: ReturnType<typeof rawMonth>) => void, string]> = [
      [(raw) => Object.assign(raw, { amount: 714.2 }), 'amount is not a decimal string'],
      [(raw) => Object.assign(raw, { compare: 'last-week' }), 'compare is not one of'],
      [(raw) => Object.assign(raw.period, { month: '2026-9' }), 'period.month is not'],
      [(raw) => Object.assign(raw.period, { year: 2025 }), 'period.year is not'],
      [(raw) => Object.assign(raw.compared, { months: '1' }), 'compared.months is not'],
      [(raw) => Object.assign(raw.variable, { lines: null }), 'variable.lines is not an array'],
      [
        (raw) => Object.assign(raw.variable.lines[1]!, { change: 'renamed' }),
        'variable.lines[1].change is not one of',
      ],
      [
        (raw) => Object.assign(raw.fixed.lines[0]!.category!, { name: '' }),
        'fixed.lines[0].category.name is not a non-empty string',
      ],
      [
        (raw) => Object.assign(raw.fixed.lines[0]!.category!, { isFixed: 'yes' }),
        'fixed.lines[0].category.isFixed is not a boolean',
      ],
      [
        (raw) => Object.assign(raw.fixed.lines[0]!.movements[0]!, { bookingDate: '01/09/2026' }),
        'fixed.lines[0].movements[0].bookingDate is not',
      ],
      [
        (raw) => Object.assign(raw.fixed.lines[0]!, { monthlyAmount: 612.37 }),
        'fixed.lines[0].monthlyAmount is not',
      ],
    ]
    for (const [breakIt, message] of cases) {
      const raw = rawMonth()
      breakIt(raw)
      expect(() => parseExpensesByCategory(raw)).toThrow(ValidationError)
      expect(() => parseExpensesByCategory(raw)).toThrow(message)
    }
    expect(() => parseExpensesByCategory(null)).toThrow('response is not an object')

    // A 400 of the backend reaches the caller as the client's ApiError.
    mockBackend([json(VALIDATION_ERROR_BODY, 400)])
    const failure = await getExpensesByCategory({ mode: 'year', year: '2025' }).catch(
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ code: API_HTTP, status: 400, apiCode: 'VALIDATION_ERROR' })
  })
})
