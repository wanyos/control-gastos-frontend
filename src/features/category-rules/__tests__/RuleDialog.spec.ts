import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import { parseCategories } from '@/shared/categories'

import RuleDialog from '../components/RuleDialog.vue'
import { proposeMatchText } from '../rules'
import { CATEGORY_TREE } from './fixtures'

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
