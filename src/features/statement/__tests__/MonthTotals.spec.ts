import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatMoney, sumAmounts } from '@/shared/money'
import { parseMovementPage } from '@/shared/movements'

import MonthTotals from '../components/MonthTotals.vue'
import { MONTH_PAGE, TOTALS } from './fixtures'

const page = parseMovementPage(MONTH_PAGE)

const mountTotals = (overrides: Record<string, unknown> = {}) =>
  mount(MonthTotals, {
    props: { pagination: page.pagination, totals: page.totals, ...overrides },
  })

describe('MonthTotals (R5, R6, R7)', () => {
  it('paints the three figures exactly as the backend sent them', () => {
    const totals = mountTotals()

    expect(totals.get('[data-test="statement-totals-in"]').text()).toBe(formatMoney(TOTALS.income))
    expect(totals.get('[data-test="statement-totals-out"]').text()).toBe(
      formatMoney(TOTALS.expense),
    )
    expect(totals.get('[data-test="statement-totals-net"]').text()).toBe(formatMoney(TOTALS.net))
  })

  it('does not recompute anything: the figures do not match the movements it was given', () => {
    const onScreen = sumAmounts(page.movements.map((movement) => movement.amount))

    expect(mountTotals().text()).not.toContain(formatMoney(onScreen))
    expect(mountTotals().text()).toContain(formatMoney(TOTALS.expense))
  })

  it('labels them neutrally, and says how many movements the month has', () => {
    const totals = mountTotals()

    expect(totals.text()).toContain('Money in')
    expect(totals.text()).toContain('Money out')
    expect(totals.text()).toContain('Difference')
    expect(totals.get('[data-test="statement-totals-count"]').text()).toBe('5 movements')
  })

  it('colours the difference by its sign', () => {
    expect(mountTotals().get('[data-test="statement-totals-net"]').classes()).toContain(
      'text-negative',
    )
    const positive = mountTotals({ totals: { income: '10.00', expense: '1.00', net: '9.00' } })
    expect(positive.get('[data-test="statement-totals-net"]').classes()).toContain('text-positive')
  })

  it('never calls these figures spending, earnings or savings (R7)', () => {
    const shown = mountTotals().text().toLowerCase()

    for (const word of ['spent', 'earned', 'savings', 'gastado', 'income tax']) {
      expect(shown).not.toContain(word)
    }
  })

  // The note the F19 wrote said the figures were inflated beyond repair and quoted July
  // 2026 in euros. Both claims died the day the deposits were marked, so the F23
  // rewrote it whole: no hand-written number survives, and the only live figure is the
  // one the backend counts itself.
  describe('the permanent note (R14, R15)', () => {
    const note = () => mountTotals().get('[data-test="statement-totals-note"]')

    /** The fixed text, letter by letter: it is the heart of the feature (design §8). */
    const FIXED_NOTE =
      'These figures already leave out what does not count: the two legs of a paired ' +
      'transfer, and everything you marked as not counted. Both stay in the list — turn ' +
      'on "Hide what does not count" to read the month without them. Two things no count ' +
      'can tell you: a transfer of yours whose other leg was never imported still counts ' +
      'as money in and out until you mark it, and a pair the app detected may not be a ' +
      'transfer at all.'

    it('is the fixed text, word for word (R14)', () => {
      expect(note().text()).toBe(FIXED_NOTE)
    })

    it('carries no figure of any kind: not one digit (R14)', () => {
      expect(note().text()).not.toMatch(/\d/)
    })

    it('no longer says the figures are inflated, nor names a month (R14)', () => {
      const text = note().text()

      for (const gone of [
        'inflated',
        'raw bank movements',
        'one deposit rolling over',
        'noise switch, which comes in a later step',
        'July',
        'August',
        '2026',
        '€',
      ]) {
        expect(text).not.toContain(gone)
      }
    })

    it('says what the figures are made of, how to read the month clean, and what no count knows', () => {
      const text = note().text()

      expect(text).toContain('already leave out what does not count')
      expect(text).toContain('the two legs of a paired transfer')
      expect(text).toContain('everything you marked as not counted')
      expect(text).toContain('turn on "Hide what does not count"')
      expect(text).toContain('whose other leg was never imported')
      expect(text).toContain('a pair the app detected may not be a transfer at all')
    })

    describe('the only live figure (R15)', () => {
      const noteWith = (ambiguousGroups: number | null) =>
        mountTotals({ ambiguousGroups }).get('[data-test="statement-totals-note"]')

      it('is absent while the count is unknown or the read failed', () => {
        expect(noteWith(null).text()).toBe(FIXED_NOTE)
        expect(
          mountTotals({ ambiguousGroups: null })
            .find('[data-test="statement-ambiguous-note"]')
            .exists(),
        ).toBe(false)
      })

      it('is absent with zero groups, and no error is painted', () => {
        expect(noteWith(0).text()).toBe(FIXED_NOTE)
        expect(
          mountTotals({ ambiguousGroups: 0 })
            .find('[data-test="statement-ambiguous-note"]')
            .exists(),
        ).toBe(false)
      })

      it('is one sentence in singular with one group', () => {
        expect(
          mountTotals({ ambiguousGroups: 1 }).get('[data-test="statement-ambiguous-note"]').text(),
        ).toBe('1 group looks like a transfer but could not be paired automatically.')
      })

      it('is one sentence in plural with three, in the same paragraph, after the fixed text', () => {
        const text = noteWith(3).text()

        expect(text).toContain(
          '3 groups look like transfers but could not be paired automatically.',
        )
        expect(text.indexOf('These figures already leave out')).toBeLessThan(
          text.indexOf('3 groups look like transfers'),
        )
      })

      it('is the ONLY digit the note ever shows', () => {
        expect(noteWith(3).text().match(/\d+/g)).toEqual(['3'])
      })
    })

    it('cannot be dismissed: no close button anywhere in the block', () => {
      const totals = mountTotals()

      expect(totals.findAll('button')).toHaveLength(0)
      expect(note().findAll('button')).toHaveLength(0)
      expect(note().attributes('title')).toBeUndefined()
      expect(note().isVisible()).toBe(true)
    })

    it('is shown with the month, not behind a hover or a tooltip', () => {
      expect(mountTotals().find('[data-test="statement-totals-note"]').exists()).toBe(true)
      expect(note().text().length).toBeGreaterThan(200)
    })
  })
  describe('the scope line of the filters (feature 20, R5, R6)', () => {
    const SCOPE = '12 movements match these filters in March 2026 · Uncategorized'

    it('is absent without filters', () => {
      expect(mountTotals().find('[data-test="statement-scope"]').exists()).toBe(false)
    })

    it('says what the figures above were computed over', () => {
      const totals = mountTotals({ scope: SCOPE })

      expect(totals.get('[data-test="statement-scope"]').text()).toBe(SCOPE)
      // The figures are still the backend's, untouched by the line.
      expect(totals.get('[data-test="statement-totals-in"]').text()).toBe(
        formatMoney(TOTALS.income),
      )
    })

    it('leaves the permanent note word for word, and still undismissable (R6)', () => {
      const withScope = mountTotals({ scope: SCOPE })
      const withoutScope = mountTotals()

      expect(withScope.get('[data-test="statement-totals-note"]').text()).toBe(
        withoutScope.get('[data-test="statement-totals-note"]').text(),
      )
      expect(withScope.findAll('button')).toHaveLength(0)
      expect(withScope.get('[data-test="statement-totals-note"]').isVisible()).toBe(true)
    })
  })
})
