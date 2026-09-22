import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import ApplyRulesDialog from '../components/ApplyRulesDialog.vue'
import { parseApplyResult } from '../service'
import type { ApplyFlow } from '../types'
import { APPLY_OK } from './fixtures'

const result = parseApplyResult(APPLY_OK)

const open = (flow: ApplyFlow) =>
  mount(ApplyRulesDialog, { props: { flow }, attachTo: document.body })

const at = (selector: string) => document.querySelector<HTMLElement>(selector)
const body = () => document.body.textContent ?? ''

describe('ApplyRulesDialog (R10, R11, R12, R13)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('paints nothing while it is closed', () => {
    const wrapper = open({ step: 'closed' })

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('asks first, spelling out what is touched and that it cannot be undone (R10)', async () => {
    const wrapper = open({ step: 'confirm' })

    expect(body()).toContain('Apply your rules?')
    expect(body()).toContain('Only pending movements without a category are touched.')
    expect(body()).toContain('Confirmed and already categorized movements are never changed.')
    expect(body()).toContain("This can't be undone from the app.")
    expect(at('[data-test="apply-cancel"]')?.getAttribute('data-autofocus')).toBe('')

    at('[data-test="apply-confirmed"]')?.click()
    at('[data-test="apply-cancel"]')?.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('cannot be dismissed while the pass runs (R11)', async () => {
    const wrapper = open({ step: 'applying' })

    expect(body()).toContain('Applying your rules…')
    expect(at('[data-test="dialog-close"]')).toBeNull()
    expect(at('[data-test="dialog-footer"]')).toBeNull()

    at('[data-test="dialog-scrim"]')?.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the three figures of a finished pass, and closes on demand (R12)', async () => {
    const wrapper = open({ step: 'done', result })

    expect(body()).toContain('12 movements categorized')
    expect(body()).toContain('5 still without a matching rule')
    expect(body()).toContain('1 conflict')

    at('[data-test="apply-close"]')?.click()
    await nextTick()

    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('shows no figures at all when the pass failed (R13)', () => {
    const wrapper = open({
      step: 'failed',
      message:
        "The rules pass didn't finish. Some movements may already be categorized. The review queue has been reloaded.",
    })

    expect(at('[data-test="apply-error"]')?.textContent).toContain("didn't finish")
    // The figures of a half-done pass are never painted, only the sentence.
    expect(body()).not.toContain('movements categorized')
    expect(body()).not.toContain('still without a matching rule')
    expect(at('[data-test="apply-result"]')).toBeNull()
    expect(at('[data-test="apply-figure"]')).toBeNull()
    wrapper.unmount()
  })
})
