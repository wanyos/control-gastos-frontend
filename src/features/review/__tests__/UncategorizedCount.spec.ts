import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import UncategorizedCount from '../components/UncategorizedCount.vue'

const SENTENCE = '[data-test="review-uncategorized-count"]'

const textOf = (count: number | null): string | null => {
  const wrapper = mount(UncategorizedCount, { props: { count } })
  const sentence = wrapper.find(SENTENCE)
  return sentence.exists() ? sentence.text() : null
}

describe('UncategorizedCount (feature 30, R13, R15)', () => {
  it('says how many pending movements have no category', () => {
    expect(textOf(847)).toBe('847 pending movements have no category.')
    expect(textOf(2)).toBe('2 pending movements have no category.')
  })

  it('uses the singular for one', () => {
    expect(textOf(1)).toBe('1 pending movement has no category.')
  })

  it('says every pending movement has a category when there are none', () => {
    expect(textOf(0)).toBe('Every pending movement has a category.')
  })

  it('paints nothing while the number is unknown', () => {
    const wrapper = mount(UncategorizedCount, { props: { count: null } })

    expect(wrapper.find(SENTENCE).exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('follows the number when it changes, and goes away when it is lost', async () => {
    const wrapper = mount(UncategorizedCount, { props: { count: 905 } })
    expect(wrapper.get(SENTENCE).text()).toBe('905 pending movements have no category.')

    await wrapper.setProps({ count: 847 })
    expect(wrapper.get(SENTENCE).text()).toBe('847 pending movements have no category.')

    await wrapper.setProps({ count: null })
    expect(wrapper.find(SENTENCE).exists()).toBe(false)
  })
})
