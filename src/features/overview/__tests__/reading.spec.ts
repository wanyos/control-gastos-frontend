import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { URL as NodeURL, fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import { API_HTTP, API_NETWORK, ApiError, AppError, ValidationError } from '@/shared/errors'
import { formatDate } from '@/shared/money'

import {
  ALL_CATEGORIZED,
  COMPARISON_FAILED,
  COMPARISON_LOADING,
  INCOMPLETE_RATE_NOTE,
  MONEY_IN_LABEL,
  MONEY_OUT_LABEL,
  NO_COMPARISON_INCOMPLETE,
  NO_INCOME_RATE_NOTE,
  NO_RATE,
  PRIOR_MONTHS,
  SAVINGS_LABEL,
  SAVINGS_RATE_LABEL,
  UNCATEGORIZED_FAILED,
  USUAL_BAND_PERMILLE,
  buildComparison,
  compareWithUsual,
  comparisonCaption,
  medianAmount,
  monthSentence,
  monthState,
  overviewErrorMessage,
  priorMonths,
  savingsRatePermille,
  statementLinkText,
  uncategorizedLine,
  uncategorizedPermille,
  usualLineText,
  verdictLabel,
} from '../reading'
import { LATEST, fabricated, figuresOf } from './fixtures'

// es-ES puts a no-break space (U+00A0) before `€` and `%`: generated, never typed.
const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`
const pct = (figure: string): string => `${figure}${NBSP}%`

/** ICU decides how September is abbreviated, so the date comes from the formatter. */
const LATEST_TEXT = formatDate(LATEST)

const priorFigures = (month: string) => priorMonths(month).map(figuresOf)

describe('monthSentence (R4)', () => {
  it('case 8, a deficit: August 2026 in whole euros', () => {
    expect(monthSentence(figuresOf('2026-08'), LATEST)).toBe(
      `In August 2026, ${eur('2.590')} came in and ${eur('4.004')} went out: you spent ${eur('1.414')} more than came in.`,
    )
  })

  it('case 6, savings: January 2026 with its rate to one decimal', () => {
    expect(monthSentence(figuresOf('2026-01'), LATEST)).toBe(
      `In January 2026, ${eur('3.114')} came in and ${eur('1.893')} went out: you saved ${eur('1.222')}, ${pct('39,2')} of what came in.`,
    )
  })

  it('case 3, incomplete: September 2026 when the data ends on the 11th', () => {
    expect(LATEST_TEXT).toContain('2026')
    expect(monthSentence(figuresOf('2026-09'), '2026-09-11')).toBe(
      `September 2026 is incomplete: your data ends on ${LATEST_TEXT}. So far, ${eur('162')} came in and ${eur('967')} went out.`,
    )
  })

  it('case 1, empty and after the last data: October 2026', () => {
    expect(monthSentence(figuresOf('2026-10'), LATEST)).toBe(
      `No movements in October 2026. Your data ends on ${LATEST_TEXT}.`,
    )
  })

  it('case 2, empty and not after the last data: December 2023', () => {
    expect(monthSentence(figuresOf('2023-12'), LATEST)).toBe('No movements in December 2023.')
  })

  it('case 2 also when the base has no data at all', () => {
    expect(monthSentence(figuresOf('2026-10'), null)).toBe('No movements in October 2026.')
  })

  it('case 4, movements that do not count: nothing came in or went out', () => {
    const figures = fabricated('2026-03', '0.00', '0.00', '0.00', 4)

    expect(monthSentence(figures, LATEST)).toBe(
      'In March 2026, nothing that counts came in or went out.',
    )
  })

  it('case 5, no income', () => {
    const figures = fabricated('2026-03', '0.00', '966.84', '-966.84')

    expect(monthSentence(figures, LATEST)).toBe(
      `In March 2026, nothing came in and ${eur('967')} went out.`,
    )
  })

  it('case 7, spent exactly what came in', () => {
    const figures = fabricated('2026-03', '1000.00', '1000.00', '0.00')

    expect(monthSentence(figures, LATEST)).toBe(
      `In March 2026, ${eur('1.000')} came in and ${eur('1.000')} went out: you spent exactly what came in.`,
    )
  })

  it('takes the first case that holds: an incomplete month with no income is still incomplete', () => {
    const figures = fabricated('2026-09', '0.00', '966.84', '-966.84')

    expect(monthSentence(figures, '2026-09-11')).toMatch(/^September 2026 is incomplete/)
  })
})

describe('monthState (R8, R9)', () => {
  it('is empty with no movements, whatever the last date is', () => {
    expect(monthState(figuresOf('2026-10'), LATEST)).toBe('empty')
    expect(monthState(figuresOf('2023-12'), null)).toBe('empty')
  })

  it('is incomplete when the last data is one day before the end of the month', () => {
    expect(monthState(figuresOf('2026-09'), '2026-09-29')).toBe('incomplete')
    expect(monthState(figuresOf('2026-09'), '2026-09-11')).toBe('incomplete')
  })

  it('is complete when the last data is ON the last day, or after it', () => {
    expect(monthState(figuresOf('2026-09'), '2026-09-30')).toBe('complete')
    expect(monthState(figuresOf('2026-09'), '2026-10-01')).toBe('complete')
    expect(monthState(figuresOf('2026-08'), LATEST)).toBe('complete')
  })

  it('knows a leap February ends on the 29th', () => {
    expect(monthState(figuresOf('2024-02'), '2024-02-28')).toBe('incomplete')
    expect(monthState(figuresOf('2024-02'), '2024-02-29')).toBe('complete')
    expect(monthState(figuresOf('2026-02'), '2026-02-28')).toBe('complete')
  })

  it('is complete when there are movements and no last date (impossible by contract)', () => {
    expect(monthState(figuresOf('2026-08'), null)).toBe('complete')
  })
})

describe('savingsRatePermille (R6, R7)', () => {
  it('is net over income, in tenths of a percent', () => {
    expect(savingsRatePermille(figuresOf('2026-01').totals)).toBe(392)
  })

  it('is negative in a month of deficit', () => {
    expect(savingsRatePermille(figuresOf('2026-08').totals)).toBe(-546)
  })

  it('is null when nothing came in', () => {
    expect(savingsRatePermille({ income: '0.00', expense: '966.84', net: '-966.84' })).toBeNull()
  })
})

describe('priorMonths (R10)', () => {
  it('lists the twelve months before, oldest first, across the year', () => {
    expect(priorMonths('2026-01')).toEqual([
      '2025-01',
      '2025-02',
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
    ])
    expect(priorMonths('2026-08')).toHaveLength(PRIOR_MONTHS)
    expect(priorMonths('2026-08')[0]).toBe('2025-08')
    expect(priorMonths('2026-08').at(-1)).toBe('2026-07')
  })
})

describe('medianAmount (R10, C2)', () => {
  it('with twelve real months, is the mean of the two central ones', () => {
    const expenses = priorFigures('2026-08').map((figures) => figures.totals.expense)
    const incomes = priorFigures('2026-08').map((figures) => figures.totals.income)

    expect([...expenses].sort()).toContain('2819.35')
    expect(expenses).toContain('3115.81')
    expect(medianAmount(expenses)).toBe('2967.58')
    expect(medianAmount(incomes)).toBe('2950.00')
  })

  it('with five, is the central one exactly as the backend gave it', () => {
    expect(medianAmount(['2819.35', '2062.95', '3115.81', '1892.53', '1874.57'])).toBe('2062.95')
  })

  it('with two, is their mean; with one, that one; with none, null', () => {
    expect(medianAmount(['10.00', '20.00'])).toBe('15.00')
    expect(medianAmount(['7.77'])).toBe('7.77')
    expect(medianAmount([])).toBeNull()
  })

  it('rounds half a cent once, away from zero', () => {
    expect(medianAmount(['0.01', '0.02'])).toBe('0.02')
    expect(medianAmount(['10.00', '10.01'])).toBe('10.01')
    expect(medianAmount(['-0.01', '-0.02'])).toBe('-0.02')
  })

  it('orders by value, not as text, and does not touch the list it was given', () => {
    const amounts = Object.freeze(['100.00', '9.00', '10.00'])

    expect(medianAmount(amounts)).toBe('10.00')
    expect(amounts).toEqual(['100.00', '9.00', '10.00'])
  })

  it('never goes through a float: every cent survives beyond 2^53', () => {
    expect(medianAmount(['90071992547409.93', '90071992547409.95'])).toBe('90071992547409.94')
  })
})

describe('compareWithUsual and buildComparison (R10)', () => {
  it('August 2026 against its twelve real months', () => {
    expect(buildComparison(figuresOf('2026-08'), priorFigures('2026-08'))).toEqual({
      months: 12,
      income: { usual: '2950.00', differencePermille: -122, verdict: 'usual' },
      expense: { usual: '2967.58', differencePermille: 349, verdict: 'more' },
    })
  })

  it('March 2026: spending about usual, income more than usual', () => {
    const comparison = buildComparison(figuresOf('2026-03'), priorFigures('2026-03'))

    expect(comparison.expense).toEqual({
      usual: '2696.47',
      differencePermille: -61,
      verdict: 'usual',
    })
    expect(comparison.income).toEqual({
      usual: '2300.26',
      differencePermille: 910,
      verdict: 'more',
    })
  })

  it('exactly 25 % is still usual, and one cent beyond is not', () => {
    expect(USUAL_BAND_PERMILLE).toBe(250)
    expect(compareWithUsual('1250.00', '1000.00').verdict).toBe('usual')
    expect(compareWithUsual('25.00', '20.00')).toEqual({
      usual: '20.00',
      differencePermille: 250,
      verdict: 'usual',
    })
    expect(compareWithUsual('25.01', '20.00').verdict).toBe('more')
    expect(compareWithUsual('15.00', '20.00').verdict).toBe('usual')
    expect(compareWithUsual('14.99', '20.00').verdict).toBe('less')
  })

  it('has no percentage and no verdict against a usual month of zero', () => {
    expect(compareWithUsual('100.00', '0.00')).toEqual({
      usual: '0.00',
      differencePermille: null,
      verdict: null,
    })
  })

  it('February 2024 compares with the only earlier month with data', () => {
    const comparison = buildComparison(figuresOf('2024-02'), priorFigures('2024-02'))

    expect(comparison.months).toBe(1)
    expect(comparison.expense).toEqual({
      usual: '1509.59',
      differencePermille: -288,
      verdict: 'less',
    })
    expect(comparison.income.usual).toBe('3337.42')
  })

  it('January 2024 has nothing to compare with', () => {
    const comparison = buildComparison(figuresOf('2024-01'), priorFigures('2024-01'))

    expect(comparison.months).toBe(0)
    expect(comparison.income.verdict).toBeNull()
    expect(comparison.expense.differencePermille).toBeNull()
  })

  it('leaves the empty months out: five with data among twelve count as five', () => {
    const prior = priorMonths('2026-08').map((month, i) =>
      i < 5 ? figuresOf(month) : figuresOf('2023-12'),
    )

    const comparison = buildComparison(figuresOf('2026-08'), prior)

    expect(comparison.months).toBe(5)
    // 2025-08 … 2025-12: the central spending of those five is October's.
    expect(comparison.expense.usual).toBe('2819.35')
  })
})

describe('the texts of the comparison (R10, R11)', () => {
  it('says how many months it compared with, and that it is worked out here', () => {
    expect(comparisonCaption(12)).toBe(
      "Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.",
    )
    expect(comparisonCaption(5)).toBe(
      "Your usual month is the middle value of the 5 previous months with data, worked out here from each month's totals.",
    )
    expect(comparisonCaption(11)).toContain('the 11 previous months with data')
    expect(comparisonCaption(2)).toContain('the 2 previous months with data')
    expect(comparisonCaption(1)).toBe('Your usual month is the only previous month with data.')
    expect(comparisonCaption(0)).toBe('No earlier months to compare with.')
  })

  it('writes the difference above, below and equal, without a sign', () => {
    expect(usualLineText({ usual: '2967.58', differencePermille: 349, verdict: 'more' })).toBe(
      `${pct('34,9')} above your usual month (${eur('2.967,58')})`,
    )
    expect(usualLineText({ usual: '2950.00', differencePermille: -122, verdict: 'usual' })).toBe(
      `${pct('12,2')} below your usual month (${eur('2.950,00')})`,
    )
    expect(usualLineText({ usual: '2950.00', differencePermille: 0, verdict: 'usual' })).toBe(
      `The same as your usual month (${eur('2.950,00')})`,
    )
    expect(usualLineText({ usual: '0.00', differencePermille: null, verdict: null })).toBe(
      `Your usual month is ${eur('0,00')}`,
    )
  })

  it('names the three verdicts', () => {
    expect(verdictLabel('usual')).toBe('About usual')
    expect(verdictLabel('more')).toBe('More than usual')
    expect(verdictLabel('less')).toBe('Less than usual')
  })

  it('fixes the labels and the notes word for word (R5, R7, R8, R14, R15)', () => {
    expect([MONEY_IN_LABEL, MONEY_OUT_LABEL, SAVINGS_LABEL, SAVINGS_RATE_LABEL]).toEqual([
      'Money in',
      'Money out',
      'Savings',
      'Savings rate',
    ])
    expect(NO_RATE).toBe('—')
    expect(NO_INCOME_RATE_NOTE).toBe('No income this month, so there is no savings rate.')
    expect(INCOMPLETE_RATE_NOTE).toBe('Not shown: the month is incomplete.')
    expect(NO_COMPARISON_INCOMPLETE).toBe('No comparison for an incomplete month.')
    expect(COMPARISON_LOADING).toBe('Loading the previous months…')
    expect(COMPARISON_FAILED).toBe("Couldn't load the previous months, so there is no comparison.")
    expect(UNCATEGORIZED_FAILED).toBe("Couldn't check how much of this spending has a category.")
    expect(statementLinkText('2026-08')).toBe('See the movements of August 2026')
  })
})

describe('uncategorizedLine (R12)', () => {
  it('August 2026: two backend figures, the share and the count', () => {
    const uncategorized = { amount: '3036.33', count: 48 }

    expect(uncategorizedLine(uncategorized, '4003.89')).toBe(
      `${eur('3.036,33')} of this month's ${eur('4.003,89')} spending has no category yet (${pct('75,8')}, 48 movements).`,
    )
    expect(uncategorizedPermille(uncategorized, '4003.89')).toBe(758)
  })

  it('says movement in the singular with one', () => {
    expect(uncategorizedLine({ amount: '10.00', count: 1 }, '100.00')).toBe(
      `${eur('10,00')} of this month's ${eur('100,00')} spending has no category yet (${pct('10,0')}, 1 movement).`,
    )
  })

  it('says so when everything has a category', () => {
    expect(ALL_CATEGORIZED).toBe("All of this month's spending has a category.")
    expect(uncategorizedLine({ amount: '0.00', count: 0 }, '4003.89')).toBe(ALL_CATEGORIZED)
  })
})

