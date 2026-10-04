import { readFileSync } from 'node:fs'
import { URL as NodeURL, fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import {
  INCOMPLETE,
  MONTH_COLUMN_LABEL,
  NOTHING_TO_ADD_UP,
  NO_MOVEMENTS,
  PERIOD_FAILED,
  PREVIOUS_MONTHS_FAILED,
  PREVIOUS_MONTHS_LOADING,
  PREVIOUS_MONTHS_TITLE,
  SHOWN_ABOVE,
  SHOWN_MONTHS,
  buildMonthRows,
  dataEndsLine,
  leftOutLine,
  notShownLine,
  periodSentence,
  scaleTop,
  shownMonths,
  summedPeriod,
} from '../previousMonths'
import { COMPARISON_LOADING } from '../reading'
import type { MonthFigures, MonthRow, PeriodTotals } from '../types'
import { LATEST, PERIOD, fabricated, figuresOf } from './fixtures'

// es-ES puts a no-break space (U+00A0) before `€`: generated, never typed.
const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const MONTHS = shownMonths(LATEST)

/** The figures of the 24 months as the store keeps them, with `changed` on top. */
const figuresByMonth = (...changed: MonthFigures[]): Record<string, MonthFigures> => ({
  ...Object.fromEntries(MONTHS.map((month) => [month, figuresOf(month)])),
  ...Object.fromEntries(changed.map((figures) => [figures.month, figures])),
})

const rowsOf = (shown: string, ...changed: MonthFigures[]): MonthRow[] => {
  const rows = buildMonthRows(MONTHS, figuresByMonth(...changed), LATEST, shown)
  if (rows === null) throw new Error('the rows are missing a month')
  return rows
}

const rowOf = (rows: readonly MonthRow[], month: string): MonthRow => {
  const row = rows.find((candidate) => candidate.month === month)
  if (row === undefined) throw new Error(`no row for ${month}`)
  return row
}

const period = (
  income: string,
  expense: string,
  net: string,
  movementCount = 412,
): PeriodTotals => ({
  from: '2024-10',
  to: '2026-08',
  totals: { income, expense, net },
  movementCount,
})

describe('shownMonths (R1)', () => {
  it('is the 24 months that end in the month of the last data, newest first', () => {
    expect(SHOWN_MONTHS).toBe(24)
    expect(MONTHS).toHaveLength(24)
    expect(MONTHS[0]).toBe('2026-09')
    expect(MONTHS.at(-1)).toBe('2024-10')
    expect(new Set(MONTHS).size).toBe(24)
    expect(MONTHS).toEqual([...MONTHS].sort((a, b) => b.localeCompare(a)))
  })

  it('crosses two changes of year without skipping a month', () => {
    expect(MONTHS.slice(8, 10)).toEqual(['2026-01', '2025-12'])
    expect(MONTHS.slice(20, 22)).toEqual(['2025-01', '2024-12'])
  })

  it('does not depend on the day of the last data', () => {
    expect(shownMonths('2026-09-30')).toEqual(MONTHS)
    expect(shownMonths('2026-09-01')).toEqual(MONTHS)
  })

  it('is empty when the base has no movements', () => {
    expect(shownMonths(null)).toEqual([])
  })
})

describe('summedPeriod (R11)', () => {
  it('stops at the month before the last data when that month is incomplete', () => {
    expect(summedPeriod('2026-09-11')).toEqual({ from: '2024-10', to: '2026-08' })
  })

  it('reaches the month of the last data when the data ends on its last day', () => {
    expect(summedPeriod('2026-09-30')).toEqual({ from: '2024-10', to: '2026-09' })
  })

  it('knows the last day of a leap February', () => {
    expect(summedPeriod('2024-02-29')).toEqual({ from: '2022-03', to: '2024-02' })
    expect(summedPeriod('2024-02-28')).toEqual({ from: '2022-03', to: '2024-01' })
  })

  it('is null when the base has no movements', () => {
    expect(summedPeriod(null)).toBeNull()
  })

  it('is the period the fixture answers', () => {
    expect(summedPeriod(LATEST)).toEqual({ from: PERIOD.from, to: PERIOD.to })
  })
})

describe('scaleTop (R3)', () => {
  const complete = MONTHS.map(figuresOf).filter(
    (figures) => figures.movementCount > 0 && figures.month !== '2026-09',
  )

  it('is the highest figure, in or out, of the 18 complete months of the fixture', () => {
    expect(complete).toHaveLength(18)
    expect(scaleTop(complete)).toBe('11527.15')
  })

  it('looks at what came in as well as at what went out', () => {
    expect(scaleTop([figuresOf('2026-05'), figuresOf('2026-01')])).toBe('7204.68')
  })

  it('is null with no months', () => {
    expect(scaleTop([])).toBeNull()
  })
})

describe('buildMonthRows (R2–R6, R9, R10)', () => {
  const rows = rowsOf('2026-08')

  it('makes one row per month, in the order given, with its name', () => {
    expect(rows.map((row) => row.month)).toEqual(MONTHS)
    expect(rowOf(rows, '2026-08').label).toBe('August 2026')
    expect(rowOf(rows, '2024-10').label).toBe('October 2024')
  })

  it('August 2026: the backend totals, its two widths, a negative sign, and shown above', () => {
    expect(rowOf(rows, '2026-08')).toEqual({
      month: '2026-08',
      label: 'August 2026',
      state: 'complete',
      isShown: true,
      totals: { income: '2590.26', expense: '4003.89', net: '-1413.63' },
      incomePermille: 225,
      expensePermille: 347,
      netSign: 'negative',
    })
  })

  it('marks the month shown above, and only that one (R5)', () => {
    expect(rows.filter((row) => row.isShown).map((row) => row.month)).toEqual(['2026-08'])
  })

  it('marks no row when the month shown above is none of them (R6)', () => {
    expect(rowsOf('2026-10').some((row) => row.isShown)).toBe(false)
    expect(rowsOf('2024-03').some((row) => row.isShown)).toBe(false)
  })

  it('January 2026: its two widths and a positive sign', () => {
    const january = rowOf(rows, '2026-01')

    expect(january.incomePermille).toBe(270)
    expect(january.expensePermille).toBe(164)
    expect(january.netSign).toBe('positive')
    expect(january.isShown).toBe(false)
  })

  it('July 2025 sets the scale: what went out fills the whole bar', () => {
    const july = rowOf(rows, '2025-07')

    expect(july.incomePermille).toBe(192)
    expect(july.expensePermille).toBe(1000)
  })

  it('nine of the 18 complete months spent more than came in (R4)', () => {
    expect(rows.filter((row) => row.netSign === 'negative').map((row) => row.month)).toEqual([
      '2026-08',
      '2026-07',
      '2026-04',
      '2025-10',
      '2025-08',
      '2025-07',
      '2025-05',
      '2025-04',
      '2025-03',
    ])
    expect(rows.filter((row) => row.netSign === 'positive')).toHaveLength(9)
  })

  it('September 2026 is incomplete: its totals, no widths and no sign (R9)', () => {
    expect(rowOf(rows, '2026-09')).toEqual({
      month: '2026-09',
      label: 'September 2026',
      state: 'incomplete',
      isShown: false,
      totals: { income: '161.82', expense: '966.84', net: '-805.02' },
      incomePermille: null,
      expensePermille: null,
      netSign: null,
    })
  })

  it('an incomplete month does not set the scale, however high its figures', () => {
    const high = rowsOf('2026-08', fabricated('2026-09', '310.44', '19872.61', '-19562.17', 9))

    expect(rowOf(high, '2026-09').state).toBe('incomplete')
    expect(rowOf(high, '2025-07').expensePermille).toBe(1000)
    expect(rowOf(high, '2026-08').expensePermille).toBe(347)
  })

  it('from October 2024 to February 2025 the fixture has no movements: empty, with no totals (R10)', () => {
    for (const month of ['2024-10', '2024-11', '2024-12', '2025-01', '2025-02']) {
      expect(rowOf(rows, month)).toEqual({
        month,
        label: rowOf(rows, month).label,
        state: 'empty',
        isShown: false,
        totals: null,
        incomePermille: null,
        expensePermille: null,
        netSign: null,
      })
    }
    expect(rows.filter((row) => row.state === 'empty')).toHaveLength(5)
  })

  it('a month with movements that add up to zero is complete, not empty (R10)', () => {
    const zero = rowOf(
      rowsOf('2026-08', fabricated('2025-01', '0.00', '0.00', '0.00', 3)),
      '2025-01',
    )

    expect(zero.state).toBe('complete')
    expect(zero.totals).toEqual({ income: '0.00', expense: '0.00', net: '0.00' })
    expect(zero.incomePermille).toBe(0)
    expect(zero.expensePermille).toBe(0)
    expect(zero.netSign).toBe('zero')
  })

  it('a net of exactly zero with money moving reads as zero', () => {
    const even = rowOf(
      rowsOf('2026-08', fabricated('2025-02', '1840.27', '1840.27', '0.00', 22)),
      '2025-02',
    )

    expect(even.netSign).toBe('zero')
    expect(even.incomePermille).toBe(160)
    expect(even.expensePermille).toBe(160)
  })

  it('paints empty bars, not an error, when every complete month adds up to zero', () => {
    const months = ['2026-06', '2026-05']
    const only = buildMonthRows(
      months,
      {
        '2026-06': fabricated('2026-06', '0.00', '0.00', '0.00', 2),
        '2026-05': fabricated('2026-05', '0.00', '0.00', '0.00', 4),
      },
      LATEST,
      '2026-06',
    )

    expect(only?.map((row) => [row.incomePermille, row.expensePermille, row.netSign])).toEqual([
      [0, 0, 'zero'],
      [0, 0, 'zero'],
    ])
  })

  it('is null while any month is missing: no rows by halves (R13)', () => {
    const { '2025-06': _missing, ...partial } = figuresByMonth()

    expect(buildMonthRows(MONTHS, partial, LATEST, '2026-08')).toBeNull()
    expect(buildMonthRows(MONTHS, {}, LATEST, '2026-08')).toBeNull()
  })

  it('has no rows when there are no months', () => {
    expect(buildMonthRows([], {}, null, '2026-10')).toEqual([])
  })

  it('hands over the totals of the backend untouched, as the same strings (R2, C3)', () => {
    const byMonth = figuresByMonth()
    const built = buildMonthRows(MONTHS, byMonth, LATEST, '2026-08') ?? []

    for (const row of built.filter((candidate) => candidate.totals !== null)) {
      expect(row.totals).toBe(byMonth[row.month]?.totals)
    }
  })

  it('never turns an amount into a number (C3)', () => {
    const source = readFileSync(
      fileURLToPath(new NodeURL('../previousMonths.ts', import.meta.url)),
      'utf8',
    )

    expect(source).not.toMatch(/\bNumber\s*\(|parseFloat|parseInt|Math\./)
    expect(source).not.toMatch(/sumAmounts/)
  })
})

describe('periodSentence (R11)', () => {
  it('case 1, nothing in the period: there is nothing to add up', () => {
    expect(periodSentence(period('0.00', '0.00', '0.00', 0), '2024-10')).toBe(
      'No complete months to add up yet.',
    )
    expect(NOTHING_TO_ADD_UP).toBe('No complete months to add up yet.')
  })

  it('case 2, savings: says what was saved, in whole euros', () => {
    expect(periodSentence(period('41290.37', '36844.12', '4446.25'), '2024-10')).toBe(
      `From October 2024 to August 2026, ${eur('41.290')} came in and ${eur('36.844')} went out: you saved ${eur('4.446')}.`,
    )
  })

  it('case 3, a net of zero: spent exactly what came in', () => {
    expect(periodSentence(period('18230.40', '18230.40', '0.00'), '2024-10')).toBe(
      `From October 2024 to August 2026, ${eur('18.230')} came in and ${eur('18.230')} went out: you spent exactly what came in.`,
    )
  })

  it('case 4, a deficit: the period of the fixture, with the sign of the net turned', () => {
    expect(periodSentence(PERIOD, MONTHS.at(-1) ?? '')).toBe(
      `From October 2024 to August 2026, ${eur('60.136')} came in and ${eur('80.935')} went out: you spent ${eur('20.799')} more than came in.`,
    )
  })

  it('names the oldest of the 24 months and the last month of the period', () => {
    const sentence = periodSentence({ ...PERIOD, to: '2026-09' }, '2024-10')

    expect(sentence.startsWith('From October 2024 to September 2026, ')).toBe(true)
  })

  it('movements that add up to zero are not «nothing to add up»', () => {
    expect(periodSentence(period('0.00', '0.00', '0.00', 6), '2024-10')).toBe(
      `From October 2024 to August 2026, ${eur('0')} came in and ${eur('0')} went out: you spent exactly what came in.`,
    )
  })
})

describe('leftOutLine (R12)', () => {
  it('names the month of the last data when it is incomplete', () => {
    expect(leftOutLine('2026-09-11')).toBe('September 2026 is left out: it is incomplete.')
  })

  it('says nothing when the data reaches the last day of its month', () => {
    expect(leftOutLine('2026-09-30')).toBeNull()
  })

  it('says nothing when the base has no movements', () => {
    expect(leftOutLine(null)).toBeNull()
  })
})

describe('notShownLine (R6)', () => {
  it('names the month shown above when it is none of the 24', () => {
    expect(notShownLine('2026-10', MONTHS)).toBe('October 2026 is not one of these months.')
    expect(notShownLine('2024-03', MONTHS)).toBe('March 2024 is not one of these months.')
  })

  it('says nothing when the month shown above is one of them', () => {
    expect(notShownLine('2026-08', MONTHS)).toBeNull()
    expect(notShownLine('2026-09', MONTHS)).toBeNull()
    expect(notShownLine('2024-10', MONTHS)).toBeNull()
  })

  it('says nothing when there are no months at all', () => {
    expect(notShownLine('2026-10', [])).toBeNull()
  })
})

describe('dataEndsLine (R9)', () => {
  it('says where the data ends, with the date as the rest of the app writes it', () => {
    expect(dataEndsLine(LATEST)).toBe(`Data ends on ${formatDate(LATEST)}`)
    expect(dataEndsLine(LATEST)).toMatch(/^Data ends on 11 \S+ 2026$/)
  })
})

describe('the fixed texts', () => {
  it('are these, letter by letter', () => {
    expect(PREVIOUS_MONTHS_TITLE).toBe('Month by month')
    expect(MONTH_COLUMN_LABEL).toBe('Month')
    expect(SHOWN_ABOVE).toBe('Shown above')
    expect(INCOMPLETE).toBe('Incomplete')
    expect(NO_MOVEMENTS).toBe('No movements')
    expect(PREVIOUS_MONTHS_LOADING).toBe('Loading month by month…')
    expect(PREVIOUS_MONTHS_FAILED).toBe("Couldn't load these months.")
    expect(PERIOD_FAILED).toBe("Couldn't add up these months.")
  })

  it('the loading text is not the one of the comparison: both can be on screen at once', () => {
    expect(PREVIOUS_MONTHS_LOADING).not.toBe(COMPARISON_LOADING)
  })
})
