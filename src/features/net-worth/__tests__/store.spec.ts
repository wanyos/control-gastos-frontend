import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { AppError, API_HTTP, UNKNOWN } from '@/shared/errors'

import { NET_WORTH_PATH } from '../service'
import { useNetWorthStore } from '../store'
import { coherentNetWorth } from './fixtures'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('useNetWorthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('load() fetches the net worth once and keeps it (R1)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse(coherentNetWorth())))
    const store = useNetWorthStore()

    await store.load()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(new URL(String(fetchSpy.mock.calls[0]?.[0])).pathname).toBe(NET_WORTH_PATH)
    expect(store.netWorth).toEqual(coherentNetWorth())
    expect(store.error).toBeNull()
  })

  it('is loading while the request is in flight, and not after (R2)', async () => {
    let respond: (response: Response) => void = () => {}
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => (respond = resolve)),
    )
    const store = useNetWorthStore()

    const loading = store.load()
    expect(store.isLoading).toBe(true)

    respond(jsonResponse(coherentNetWorth()))
    await loading
    expect(store.isLoading).toBe(false)
  })

  it('keeps the ApiError instance of an HTTP failure and does not rethrow (R3)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(jsonResponse({ message: 'boom' }, { status: 500 })),
    )
    const store = useNetWorthStore()

    await expect(store.load()).resolves.toBeUndefined()

    expect(store.error).toBeInstanceOf(AppError)
    expect(store.error?.code).toBe(API_HTTP)
    expect(store.error?.message).toBe('HTTP 500: boom')
    expect(store.netWorth).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('normalizes a non-Error rejection with toAppError (R3)', async () => {
    const store = useNetWorthStore()
    const client = () => Promise.reject('plain string') as never

    await store.load(client)

    expect(store.error).toBeInstanceOf(AppError)
    expect(store.error?.code).toBe(UNKNOWN)
    expect(store.error?.message).toBe('plain string')
  })

  it('clears a previous error when a later load succeeds', async () => {
    const store = useNetWorthStore()
    await store.load(() => Promise.reject(new Error('down')) as never)
    expect(store.error).not.toBeNull()

    await store.load(<T>() => Promise.resolve(coherentNetWorth() as T))

    expect(store.error).toBeNull()
    expect(store.netWorth?.total).toBe('39924.05')
  })
})