describe('overviewErrorMessage (R13)', () => {
  const BACKEND_MESSAGE = 'El parámetro «from» no es una fecha válida'

  it('has a sentence for the network, for an unreadable answer and for the rest', () => {
    expect(overviewErrorMessage(new ApiError('Network request failed', API_NETWORK))).toBe(
      "Couldn't reach the server.",
    )
    expect(overviewErrorMessage(new ValidationError('totals.income is not a decimal'))).toBe(
      "The server answered, but the month couldn't be read.",
    )
    expect(overviewErrorMessage(new AppError('boom', 'UNKNOWN'))).toBe(
      'Something went wrong loading this month.',
    )
  })

  it.each([400, 500])('never paints the backend message of a %i', (status) => {
    const error = new ApiError(`HTTP ${status}: ${BACKEND_MESSAGE}`, API_HTTP, { status })

    const message = overviewErrorMessage(error)

    expect(message).toBe('Something went wrong loading this month.')
    expect(message).not.toContain(BACKEND_MESSAGE)
  })
})

describe('the word the comparison was renamed away from', () => {
  // The comparison is against the MEDIAN and reads «your usual month» (2026-10-02).
  const FORBIDDEN = /average/i

  it('is in no text this module builds', () => {
    const comparison = buildComparison(figuresOf('2026-08'), priorFigures('2026-08'))
    const texts = [
      ...[0, 1, 2, 5, 11, 12].map(comparisonCaption),
      usualLineText(comparison.income),
      usualLineText(comparison.expense),
      usualLineText({ usual: '1.00', differencePermille: 0, verdict: 'usual' }),
      usualLineText({ usual: '0.00', differencePermille: null, verdict: null }),
      verdictLabel('usual'),
      verdictLabel('more'),
      verdictLabel('less'),
      monthSentence(figuresOf('2026-08'), LATEST),
      monthSentence(figuresOf('2026-01'), LATEST),
      monthSentence(figuresOf('2026-09'), LATEST),
      NO_COMPARISON_INCOMPLETE,
      COMPARISON_FAILED,
      COMPARISON_LOADING,
    ]

    for (const text of texts) expect(text).not.toMatch(FORBIDDEN)
  })

  it('is in no source file of the feature, templates included', () => {
    const root = fileURLToPath(new NodeURL('../', import.meta.url))
    const sources = (readdirSync(root, { recursive: true }) as string[])
      .map((file) => file.replaceAll('\\', '/'))
      .filter((file) => /\.(ts|vue)$/.test(file) && !file.startsWith('__tests__/'))

    expect(sources).toContain('reading.ts')
    expect(sources).toContain('views/OverviewView.vue')
    const offenders = sources.filter((file) =>
      FORBIDDEN.test(readFileSync(join(root, file), 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})
