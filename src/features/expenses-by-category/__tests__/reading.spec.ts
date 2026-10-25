import { describe, it, expect } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, AppError, ValidationError } from '@/shared/errors'

import {
  ALL_CATEGORIZED,
  emptySentence,
  expensesErrorMessage,
  formatDifference,
  periodFromRouteQuery,
  periodLabel,
  periodSentence,
  periodToRouteQuery,
  switchMode,
  uncategorizedLine,
  uncategorizedText,
} from '../reading'
import { parseExpensesByCategory } from '../service'
import { rawAllCategorized, rawEmpty, rawMonth, rawYear } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

/** Local time, as the user lives it: the 20th of September 2026. */
const SEPTEMBER = new Date(2026, 8, 20, 12)
const OCTOBER = new Date(2026, 9, 25, 12)

describe('expenses-by-category reading', () => {
  it('reads the period from the address and falls back to the current month', () => {
    expect(periodFromRouteQuery({ month: '2026-03', compare: 'same-month-last-year' })).toEqual({
      mode: 'month',
      month: '2026-03',
      compare: 'same-month-last-year',
    })
    expect(periodFromRouteQuery({ month: '2026-03' })).toEqual({
      mode: 'month',
      month: '2026-03',
      compare: 'previous-month',
    })
    expect(periodFromRouteQuery({ year: '2025' })).toEqual({ mode: 'year', year: '2025' })

    const fallback = { mode: 'month', month: '2026-09', compare: 'previous-month' }
    expect(periodFromRouteQuery({}, SEPTEMBER)).toEqual(fallback)
    expect(periodFromRouteQuery({ month: '2026-13' }, SEPTEMBER)).toEqual(fallback)
    expect(periodFromRouteQuery({ month: '26-09' }, SEPTEMBER)).toEqual(fallback)
    expect(periodFromRouteQuery({ month: '2026-03', compare: 'last-week' }, SEPTEMBER)).toEqual(
      fallback,
    )
    expect(periodFromRouteQuery({ month: '2026-03', year: '2025' }, SEPTEMBER)).toEqual(fallback)
    expect(periodFromRouteQuery({ year: '25' }, SEPTEMBER)).toEqual(fallback)
    expect(periodFromRouteQuery({ year: '2025', compare: 'previous-month' }, SEPTEMBER)).toEqual(
      fallback,
    )
    // A repeated key takes its first value, as the statement does.
    expect(periodFromRouteQuery({ year: ['2024', '2025'] })).toEqual({ mode: 'year', year: '2024' })

    // What is written is what is read back.
    expect(
      periodToRouteQuery({ mode: 'month', month: '2026-03', compare: 'same-month-last-year' }),
    ).toEqual({ month: '2026-03', compare: 'same-month-last-year' })
    expect(periodToRouteQuery({ mode: 'year', year: '2025' })).toEqual({ year: '2025' })
  })

  it('switching mode keeps the year of the month and comes back to the current month', () => {
    const march = { mode: 'month', month: '2025-03', compare: 'same-month-last-year' } as const

    expect(switchMode(march, 'year', SEPTEMBER)).toEqual({ mode: 'year', year: '2025' })
    expect(switchMode(march, 'month', SEPTEMBER)).toBe(march)
    expect(switchMode({ mode: 'year', year: '2026' }, 'month', SEPTEMBER)).toEqual({
      mode: 'month',
      month: '2026-09',
      compare: 'previous-month',
    })
    expect(switchMode({ mode: 'year', year: '2024' }, 'month', SEPTEMBER)).toEqual({
      mode: 'month',
      month: '2024-12',
      compare: 'previous-month',
    })
    const year = { mode: 'year', year: '2024' } as const
    expect(switchMode(year, 'year', SEPTEMBER)).toBe(year)
  })

  it('names a month, a whole year and part of a year', () => {
    expect(periodLabel({ from: '2026-09-01', to: '2026-09-30', months: 1 })).toBe('September 2026')
    expect(periodLabel({ from: '2025-01-01', to: '2025-12-31', months: 12 })).toBe('2025')
    expect(periodLabel({ from: '2026-01-01', to: '2026-10-31', months: 10 })).toBe(
      'January – October 2026',
    )
    expect(periodLabel({ from: '2025-12-01', to: '2026-01-31', months: 2 })).toBe(
      'December 2025 – January 2026',
    )
  })

  it('builds the sentence for a closed period, a period in progress and an empty one', () => {
    const month = parseExpensesByCategory(rawMonth())

    expect(periodSentence(month, OCTOBER)).toBe(
      `In September 2026 you spent ${eur('714,20')}, ${eur('25,86')} more than in August 2026.`,
    )
    expect(periodSentence(month, SEPTEMBER)).toBe(
      `So far in September 2026 you spent ${eur('714,20')}, ${eur('25,86')} more than in the whole of August 2026.`,
    )

    const less = rawMonth()
    less.difference = '-25.86'
    expect(periodSentence(parseExpensesByCategory(less), OCTOBER)).toBe(
      `In September 2026 you spent ${eur('714,20')}, ${eur('25,86')} less than in August 2026.`,
    )
    const same = rawMonth()
    same.comparedAmount = '714.20'
    same.difference = '0.00'
    expect(periodSentence(parseExpensesByCategory(same), OCTOBER)).toBe(
      `In September 2026 you spent ${eur('714,20')}, the same as in August 2026.`,
    )
    const nothingBefore = rawMonth()
    nothingBefore.comparedAmount = '0.00'
    nothingBefore.difference = '714.20'
    expect(periodSentence(parseExpensesByCategory(nothingBefore), OCTOBER)).toBe(
      `In September 2026 you spent ${eur('714,20')}. Nothing counted as spending in August 2026.`,
    )

    const year = parseExpensesByCategory(rawYear())
    expect(periodSentence(year, OCTOBER)).toBe(
      `In 2025 you spent ${eur('8.864,14')}, ${eur('76,02')} more than in 2024.`,
    )
    const running = rawYear()
    running.period = { month: null, year: '2026', from: '2026-01-01', to: '2026-10-31', months: 10 }
    running.compared = { from: '2025-01-01', to: '2025-10-31', months: 10 }
    expect(periodSentence(parseExpensesByCategory(running), OCTOBER)).toBe(
      `So far in January – October 2026 you spent ${eur('8.864,14')}, ${eur('76,02')} more than in January – October 2025.`,
    )

    const empty = parseExpensesByCategory(rawEmpty())
    expect(periodSentence(empty, OCTOBER)).toBe(
      'No spending counted in September 2026 or in August 2026.',
    )
    expect(emptySentence(empty)).toBe(periodSentence(empty, SEPTEMBER))
  })

  it('writes the difference with its sign', () => {
    expect(formatDifference('25.86')).toBe(`+${eur('25,86')}`)
    expect(formatDifference('-23.81')).toBe(`-${eur('23,81')}`)
    expect(formatDifference('0.00')).toBe(eur('0,00'))
    expect(formatDifference('1471.20')).toBe(`+${eur('1.471,20')}`)
  })

  it('counts the movements with no category and their share of the spending', () => {
    expect(uncategorizedText(parseExpensesByCategory(rawMonth()))).toBe(
      `1 movement with no category — 2,0${NBSP}% of the spending`,
    )
    // 44.50 of 8864.14 is 0,5 %.
    expect(uncategorizedText(parseExpensesByCategory(rawYear()))).toBe(
      `3 movements with no category — 0,5${NBSP}% of the spending`,
    )
    expect(uncategorizedText(parseExpensesByCategory(rawAllCategorized()))).toBe(ALL_CATEGORIZED)
    expect(uncategorizedText(parseExpensesByCategory(rawEmpty()))).toBe(ALL_CATEGORIZED)

    // A line with no category that only spent in the compared period: nothing to count.
    const before = rawAllCategorized()
    before.variable.lines.push({
      category: null,
      amount: '0.00',
      comparedAmount: '9.99',
      difference: '-9.99',
      change: 'gone',
      monthlyAmount: null,
      movements: [],
    })
    before.variable.comparedAmount = '85.96'
    before.variable.difference = '1.50'
    before.comparedAmount = '698.33'
    before.difference = '1.50'
    expect(uncategorizedText(parseExpensesByCategory(before))).toBe(ALL_CATEGORIZED)

    expect(uncategorizedLine(3, 20)).toBe(
      `3 movements with no category — 2,0${NBSP}% of the spending`,
    )
  })

  it('says what failed in words', () => {
    expect(expensesErrorMessage(new ApiError('Network request failed', API_NETWORK))).toBe(
      "Couldn't reach the server.",
    )
    expect(expensesErrorMessage(new ValidationError('fixed.amount is not …'))).toBe(
      "The server answered, but the spending couldn't be read.",
    )
    expect(
      expensesErrorMessage(new ApiError('HTTP 500: Error interno', API_HTTP, { status: 500 })),
    ).toBe('Something went wrong loading your spending.')
    expect(expensesErrorMessage(new AppError('boom', 'UNKNOWN'))).toBe(
      'Something went wrong loading your spending.',
    )
  })
})
