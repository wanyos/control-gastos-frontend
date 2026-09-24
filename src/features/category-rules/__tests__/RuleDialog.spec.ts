import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import { parseCategories } from '@/shared/categories'
import { parseMovementPage } from '@/shared/movements'

import RuleDialog from '../components/RuleDialog.vue'
import { proposeMatchText } from '../rules'
import type { MatchPreview } from '../types'
import { CATEGORY_TREE, movement, movementPage } from './fixtures'

// The dialog lives in a Teleport, so everything is asked of the document, as the
// feature 16 dialog tests do.

const categories = parseCategories(CATEGORY_TREE)

const open = (props: Record<string, unknown> = {}) =>
  mount(RuleDialog, {
    props: {
      open: true,
      mode: 'create',
      initialText: proposeMatchText('RECIB /IBERDROLA CLIENTES, S.A'),
      kind: 'expense',
      categories,
      ...props,
    },
    attachTo: document.body,
  })

const at = <T extends HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector)

const textField = (): HTMLInputElement => {
  const input = at<HTMLInputElement>('[data-test="rule-text"] input')
  if (!input) throw new Error('no text field')
  return input
}

const categoryField = (): HTMLSelectElement => {
  const select = at<HTMLSelectElement>('[data-test="rule-category"] select')
  if (!select) throw new Error('no category field')
  return select
}

const type = async (value: string): Promise<void> => {
  const input = textField()
  input.value = value
  input.dispatchEvent(new Event('input'))
  await nextTick()
}

const choose = async (value: string): Promise<void> => {
  const select = categoryField()
  select.value = value
  select.dispatchEvent(new Event('change'))
  await nextTick()
}

const click = async (test: string): Promise<void> => {
  at(`[data-test="${test}"]`)?.click()
  await nextTick()
}

