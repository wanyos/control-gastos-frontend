import { describe, it, expect, afterEach, vi } from 'vitest'

import type { HttpClient } from '@/services/http'
import { ValidationError } from '@/shared/errors'

import { RECURRING_EXPENSES_PATH, getRecurringExpenses, parseRecurringExpenses } from '../service'
import { json, mockBackend, rawEmptyRecurringExpenses, rawRecurringExpenses } from './fixtures'

describe('monthly-cost service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the recurring expenses response of the contract', () => {
    const read = parseRecurringExpenses(rawRecurringExpenses())

    expect(read.period).toEqual({
      from: '2025-10-01',
      to: '2026-09-30',
      months: rawRecurringExpenses().period.months,
    })
    expect(read.monthlyTotal).toBe('356.05')
    expect(read.bills.map((bill) => bill.key)).toEqual([
      'comunidad vecinos',
      'telefonia ficticia',
      'gimnasio inventado',
      'seguro hogar',
      'academia idiomas',
      'revista ficticia',
    ])
    expect(read.bills[3]).toEqual({
      key: 'seguro hogar',
      name: 'RECIBO /SEGURO HOGAR FICTICIO',
      periodicity: 'annual',
      usualAmount: '187.37',
      count: 2,
      lastDate: '2025-11-03',
      previousMonthAmount: '187.37',
      change: '9.92',
      hasIncreased: true,
      monthlyCost: '16.44',
      charges: [
        {
          id: 812,
          accountId: 1,
          bookingDate: '2025-11-03',
          amount: '197.29',
          description: 'RECIBO /SEGURO HOGAR FICTICIO',
        },
        {
          id: 344,
          accountId: 1,
          bookingDate: '2024-11-04',
          amount: '187.37',
          description: 'RECIBO /SEGURO HOGAR FICTICIO',
        },
      ],
    })
    expect(read.bills[4]?.change).toBeNull()
    expect(read.bills[4]?.previousMonthAmount).toBeNull()
    expect(read.people.monthlyCost).toBe('118.50')
    expect(read.people.charges).toHaveLength(2)
    expect(read.variable.map((entry) => [entry.categoryName, entry.monthlyCost])).toEqual([
      ['Combustible', '8.33'],
      [null, '1.20'],
    ])
    // Fields the screen does not use are not carried over.
    expect(read.bills[0]).not.toHaveProperty('lastMonth')
    expect(read.people).not.toHaveProperty('months')
  })

  it('reads the empty response of the contract', () => {
    const read = parseRecurringExpenses(rawEmptyRecurringExpenses())

    expect(read.monthlyTotal).toBe('0.00')
    expect(read.bills).toEqual([])
    expect(read.variable).toEqual([])
    expect(read.people).toEqual({ monthlyCost: '0.00', charges: [] })
  })

  it('asks the recurring expenses path with no method and no body', async () => {
    const { calls, spy } = mockBackend([json(rawRecurringExpenses())])

    const read = await getRecurringExpenses()

    expect(read.monthlyTotal).toBe('356.05')
    expect(calls).toEqual([
      { method: 'GET', path: RECURRING_EXPENSES_PATH, search: '', body: undefined },
    ])
    const init = spy.mock.calls[0]?.[1]
    expect(init?.method).toBeUndefined()
    expect(init?.body).toBeUndefined()

    // An injected client gets the path and nothing else.
    const asked: unknown[][] = []
    const client: HttpClient = <T>(...args: [string, RequestInit?]): Promise<T> => {
      asked.push(args)
      return Promise.resolve(rawRecurringExpenses() as T)
    }
    await getRecurringExpenses(client)
    expect(asked).toEqual([[RECURRING_EXPENSES_PATH]])
  })

  it('reads an unknown periodicity as text', () => {
    const raw = rawRecurringExpenses()
    raw.bills[0]!.periodicity = 'every_four_weeks'

    expect(parseRecurringExpenses(raw).bills[0]?.periodicity).toBe('every_four_weeks')
  })

  it('rejects a response whose monthly costs do not add up to the monthly total', () => {
    const raw = rawRecurringExpenses()
    raw.bills[1]!.monthlyCost = '37.69'

    expect(() => parseRecurringExpenses(raw)).toThrow(ValidationError)
    expect(() => parseRecurringExpenses(raw)).toThrow('monthly costs do not add up to monthlyTotal')
  })

  it('rejects a response that breaks the contract, naming the field', () => {
    const noMonths = rawRecurringExpenses()
    noMonths.period.months = noMonths.period.months.slice(1)
    const badCategory = rawRecurringExpenses()
    badCategory.variable[0]!.category = { id: 21, name: '', parentId: 4 }
    const badAmount = rawRecurringExpenses()
    badAmount.bills[2]!.movements[0]!.amount = '13.4'

    expect(() => parseRecurringExpenses(noMonths)).toThrow('period.months is not a list of 12')
    expect(() => parseRecurringExpenses(badCategory)).toThrow('variable[0].category.name')
    expect(() => parseRecurringExpenses(badAmount)).toThrow('bills[2].movements[0].amount')
    expect(() => parseRecurringExpenses(null)).toThrow(ValidationError)
  })
})
