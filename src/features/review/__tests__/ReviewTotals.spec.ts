import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatMoney } from '@/shared/money'

import ReviewTotals from '../components/ReviewTotals.vue'

const cls = (...parts: string[]) => parts.join('-')

const pagination = { page: 1, pageSize: 100, total: 132, totalPages: 2 }

describe('ReviewTotals (R9)', () => {
  it('shows the matches and the three totals exactly as the API sent them', () => {
    const wrapper = mount(ReviewTotals, {
      props: {
        pagination,
        totals: { income: '1200.00', expense: '845.37', net: '354.63' },
      },
    })

    expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('132 movements')
    expect(wrapper.get('[data-test="totals-in"]').text()).toBe(formatMoney('1200.00'))
    expect(wrapper.get('[data-test="totals-out"]').text()).toBe(formatMoney('845.37'))
    expect(wrapper.get('[data-test="totals-net"]').text()).toBe(formatMoney('354.63'))
  })

  it('keeps the API totals even when the loaded page does not add up to them', () => {
    // The page holds 100 rows of 1378 matches: adding the page would be a lie.
    const wrapper = mount(ReviewTotals, {
      props: {
        pagination: { ...pagination, total: 1378 },
        totals: { income: '9000.00', expense: '12000.00', net: '-3000.00' },
      },
    })

    expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('1378 movements')
    expect(wrapper.get('[data-test="totals-net"]').text()).toBe(formatMoney('-3000.00'))
  })

  it('paints a negative net in the negative tone and a positive one in the positive tone', () => {
    const negative = mount(ReviewTotals, {
      props: { pagination, totals: { income: '0.00', expense: '10.00', net: '-10.00' } },
    })
    const positive = mount(ReviewTotals, {
      props: { pagination, totals: { income: '10.00', expense: '0.00', net: '10.00' } },
    })

    expect(negative.get('[data-test="totals-net"]').classes()).toContain(cls('text', 'negative'))
    expect(positive.get('[data-test="totals-net"]').classes()).toContain(cls('text', 'positive'))
  })

  it('says movement in singular for a single match', () => {
    const wrapper = mount(ReviewTotals, {
      props: {
        pagination: { ...pagination, total: 1 },
        totals: { income: '0.00', expense: '1.00', net: '-1.00' },
      },
    })

    expect(wrapper.get('[data-test="totals-matches"]').text()).toBe('1 movement')
  })
})
