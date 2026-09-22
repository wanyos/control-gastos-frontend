import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ActionNotice from '../components/ActionNotice.vue'

const noticeOf = (props: Record<string, unknown>) => mount(ActionNotice, { props })

describe('ActionNotice (R12, R13)', () => {
  it('says what the action did and offers to undo it', async () => {
    const wrapper = noticeOf({ summary: '3 movements confirmed' })

    expect(wrapper.get('[data-test="action-summary"]').text()).toContain('3 movements confirmed')

    await wrapper.get('[data-test="action-undo"]').trigger('click')

    expect(wrapper.emitted('undo')).toHaveLength(1)
  })

  it('shows nothing at all when there is nothing to say', () => {
    expect(noticeOf({}).text()).toBe('')
    expect(noticeOf({ summary: null, error: null }).find('button').exists()).toBe(false)
  })

  it('paints a failure in the negative tone, and never next to an Undo', () => {
    const wrapper = noticeOf({
      summary: '3 movements confirmed',
      error: "Nothing changed. Some of those movements don't accept that category.",
    })

    expect(wrapper.get('[data-test="action-error"]').classes()).toContain(
      ['text', 'negative'].join('-'),
    )
    expect(wrapper.find('[data-test="action-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="action-undo"]').exists()).toBe(false)
  })

  it('does not let the undo start while another action is running (R11)', () => {
    const wrapper = noticeOf({ summary: '1 movement confirmed', busy: true })

    expect(wrapper.get('[data-test="action-undo"]').attributes('disabled')).toBeDefined()
  })
})
