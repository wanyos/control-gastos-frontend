import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { MOVEMENTS_PATH } from '@/shared/movements'

import { useCategoryRulesStore } from '../store'
import {
  answer,
  deferred,
  fakeClient,
  httpError,
  movement,
  movementPage,
  rejectWith,
  VALIDATION_BODY,
} from './fixtures'

// The state of the match preview (feature 18). Everything goes through a fake HTTP
// client that records every call: nothing touches `fetch`, so no request can leave,
// and the recorded calls are what proves this feature only reads (C1).

const MOVEMENTS = `GET ${MOVEMENTS_PATH}`

const page = movementPage(
  [movement(10, 'COMPRA MERCADONA VALENCIA'), movement(11, 'COMPRA TARJ. MERCADONA')],
  34,
)

describe('the match preview in the store (R1, R2, R8, R10, C1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with nothing to show', () => {
    expect(useCategoryRulesStore().preview).toEqual({ step: 'idle' })
  })

  it('asks for exactly the filter of R1, and for nothing else', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer(page) })
    const store = useCategoryRulesStore()

    await store.previewMatches('  mercadona  ', 'expense', api.client)

    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]?.method).toBe('GET')
    expect(api.calls[0]?.path).toBe(
      `${MOVEMENTS_PATH}?status=pending_review&type=expense&uncategorized=true&q=mercadona&page=1&pageSize=5`,
    )
  })

  it('follows the kind of the dialog into the request', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer(movementPage([], 0)) })
    const store = useCategoryRulesStore()

    await store.previewMatches('nomina', 'income', api.client)

    expect(api.calls[0]?.path).toContain('type=income')
    expect(api.calls[0]?.path).not.toContain('categoryId')
  })

  it('keeps the total of the pagination and the movements of the page (R3, R4)', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer(page) })
    const store = useCategoryRulesStore()

    await store.previewMatches('mercadona', 'expense', api.client)

    expect(store.preview).toMatchObject({ step: 'ready', text: 'mercadona', total: 34 })
    expect(store.preview.step === 'ready' && store.preview.samples.map((one) => one.id)).toEqual([
      10, 11,
    ])
  })

  it('sends nothing below the floor or above the ceiling of the contract (R2)', async () => {
    const api = fakeClient({})
    const store = useCategoryRulesStore()

    await store.previewMatches('ab', 'expense', api.client)
    await store.previewMatches('a'.repeat(101), 'expense', api.client)
    await store.previewMatches('', 'expense', api.client)

    expect(api.calls).toEqual([])
    expect(store.preview).toEqual({ step: 'idle' })
  })

  it('forgets a count that no longer applies when the text falls below the floor (R2)', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer(page) })
    const store = useCategoryRulesStore()

    await store.previewMatches('mercadona', 'expense', api.client)
    await store.previewMatches('me', 'expense', api.client)

    expect(store.preview).toEqual({ step: 'idle' })
    expect(api.count(MOVEMENTS_PATH)).toBe(1)
  })

  it('says it is counting while the answer is on its way (R9)', async () => {
    const slow = deferred()
    const api = fakeClient({ [MOVEMENTS]: slow.answer })
    const store = useCategoryRulesStore()

    const flight = store.previewMatches('mercadona', 'expense', api.client)
    expect(store.preview).toEqual({ step: 'loading', text: 'mercadona' })

    slow.resolve(page)
    await flight
    expect(store.preview.step).toBe('ready')
  })

  it('drops the answer of a query that is no longer the last one (R8)', async () => {
    const first = deferred()
    const second = deferred()
    let call = 0
    const api = fakeClient({
      [MOVEMENTS]: (one) => {
        call += 1
        return call === 1 ? first.answer(one) : second.answer(one)
      },
    })
    const store = useCategoryRulesStore()

    const old = store.previewMatches('merca', 'expense', api.client)
    const fresh = store.previewMatches('mercadona', 'expense', api.client)

    // The new one answers first, the stale one afterwards: the stale must not win.
    second.resolve(movementPage([movement(10, 'COMPRA MERCADONA')], 7))
    await fresh
    first.resolve(movementPage([], 900))
    await old

    expect(store.preview).toMatchObject({ step: 'ready', text: 'mercadona', total: 7 })
  })

  it('drops an answer still in flight when the preview is cleared', async () => {
    const slow = deferred()
    const api = fakeClient({ [MOVEMENTS]: slow.answer })
    const store = useCategoryRulesStore()

    const flight = store.previewMatches('mercadona', 'expense', api.client)
    store.clearPreview()
    slow.resolve(page)
    await flight

    expect(store.preview).toEqual({ step: 'idle' })
  })

  it('never throws when the count fails, and says so in English (R10)', async () => {
    const api = fakeClient({ [MOVEMENTS]: rejectWith(httpError(400, VALIDATION_BODY)) })
    const store = useCategoryRulesStore()

    await expect(store.previewMatches('mercadona', 'expense', api.client)).resolves.toBeUndefined()

    expect(store.preview).toEqual({
      step: 'failed',
      text: 'mercadona',
      message: 'The backend rejected that search.',
    })
  })

  it('never throws when the answer does not follow the contract (R10)', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer({ movements: [] }) })
    const store = useCategoryRulesStore()

    await expect(store.previewMatches('mercadona', 'expense', api.client)).resolves.toBeUndefined()

    expect(store.preview).toEqual({
      step: 'failed',
      text: 'mercadona',
      message: "The server answered, but the count couldn't be read.",
    })
  })

  it('only ever reads: every call it makes is a GET of the movements list (C1)', async () => {
    const api = fakeClient({ [MOVEMENTS]: answer(page) })
    const store = useCategoryRulesStore()

    await store.previewMatches('mercadona', 'expense', api.client)
    await store.previewMatches('iberdrola', 'expense', api.client)
    store.clearPreview()

    expect(api.calls.map((one) => one.method)).toEqual(['GET', 'GET'])
    expect(api.calls.every((one) => one.path.startsWith(MOVEMENTS_PATH))).toBe(true)
    expect(api.calls.every((one) => one.body === undefined)).toBe(true)
  })
})
