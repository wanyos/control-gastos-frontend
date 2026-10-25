import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { API_HTTP, API_NETWORK, VALIDATION } from '@/shared/errors'

import { useExpensesByCategoryStore } from '../store'
import {
  SERVER_ERROR_BODY,
  deferred,
  json,
  jsonResponse,
  mockBackend,
  networkDown,
  rawEmpty,
  rawFixedNotAddingUp,
  rawMonth,
  rawYear,
} from './fixtures'

const SEPTEMBER = { mode: 'month', month: '2026-09', compare: 'previous-month' } as const
const YEAR = { mode: 'year', year: '2025' } as const

describe('useExpensesByCategoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts idle, with nothing read', () => {
    const store = useExpensesByCategoryStore()

    expect(store.loadState).toBe('idle')
    expect(store.data).toBeNull()
    expect(store.error).toBeNull()
    expect(store.query).toBeNull()
  })

  it('keeps only the answer of the latest load', async () => {
    const first = deferred()
    const second = deferred()
    const { calls } = mockBackend([() => first.promise, () => second.promise])
    const store = useExpensesByCategoryStore()

    const older = store.load(SEPTEMBER)
    expect(store.loadState).toBe('loading')
    const newer = store.load(YEAR)
    second.resolve(jsonResponse(rawYear()))
    await newer
    first.resolve(jsonResponse(rawMonth()))
    await older

    expect(calls.map((call) => call.search)).toEqual([
      '?month=2026-09&compare=previous-month',
      '?year=2025',
    ])
    expect(store.loadState).toBe('ready')
    expect(store.data?.period.year).toBe('2025')
    expect(store.query).toEqual(YEAR)

    // A failure that arrives late does not take a newer answer down either.
    const late = deferred()
    const fresh = deferred()
    vi.restoreAllMocks()
    mockBackend([() => late.promise, () => fresh.promise])
    const failing = store.load(YEAR)
    const ok = store.load(SEPTEMBER)
    // While reading, no figure of the period before.
    expect(store.data).toBeNull()
    fresh.resolve(jsonResponse(rawEmpty()))
    await ok
    late.resolve(jsonResponse(SERVER_ERROR_BODY, { status: 500 }))
    await failing

    expect(store.loadState).toBe('ready')
    expect(store.error).toBeNull()
    expect(store.data?.amount).toBe('0.00')
  })

  it('keeps a failure in error and Try again asks the same period', async () => {
    const store = useExpensesByCategoryStore()

    const { calls } = mockBackend([json(SERVER_ERROR_BODY, 500), json(rawYear())])
    await expect(store.load(YEAR)).resolves.toBeUndefined()
    expect(store.loadState).toBe('error')
    expect(store.error?.code).toBe(API_HTTP)
    expect(store.data).toBeNull()

    await store.retry()
    expect(calls.map((call) => call.search)).toEqual(['?year=2025', '?year=2025'])
    expect(store.loadState).toBe('ready')
    expect(store.error).toBeNull()
    expect(store.data?.amount).toBe('8864.14')

    vi.restoreAllMocks()
    mockBackend([networkDown])
    await expect(store.load(SEPTEMBER)).resolves.toBeUndefined()
    expect(store.error?.code).toBe(API_NETWORK)

    // A response that does not add up is a failure too, with nothing kept (R15).
    vi.restoreAllMocks()
    mockBackend([json(rawFixedNotAddingUp())])
    await expect(store.load(SEPTEMBER)).resolves.toBeUndefined()
    expect(store.error?.code).toBe(VALIDATION)
    expect(store.data).toBeNull()
  })

  it('does nothing on Try again before any load', async () => {
    const { calls } = mockBackend([json(rawMonth())])
    const store = useExpensesByCategoryStore()

    await store.retry()

    expect(calls).toEqual([])
    expect(store.loadState).toBe('idle')
  })
})
