import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

import ImportButton from '../components/ImportButton.vue'
import {
  DRIVE_ERROR_BODY,
  FULL_REPORT,
  GET_PENDING,
  PARTIAL_REPORT,
  PENDING_NONE,
  PENDING_TWO,
  POST_IMPORT,
  deferred,
  json,
  jsonResponse,
  mockApi,
  networkDown,
} from './fixtures'
import type { Answer } from './fixtures'

// The dialog is teleported to <body>: its nodes are looked up in `document`.
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)
const text = (selector: string) => $(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

const Topbar = defineComponent({ render: () => h('header', [h(ImportButton)]) })

let wrapper: VueWrapper | undefined

/** Answers each call with the next answer of the list; the last one repeats. */
const sequence =
  (...answers: Answer[]): Answer =>
  () =>
    (answers.length > 1 ? answers.shift() : answers[0])!()

async function mountTopbar() {
  wrapper = mount(Topbar, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

async function clickImport() {
  const button = $<HTMLButtonElement>('[data-test="import-button"]')
  button?.focus()
  button?.click()
  await flushPromises()
}

async function click(selector: string) {
  $<HTMLButtonElement>(selector)?.click()
  await flushPromises()
}

const press = (key: string) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

/** Visible own text of the dialog: the backend's Spanish originals (lang="es") are left out. */
function ownDialogText(): string {
  const panel = $('[role="dialog"]')?.cloneNode(true) as HTMLElement | undefined
  panel?.querySelectorAll('[lang="es"]').forEach((node) => node.remove())
  return panel?.textContent ?? ''
}

const SPANISH = ['importación', 'archivo', 'Cerrar', 'Reintentar']

function expectEnglishOnly() {
  const own = ownDialogText()
  expect(own).not.toBe('')
  for (const word of SPANISH) expect(own).not.toContain(word)
}

describe('ImportDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('checking (R4, R14)', () => {
    it('opens on the checking phase with a single GET', async () => {
      const check = deferred()
      const api = mockApi({ pending: sequence(json(PENDING_NONE), check.answer) })
      await mountTopbar()
      api.calls.length = 0

      await clickImport()

      expect($('[data-test="import-step-checking"]')?.textContent).toContain(
        'Checking Drive for new files…',
      )
      expect(api.calls).toEqual([GET_PENDING])
      expect(text('[data-test="import-cancel"]')).toBe('Cancel')
      expectEnglishOnly()
    })

    it('is a labelled modal dialog', async () => {
      mockApi({ pending: sequence(json(PENDING_NONE), deferred().answer) })
      await mountTopbar()

      await clickImport()

      const dialog = $('[role="dialog"]')
      expect(dialog?.getAttribute('aria-modal')).toBe('true')
      const labelledBy = dialog?.getAttribute('aria-labelledby') ?? ''
      expect(document.getElementById(labelledBy)?.textContent?.trim()).toBe(
        'Import from Google Drive',
      )
    })
  })

  describe('up to date (R5, R14)', () => {
    it('says so with only a Close button and never POSTs', async () => {
      const api = mockApi({ pending: json(PENDING_NONE) })
      await mountTopbar()

      await clickImport()

      const lines = [...($('[data-test="import-step-upToDate"]')?.querySelectorAll('p') ?? [])]
      expect(lines.map((line) => line.textContent?.trim())).toEqual([
        "You're up to date",
        'No new files in Google Drive.',
      ])
      // Besides the X, the only action is Close.
      const buttons = [...($('[role="dialog"]')?.querySelectorAll('button') ?? [])]
      expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())).toEqual([
        'Close',
        'Close',
      ])
      expect(document.activeElement?.textContent?.trim()).toBe('Close')
      expect(api.count(POST_IMPORT)).toBe(0)
      expectEnglishOnly()
    })

    it('closes and gives the focus back to the Import button', async () => {
      mockApi({ pending: json(PENDING_NONE) })
      await mountTopbar()
      await clickImport()

      await click('[data-test="import-close"]')

      expect($('[role="dialog"]')).toBeNull()
      expect(document.activeElement).toBe($('[data-test="import-button"]'))
    })
  })

  describe('confirmation (R5, R14)', () => {
    it('lists the files with the note and the Cancel and Import 2 files buttons', async () => {
      mockApi({ pending: json(PENDING_TWO) })
      await mountTopbar()

      await clickImport()

      const step = $('[data-test="import-step-confirm"]')
      expect(step?.textContent).toContain('2 new files found')
      expect(step?.querySelectorAll('[data-test="pending-file"]')).toHaveLength(2)
      expect(step?.textContent).toContain(
        'Files are moved to the processed folder in Drive once imported',
      )
      expect(text('[data-test="import-cancel"]')).toBe('Cancel')
      expect(text('[data-test="import-confirm"]')).toBe('Import 2 files')
      expect(document.activeElement).toBe($('[data-test="import-confirm"]'))
      expectEnglishOnly()
    })

    it('Cancel closes without importing', async () => {
      const api = mockApi({ pending: json(PENDING_TWO) })
      await mountTopbar()
      await clickImport()

      await click('[data-test="import-cancel"]')

      expect($('[role="dialog"]')).toBeNull()
      expect(api.count(POST_IMPORT)).toBe(0)
    })
  })

  describe('check failures (R6)', () => {
    it("says Couldn't reach Google Drive on a Drive error", async () => {
      mockApi({ pending: sequence(json(PENDING_NONE), json(DRIVE_ERROR_BODY, 503)) })
      await mountTopbar()

      await clickImport()

      expect(text('[data-test="failure-title"]')).toBe("Couldn't reach Google Drive")
      expect(text('[data-test="failure-detail"]')).toBe('Nothing has been imported.')
      expect(text('[data-test="import-close"]')).toBe('Close')
      expect(text('[data-test="import-retry"]')).toBe('Try again')
      expect(document.activeElement).toBe($('[data-test="import-retry"]'))
      expectEnglishOnly()
    })

    it("says Couldn't reach the server on any other failure, and Try again checks again", async () => {
      const api = mockApi({
        pending: sequence(json(PENDING_NONE), networkDown, json(PENDING_TWO)),
      })
      await mountTopbar()
      await clickImport()

      expect(text('[data-test="failure-title"]')).toBe("Couldn't reach the server")
      expect(text('[data-test="failure-detail"]')).toBe('Nothing has been imported.')
      api.calls.length = 0

      await click('[data-test="import-retry"]')

      expect(api.calls).toEqual([GET_PENDING])
      expect($('[data-test="import-step-confirm"]')).not.toBeNull()
    })
  })

  describe('importing (R7, R8)', () => {
    it('makes one POST on a double click on Import 2 files', async () => {
      const post = deferred()
      const api = mockApi({ pending: json(PENDING_TWO), import: post.answer })
      await mountTopbar()
      await clickImport()

      const confirm = $<HTMLButtonElement>('[data-test="import-confirm"]')
      confirm?.click()
      confirm?.click()
      $<HTMLButtonElement>('[data-test="import-confirm"]')?.click()
      await flushPromises()

      expect(api.count(POST_IMPORT)).toBe(1)
      post.resolve(jsonResponse(FULL_REPORT))
      await flushPromises()
      expect(api.count(POST_IMPORT)).toBe(1)
    })

    it('shows the importing phase and cannot be closed while it runs', async () => {
      const post = deferred()
      mockApi({ pending: json(PENDING_TWO), import: post.answer })
      await mountTopbar()
      await clickImport()
      await click('[data-test="import-confirm"]')

      const step = $('[data-test="import-step-importing"]')
      expect(step?.textContent).toContain('Importing 2 files…')
      expect(step?.textContent).toContain('This can take a few seconds')

      press('Escape')
      await click('[data-test="dialog-scrim"]')

      expect($('[role="dialog"]')).not.toBeNull()
      expect($('[data-test="dialog-close"]')).toBeNull()
      expect($('[data-test="import-confirm"]')?.hasAttribute('disabled')).toBe(true)
      expect($('[data-test="import-button"]')?.hasAttribute('disabled')).toBe(true)
      expect(document.activeElement).toBe($('[role="dialog"]'))
      expectEnglishOnly()
    })
  })

  describe('result (R9, R10)', () => {
    it('shows the summary and the files that need attention', async () => {
      mockApi({ pending: json(PENDING_TWO), import: json(PARTIAL_REPORT) })
      await mountTopbar()
      await clickImport()

      await click('[data-test="import-confirm"]')

      const step = $('[data-test="import-step-finished"]')
      expect(text('[data-test="outcome-headline"]')).toBe('Partially imported')
      expect(step?.querySelectorAll('[data-test="summary-counter"]')).toHaveLength(4)
      expect(text('[data-test="review-sentence"]')).toBe(
        '39 new movements are waiting for your review',
      )
      expect(step?.querySelectorAll('[data-test="file-issue"]')).toHaveLength(1)
      expect(text('[data-test="file-issue-message"]')).toBe(
        "The file isn't saved as UTF-8. Save it as UTF-8 and try again.",
      )
      expect(document.activeElement).toBe($('[data-test="import-close"]'))
      expectEnglishOnly()
    })
  })

  describe('import failures (R11)', () => {
    const MAY_HAVE =
      'Some files may already have been imported. Trying again is safe: nothing is imported twice.'

    it.each([
      ['a Drive error', json(DRIVE_ERROR_BODY, 503), "Couldn't reach Google Drive"],
      [
        'a 500',
        json({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'x' }, 500),
        "Couldn't reach the server",
      ],
      ['a network failure', networkDown, "Couldn't reach the server"],
    ])('on %s warns that some files may be in and offers Try again', async (_n, answer, title) => {
      mockApi({ pending: json(PENDING_TWO), import: answer })
      await mountTopbar()
      await clickImport()

      await click('[data-test="import-confirm"]')

      expect(text('[data-test="failure-title"]')).toBe(title)
      expect(text('[data-test="failure-detail"]')).toBe(MAY_HAVE)
      expect(ownDialogText()).not.toContain('Nothing has been imported')
      expect(text('[data-test="import-retry"]')).toBe('Try again')
      expectEnglishOnly()
    })

    it('Try again after a failed import checks Drive again instead of POSTing', async () => {
      const api = mockApi({ pending: json(PENDING_TWO), import: networkDown })
      await mountTopbar()
      await clickImport()
      await click('[data-test="import-confirm"]')

      await click('[data-test="import-retry"]')

      expect($('[data-test="import-step-confirm"]')).not.toBeNull()
      expect(api.count(POST_IMPORT)).toBe(1)
    })

    it('says the files may have been imported when the report cannot be read, with only Close', async () => {
      mockApi({ pending: json(PENDING_TWO), import: json({ ...FULL_REPORT, files: {} }) })
      await mountTopbar()
      await clickImport()

      await click('[data-test="import-confirm"]')

      expect(text('[data-test="import-step-reportUnreadable"]')).toBe(
        "The import finished, but its report couldn't be read. Your files may have been imported.",
      )
      expect(ownDialogText()).not.toContain('Nothing has been imported')
      expect($('[data-test="import-retry"]')).toBeNull()
      expect(text('[data-test="import-close"]')).toBe('Close')
    })
  })

  describe('live region (R15)', () => {
    it('announces every phase from the same node', async () => {
      const check = deferred()
      const post = deferred()
      mockApi({ pending: sequence(json(PENDING_NONE), check.answer), import: post.answer })
      await mountTopbar()
      await clickImport()

      const live = $('[data-test="import-live"]')
      expect(live?.getAttribute('aria-live')).toBe('polite')
      expect(live?.textContent).toBe('Checking Drive for new files…')

      check.resolve(jsonResponse(PENDING_TWO))
      await flushPromises()
      expect($('[data-test="import-live"]')).toBe(live)
      expect(live?.textContent).toContain('2 new files found')

      await click('[data-test="import-confirm"]')
      expect($('[data-test="import-live"]')).toBe(live)
      expect(live?.textContent).toBe('Importing 2 files…')

      post.resolve(jsonResponse(PARTIAL_REPORT))
      await flushPromises()
      expect($('[data-test="import-live"]')).toBe(live)
      expect(live?.textContent).toBe('Partially imported')
    })
  })
})
