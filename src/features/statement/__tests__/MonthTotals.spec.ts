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

  describe('the permanent note (R6)', () => {
    const note = () => mountTotals().get('[data-test="statement-totals-note"]')

    it('says the four things, with July 2026 as the example', () => {
      const text = note().text()

      expect(text).toContain('raw bank movements')
      expect(text).toContain('count as money in and out')
      expect(text).toContain('July 2026')
      expect(text).toContain('57.949')
      expect(text).toContain('59.096')
      expect(text).toContain('one deposit rolling over')
      expect(text).toContain('Paired transfers are already out of these figures')
      expect(text).toContain('noise switch')
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