describe('RuleDialog (R2, R3, R4, R6, R8)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('proposes the meaningful word and lets it be edited (R2)', async () => {
    const wrapper = open({ description: 'RECIB /IBERDROLA CLIENTES, S.A' })

    expect(textField().value).toBe('iberdrola')
    expect(at('[data-test="rule-source"]')?.textContent).toContain('RECIB /IBERDROLA CLIENTES, S.A')

    await type('iberdrola clientes')
    await choose('6')
    await click('rule-save')

    expect(wrapper.emitted('save')).toEqual([[{ matchText: 'iberdrola clientes', categoryId: 6 }]])
    wrapper.unmount()
  })

  it('offers only the categories of the movement kind (R3)', () => {
    const wrapper = open()

    const labels = [...categoryField().querySelectorAll('option')].map((one) => one.textContent)
    expect(labels).toContain('Supermercado')
    expect(labels).toContain('Fruteria')
    expect(labels).toContain('Suministros')
    expect(labels).not.toContain('Nomina')
    wrapper.unmount()
  })

  it('offers only income categories for an income movement (R3)', () => {
    const wrapper = open({ kind: 'income' })

    const labels = [...categoryField().querySelectorAll('option')].map((one) => one.textContent)
    expect(labels).toEqual(['Choose a category…', 'Nomina'])
    wrapper.unmount()
  })

  it('starts on the category the movement already has (R3)', () => {
    const wrapper = open({ initialCategoryId: 4 })

    expect(categoryField().value).toBe('4')
    wrapper.unmount()
  })

  it('starts empty and refuses to save when the movement has no category (R3)', () => {
    const wrapper = open()

    expect(categoryField().value).toBe('')
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('refuses a text the contract would reject, without sending anything (R4)', async () => {
    const wrapper = open({ initialCategoryId: 4 })

    await type('ab')

    expect(at('[data-test="rule-text"]')?.textContent).toContain(
      'Use at least 3 letters or digits.',
    )
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(true)

    await click('rule-save')
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })

  it('explains what the field does while the text is fine', () => {
    const wrapper = open({ initialCategoryId: 4 })

    expect(at('[data-test="rule-text"]')?.textContent).toContain(
      'Matches any description that contains this text, ignoring case and accents.',
    )
    wrapper.unmount()
  })

  it('keeps what was typed and shows the failure inside the dialog (R6)', async () => {
    const wrapper = open({ initialCategoryId: 4 })
    await type('mercadona')

    await wrapper.setProps({ message: 'Nothing was saved: another rule already uses that text.' })

    expect(at('[data-test="rule-error"]')?.textContent).toContain(
      'another rule already uses that text',
    )
    expect(textField().value).toBe('mercadona')
    expect(at('[data-test="rule-dialog"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('waits for the save in flight instead of firing a second one', () => {
    const wrapper = open({ initialCategoryId: 4, busy: true })

    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('changes an existing rule with the same dialog, under another title (R8)', async () => {
    const wrapper = open({ mode: 'edit', initialText: 'iberdrola', initialCategoryId: 6 })

    expect(at('[data-test="rule-dialog"]')?.textContent).toContain('Edit rule')
    expect(at('[data-test="rule-save"]')?.textContent?.trim()).toBe('Save')
    expect(at('[data-test="rule-source"]')).toBeNull()

    await choose('4')
    await click('rule-save')

    expect(wrapper.emitted('save')).toEqual([[{ matchText: 'iberdrola', categoryId: 4 }]])
    wrapper.unmount()
  })

  it('cancels without emitting a save', async () => {
    const wrapper = open({ initialCategoryId: 4 })

    await click('rule-cancel')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})

// ─── The match preview (feature 18) ────────────────────────────────────────
// The dialog does not count anything itself: it says WHEN to count, waiting out the
// burst of keystrokes, and paints what it is handed back.

const SAMPLES = parseMovementPage(movementPage([movement(10, 'COMPRA MERCADONA')], 34)).movements

const READY: MatchPreview = {
  step: 'ready',
  text: 'mercadona',
  total: 51,
  samples: SAMPLES,
}

describe('RuleDialog: the match preview (R1, R7, R9, R11)', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('asks for the count as soon as it opens, without a keystroke (R11)', () => {
    vi.useFakeTimers()
    const wrapper = open({ mode: 'edit', initialText: 'iberdrola', initialCategoryId: 6 })

    expect(wrapper.emitted('preview')).toEqual([['iberdrola']])
    wrapper.unmount()
  })

  it('asks once for a burst of keystrokes, with the text of the last one (R1)', async () => {
    vi.useFakeTimers()
    const wrapper = open({ initialCategoryId: 4 })
    const first = wrapper.emitted('preview')?.length ?? 0

    await type('merc')
    await type('mercad')
    await type('mercadona')
    expect(wrapper.emitted('preview')).toHaveLength(first)

    vi.advanceTimersByTime(350)
    expect(wrapper.emitted('preview')?.slice(first)).toEqual([['mercadona']])
    wrapper.unmount()
  })

  it('waits the same 350 ms the review search waits (R1)', async () => {
    vi.useFakeTimers()
    const wrapper = open({ initialCategoryId: 4 })
    const first = wrapper.emitted('preview')?.length ?? 0

    await type('mercadona')
    vi.advanceTimersByTime(349)
    expect(wrapper.emitted('preview')).toHaveLength(first)

    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('preview')).toHaveLength(first + 1)
    wrapper.unmount()
  })

  it('asks for nothing below the floor of the contract, and says so (R2)', async () => {
    vi.useFakeTimers()
    const wrapper = open({ initialCategoryId: 4 })
    const first = wrapper.emitted('preview')?.length ?? 0

    await type('ab')
    vi.advanceTimersByTime(350)

    expect(wrapper.emitted('preview')?.slice(first)).toEqual([['']])
    wrapper.unmount()
  })

  it('asks for nothing above the ceiling of `q` either (R2)', async () => {
    vi.useFakeTimers()
    const wrapper = open({ initialCategoryId: 4 })
    const first = wrapper.emitted('preview')?.length ?? 0

    await type('a'.repeat(101))
    vi.advanceTimersByTime(350)

    expect(wrapper.emitted('preview')?.slice(first)).toEqual([['']])
    wrapper.unmount()
  })

  it('shows the count and the examples inside the dialog itself (R3, R4)', () => {
    const wrapper = open({ initialCategoryId: 4, preview: READY })

    expect(at('[data-test="rule-dialog"]')?.textContent).toContain(
      '51 pending movements without a category contain this text.',
    )
    expect(at('[data-test="rule-preview-sample"]')?.textContent).toContain('COMPRA MERCADONA')
    wrapper.unmount()
  })

  it('keeps the save button enabled while the text matches too many (R7)', () => {
    const wrapper = open({ initialCategoryId: 4, preview: READY })

    expect(at('[data-test="rule-preview-warning"]')).not.toBeNull()
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(false)
    wrapper.unmount()
  })

  it('keeps the save button enabled when nothing matches, and when the count fails (R7)', () => {
    const none = open({
      initialCategoryId: 4,
      preview: { step: 'ready', text: 'zzzz', total: 0, samples: [] },
    })
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(false)
    none.unmount()
    document.body.innerHTML = ''

    const failed = open({
      initialCategoryId: 4,
      preview: { step: 'failed', text: 'mercadona', message: "Couldn't check how many match." },
    })
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(false)
    failed.unmount()
  })

  it('leaves the field, the selector and the save button usable while counting (R9)', async () => {
    const wrapper = open({
      initialCategoryId: 4,
      preview: { step: 'loading', text: 'mercadona' },
    })

    expect(textField().disabled).toBe(false)
    expect(categoryField().disabled).toBe(false)
    expect(at('[data-test="rule-save"]')?.hasAttribute('disabled')).toBe(false)

    await type('mercadona valencia')
    expect(textField().value).toBe('mercadona valencia')
    wrapper.unmount()
  })
})
