import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import GainsSummary from '../components/GainsSummary.vue'
import type { GainsTotal } from '../types'
import { investmentGains } from './fixtures'

const NBSP = String.fromCharCode(0xa0)

function mountSummary(total: GainsTotal) {
  return mount(GainsSummary, { props: { total } })
}

describe('GainsSummary', () => {
  it('shows the total of the live investments in euros and percent, green when it gains', () => {
    const summary = mountSummary(investmentGains().total)

    expect(summary.text()).toContain('Gain or loss on live investments')
    const total = summary.get('[data-test="gains-total"]')
    const percent = summary.get('[data-test="gains-total-percent"]')
    // Exactly as the backend sent it: nothing summed nor recalculated here.
    expect(total.text()).toBe(`+565,95${NBSP}€`)
    expect(percent.text()).toBe(`+2,02${NBSP}%`)
    expect(total.classes()).toContain('text-positive')
    expect(percent.classes()).toContain('text-positive')
    expect(summary.get('[data-test="gains-invested"]').text()).toBe(`on 28.033,30${NBSP}€ put in`)
  })

  it('paints the total red when it loses', () => {
    const summary = mountSummary({
      gain: '-310.75',
      invested: '9480.20',
      gainPercent: '-3.28',
      excluded: [],
    })

    const total = summary.get('[data-test="gains-total"]')
    const percent = summary.get('[data-test="gains-total-percent"]')
    expect(total.text()).toBe(`-310,75${NBSP}€`)
    expect(percent.text()).toBe(`-3,28${NBSP}%`)
    expect(total.classes()).toContain('text-negative')
    expect(percent.classes()).toContain('text-negative')
    expect(total.classes()).not.toContain('text-positive')
  })

  it('paints a total of exactly zero in the neutral colour and a missing percent as a gap', () => {
    const summary = mountSummary({
      gain: '0.00',
      invested: '0.00',
      gainPercent: null,
      excluded: [{ productId: 2, name: 'ETF Mundo', reason: 'no_photo' }],
    })

    const total = summary.get('[data-test="gains-total"]')
    expect(total.text()).toBe(`0,00${NBSP}€`)
    expect(total.classes()).toContain('text-ink-strong')
    expect(total.classes()).not.toContain('text-positive')
    expect(total.classes()).not.toContain('text-negative')
    expect(summary.get('[data-test="gains-total-percent"]').text()).toBe('—')
  })

  it('lists the live investments left out of the total with their reason', () => {
    const summary = mountSummary({
      ...investmentGains().total,
      excluded: [
        { productId: 2, name: 'ETF Mundo', reason: 'no_photo' },
        { productId: 6, name: 'Fondo Bonos', reason: 'gain_not_reported' },
      ],
    })

    expect(summary.get('[data-test="gains-excluded"]').text()).toBe(
      'Not included: ETF Mundo (no valuation on file), Fondo Bonos (the valuation has no gain)',
    )
    const none = mountSummary({ ...investmentGains().total, excluded: [] })
    expect(none.find('[data-test="gains-excluded"]').exists()).toBe(false)
  })
})
