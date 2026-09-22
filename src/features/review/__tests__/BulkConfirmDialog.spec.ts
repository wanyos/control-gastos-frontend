import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BulkConfirmDialog from '../components/BulkConfirmDialog.vue'

const dialogOf = (props: Record<string, unknown> = {}) =>
  mount(BulkConfirmDialog, {
    props: { open: true, count: 24, action: 'confirm', ...props },
    attachTo: document.body,
  })

describe('BulkConfirmDialog (R8)', () => {
  it('names the action and the exact number of movements', () => {
    const wrapper = dialogOf()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Confirm 24 movements?')
    expect(document.body.textContent).toContain('It is all or nothing')

    wrapper.unmount()
  })

  it('names the category it is about to apply, and says when it is being removed', () => {
    const applying = dialogOf({ action: 'category', categoryName: 'Groceries', count: 20 })
    expect(document.body.textContent).toContain('Apply "Groceries" to 20 movements?')
    applying.unmount()

    const removing = dialogOf({ action: 'category', count: 21 })
    expect(document.body.textContent).toContain('Remove the category from 21 movements?')
    removing.unmount()
  })

  it('answers Cancel or Yes, continue, and puts the focus on the safe one', async () => {
    const wrapper = dialogOf()

    expect(
      document.querySelector('[data-test="bulk-cancel"]')?.getAttribute('data-autofocus'),
    ).toBe('')

    document.querySelector<HTMLElement>('[data-test="bulk-continue"]')?.click()
    document.querySelector<HTMLElement>('[data-test="bulk-cancel"]')?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)

    wrapper.unmount()
  })

  it('paints nothing while it is closed', () => {
    const wrapper = dialogOf({ open: false })

    expect(document.querySelector('[role="dialog"]')).toBeNull()

    wrapper.unmount()
  })
})
