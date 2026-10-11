import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import StickyBelowTopBar from '../StickyBelowTopBar.vue'

// Class names are composed at runtime: a literal in a spec would end up in the
// production CSS, because Tailwind scans src/ as text (docs/stack.md).
const cls = (...parts: string[]) => parts.join('-')
const STICKS = ['stick', 'y'].join('')

const BLOCK = '[data-test="sticky-below-top-bar"]'
const ROW = '[data-movement-id="24377"]'

const box = (top: number, bottom: number): DOMRect =>
  ({ top, bottom, left: 0, right: 0, x: 0, y: top, width: 0, height: bottom - top }) as DOMRect

let wrapper: VueWrapper | undefined
let scrollBy = vi.fn<(options: ScrollToOptions) => void>()

/** jsdom lays nothing out: the block and the row answer with the boxes a test gives them. */
function layOut(block: DOMRect, row: DOMRect): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.matches(BLOCK) ? block : row
  })
}

function addRow(): void {
  const row = document.createElement('li')
  row.dataset.movementId = '24377'
  document.body.append(row)
}

async function mountBlock(keepClearOf?: string | null) {
  wrapper = mount(StickyBelowTopBar, {
    attachTo: document.body,
    props: keepClearOf === undefined ? {} : { keepClearOf },
    slots: { default: '<p data-test="inside">1 movement confirmed</p>' },
  })
  await flushPromises()
  return wrapper
}

/**
 * A screen in small: the sentence and the selector are its own state, and the sentence
 * is read inside the slot, as the three screens do with their stores.
 */
function mountScreen(firstSentence: string, firstSelector: string | null) {
  const sentence = ref(firstSentence)
  const selector = ref(firstSelector)
  const Screen = defineComponent({
    setup: () => () =>
      h(
        StickyBelowTopBar,
        { keepClearOf: selector.value },
        { default: () => h('p', { 'data-test': 'inside' }, sentence.value) },
      ),
  })
  wrapper = mount(Screen, { attachTo: document.body })
  return { sentence, selector, screen: wrapper }
}

describe('StickyBelowTopBar (feature 27)', () => {
  beforeEach(() => {
    scrollBy = vi.fn<(options: ScrollToOptions) => void>()
    vi.stubGlobal('scrollBy', scrollBy)
    // The measure waits for a frame; here the frame comes at once.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders its slot inside a block that sticks below the top bar on the page background', async () => {
    const block = (await mountBlock()).get(BLOCK)

    expect(block.get('[data-test="inside"]').text()).toBe('1 movement confirmed')
    expect(block.element.tagName).toBe('DIV')
    expect(block.classes()).toEqual(
      expect.arrayContaining([
        STICKS,
        cls('top', '[var(--topbar-h)]'),
        cls('bg', 'surface', 'app'),
        cls('z', '[var(--z-sticky)]'),
      ]),
    )
  })

  it('moves the page up by the overlap when the row to keep clear is under the block', async () => {
    addRow()
    layOut(box(60, 100), box(80, 136))

    await mountBlock(ROW)

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ top: -20 })
  })

  it('leaves the page alone when there is nothing to keep clear', async () => {
    const under = box(80, 136)
    const cases: { why: string; selector?: string | null; row?: DOMRect }[] = [
      { why: 'no selector', row: under },
      { why: 'a null selector', selector: null, row: under },
      { why: 'a selector that finds no row', selector: ROW },
      { why: 'the row already below the block', selector: ROW, row: box(120, 176) },
      { why: 'the whole row above the block', selector: ROW, row: box(-16, 40) },
    ]

    for (const { why, selector, row } of cases) {
      if (row) addRow()
      layOut(box(60, 100), row ?? under)

      await mountBlock(selector)

      // The reason travels in the value, so a failure names its case.
      expect({ why, moves: scrollBy.mock.calls.length }).toEqual({ why, moves: 0 })
      wrapper?.unmount()
      vi.restoreAllMocks()
      document.body.innerHTML = ''
    }
  })

  it('measures again when the row to keep clear changes', async () => {
    addRow()
    layOut(box(60, 100), box(80, 136))
    const block = await mountBlock(null)
    expect(scrollBy).not.toHaveBeenCalled()

    await block.setProps({ keepClearOf: ROW })
    await flushPromises()

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ top: -20 })

    await block.setProps({ keepClearOf: '[data-movement-id="33339"]' })
    await flushPromises()

    // The new selector finds no row: nothing else moved the page.
    expect(scrollBy).toHaveBeenCalledTimes(1)
  })

  it('rounds the overlap up, because the browser keeps the page at a whole pixel', async () => {
    addRow()
    // The figures measured in Chromium on Review: a row 73.5625 px tall, 0.0625 px above
    // the bottom edge of the top bar when the block appears.
    layOut(box(60, 108), box(59.9375, 133.5))

    await mountBlock(ROW)

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ top: -49 })
  })

  it('measures again when what it shows changes and the row to keep clear is the same', async () => {
    addRow()
    layOut(box(60, 100), box(80, 136))
    const { sentence, screen } = mountScreen('1 movement categorized as Transport', ROW)
    await flushPromises()
    expect(scrollBy).toHaveBeenCalledTimes(1)

    // A second action on the same row: the selector is the same, the sentence is not.
    sentence.value = '1 movement categorized as Groceries'
    await flushPromises()

    expect(screen.get('[data-test="inside"]').text()).toBe('1 movement categorized as Groceries')
    expect(scrollBy).toHaveBeenCalledTimes(2)
    expect(scrollBy).toHaveBeenLastCalledWith({ top: -20 })
  })

  it('measures once when the sentence and the row to keep clear change together', async () => {
    addRow()
    layOut(box(60, 100), box(80, 136))
    const { sentence, selector } = mountScreen('1 movement confirmed', null)
    await flushPromises()
    expect(scrollBy).not.toHaveBeenCalled()

    selector.value = ROW
    sentence.value = '1 movement categorized as Groceries'
    await flushPromises()

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ top: -20 })
  })
})
