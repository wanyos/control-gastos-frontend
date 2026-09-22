import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ReviewPager from '../components/ReviewPager.vue'

const pagerOf = (page: number, totalPages: number) =>
  mount(ReviewPager, { props: { pagination: { page, pageSize: 100, total: 132, totalPages } } })

describe('ReviewPager (R3, R10)', () => {
  it('says where you are and asks for the next page', async () => {
    const wrapper = pagerOf(1, 2)

    expect(wrapper.get('[data-test="pager-position"]').text()).toBe('Page 1 of 2')

    await wrapper.get('[data-test="pager-next"]').trigger('click')

    expect(wrapper.emitted('go')).toEqual([[2]])
  })

  it('asks for the previous page from the second one', async () => {
    const wrapper = pagerOf(2, 2)

    await wrapper.get('[data-test="pager-previous"]').trigger('click')

    expect(wrapper.emitted('go')).toEqual([[1]])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const first = pagerOf(1, 3)
    const last = pagerOf(3, 3)

    expect(first.get('[data-test="pager-previous"]').attributes('disabled')).toBeDefined()
    expect(first.get('[data-test="pager-next"]').attributes('disabled')).toBeUndefined()
    expect(last.get('[data-test="pager-next"]').attributes('disabled')).toBeDefined()
    expect(last.get('[data-test="pager-previous"]').attributes('disabled')).toBeUndefined()
  })

  it.each([0, 1])('is not painted at all with %i pages', (totalPages) => {
    expect(pagerOf(1, totalPages).find('[data-test="review-pager"]').exists()).toBe(false)
  })
})
