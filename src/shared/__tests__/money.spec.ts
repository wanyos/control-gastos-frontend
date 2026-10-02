import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'

import {
  formatDate,
  formatMoney,
  formatMoneyWhole,
  formatPercent,
  fromCents,
  sharePermille,
  sumAmounts,
  toCents,
} from '../money'

// es-ES puts a no-break space (U+00A0) before `€` and `%`, never a typed space.
const NBSP = String.fromCharCode(0xa0)

describe('toCents / fromCents', () => {
  it('converts decimal strings to integer cents and back, sign included', () => {
    expect(toCents('12480.55')).toBe(1248055n)
    expect(toCents('-0.50')).toBe(-50n)
    expect(toCents('0.00')).toBe(0n)
    expect(fromCents(1248055n)).toBe('12480.55')
    expect(fromCents(-50n)).toBe('-0.50')
    expect(fromCents(0n)).toBe('0.00')
  })

  it('keeps every cent beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = '90071992547409.93' // 9007199254740993 cents > 2^53
    expect(toCents(huge)).toBe(9007199254740993n)
    expect(fromCents(toCents(huge))).toBe(huge)
  })

  it('rejects anything that is not a two-decimal string', () => {
    for (const bad of ['12', '12.5', '1,00', 'abc', '', '1.000']) {
      expect(() => toCents(bad)).toThrow(ValidationError)
    }
  })
})

describe('sumAmounts', () => {
  it('sums exactly, where floats would drift', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30')
    expect(sumAmounts(['1500.00', '-5.25', '0.25'])).toBe('1495.00')
    expect(sumAmounts([])).toBe('0.00')
  })
})

describe('sharePermille', () => {
  it('returns tenths of a percentage point, rounded half up in a single pass', () => {
    expect(sharePermille('383.00', '1000.00')).toBe(383)
    // 38,249 % gives 382: rounding first to basis points (3825) would give 383.
    expect(sharePermille('382.49', '1000.00')).toBe(382)
    expect(sharePermille('382.50', '1000.00')).toBe(383)
    expect(sharePermille('1.00', '3.00')).toBe(333)
    expect(sharePermille('2.00', '3.00')).toBe(667)
  })

  it('rounds a negative part half away from zero', () => {
    expect(sharePermille('-382.50', '1000.00')).toBe(-383)
  })

  it('has no share when the total is zero or negative', () => {
    expect(sharePermille('10.00', '0.00')).toBeNull()
    expect(sharePermille('10.00', '-1.00')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('groups thousands even with 4 digits (es-ES CLDR trap, needs useGrouping always)', () => {
    expect(formatMoney('1234.56')).toBe(`1.234,56${NBSP}€`)
  })

  it('formats negative, zero and 5-digit amounts', () => {
    expect(formatMoney('-5.00')).toBe(`-5,00${NBSP}€`)
    expect(formatMoney('0.00')).toBe(`0,00${NBSP}€`)
    expect(formatMoney('12480.55')).toBe(`12.480,55${NBSP}€`)
  })

  it('formats from the exact string, beyond the precision of a number', () => {
    expect(formatMoney('90071992547409.93')).toBe(`90.071.992.547.409,93${NBSP}€`)
  })

  it('rejects a malformed amount', () => {
    expect(() => formatMoney('12.5')).toThrow(ValidationError)
  })
})

describe('formatPercent', () => {
  it('formats a permille with one decimal in es-ES', () => {
    expect(formatPercent(383)).toBe(`38,3${NBSP}%`)
    expect(formatPercent(1000)).toBe(`100,0${NBSP}%`)
    expect(formatPercent(0)).toBe(`0,0${NBSP}%`)
    expect(formatPercent(5)).toBe(`0,5${NBSP}%`)
  })

  it('rejects a non-integer permille', () => {
    expect(() => formatPercent(38.3)).toThrow(ValidationError)
  })
})

describe('formatDate', () => {
  it('formats a date-only value in en-GB (value observed in the current ICU)', () => {
    expect(formatDate('2026-09-12')).toBe('12 Sept 2026')
    expect(formatDate('2026-08-29')).toBe('29 Aug 2026')
  })

  it('keeps the calendar day at the edges of the year, whatever the local timezone', () => {
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026')
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026')
  })

  it('rejects a malformed date', () => {
    expect(() => formatDate('12/09/2026')).toThrow(ValidationError)
  })
})

describe('formatMoneyWhole (feature 25)', () => {
  it('rounds to whole euros from the exact string, with the no-break space', () => {
    expect(formatMoneyWhole('4003.89')).toBe(`4.004${NBSP}€`)
    expect(formatMoneyWhole('161.82')).toBe(`162${NBSP}€`)
    expect(formatMoneyWhole('0.00')).toBe(`0${NBSP}€`)
    expect(formatMoneyWhole('1413.63')).toBe(`1.414${NBSP}€`)
  })

  it('groups 4-digit amounts, which es-ES does not do by default', () => {
    expect(formatMoneyWhole('1234.00')).toBe(`1.234${NBSP}€`)
    expect(formatMoneyWhole('2590.26')).toBe(`2.590${NBSP}€`)
  })

  it('keeps the sign and never goes through a float', () => {
    expect(formatMoneyWhole('-805.02')).toBe(`-805${NBSP}€`)
    // 9007199254740993 cents > 2^53: a float would lose the last euro.
    expect(formatMoneyWhole('90071992547409.93')).toBe(`90.071.992.547.410${NBSP}€`)
  })

  it('rejects anything that is not a two-decimal string', () => {
    expect(() => formatMoneyWhole('12')).toThrow(ValidationError)
    expect(() => formatMoneyWhole('abc')).toThrow(ValidationError)
  })
})
