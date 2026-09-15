import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ReportSection from '../components/ReportSection.vue'

const mountSection = () =>
  mount(ReportSection, {
    props: { id: 'mismatches', title: 'Balance mismatches', count: 2 },
    slots: { default: '<p data-test="content">Rows</p>' },
  })

describe('ReportSection (R2)', () => {
  it('is a closed details element tagged with its section id', () => {
    const wrapper = mountSection()

    const details = wrapper.get('details')
    expect(details.attributes('data-test')).toBe('report-section-mismatches')
    expect(details.attributes()).not.toHaveProperty('open')
    expect((details.element as HTMLDetailsElement).open).toBe(false)
  })

  it('shows the title and the count in the summary', () => {
    const wrapper = mountSection()

    const summary = wrapper.get('summary')
    expect(summary.get('[data-test="report-section-title"]').text()).toBe('Balance mismatches')
    expect(summary.get('[data-test="report-section-count"]').text()).toBe('2')
  })

  it('keeps its content inside the fold', () => {
    const wrapper = mountSection()

    expect(wrapper.get('details').find('[data-test="content"]').exists()).toBe(true)
    expect(wrapper.get('summary').find('[data-test="content"]').exists()).toBe(false)
  })
})
