import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { AppError, API_HTTP } from '@/shared/errors'

import { GAINS_PATH } from '../service'
import { useInvestmentsStore } from '../store'
import { emptyInvestmentGains, investmentGains } from './fixtures'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

const pathOf = (input: unknown) => new URL(String(input)).pathname

/** Answers the gains path; any other path is rejected, so an extra read shows up. */
function answerGains(respond: () => Promise<Response>) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input) =>
      pathOf(input) === GAINS_PATH
        ? respond()
        : Promise.reject(new TypeError(`unexpected ${pathOf(input)}`)),
    )
}

describe('useInvestmentsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loadGains() asks the gains once, with GET, and keeps them', async () => {
    const fetchSpy = answerGains(() => Promise.resolve(jsonResponse(investmentGains())))
    const store = useInvestmentsStore()

    await store.loadGains()

    expect(
      fetchSpy.mock.calls.map(([input, init]) => [pathOf(input), init?.method ?? 'GET']),
    ).toEqual([[GAINS_PATH, 'GET']])
    expect(store.gains).toEqual(investmentGains())
    expect(store.gainsError).toBeNull()
    expect(store.gainsLoading).toBe(false)
  })

  it('is loading the gains while the request is in flight, and not after', async () => {
    let respond: (response: Response) => void = () => {}
    answerGains(() => new Promise<Response>((resolve) => (respond = resolve)))
    const store = useInvestmentsStore()

    const loading = store.loadGains()
    expect(store.gainsLoading).toBe(true)

    respond(jsonResponse(emptyInvestmentGains()))
    await loading
    expect(store.gainsLoading).toBe(false)
    expect(store.gains).toEqual(emptyInvestmentGains())
  })

  it('keeps a failed gains request in gainsError and never rethrows', async () => {
    answerGains(() => Promise.resolve(jsonResponse({ message: 'boom' }, { status: 500 })))
    const store = useInvestmentsStore()

    await expect(store.loadGains()).resolves.toBeUndefined()

    expect(store.gains).toBeNull()
    expect(store.gainsError).toBeInstanceOf(AppError)
    expect(store.gainsError?.code).toBe(API_HTTP)
    expect(store.gainsError?.message).toBe('HTTP 500: boom')
    expect(store.gainsLoading).toBe(false)
  })

  it('clears the previous error when the gains are asked again', async () => {
    const fetchSpy = answerGains(() =>
      Promise.resolve(jsonResponse({ message: 'boom' }, { status: 500 })),
    )
    const store = useInvestmentsStore()
    await store.loadGains()
    expect(store.gainsError).not.toBeNull()

    fetchSpy.mockImplementation(() => Promise.resolve(jsonResponse(investmentGains())))
    await store.loadGains()

    expect(store.gainsError).toBeNull()
    expect(store.gains).toEqual(investmentGains())
  })

  it('refreshGainsIfLoaded() asks again when the gains were loaded', async () => {
    const fetchSpy = answerGains(() => Promise.resolve(jsonResponse(investmentGains())))
    const store = useInvestmentsStore()
    await store.loadGains()

    await store.refreshGainsIfLoaded()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('refreshGainsIfLoaded() asks nothing when the gains were never loaded', async () => {
    const fetchSpy = answerGains(() => Promise.resolve(jsonResponse(investmentGains())))
    const store = useInvestmentsStore()

    await store.refreshGainsIfLoaded()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(store.gains).toBeNull()
  })
})
