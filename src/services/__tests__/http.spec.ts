import { describe, it, expect, vi, afterEach } from 'vitest'

import { createHttp } from '@/services/http'
import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

const BASE_URL = 'http://api.test:3000'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('createHttp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the parsed JSON body typed as T on a 2xx response (R8)', async () => {
    const payload = { id: 1, concept: 'coffee' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(payload))
    const http = createHttp({ apiUrl: BASE_URL })

    const result = await http<{ id: number; concept: string }>('/expenses/1')

    expect(result).toEqual(payload)
  })

  it('returns undefined on a 204 response without body (R8)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    const http = createHttp({ apiUrl: BASE_URL })

    const result = await http<undefined>('/expenses/1')

    expect(result).toBeUndefined()
  })

  it('throws an ApiError carrying the status on a 404 response (R9)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(jsonResponse({ message: 'expense not found' }, { status: 404 })),
    )
    const http = createHttp({ apiUrl: BASE_URL })

    const promise = http('/expenses/999')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(http('/expenses/999')).rejects.toMatchObject({
      code: API_HTTP,
      status: 404,
      message: expect.stringContaining('expense not found') as string,
    })
  })

  it('throws an ApiError carrying the status on a 500 response (R9)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500, statusText: 'Internal Server Error' }),
    )
    const http = createHttp({ apiUrl: BASE_URL })

    await expect(http('/expenses')).rejects.toMatchObject({
      code: API_HTTP,
      status: 500,
    })
  })

  it('throws a network ApiError preserving the original cause when fetch rejects (R10)', async () => {
    const original = new TypeError('Failed to fetch')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(original)
    const http = createHttp({ apiUrl: BASE_URL })

    const promise = http('/expenses')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(http('/expenses')).rejects.toMatchObject({
      code: API_NETWORK,
      cause: original,
    })
  })

  it('builds URLs exclusively from the injected config apiUrl (R11)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse({})))
    const httpA = createHttp({ apiUrl: 'http://alpha.test:1111' })
    const httpB = createHttp({ apiUrl: 'http://beta.test:2222' })

    await httpA('/expenses')
    await httpB('/incomes')

    const firstUrl = fetchSpy.mock.calls[0]?.[0]
    const secondUrl = fetchSpy.mock.calls[1]?.[0]
    expect(String(firstUrl)).toBe('http://alpha.test:1111/expenses')
    expect(String(secondUrl)).toBe('http://beta.test:2222/incomes')
  })

  it('throws a ValidationError when a 2xx body is not JSON (feature 13, R11)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>ok</html>', { status: 200 }),
    )
    const http = createHttp({ apiUrl: BASE_URL })

    const error: unknown = await http('/api/import', { method: 'POST' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).message).toBe('/api/import: response body is not JSON')
  })

  describe('apiCode (feature 13, R13)', () => {
    it('keeps the backend code as apiCode without changing code, status or message', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          jsonResponse(
            { statusCode: 503, code: 'DRIVE_CONNECTION_ERROR', message: 'Drive unavailable' },
            { status: 503 },
          ),
        ),
      )
      const http = createHttp({ apiUrl: BASE_URL })

      const error: unknown = await http('/api/ingestion/pending').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        apiCode: 'DRIVE_CONNECTION_ERROR',
        code: API_HTTP,
        status: 503,
        message: 'HTTP 503: Drive unavailable',
      })
    })

    it('leaves apiCode undefined when the error body is not JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('boom', { status: 500, statusText: 'Internal Server Error' }),
      )
      const http = createHttp({ apiUrl: BASE_URL })

      const error = (await http('/api/import').catch((e: unknown) => e)) as ApiError

      expect(error.apiCode).toBeUndefined()
      expect(error.message).toBe('HTTP 500: Internal Server Error')
    })

    it('leaves apiCode undefined when the JSON body has no code', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse({ message: 'expense not found' }, { status: 404 }),
      )
      const http = createHttp({ apiUrl: BASE_URL })

      const error = (await http('/expenses/1').catch((e: unknown) => e)) as ApiError

      expect(error.apiCode).toBeUndefined()
      expect(error.message).toBe('HTTP 404: expense not found')
    })

    it('leaves apiCode undefined on a network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
      const http = createHttp({ apiUrl: BASE_URL })

      const error = (await http('/api/import').catch((e: unknown) => e)) as ApiError

      expect(error.code).toBe(API_NETWORK)
      expect(error.apiCode).toBeUndefined()
    })
  })
})
