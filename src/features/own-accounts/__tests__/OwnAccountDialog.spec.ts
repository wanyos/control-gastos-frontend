import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import OwnAccountDialog from '../components/OwnAccountDialog.vue'
import { parseOwnAccount } from '../service'
import { FIELD_MESSAGES, changesOf, draftOf, emptyDraft } from '../texts'
import type { OwnAccountDraft } from '../types'
import { rawRow, rowOf } from './fixtures'

// The window lives in a Teleport, so everything is asked of the document.

const rowDraft = (id: number): OwnAccountDraft => draftOf(parseOwnAccount(rawRow(rowOf(id)), 'row'))

const mountDialog = (props: Record<string, unknown> = {}) =>
  mount(OwnAccountDialog, {
    props: { open: true, mode: 'create', initial: emptyDraft(), ...props },
    attachTo: document.body,
  })

const at = <T extends Element = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T & Element>(selector)
  if (!element) throw new Error(`nothing at ${selector}`)
  return element
}
const all = <T extends Element = HTMLElement>(selector: string): T[] => [
  ...document.querySelectorAll<T & Element>(selector),
]

const field = (test: string): HTMLInputElement =>
  at<HTMLInputElement>(`[data-test="${test}"] input`)
const textFields = (): HTMLInputElement[] =>
  all<HTMLInputElement>('[data-test="account-dialog"] [data-test="text-list-field"] input')
const hintOf = (test: string): string =>
  at(`[data-test="${test}"]`).querySelector('p')?.textContent?.trim() ?? ''

async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input'))
  await nextTick()
}

async function choose(value: string): Promise<void> {
  const select = at<HTMLSelectElement>('[data-test="account-type"] select')
  select.value = value
  select.dispatchEvent(new Event('change'))
  await nextTick()
}

async function click(test: string, index = 0): Promise<void> {
  const button = all<HTMLButtonElement>(`[data-test="${test}"]`)[index]
  if (!button) throw new Error(`no ${test} #${index}`)
  button.click()
  await nextTick()
}

const saveButton = (): HTMLButtonElement => at<HTMLButtonElement>('[data-test="account-save"]')

