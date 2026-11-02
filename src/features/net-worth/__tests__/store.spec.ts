import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { AppError, API_HTTP, UNKNOWN } from '@/shared/errors'

import { DEPOSITS_PATH, NET_WORTH_PATH } from '../service'
import { useNetWorthStore } from '../store'
import { coherentNetWorth, depositEarnings } from './fixtures'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

const pathOf = (input: unknown) => new URL(String(input)).pathname

/** Answers by path: the store asks the net worth and the deposits (feature 38). */
function answerByPath(answers: Record<string, () => Promise<Response>>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const answer = answers[pathOf(input)]
    return answer ? answer() : Promise.reject(new TypeError(`unexpected ${pathOf(input)}`))
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
    const fetchSpy = answerByPath({
      [NET_WORTH_PATH]: () => Promise.resolve(jsonResponse(coherentNetWorth())),
      [DEPOSITS_PATH]: () => Promise.resolve(jsonResponse(depositEarnings())),
    })
    const store = useNetWorthStore()

    await store.load()

    // Two requests now: the net worth one, once, and the deposits one (feature 38).
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const paths = fetchSpy.mock.calls.map(([input]) => pathOf(input))
    expect(paths.filter((path) => path === NET_WORTH_PATH)).toHaveLength(1)
    expect(store.netWorth).toEqual(coherentNetWorth())
    expect(store.error).toBeNull()
  })

  it('is loading while the request is in flight, and not after (R2)', async () => {
    let respond: (response: Response) => void = () => {}
    answerByPath({
      [NET_WORTH_PATH]: () => new Promise<Response>((resolve) => (respond = resolve)),
      [DEPOSITS_PATH]: () => Promise.resolve(jsonResponse(depositEarnings())),
    })
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

  it('load() asks the net worth and the deposits at the same time', async () => {
    let respondNetWorth: (response: Response) => void = () => {}
    let respondDeposits: (response: Response) => void = () => {}
    const fetchSpy = answerByPath({
      [NET_WORTH_PATH]: () => new Promise<Response>((resolve) => (respondNetWorth = resolve)),
      [DEPOSITS_PATH]: () => new Promise<Response>((resolve) => (respondDeposits = resolve)),
    })
    const store = useNetWorthStore()

    const loading = store.load()
    await Promise.resolve()

    // Both are in flight before either answers: neither waits for the other.
    expect(
      fetchSpy.mock.calls.map(([input, init]) => [pathOf(input), init?.method ?? 'GET']),
    ).toEqual(
      expect.arrayContaining([
        [NET_WORTH_PATH, 'GET'],
        [DEPOSITS_PATH, 'GET'],
      ]),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(store.isLoading).toBe(true)
    expect(store.depositsLoading).toBe(true)

    respondDeposits(jsonResponse(depositEarnings()))
    respondNetWorth(jsonResponse(coherentNetWorth()))
    await loading
    expect(store.deposits).toEqual(depositEarnings())
    expect(store.netWorth).toEqual(coherentNetWorth())
    expect(store.depositsLoading).toBe(false)
    expect(store.depositsError).toBeNull()
  })

  it('a failed deposits request leaves the net worth loaded', async () => {
    answerByPath({
      [NET_WORTH_PATH]: () => Promise.resolve(jsonResponse(coherentNetWorth())),
      [DEPOSITS_PATH]: () => Promise.resolve(jsonResponse({ message: 'boom' }, { status: 500 })),
    })
    const store = useNetWorthStore()

    await expect(store.load()).resolves.toBeUndefined()

    expect(store.netWorth).toEqual(coherentNetWorth())
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.deposits).toBeNull()
    expect(store.depositsError).toBeInstanceOf(AppError)
    expect(store.depositsError?.code).toBe(API_HTTP)
    expect(store.depositsError?.message).toBe('HTTP 500: boom')
    expect(store.depositsLoading).toBe(false)
  })

  it('a failed net worth request leaves the deposits loaded', async () => {
    answerByPath({
      [NET_WORTH_PATH]: () => Promise.reject(new TypeError('Failed to fetch')),
      [DEPOSITS_PATH]: () => Promise.resolve(jsonResponse(depositEarnings())),
    })
    const store = useNetWorthStore()

    await store.load()

    expect(store.netWorth).toBeNull()
    expect(store.error).not.toBeNull()
    expect(store.deposits).toEqual(depositEarnings())
    expect(store.depositsError).toBeNull()
  })
})
