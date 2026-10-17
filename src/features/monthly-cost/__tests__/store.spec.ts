import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { API_HTTP, API_NETWORK, VALIDATION } from '@/shared/errors'

import { useMonthlyCostStore } from '../store'
import {
  SERVER_ERROR_BODY,
  deferred,
  json,
  jsonResponse,
  mockBackend,
  networkDown,
  rawEmptyRecurringExpenses,
  rawRecurringExpenses,
} from './fixtures'

describe('useMonthlyCostStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts idle, with nothing read', () => {
    const store = useMonthlyCostStore()

    expect(store.loadState).toBe('idle')
    expect(store.data).toBeNull()
    expect(store.error).toBeNull()
  })

  it('reads once and keeps the answer', async () => {
    const { calls } = mockBackend([json(rawRecurringExpenses())])
    const store = useMonthlyCostStore()

    const loading = store.load()
    expect(store.loadState).toBe('loading')
    await loading

    expect(calls).toHaveLength(1)
    expect(store.loadState).toBe('ready')
    expect(store.data?.monthlyTotal).toBe('356.05')
    expect(store.error).toBeNull()
  })

  it('keeps only the answer of the latest load', async () => {
    const first = deferred()
    const second = deferred()
    const { calls } = mockBackend([() => first.promise, () => second.promise])
    const store = useMonthlyCostStore()

    const older = store.load()
    const newer = store.load()
    second.resolve(jsonResponse(rawEmptyRecurringExpenses()))
    await newer
    first.resolve(jsonResponse(rawRecurringExpenses()))
    await older

    expect(calls).toHaveLength(2)
    expect(store.loadState).toBe('ready')
    expect(store.data?.monthlyTotal).toBe('0.00')

    // A failure that arrives late does not take a newer answer down either.
    const late = deferred()
    const fresh = deferred()
    vi.restoreAllMocks()
    mockBackend([() => late.promise, () => fresh.promise])
    const failing = store.load()
    const ok = store.load()
    fresh.resolve(jsonResponse(rawRecurringExpenses()))
    await ok
    late.resolve(jsonResponse(SERVER_ERROR_BODY, { status: 500 }))
    await failing

    expect(store.loadState).toBe('ready')
    expect(store.error).toBeNull()
    expect(store.data?.monthlyTotal).toBe('356.05')
  })

  it('keeps the error and never throws', async () => {
    const store = useMonthlyCostStore()

    mockBackend([json(SERVER_ERROR_BODY, 500)])
    await expect(store.load()).resolves.toBeUndefined()
    expect(store.loadState).toBe('error')
    expect(store.error?.code).toBe(API_HTTP)
    expect(store.data).toBeNull()

    vi.restoreAllMocks()
    mockBackend([networkDown])
    await expect(store.load()).resolves.toBeUndefined()
    expect(store.error?.code).toBe(API_NETWORK)

    vi.restoreAllMocks()
    const raw = rawRecurringExpenses()
    raw.monthlyTotal = '356.06'
    mockBackend([json(raw)])
    await expect(store.load()).resolves.toBeUndefined()
    expect(store.error?.code).toBe(VALIDATION)
    expect(store.data).toBeNull()

    // A new load forgets the old error.
    vi.restoreAllMocks()
    mockBackend([json(rawRecurringExpenses())])
    await store.load()
    expect(store.loadState).toBe('ready')
    expect(store.error).toBeNull()
  })
})
