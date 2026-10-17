import { describe, it, expect } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, AppError, ValidationError } from '@/shared/errors'
import { formatMoney, sumAmounts } from '@/shared/money'

import { parseRecurringExpenses } from '../service'
import {
  billTitle,
  blockSubtotals,
  changeView,
  chargesHeading,
  increasedLine,
  isEmpty,
  monthlyCostErrorMessage,
  noChargesSummary,
  periodLine,
  periodicityLabel,
  splitBills,
  usualSuffix,
} from '../texts'
import type { Bill } from '../types'
import { rawEmptyRecurringExpenses, rawRecurringExpenses } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const data = () => parseRecurringExpenses(rawRecurringExpenses())
const billOf = (key: string): Bill => {
  const bill = data().bills.find((item) => item.key === key)
  if (!bill) throw new Error(`no bill ${key} in the fixture`)
  return bill
}

describe('monthly-cost texts', () => {
  it('names each periodicity in words and leaves an unknown one as it comes', () => {
    expect(
      [
        'monthly',
        'twice_monthly',
        'every_two_months',
        'every_three_months',
        'every_six_months',
        'annual',
        'once',
      ].map(periodicityLabel),
    ).toEqual([
      'Monthly',
      'Twice a month',
      'Every 2 months',
      'Every 3 months',
      'Every 6 months',
      'Yearly',
      'Once',
    ])
    expect(periodicityLabel('every_four_weeks')).toBe('every_four_weeks')
    expect(periodicityLabel('toString')).toBe('toString')
    expect(usualSuffix('twice_monthly')).toBe(' a month')
    expect(usualSuffix('annual')).toBe(' each time')
    expect(usualSuffix('every_four_weeks')).toBe(' each time')
    expect(billTitle('seguro hogar')).toBe('Seguro hogar')
    expect(billTitle('x')).toBe('X')
  })

  it('splits the bills with no charges in the period and keeps the order', () => {
    const { charged, uncharged } = splitBills(data().bills)

    expect(charged.map((bill) => bill.key)).toEqual([
      'comunidad vecinos',
      'telefonia ficticia',
      'gimnasio inventado',
      'seguro hogar',
    ])
    expect(uncharged.map((bill) => bill.key)).toEqual(['academia idiomas', 'revista ficticia'])
    // Not reordered: a cheaper bill sent first stays first.
    const swapped = [billOf('seguro hogar'), billOf('comunidad vecinos')]
    expect(splitBills(swapped).charged.map((bill) => bill.key)).toEqual([
      'seguro hogar',
      'comunidad vecinos',
    ])
    expect(splitBills([])).toEqual({ charged: [], uncharged: [] })
  })

  it('adds up each block in exact cents', () => {
    const read = data()
    const subtotals = blockSubtotals(read)

    expect(subtotals).toEqual({ bills: '228.02', people: '118.50', variable: '9.53' })
    expect(sumAmounts([subtotals.bills, subtotals.people, subtotals.variable])).toBe(
      read.monthlyTotal,
    )
    // Cents that floats would lose: 0.10 + 0.20 is exactly 0.30.
    const tiny = {
      ...read,
      bills: [],
      variable: [
        { categoryName: 'Uno', monthlyCost: '0.10', charges: [] },
        { categoryName: 'Dos', monthlyCost: '0.20', charges: [] },
      ],
    }
    expect(blockSubtotals(tiny).variable).toBe('0.30')
    expect(blockSubtotals(tiny).bills).toBe('0.00')
    expect(isEmpty(read)).toBe(false)
    expect(isEmpty(parseRecurringExpenses(rawEmptyRecurringExpenses()))).toBe(true)
  })

  it('writes singular and plural in every counted line', () => {
    const { period } = data()

    expect(periodLine(period)).toBe(
      'Monthly average of the 12 complete months before this one: October 2025 to September 2026.',
    )
    expect(increasedLine(8, 15)).toBe('8 of 15 bills went up since their previous charge.')
    expect(increasedLine(1, 1)).toBe('1 of 1 bill went up since its previous charge.')
    expect(increasedLine(1, 6)).toBe('1 of 6 bills went up since its previous charge.')
    expect(increasedLine(0, 6)).toBe('No bill went up since its previous charge.')
    expect(noChargesSummary(2, period)).toBe(
      '2 bills with no charges between October 2025 and September 2026',
    )
    expect(noChargesSummary(1, period)).toBe(
      '1 bill with no charges between October 2025 and September 2026',
    )
    expect(chargesHeading('bill', 2)).toBe('All 2 charges, newest first')
    expect(chargesHeading('bill', 1)).toBe('The only charge')
    expect(chargesHeading('period', 2)).toBe('2 charges in these 12 months, newest first')
    expect(chargesHeading('period', 1)).toBe('1 charge in these 12 months')
    expect(chargesHeading('period', 0)).toBe('No charges in these 12 months')
  })

  it('tells the change of a bill without computing it', () => {
    expect(changeView(billOf('seguro hogar'))).toEqual({
      kind: 'up',
      text: `Up ${eur('9,92')}`,
      was: `was ${eur('187,37')}`,
    })
    expect(changeView(billOf('gimnasio inventado'))).toEqual({
      kind: 'down',
      text: `Down ${eur('2,00')}`,
      was: null,
    })
    expect(changeView(billOf('telefonia ficticia'))).toEqual({
      kind: 'same',
      text: 'Same',
      was: null,
    })
    expect(changeView(billOf('academia idiomas'))).toEqual({
      kind: 'none',
      text: 'No earlier charge',
      was: null,
    })
    // The figure is the backend's `change`, not last minus previous worked out here.
    const odd = { ...billOf('seguro hogar'), change: '1.00' }
    expect(changeView(odd).text).toBe(`Up ${formatMoney('1.00')}`)
  })

  it('says what went wrong in words', () => {
    expect(monthlyCostErrorMessage(new ApiError('down', API_NETWORK))).toBe(
      "Couldn't reach the server.",
    )
    expect(monthlyCostErrorMessage(new ValidationError('bad'))).toBe(
      "The server answered, but the monthly cost couldn't be read.",
    )
    expect(monthlyCostErrorMessage(new ApiError('HTTP 500', API_HTTP, { status: 500 }))).toBe(
      'Something went wrong loading the monthly cost.',
    )
    expect(monthlyCostErrorMessage(new AppError('?', 'UNKNOWN'))).toBe(
      'Something went wrong loading the monthly cost.',
    )
  })
})
