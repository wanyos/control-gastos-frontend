import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ImportSummary from '../components/ImportSummary.vue'
import { parseImportReport } from '../service'
import { ALL_DUPLICATES_REPORT, FULL_REPORT, CLEAN_REPORT } from './fixtures'

const mountSummary = (raw: unknown) =>
  mount(ImportSummary, { props: { report: parseImportReport(raw) } })

describe('ImportSummary (R9)', () => {
  it('shows the headline and the four counters in mono figures', () => {
    const wrapper = mountSummary(FULL_REPORT)

    expect(wrapper.get('[data-test="outcome-headline"]').text()).toBe('Partially imported')
    const counters = wrapper.findAll('[data-test="summary-counter"]')
    expect(counters.map((c) => [c.get('dt').text(), c.get('dd').text()])).toEqual([
      ['New movements', '39'],
      ['Already imported', '2'],
      ['Investment files updated', '2'],
      ['Files not imported', '4'],
    ])
    expect(counters[0]?.get('dd').classes()).toEqual(
      expect.arrayContaining([['font', 'mono'].join('-'), ['tabular', 'nums'].join('-')]),
    )
    expect(wrapper.find('svg[aria-hidden="true"]').exists()).toBe(true)
  })

  it('shows the final passes line', () => {
    const wrapper = mountSummary(FULL_REPORT)

    expect(wrapper.get('[data-test="final-passes"]').text()).toBe(
      '2 transfers matched · 12 categorized · 1 new account',
    )
  })

  it('shows the review sentence as plain text, without a link', () => {
    const wrapper = mountSummary(CLEAN_REPORT)

    const sentence = wrapper.get('[data-test="review-sentence"]')
    expect(sentence.text()).toBe('1 new movement is waiting for your review')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('shows neither the review sentence nor the final line when there is nothing to say', () => {
    const wrapper = mountSummary(ALL_DUPLICATES_REPORT)

    expect(wrapper.find('[data-test="review-sentence"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="final-passes"]').exists()).toBe(false)
  })
})
