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
  // one the backend counts itself. Feature 29 reworded it: one sentence in sight and the
  // rest folded in a <details>.
  describe('the permanent note (R14, R15)', () => {
    const note = () => mountTotals().get('[data-test="statement-totals-note"]')

    /** The sentence always in sight, letter by letter (feature 29, R8; feature 31, R10). */
    const FIGURES_LINE =
      'These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.'

    /** The sixth folded sentence, about deposits (feature 31, R10). */
    const DEPOSIT_LINE =
      'Opening or cancelling a deposit is not counted. When one matures, only its interest counts. A doubtful one counts nothing until the app knows how much was put in.'

    /** The folded sentences, in order and letter by letter (feature 29, R10). */
    const MORE_LINES = [
      'They stay in the list, with the amount crossed out. Tick "Hide what does not count" to take them off the list.',
      '"Transfer" is put by the app on the two movements of a transfer between your accounts. "Not counted" is put by you.',
      'A movement that is left out keeps its category: the category says what it was, the label says it is not in the sums.',
      'If only one of the two movements of a transfer was imported, it still counts until you mark it as "Not counted".',
      'The app can pair two movements that are not a transfer. Unlink them in "Transfers".',
      DEPOSIT_LINE,
    ]

    const AMBIGUOUS_TWO = '2 groups look like transfers but could not be paired automatically.'

    /** Everything the note says when no group is doubtful, in the order it is read. */
    const FIXED_TEXTS = [FIGURES_LINE, 'More about what counts', ...MORE_LINES]

    const items = (ambiguousGroups?: number | null) =>
      mountTotals(ambiguousGroups === undefined ? {} : { ambiguousGroups })
        .get('[data-test="statement-totals-more"]')
        .findAll('li')

    it('shows one sentence and keeps the rest folded until it is opened', () => {
      const totals = mountTotals()

      // The sentence in sight, inside the note and outside the folded part (R8).
      const line = note().get('[data-test="statement-totals-line"]')
      expect(line.text()).toBe(FIGURES_LINE)
      expect(line.element.closest('details')).toBeNull()

      // The rest: a native <details>, closed, with its summary (R9).
      const more = note().get('[data-test="statement-totals-more"]')
      expect(more.element.tagName).toBe('DETAILS')
      expect(more.attributes('open')).toBeUndefined()
      expect((more.element as HTMLDetailsElement).open).toBe(false)
      expect(more.findAll('summary')).toHaveLength(1)
      expect(more.get('summary').text()).toBe('More about what counts')
      expect(totals.findAll('details')).toHaveLength(1)

      // Six sentences, each in its own list item, in order (R10; the sixth since feature 31).
      expect(items().map((item) => item.text())).toEqual(MORE_LINES)
      expect(more.findAll('ul')).toHaveLength(1)

      // The doubtful groups are the seventh item, and only with a count above zero (R11).
      const withGroups = items(2)
      expect(withGroups.map((item) => item.text())).toEqual([...MORE_LINES, AMBIGUOUS_TWO])
      expect(withGroups.at(-1)?.attributes('data-test')).toBe('statement-ambiguous-note')
      for (const none of [null, 0]) {
        expect(items(none)).toHaveLength(6)
        expect(
          mountTotals({ ambiguousGroups: none })
            .find('[data-test="statement-ambiguous-note"]')
            .exists(),
        ).toBe(false)
      }
    })

    it('is the fixed text, word for word (R14)', () => {
      const texts = [
        note().get('[data-test="statement-totals-line"]').text(),
        note().get('summary').text(),
        ...items().map((item) => item.text()),
      ]

      expect(texts).toEqual(FIXED_TEXTS)
    })

    it('says under the figures that a deposit counts only by its interest', () => {
      const line = note().get('[data-test="statement-totals-line"]')
      expect(line.text()).toBe(FIGURES_LINE)
      expect(line.text()).toContain('count a deposit only by its interest')
      expect(line.element.closest('details')).toBeNull()

      // Folded, after the five of feature 29 and before the doubtful groups.
      const folded = items(2).map((item) => item.text())
      expect(folded.indexOf(DEPOSIT_LINE)).toBe(5)
      expect(folded.at(-1)).toBe(AMBIGUOUS_TWO)
    })

    it('carries no figure of any kind: not one digit (R14)', () => {
      expect(note().text()).not.toMatch(/\d/)
      for (const text of FIXED_TEXTS) expect(text).not.toMatch(/\d/)
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

      expect(text).toContain('leave out the movements labelled "Transfer" or "Not counted"')
      expect(text).toContain('Tick "Hide what does not count" to take them off the list')
      expect(text).toContain('keeps its category')
      expect(text).toContain('If only one of the two movements of a transfer was imported')
      expect(text).toContain('The app can pair two movements that are not a transfer')
    })

    describe('the only live figure (R15)', () => {
      const noteWith = (ambiguousGroups: number | null) =>
        mountTotals({ ambiguousGroups }).get('[data-test="statement-totals-note"]')

      it('is absent while the count is unknown or the read failed', () => {
        expect(noteWith(null).text()).toBe(note().text())
        expect(noteWith(null).text()).not.toContain('could not be paired automatically')
        expect(
          mountTotals({ ambiguousGroups: null })
            .find('[data-test="statement-ambiguous-note"]')
            .exists(),
        ).toBe(false)
      })

      it('is absent with zero groups, and no error is painted', () => {
        expect(noteWith(0).text()).toBe(note().text())
        expect(noteWith(0).text()).not.toContain('could not be paired automatically')
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

      it('is one sentence in plural with three, folded with the rest, after the fixed text', () => {
        const text = noteWith(3).text()

        expect(text).toContain(
          '3 groups look like transfers but could not be paired automatically.',
        )
        expect(text.indexOf(MORE_LINES[4] ?? '')).toBeGreaterThan(-1)
        expect(text.indexOf(MORE_LINES[4] ?? '')).toBeLessThan(
          text.indexOf('3 groups look like transfers'),
        )
        expect(
          noteWith(3)
            .get('[data-test="statement-ambiguous-note"]')
            .element.closest('[data-test="statement-totals-more"]'),
        ).not.toBeNull()
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
      expect(note().get('[data-test="statement-totals-line"]').isVisible()).toBe(true)
      expect(note().get('summary').attributes('title')).toBeUndefined()
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
