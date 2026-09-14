// Typed, validated environment configuration (feature 2: fundamentos).
// Manual validation, no schema library: only one required variable today.
// Decision recorded in docs/stack.md; revisit when API responses need validation.

import { ConfigError } from './errors'

export interface AppConfig {
  /** Absolute base URL of the backend API (resolved from VITE_API_URL). */
  readonly apiUrl: string
}

const REQUIRED_VARS = ['VITE_API_URL'] as const

/** Origin of the page, or null outside a browser (SSR, plain Node). */
function currentOrigin(): string | null {
  return typeof location === 'undefined' ? null : location.origin
}

/**
 * Pure function: validates a raw env object and builds the typed config.
 * Throws a single ConfigError listing every missing or invalid variable.
 *
 * VITE_API_URL accepts two forms:
 * - absolute (`http://localhost:3000`) → the browser calls that origin directly;
 * - root-relative (`/`) → resolved against the page origin, so the request is
 *   same-origin and the Vite dev proxy can forward it (see docs/stack.md).
 *
 * `origin` is injectable for tests; `null` means "no origin available".
 */
export function loadConfig(
  raw: Readonly<Record<string, unknown>>,
  origin: string | null = currentOrigin(),
): AppConfig {
  const problems: string[] = []
  const values: Partial<Record<(typeof REQUIRED_VARS)[number], string>> = {}

  for (const name of REQUIRED_VARS) {
    const value = raw[name]
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${name} is required but missing or empty`)
      continue
    }
    values[name] = value
  }

  const rawApiUrl = values.VITE_API_URL
  let apiUrl: string | undefined
  if (rawApiUrl !== undefined) {
    if (rawApiUrl.startsWith('/')) {
      if (origin === null) {
        problems.push(
          `VITE_API_URL is relative ("${rawApiUrl}") but there is no page origin to resolve it against`,
        )
      } else {
        apiUrl = new URL(rawApiUrl, origin).toString()
      }
    } else {
      try {
        // oxlint-disable-next-line no-new -- constructing the URL is the validation
        new URL(rawApiUrl)
        apiUrl = rawApiUrl
      } catch {
        problems.push(
          `VITE_API_URL is not a parseable URL nor a root-relative path: "${rawApiUrl}"`,
        )
      }
    }
  }

  if (problems.length > 0 || apiUrl === undefined) {
    throw new ConfigError(`Invalid environment configuration: ${problems.join('; ')}`)
  }

  return Object.freeze({ apiUrl })
}

/** Eager singleton, evaluated at module import → invalid env fails at startup. */
export const appConfig: AppConfig = loadConfig(import.meta.env)