describe('OwnAccountDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens empty to add and filled with the row to edit', async () => {
    const created = mountDialog()

    expect(at('[role="dialog"] h2').textContent?.trim()).toBe('Add an account')
    expect(at('[data-test="account-hint"]').textContent?.trim()).toBe(
      "A row with no texts recognizes nothing. Rows can't be deleted: leave it with no texts instead.",
    )
    expect(field('account-name').value).toBe('')
    expect(field('account-bank').value).toBe('')
    expect(field('account-number').value).toBe('')
    expect(at<HTMLSelectElement>('[data-test="account-type"] select').value).toBe('')
    expect(field('account-opened').type).toBe('date')
    expect(field('account-closed').value).toBe('')
    expect(textFields()).toEqual([])
    expect(at('[data-test="text-list-add"]').textContent?.trim()).toBe('Add text')
    const options = all<HTMLOptionElement>('[data-test="account-type"] option')
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Choose a type…',
      'Checking account',
      'Savings account',
      'Investment',
      'Deposit',
      'Crypto',
      'Other',
    ])
    created.unmount()

    mountDialog({ mode: 'edit', initial: rowDraft(5) })
    expect(at('[role="dialog"] h2').textContent?.trim()).toBe('Edit account')
    expect(field('account-name').value).toBe('Cuenta inventada dos')
    expect(field('account-bank').value).toBe('ING')
    expect(field('account-number').value).toBe('ES00 0000 0000 0000 0000 0002')
    expect(at<HTMLSelectElement>('[data-test="account-type"] select').value).toBe('checking')
    expect(field('account-opened').value).toBe('2015-09-14')
    expect(field('account-closed').value).toBe('2024-06-30')
    expect(textFields().map((input) => input.value)).toEqual(['Cuenta Inventada Dos'])
    expect(saveButton().disabled).toBe(false)
  })

  it('adds and removes text fields and drops the blank ones on save', async () => {
    const wrapper = mountDialog({ mode: 'edit', initial: rowDraft(2) })
    expect(textFields().map((input) => input.value)).toEqual([
      'Cartera Indexada Inventada',
      'MyInvestor',
    ])

    // Remove the second, add two fields, fill one and leave the other blank.
    await click('text-list-remove', 1)
    expect(textFields().map((input) => input.value)).toEqual(['Cartera Indexada Inventada'])
    await click('text-list-add')
    await click('text-list-add')
    expect(textFields()).toHaveLength(3)
    await type(textFields()[1]!, 'Indexada MyInvestor')
    expect(all('[data-test="account-dialog"] [data-test="text-list-remove"]')).toHaveLength(3)
    expect(saveButton().disabled).toBe(false)

    await click('account-save')

    const saved = wrapper.emitted('save')?.[0]?.[0] as OwnAccountDraft
    // The window hands up every field; the blank one is dropped when the body is built.
    expect(saved.texts).toEqual(['Cartera Indexada Inventada', 'Indexada MyInvestor', ''])
    expect(changesOf(parseOwnAccount(rawRow(rowOf(2)), 'row'), saved)).toEqual({
      texts: ['Cartera Indexada Inventada', 'Indexada MyInvestor'],
    })
  })

  it('a text shorter than three characters once compared keeps Save off and says why', async () => {
    const wrapper = mountDialog({ mode: 'edit', initial: rowDraft(6) })

    await click('text-list-add')
    await type(textFields()[1]!, 'N-2')
    expect(saveButton().disabled).toBe(false)
    await type(textFields()[1]!, ' *n2* ')

    expect(saveButton().disabled).toBe(true)
    const item = all('[data-test="account-dialog"] [data-test="text-list-field"]')[1]!
    expect(item.querySelector('p')?.textContent?.trim()).toBe(FIELD_MESSAGES.short)
    expect(item.querySelector('input')?.getAttribute('aria-invalid')).toBe('true')
    await click('account-save')
    expect(wrapper.emitted('save')).toBeUndefined()

    // Left blank, it is not a problem: it is dropped.
    await type(textFields()[1]!, '   ')
    expect(saveButton().disabled).toBe(false)
  })

  it('a closing date before the opening date keeps Save off and says why', async () => {
    const wrapper = mountDialog({ mode: 'edit', initial: rowDraft(10) })

    await type(field('account-closed'), '2025-01-14')

    expect(saveButton().disabled).toBe(true)
    expect(hintOf('account-closed')).toBe("The closing date can't be before the opening date.")
    await click('account-save')
    expect(wrapper.emitted('save')).toBeUndefined()

    await type(field('account-closed'), '2025-01-15')
    expect(saveButton().disabled).toBe(false)
    expect(hintOf('account-closed')).toBe('')
  })

  it('blank name or bank or no type keep Save off', async () => {
    const wrapper = mountDialog()

    // Empty, the three say why.
    expect(saveButton().disabled).toBe(true)
    expect(hintOf('account-name')).toBe('Write something here.')
    expect(hintOf('account-bank')).toBe('Write something here.')
    expect(hintOf('account-type')).toBe('Choose a type.')

    await type(field('account-name'), 'Monedero inventado dos')
    await type(field('account-bank'), 'Criptan')
    await choose('crypto')
    expect(saveButton().disabled).toBe(false)
    expect(hintOf('account-name')).toBe('')
    expect(hintOf('account-bank')).toBe('')
    expect(hintOf('account-type')).toBe('')

    // Only the name blank (spaces count as blank).
    await type(field('account-name'), '   ')
    expect(saveButton().disabled).toBe(true)
    expect(hintOf('account-name')).toBe('Write something here.')
    expect(hintOf('account-bank')).toBe('')
    expect(hintOf('account-type')).toBe('')
    await click('account-save')
    expect(wrapper.emitted('save')).toBeUndefined()
    await type(field('account-name'), 'Monedero inventado dos')
    expect(saveButton().disabled).toBe(false)

    // Only the bank blank.
    await type(field('account-bank'), '   ')
    expect(saveButton().disabled).toBe(true)
    expect(hintOf('account-bank')).toBe('Write something here.')
    expect(hintOf('account-name')).toBe('')
    expect(hintOf('account-type')).toBe('')
    await click('account-save')
    expect(wrapper.emitted('save')).toBeUndefined()
    await type(field('account-bank'), 'Criptan')
    expect(saveButton().disabled).toBe(false)

    // Only the type missing.
    await choose('')
    expect(saveButton().disabled).toBe(true)
    expect(hintOf('account-type')).toBe('Choose a type.')
    expect(hintOf('account-name')).toBe('')
    expect(hintOf('account-bank')).toBe('')
    await click('account-save')
    expect(wrapper.emitted('save')).toBeUndefined()

    await choose('crypto')
    await click('account-save')
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({
      ...emptyDraft(),
      name: 'Monedero inventado dos',
      bank: 'Criptan',
      type: 'crypto',
    })
  })

  it('keeps what was typed and shows the message after a failed save', async () => {
    const wrapper = mountDialog({ mode: 'edit', initial: rowDraft(7) })
    await type(field('account-number'), 'ES00 0000 0000 0000 0000 0012')
    await type(textFields()[0]!, 'Hucha Inventada Dos')

    // The save fails: the parent passes the sentence and keeps the window open, and the
    // table read again behind it hands a new `initial`.
    await wrapper.setProps({
      busy: false,
      message: "Nothing was saved: the server didn't accept one of the fields.",
      initial: rowDraft(7),
    })

    expect(at('[data-test="account-error"]').textContent?.trim()).toBe(
      "Nothing was saved: the server didn't accept one of the fields.",
    )
    expect(field('account-number').value).toBe('ES00 0000 0000 0000 0000 0012')
    expect(textFields().map((input) => input.value)).toEqual(['Hucha Inventada Dos', 'Bankinter'])

    // While busy, Save is off.
    await wrapper.setProps({ busy: true })
    expect(saveButton().disabled).toBe(true)

    // Closing and opening again starts from the row.
    await wrapper.setProps({ open: false, busy: false, message: null })
    await wrapper.setProps({ open: true })
    expect(field('account-number').value).toBe('')
    expect(document.querySelector('[data-test="account-error"]')).toBeNull()
  })
})
