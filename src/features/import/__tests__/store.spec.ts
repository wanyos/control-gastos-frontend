import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

import { coherentNetWorth } from '@/features/net-worth/__tests__/fixtures'
import { useNetWorthStore } from '@/features/net-worth/store'
import { ApiError, ValidationError } from '@/shared/errors'

import { useImportStore } from '../store'
import {
  DRIVE_ERROR_BODY,
  FULL_REPORT,
  GET_NET_WORTH,
  GET_PENDING,
  PENDING_NONE,
  PENDING_TWO,
  POST_IMPORT,
  deferred,
  json,
  jsonResponse,
  mockApi,
  networkDown,
} from './fixtures'

/** Opens the dialog on 2 pending files and leaves it at the confirmation. */
async function atConfirm(store: ReturnType<typeof useImportStore>) {
  await store.open()
  expect(store.flow.step).toBe('confirm')
}

describe('useImportStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('refreshPending (R2)', () => {
    it('makes one GET and keeps the pending files', async () => {
      const api = mockApi({ pending: json(PENDING_TWO) })
      const store = useImportStore()

      await store.refreshPending()

      expect(api.calls).toEqual([GET_PENDING])
      expect(store.pending?.totalPending).toBe(2)
    })

    it('leaves pending at null on a failure without throwing', async () => {
      mockApi({ pending: json(DRIVE_ERROR_BODY, 503) })
      const store = useImportStore()
      store.pending = { totalPending: 3, banks: [] }

      await expect(store.refreshPending()).resolves.toBeUndefined()

      expect(store.pending).toBeNull()
    })
  })

  describe('open and check (R2, R4, R5, R6)', () => {
    it('goes through checking with a single GET', async () => {
      const pending = deferred()
      const api = mockApi({ pending: pending.answer })
      const store = useImportStore()

      const opening = store.open()

      expect(store.flow.step).toBe('checking')
      pending.resolve(jsonResponse(PENDING_TWO))
      await opening
      expect(api.calls).toEqual([GET_PENDING])
    })

    it('ends up to date with 0 pending and never POSTs', async () => {
      const api = mockApi({ pending: json(PENDING_NONE) })
      const store = useImportStore()

      await store.open()

      expect(store.flow.step).toBe('upToDate')
      expect(api.count(POST_IMPORT)).toBe(0)
    })

    it('asks for confirmation with the pending files and refreshes the known pending', async () => {
      mockApi({ pending: json(PENDING_TWO) })
      const store = useImportStore()

      await store.open()

      expect(store.flow).toEqual({ step: 'confirm', pending: PENDING_TWO })
      expect(store.pending).toEqual(PENDING_TWO)
    })

    it('does nothing when the dialog is already open', async () => {
      const api = mockApi({ pending: json(PENDING_TWO) })
      const store = useImportStore()
      await store.open()

      await store.open()

      expect(api.count(GET_PENDING)).toBe(1)
    })

    it('fails as drive on a 503 DRIVE_CONNECTION_ERROR and forgets the pending files', async () => {
      mockApi({ pending: json(DRIVE_ERROR_BODY, 503) })
      const store = useImportStore()
      store.pending = { totalPending: 3, banks: [] }

      await store.open()

      expect(store.flow).toMatchObject({ step: 'checkFailed', kind: 'drive' })
      expect(store.pending).toBeNull()
    })

    it.each([
      ['a 500', json({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'x' }, 500)],
      ['a network failure', networkDown],
      ['a response that does not validate', json({ totalPending: 'two', banks: [] })],
    ])('fails as server on %s', async (_name, answer) => {
      mockApi({ pending: answer })
      const store = useImportStore()

      await store.open()

      expect(store.flow).toMatchObject({ step: 'checkFailed', kind: 'server' })
    })

    it('ignores a check that answers after the dialog was closed', async () => {
      const pending = deferred()
      mockApi({ pending: pending.answer })
      const store = useImportStore()

      const opening = store.open()
      store.close()
      pending.resolve(jsonResponse(PENDING_TWO))
      await opening

      expect(store.flow.step).toBe('closed')
      expect(store.pending).toEqual(PENDING_TWO)
    })

    it('retry from checkFailed checks again with one more GET', async () => {
      let answer = json(DRIVE_ERROR_BODY, 503)
      const api = mockApi({ pending: () => answer() })
      const store = useImportStore()
      await store.open()
      expect(store.flow.step).toBe('checkFailed')
      answer = json(PENDING_TWO)

      const retrying = store.retry()

      expect(store.flow.step).toBe('checking')
      await retrying
      expect(store.flow.step).toBe('confirm')
      expect(api.count(GET_PENDING)).toBe(2)
    })
  })

  describe('start (R7, R8, R11, R12)', () => {
    it('makes exactly one POST however many times it is called', async () => {
      const post = deferred()
      const api = mockApi({ pending: json(PENDING_TWO), import: post.answer })
      const store = useImportStore()
      await atConfirm(store)

      const first = store.start()
      void store.start()
      void store.start()

      expect(store.flow).toEqual({ step: 'importing', fileCount: 2 })
      expect(api.count(POST_IMPORT)).toBe(1)
      post.resolve(jsonResponse(FULL_REPORT))
      await first
      expect(api.count(POST_IMPORT)).toBe(1)
    })

    it('does not close while importing', async () => {
      const post = deferred()
      mockApi({ pending: json(PENDING_TWO), import: post.answer })
      const store = useImportStore()
      await atConfirm(store)
      void store.start()

      store.close()

      expect(store.flow.step).toBe('importing')
      expect(store.isImporting).toBe(true)
    })

    it('finishes with the parsed report on a 200 and refreshes pending once more', async () => {
      const api = mockApi({ pending: json(PENDING_TWO), import: json(FULL_REPORT) })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()
      await flushPromises()

      expect(store.flow.step).toBe('finished')
      expect(store.flow.step === 'finished' && store.flow.report.importedCount).toBe(39)
      expect(api.count(GET_PENDING)).toBe(2)
    })

    it('fails as drive on a 503 DRIVE_CONNECTION_ERROR, and refreshes pending', async () => {
      const api = mockApi({ pending: json(PENDING_TWO), import: json(DRIVE_ERROR_BODY, 503) })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()
      await flushPromises()

      expect(store.flow).toMatchObject({ step: 'importFailed', kind: 'drive' })
      expect(store.flow.step === 'importFailed' && store.flow.error).toBeInstanceOf(ApiError)
      expect(api.count(GET_PENDING)).toBe(2)
    })

    it.each([
      ['a 500', json({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'x' }, 500)],
      ['a network failure', networkDown],
    ])('fails as server on %s', async (_name, answer) => {
      mockApi({ pending: json(PENDING_TWO), import: answer })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()

      expect(store.flow).toMatchObject({ step: 'importFailed', kind: 'server' })
    })

    it('reports an unreadable report on a 200 that does not validate, and refreshes pending', async () => {
      const api = mockApi({
        pending: json(PENDING_TWO),
        import: json({ ...FULL_REPORT, files: {} }),
      })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()
      await flushPromises()

      expect(store.flow.step).toBe('reportUnreadable')
      expect(store.flow.step === 'reportUnreadable' && store.flow.error).toBeInstanceOf(
        ValidationError,
      )
      expect(api.count(GET_PENDING)).toBe(2)
    })

    it('reports an unreadable report on a 200 whose body is not JSON (review)', async () => {
      mockApi({
        pending: json(PENDING_TWO),
        import: () => Promise.resolve(new Response('<html>ok</html>', { status: 200 })),
      })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()

      expect(store.flow.step).toBe('reportUnreadable')
    })

    it('does nothing outside the confirmation', async () => {
      const api = mockApi({ pending: json(PENDING_NONE) })
      const store = useImportStore()

      await store.start()
      await store.open()
      await store.start()

      expect(api.count(POST_IMPORT)).toBe(0)
    })

    it('retry from importFailed checks Drive again instead of POSTing', async () => {
      const api = mockApi({ pending: json(PENDING_TWO), import: networkDown })
      const store = useImportStore()
      await atConfirm(store)
      await store.start()
      await flushPromises()

      const retrying = store.retry()

      expect(store.flow.step).toBe('checking')
      await retrying
      expect(store.flow.step).toBe('confirm')
      expect(api.count(POST_IMPORT)).toBe(1)
    })

    it.each([
      ['a 200', json(FULL_REPORT)],
      ['a 503', json(DRIVE_ERROR_BODY, 503)],
      ['an unreadable report', json({ ...FULL_REPORT, files: {} })],
    ])('reloads a net worth already loaded after %s', async (_name, answer) => {
      const api = mockApi({
        pending: json(PENDING_TWO),
        import: answer,
        netWorth: json(coherentNetWorth()),
      })
      const netWorth = useNetWorthStore()
      await netWorth.load()
      expect(netWorth.netWorth).not.toBeNull()
      const store = useImportStore()
      await atConfirm(store)

      await store.start()
      await flushPromises()

      expect(api.count(GET_NET_WORTH)).toBe(2)
    })

    it('does not request the net worth when it was never loaded', async () => {
      const api = mockApi({ pending: json(PENDING_TWO), import: json(FULL_REPORT) })
      const store = useImportStore()
      await atConfirm(store)

      await store.start()
      await flushPromises()

      expect(useNetWorthStore().netWorth).toBeNull()
      expect(api.count(GET_NET_WORTH)).toBe(0)
    })
  })
})
