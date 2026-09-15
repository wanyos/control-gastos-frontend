import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

import BaseDialog from '../BaseDialog.vue'

// The dialog is teleported to <body>: nodes are looked up in `document`, not in the wrapper.
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)

// Class names are composed at runtime: a literal in a spec would end up in the production CSS.
const cls = (...parts: string[]) => parts.join('-')

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

interface Options {
  dismissible?: boolean
  body?: string
  footer?: string
}

async function mountDialog({ dismissible = true, body, footer }: Options = {}) {
  wrapper = mount(BaseDialog, {
    attachTo: document.body,
    props: { open: true, title: 'Import from Google Drive', dismissible },
    slots: {
      default: body ?? '<p>Body</p>',
      ...(footer === undefined ? {} : { footer }),
    },
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const press = (key: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('BaseDialog (R14)', () => {
  it('is a labelled modal dialog', async () => {
    await mountDialog()

    const panel = $('[role="dialog"]')
    expect(panel?.getAttribute('aria-modal')).toBe('true')
    const titleId = panel?.getAttribute('aria-labelledby') ?? ''
    expect(titleId).not.toBe('')
    expect(document.getElementById(titleId)?.textContent?.trim()).toBe('Import from Google Drive')
  })

  it('draws the panel with a border so it stands out from the scrim', async () => {
    await mountDialog()

    const panel = $('[data-test="dialog-panel"]')
    expect(panel?.classList).toContain(cls('border', 'line', 'subtle'))
    expect(panel?.classList).toContain(cls('bg', 'surface', 'card'))
    expect($('[data-test="dialog-scrim"]')?.classList).toContain(cls('bg', 'surface', 'overlay'))
  })

  it('renders nothing while closed', () => {
    wrapper = mount(BaseDialog, { attachTo: document.body, props: { open: false, title: 'x' } })

    expect($('[role="dialog"]')).toBeNull()
  })

  it('focuses the [data-autofocus] element on open', async () => {
    await mountDialog({ footer: '<button>Cancel</button><button data-autofocus>Import</button>' })

    expect(document.activeElement?.textContent).toBe('Import')
  })

  it('focuses the panel when the autofocus target is disabled or missing', async () => {
    await mountDialog({ footer: '<button data-autofocus disabled>Importing…</button>' })

    expect(document.activeElement).toBe($('[role="dialog"]'))
  })

  it('keeps Tab inside: from the last focusable to the first, and Shift+Tab back', async () => {
    await mountDialog({ footer: '<button id="a">A</button><button id="b">B</button>' })
    const close = $('[data-test="dialog-close"]')
    const last = $('#b')

    last?.focus()
    const forward = press('Tab')
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)

    const backward = press('Tab', true)
    expect(backward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it('lets Tab move normally between inner elements', async () => {
    await mountDialog({ footer: '<button id="a">A</button><button id="b">B</button>' })

    $('#a')?.focus()
    expect(press('Tab').defaultPrevented).toBe(false)
  })

  it('keeps the focus on the panel when nothing inside can take it', async () => {
    await mountDialog({ dismissible: false, footer: '<button disabled>Importing…</button>' })

    const event = press('Tab')

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe($('[role="dialog"]'))
  })

  it('emits close on Esc, on a scrim click and on the X when dismissible', async () => {
    const dialog = await mountDialog()

    press('Escape')
    $('[data-test="dialog-scrim"]')?.click()
    $<HTMLButtonElement>('[data-test="dialog-close"]')?.click()

    expect(dialog.emitted('close')).toHaveLength(3)
    expect($('[data-test="dialog-close"]')?.getAttribute('aria-label')).toBe('Close')
  })

  it('does not emit close from a click inside the panel', async () => {
    const dialog = await mountDialog()

    $('[data-test="dialog-panel"]')?.click()

    expect(dialog.emitted('close')).toBeUndefined()
  })

  it('ignores Esc and scrim clicks and shows no X when not dismissible', async () => {
    const dialog = await mountDialog({ dismissible: false })

    press('Escape')
    $('[data-test="dialog-scrim"]')?.click()

    expect(dialog.emitted('close')).toBeUndefined()
    expect($('[data-test="dialog-close"]')).toBeNull()
  })

  it('gives the focus back to the element that had it when it closes', async () => {
    const Host = defineComponent({
      setup() {
        const open = ref(false)
        return () => [
          h('button', { id: 'opener', onClick: () => (open.value = true) }, 'Import'),
          h(BaseDialog, { open: open.value, title: 't', onClose: () => (open.value = false) }, () =>
            h('button', { 'data-autofocus': '' }, 'Close'),
          ),
        ]
      },
    })
    wrapper = mount(Host, { attachTo: document.body })
    const opener = $<HTMLButtonElement>('#opener')

    opener?.focus()
    opener?.click()
    await nextTick()
    await nextTick()
    expect(document.activeElement?.textContent).toBe('Close')

    press('Escape')
    await nextTick()
    expect($('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('gives the focus back when it is unmounted while open', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()

    await mountDialog({ footer: '<button data-autofocus>Close</button>' })
    expect(document.activeElement).not.toBe(outside)

    wrapper?.unmount()
    wrapper = undefined

    expect(document.activeElement).toBe(outside)
  })
})
