import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import HolderNames from '../components/HolderNames.vue'
import HolderNamesDialog from '../components/HolderNamesDialog.vue'
import { FIELD_MESSAGES } from '../texts'
import { HOLDER_NAMES } from './fixtures'

// The window lives in a Teleport, so everything is asked of the document.

const mountDialog = (props: Record<string, unknown> = {}) =>
  mount(HolderNamesDialog, {
    props: { open: true, initial: [...HOLDER_NAMES.names], ...props },
    attachTo: document.body,
  })

const all = <T extends Element = HTMLElement>(selector: string): T[] => [
  ...document.querySelectorAll<T & Element>(selector),
]
const at = <T extends Element = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T & Element>(selector)
  if (!element) throw new Error(`nothing at ${selector}`)
  return element
}

const forms = (): HTMLInputElement[] =>
  all<HTMLInputElement>('[data-test="names-dialog"] [data-test="text-list-field"] input')
const saveButton = (): HTMLButtonElement => at<HTMLButtonElement>('[data-test="names-save"]')

async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input'))
  await nextTick()
}

async function click(test: string, index = 0): Promise<void> {
  const button = all<HTMLButtonElement>(`[data-test="${test}"]`)[index]
  if (!button) throw new Error(`no ${test} #${index}`)
  button.click()
  await nextTick()
}

describe('HolderNamesDialog and HolderNames', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('edits the forms of your name as a list and saves them whole', async () => {
    const wrapper = mountDialog()

    expect(at('[role="dialog"] h2').textContent?.trim()).toBe('Forms of your name')
    expect(at('[data-test="names-dialog-hint"]').textContent?.trim()).toBe(
      'How your name appears in the descriptions: in full, surnames first, cut short by the bank… Only the whole form counts.',
    )
    expect(forms().map((input) => input.value)).toEqual(['Inventado Titular', 'Titular Inventado'])
    expect(at('[data-test="text-list-add"]').textContent?.trim()).toBe('Add a form')

    await click('text-list-remove', 0)
    await click('text-list-add')
    await click('text-list-add')
    await type(forms()[1]!, 'TITULAR INVENTADO SL')
    await click('names-save')

    // The whole list as typed, blank field included: the store drops it.
    expect(wrapper.emitted('save')).toEqual([[['Titular Inventado', 'TITULAR INVENTADO SL', '']]])

    // An empty list can be saved: it deletes them all.
    wrapper.unmount()
    const empty = mountDialog()
    await click('text-list-remove', 1)
    await click('text-list-remove', 0)
    expect(forms()).toEqual([])
    expect(saveButton().disabled).toBe(false)
    await click('names-save')
    expect(empty.emitted('save')).toEqual([[[]]])
  })

  it('a form shorter than three characters keeps Save off', async () => {
    const wrapper = mountDialog()

    await type(forms()[0]!, 'T.I')
    expect(saveButton().disabled).toBe(false)
    await type(forms()[0]!, ' T. ')

    expect(saveButton().disabled).toBe(true)
    const item = all('[data-test="names-dialog"] [data-test="text-list-field"]')[0]!
    expect(item.querySelector('p')?.textContent?.trim()).toBe(FIELD_MESSAGES.short)
    await click('names-save')
    expect(wrapper.emitted('save')).toBeUndefined()

    await type(forms()[0]!, '')
    expect(saveButton().disabled).toBe(false)
  })

  it('keeps what was typed and shows the message after a failed save of the forms', async () => {
    const wrapper = mountDialog()
    await type(forms()[1]!, 'Titular Inventado Otro')

    // The list read again behind the window must not wipe what was typed.
    await wrapper.setProps({
      message: "Nothing was saved: the server didn't accept one of the forms.",
      initial: ['Inventado Titular'],
    })

    expect(at('[data-test="names-error"]').textContent?.trim()).toBe(
      "Nothing was saved: the server didn't accept one of the forms.",
    )
    expect(forms().map((input) => input.value)).toEqual([
      'Inventado Titular',
      'Titular Inventado Otro',
    ])
    await wrapper.setProps({ busy: true })
    expect(saveButton().disabled).toBe(true)
  })

  it('the block shows each form, or says there is none, or offers Try again', async () => {
    const block = mount(HolderNames, {
      props: { names: [...HOLDER_NAMES.names], state: 'loaded', errorMessage: null },
    })
    expect(block.get('h2').text()).toBe('Forms of your name')
    expect(block.findAll('[data-test="holder-name"]').map((item) => item.text())).toEqual([
      'Inventado Titular',
      'Titular Inventado',
    ])
    await block.get('[data-test="holder-names-edit"]').trigger('click')
    expect(block.emitted('edit')).toHaveLength(1)

    await block.setProps({ names: [] })
    expect(block.get('[data-test="holder-names-empty"]').text()).toBe('No forms of your name yet.')

    await block.setProps({
      names: null,
      state: 'failed',
      errorMessage: "Couldn't reach the server.",
    })
    expect(block.get('[data-test="holder-names-error"]').text()).toBe("Couldn't reach the server.")
    expect(
      (block.get('[data-test="holder-names-edit"]').element as HTMLButtonElement).disabled,
    ).toBe(true)
    await block.get('[data-test="holder-names-retry"]').trigger('click')
    expect(block.emitted('retry')).toHaveLength(1)
  })
})
