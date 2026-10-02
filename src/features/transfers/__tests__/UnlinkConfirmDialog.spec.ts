import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import UnlinkConfirmDialog from '../components/UnlinkConfirmDialog.vue'
import { parseTransferPairs } from '../service'
import { FINE_100, marked } from './fixtures'

const pairOf = (raw: Record<string, unknown>) => parseTransferPairs({ pairs: [raw] })[0]!

const dialogOf = (raw: Record<string, unknown> = FINE_100, open = true) =>
  mount(UnlinkConfirmDialog, { props: { open, pair: pairOf(raw) }, attachTo: document.body })

/** Collapses whitespace, the non-breaking space of an amount included. */
const flat = (text: string) => text.replace(/\s+/g, ' ').trim()

const textOf = (selector: string) =>
  [...document.querySelectorAll(selector)].map((node) => flat(node.textContent ?? ''))

describe('UnlinkConfirmDialog (R5)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('names both legs with date, account and amount, and says what will count again', () => {
    const wrapper = dialogOf()

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Unlink this pair?')
    expect(textOf('[data-test="unlink-confirm-leg"]')).toEqual([
      flat(`Money out · ${formatDate('2025-06-30')} · n26 ···4136 · ${formatMoney('100.00')}`),
      flat(`Money in · ${formatDate('2025-06-27')} · openbank ···4073 · ${formatMoney('100.00')}`),
    ])
    expect(textOf('[data-test="unlink-confirm-consequence"]')).toEqual([
      'Both movements will count in your totals again.',
    ])
    expect(textOf('[data-test="unlink-confirm-memory"]')).toEqual([
      "The next import won't pair these two again.",
    ])

    wrapper.unmount()
  })

  it('says a leg marked as not counted stays out', () => {
    const wrapper = dialogOf(marked(FINE_100, false, true))

    expect(textOf('[data-test="unlink-confirm-consequence"]')).toEqual([
      'The money out leg will count in your totals again. The money in leg stays out because you marked it as not counted.',
    ])

    wrapper.unmount()
  })

  it('answers Cancel or Yes, unlink, and puts the focus on Cancel', async () => {
    const wrapper = dialogOf()
    await wrapper.vm.$nextTick()

    const cancel = document.querySelector<HTMLElement>('[data-test="unlink-cancel"]')
    expect(cancel?.getAttribute('data-autofocus')).toBe('')
    expect(document.activeElement).toBe(cancel)

    document.querySelector<HTMLElement>('[data-test="unlink-continue"]')?.click()
    cancel?.click()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)

    wrapper.unmount()
  })

  it('paints nothing while it is closed', () => {
    const wrapper = dialogOf(FINE_100, false)

    expect(document.querySelector('[role="dialog"]')).toBeNull()

    wrapper.unmount()
  })
})
