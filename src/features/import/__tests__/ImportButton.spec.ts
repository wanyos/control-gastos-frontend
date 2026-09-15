import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'

import ImportButton from '../components/ImportButton.vue'
import { useImportStore } from '../store'
import { DRIVE_ERROR_BODY, GET_PENDING, PENDING_TWO, json, mockApi } from './fixtures'
import type { Answer } from './fixtures'

/** The button as the topbar holds it, inside a <header>. */
const Topbar = defineComponent({ render: () => h('header', [h(ImportButton)]) })

let wrapper: VueWrapper | undefined

async function mountTopbar() {
  wrapper = mount(Topbar, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

const pendingWith = (totalPending: number): Answer => json({ ...PENDING_TWO, totalPending })

describe('ImportButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('pending badge (R3)', () => {
    it('shows 3 new files', async () => {
      mockApi({ pending: pendingWith(3) })
      const topbar = await mountTopbar()

      expect(topbar.get('[data-test="pending-badge"]').text()).toBe('3 new files')
    })

    it('shows 1 new file', async () => {
      mockApi({ pending: pendingWith(1) })
      const topbar = await mountTopbar()

      expect(topbar.get('[data-test="pending-badge"]').text()).toBe('1 new file')
    })

    it('shows no badge with 0 pending files', async () => {
      mockApi({ pending: pendingWith(0) })
      const topbar = await mountTopbar()

      expect(topbar.find('[data-test="pending-badge"]').exists()).toBe(false)
    })

    it('shows neither a badge nor any error in the header when the query fails', async () => {
      mockApi({ pending: json(DRIVE_ERROR_BODY, 503) })
      const topbar = await mountTopbar()

      expect(topbar.find('[data-test="pending-badge"]').exists()).toBe(false)
      expect(topbar.get('header').text()).toBe('Import')
    })
  })

  describe('pending query (R2)', () => {
    it('asks for the pending files once on mount and never polls', async () => {
      vi.useFakeTimers()
      const api = mockApi({ pending: pendingWith(3) })
      wrapper = mount(Topbar, { attachTo: document.body })
      await vi.advanceTimersByTimeAsync(0)

      expect(api.calls).toEqual([GET_PENDING])

      await vi.advanceTimersByTimeAsync(10 * 60 * 1000)

      expect(api.calls).toEqual([GET_PENDING])
    })
  })

  describe('button (R1)', () => {
    it('is a primary Import button with its icon', async () => {
      mockApi({ pending: pendingWith(0) })
      const topbar = await mountTopbar()

      const button = topbar.get('[data-test="import-button"]')
      expect(button.text()).toBe('Import')
      expect(button.find('svg').exists()).toBe(true)
      expect(button.attributes('disabled')).toBeUndefined()
      expect(button.classes()).toContain(['bg', 'brand'].join('-'))
    })

    it('reads Importing… and is disabled while an import runs', async () => {
      mockApi({ pending: pendingWith(2) })
      const topbar = await mountTopbar()

      useImportStore().flow = { step: 'importing', fileCount: 2 }
      await nextTick()

      const button = topbar.get('[data-test="import-button"]')
      expect(button.text()).toBe('Importing…')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })
})
