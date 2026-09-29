import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ExcludeConfirmDialog from '../components/ExcludeConfirmDialog.vue'

const dialogOf = (props: Record<string, unknown> = {}) =>
  mount(ExcludeConfirmDialog, {
    props: { open: true, count: 24, excluded: true, ...props },
    attachTo: document.body,
  })

describe('ExcludeConfirmDialog (R13)', () => {
  it('names what it is about to do and the exact number of movements', () => {
    const wrapper = dialogOf()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Exclude 24 movements from totals?')
    expect(document.body.textContent).toContain('It is all or nothing')

    wrapper.unmount()
  })

  it('asks the other way round when the movements are going back in', () => {
    const wrapper = dialogOf({ excluded: false, count: 21 })

    expect(document.body.textContent).toContain('Put 21 movements back in totals?')

    wrapper.unmount()
  })

  it('says one movement in the singular', () => {
    const wrapper = dialogOf({ count: 1 })

    expect(document.body.textContent).toContain('Exclude 1 movement from totals?')

    wrapper.unmount()
  })

  it('answers Cancel or Yes, continue, and puts the focus on the safe one', async () => {
    const wrapper = dialogOf()

    expect(
      document
        .querySelector('[data-test="statement-exclude-cancel"]')
        ?.getAttribute('data-autofocus'),
    ).toBe('')

    document.querySelector<HTMLElement>('[data-test="statement-exclude-continue"]')?.click()
    document.querySelector<HTMLElement>('[data-test="statement-exclude-cancel"]')?.click()
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
