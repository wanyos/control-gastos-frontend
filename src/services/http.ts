// Base HTTP client (feature 2: fundamentos).
// Knows nothing about endpoints or data shapes: mapping API responses to
// frontend types belongs to each feature's service.ts (ADR-002).

import { appConfig } from '@/shared/config'
import type { AppConfig } from '@/shared/config'
import { ApiError, API_HTTP, API_NETWORK } from '@/shared/errors'

export type HttpClient = <T>(path: string, init?: RequestInit) => Promise<T>

/** Extracts a human message from an error response body, if any. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = (body as { message: unknown }).message
      if (typeof message === 'string' && message !== '') {
        return message
      }
    }
  } catch {
    // Non-JSON error body: fall back to statusText.
  }
  return response.statusText
}

/**
 * Factory with injected config (testable). URLs are built exclusively from
 * `config.apiUrl` — no hardcoded API URLs anywhere in src/.
 *
 * - 2xx with JSON body → parsed body typed as T.
 * - 2xx without body (204 / empty) → `undefined as T`.
 * - non-2xx → throws ApiError (code API_HTTP) with the response status.
 * - network failure (fetch rejects) → throws ApiError (code API_NETWORK)
 *   with the original error preserved as `cause`.
 */
export function createHttp(config: Pick<AppConfig, 'apiUrl'>): HttpClient {
  return async <T>(path: string, init?: RequestInit): Promise<T> => {
    const url = new URL(path, config.apiUrl)

    let response: Response
    try {
      response = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...init?.headers },
      })
    } catch (cause) {
      throw new ApiError(`Network request failed: ${url.pathname}`, API_NETWORK, { cause })
    }

    if (!response.ok) {
      const message = await readErrorMessage(response)
      throw new ApiError(`HTTP ${response.status}: ${message}`, API_HTTP, {
        status: response.status,
      })
    }

    if (response.status === 204) {
      return undefined as T
    }
    const text = await response.text()
    if (text === '') {
      return undefined as T
    }
    return JSON.parse(text) as T
  }
}

/** Default client bound to the validated appConfig. */
export const http: HttpClient = createHttp(appConfig)
