import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHttp } from '@/services/http'
import { ApiError } from '@/shared/errors'
import { takeUnansweredRequests } from './no-network'

// The checks of src/__tests__/no-network.ts (loaded by vitest.config.ts before every
// test file): no unit test reaches the network, and a request no mock answered
// fails its test naming the method and the path.

describe('unit tests never reach the network', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refuses an unmocked fetch, naming the method and the path', async () => {
    await expect(fetch(new URL('/api/movements?month=2026-07', location.origin))).rejects.toThrow(
      'no mock answered GET /api/movements?month=2026-07',
    )
    await expect(
      fetch('/api/movements/c4f1e2a9', { method: 'PATCH', body: '{"categoryId":null}' }),
    ).rejects.toThrow('no mock answered PATCH /api/movements/c4f1e2a9')
    await expect(
      fetch(new Request('http://localhost:3000/api/import', { method: 'POST' })),
    ).rejects.toThrow('no mock answered POST /api/import')

    expect(takeUnansweredRequests()).toEqual([
      'GET /api/movements?month=2026-07',
      'PATCH /api/movements/c4f1e2a9',
      'POST /api/import',
    ])
  })

  it('writes down the request even when the code under test swallows the rejection', async () => {
    const http = createHttp({ apiUrl: location.origin })

    await expect(http('/api/accounts')).rejects.toMatchObject({ code: 'API_NETWORK' })

    expect(takeUnansweredRequests()).toEqual(['GET /api/accounts'])
  })

  it('refuses the other ways a page opens a connection', () => {
    const xhr = new XMLHttpRequest()
    xhr.open('DELETE', '/api/category-rules/r-118')
    expect(() => xhr.send()).toThrow('no mock answered DELETE /api/category-rules/r-118')
    expect(() => new WebSocket('ws://localhost:3000/live')).toThrow(
      'no mock answered WEBSOCKET /live',
    )
    expect(() => navigator.sendBeacon('/api/log', 'x')).toThrow('no mock answered POST /api/log')

    expect(takeUnansweredRequests()).toEqual([
      'DELETE /api/category-rules/r-118',
      'WEBSOCKET /live',
      'POST /api/log',
    ])
  })

  it('lets a mock answer, and brings back the refusal, not the real fetch, when the mock is restored', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ items: [] }))
    await expect((await fetch('/api/movements')).json()).resolves.toEqual({ items: [] })
    expect(takeUnansweredRequests()).toEqual([])

    vi.restoreAllMocks()

    await expect(fetch('/api/movements')).rejects.toThrow('no mock answered GET /api/movements')
    expect(takeUnansweredRequests()).toEqual(['GET /api/movements'])
  })

  it('a spy that does not answer passes the request on to the refusal', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')

    await expect(fetch('/api/own-accounts')).rejects.toThrow(
      'no mock answered GET /api/own-accounts',
    )

    expect(spy).toHaveBeenCalledOnce()
    expect(takeUnansweredRequests()).toEqual(['GET /api/own-accounts'])
  })

  // The whole mechanism: this test swallows the rejection, as a view does, and would
  // pass on its own; the check after it is what makes it fail. `it.fails` turns that
  // failure into a pass, and would turn a missing failure into a red suite.
  it.fails(
    'fails a test whose request no mock answered, even if the test swallows it',
    async () => {
      const http = createHttp({ apiUrl: location.origin })
      const failure: unknown = await http('/api/movements?month=2026-08').catch(
        (error: unknown) => error,
      )
      expect(failure).toBeInstanceOf(ApiError)
    },
  )
})
