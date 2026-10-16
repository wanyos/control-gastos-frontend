// Base HTTP client (feature 2: fundamentos).
// Knows nothing about endpoints or data shapes: mapping API responses to
// frontend types belongs to each feature's service.ts (ADR-002).

import { appConfig } from '@/shared/config'
import type { AppConfig } from '@/shared/config'
import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

export type HttpClient = <T>(path: string, init?: RequestInit) => Promise<T>

/**
 * How long a request may take before it is given up (2026-10-16). A backend that
 * hangs used to leave every spinner turning for ever. A caller that needs longer —
 * `POST /api/import` downloads and parses every pending file of Drive — passes its
 * own `signal` (or `signal: null` for none), which replaces this one.
 */
export const REQUEST_TIMEOUT_MS = 30_000

/** The signal a request gets when its `init` names none; null when the runtime cannot make one. */
function timeoutSignal(): AbortSignal | null {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : null
}

/** Reads the message and the backend's stable `code` from an error response body, if any. */
async function readErrorBody(response: Response): Promise<{ message: string; apiCode?: string }> {
  let message = response.statusText
  let apiCode: string | undefined
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const fields = body as { message?: unknown; code?: unknown }
      if (typeof fields.message === 'string' && fields.message !== '') {
        message = fields.message
      }
      if (typeof fields.code === 'string' && fields.code !== '') {
        apiCode = fields.code
      }
    }
  } catch {
    // Non-JSON error body: fall back to statusText.
  }
  return { message, apiCode }
}

/**
 * Factory with injected config (testable). URLs are built exclusively from
 * `config.apiUrl` — no hardcoded API URLs anywhere in src/.
 *
 * - 2xx with JSON body → parsed body typed as T; a 2xx body that is not JSON →
 *   ValidationError.
 * - 2xx without body (204 / empty) → `undefined as T`.
 * - non-2xx → throws ApiError (code API_HTTP) with the response status and, when
 *   the body carries it, the backend's `code` as `apiCode`.
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
        signal: init !== undefined && 'signal' in init ? init.signal : timeoutSignal(),
      })
    } catch (cause) {
      // A timed-out request is a network failure like any other: the answer is lost,
      // and whoever wrote may have been heard (see `needsReload` in shared/movements).
      const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError'
      throw new ApiError(
        timedOut
          ? `Network request timed out: ${url.pathname}`
          : `Network request failed: ${url.pathname}`,
        API_NETWORK,
        { cause },
      )
    }

    if (!response.ok) {
      const { message, apiCode } = await readErrorBody(response)
      throw new ApiError(`HTTP ${response.status}: ${message}`, API_HTTP, {
        status: response.status,
        apiCode,
      })
    }

    if (response.status === 204) {
      return undefined as T
    }
    const text = await response.text()
    if (text === '') {
      return undefined as T
    }
    try {
      return JSON.parse(text) as T
    } catch (cause) {
      // The server answered, but not with JSON: a contract problem, not a network one.
      throw new ValidationError(`${url.pathname}: response body is not JSON`, { cause })
    }
  }
}

/** Default client bound to the validated appConfig. */
export const http: HttpClient = createHttp(appConfig)
