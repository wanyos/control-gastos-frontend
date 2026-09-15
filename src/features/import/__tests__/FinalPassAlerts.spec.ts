import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import FinalPassAlerts from '../components/FinalPassAlerts.vue'
import { finalPassFailures } from '../details'
import { parseImportReport } from '../service'
import { CATEGORIZATION_ERROR, CLEAN_REPORT, TRANSFERS_ERROR } from './fixtures'

const withErrors = ({ transfers = false, categorization = false }) => ({
  ...CLEAN_REPORT,
  transfers: { ...CLEAN_REPORT.transfers, error: transfers ? TRANSFERS_ERROR : undefined },
  categorization: {
    ...CLEAN_REPORT.categorization,
    error: categorization ? CATEGORIZATION_ERROR : undefined,
  },
})

const mountAlerts = (raw: unknown) =>
  mount(FinalPassAlerts, { props: { failures: finalPassFailures(parseImportReport(raw)) } })

describe('FinalPassAlerts (R3)', () => {
  it('shows one alert for a transfers failure, saying the movements are safe', () => {
    const wrapper = mountAlerts(withErrors({ transfers: true }))

    const alerts = wrapper.findAll('[data-test="final-pass-failure"]')
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.get('[data-test="final-pass-title"]').text()).toBe(
      "Transfer matching didn't finish",
    )
    expect(alerts[0]?.text()).toContain('Your imported movements are safe.')
  })

  it('shows both alerts, transfers first', () => {
    const wrapper = mountAlerts(withErrors({ transfers: true, categorization: true }))

    expect(wrapper.findAll('[data-test="final-pass-title"]').map((t) => t.text())).toEqual([
      "Transfer matching didn't finish",
      "Automatic categorization didn't finish",
    ])
  })

  it('renders nothing when both passes finished', () => {
    const wrapper = mountAlerts(CLEAN_REPORT)

    expect(wrapper.find('[data-test="report-section-final-passes"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('folds the original message in a closed Details marked as Spanish, the alert itself unfolded', () => {
    const wrapper = mountAlerts(withErrors({ categorization: true }))

    const alert = wrapper.get('[data-test="final-pass-failure"]')
    expect(alert.element.closest('details')).toBeNull()
    const details = alert.get('details')
    expect((details.element as HTMLDetailsElement).open).toBe(false)
    expect(details.get('summary').text()).toBe('Details')
    const original = details.get('[data-test="final-pass-details"]')
    expect(original.attributes('lang')).toBe('es')
    expect(original.text()).toBe(CATEGORIZATION_ERROR.message)
  })

  it('shows no Details when the original message came empty', () => {
    const raw = {
      ...CLEAN_REPORT,
      transfers: { ...CLEAN_REPORT.transfers, error: { code: 'X', message: '' } },
    }

    const wrapper = mountAlerts(raw)

    expect(wrapper.find('[data-test="final-pass-failure"]').exists()).toBe(true)
    expect(wrapper.find('details').exists()).toBe(false)
  })
})
