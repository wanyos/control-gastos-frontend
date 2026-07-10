// Typed, validated environment configuration (feature 2: fundamentos).
// Manual validation, no schema library: only one required variable today.
// Decision recorded in docs/stack.md; revisit when API responses need validation.

import { ConfigError } from './errors'

export interface AppConfig {
  /** Base URL of the backend API (from VITE_API_URL). */
  readonly apiUrl: string
}

const REQUIRED_VARS = ['VITE_API_URL'] as const

/**
 * Pure function: validates a raw env object and builds the typed config.
 * Throws a single ConfigError listing every missing or invalid variable.
 */
export function loadConfig(raw: Readonly<Record<string, unknown>>): AppConfig {
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

  const apiUrl = values.VITE_API_URL
  if (apiUrl !== undefined) {
    try {
      new URL(apiUrl)
    } catch {
      problems.push(`VITE_API_URL is not a parseable URL: "${apiUrl}"`)
    }
  }

  if (problems.length > 0 || apiUrl === undefined) {
    throw new ConfigError(`Invalid environment configuration: ${problems.join('; ')}`)
  }

  return Object.freeze({ apiUrl })
}

/** Eager singleton, evaluated at module import → invalid env fails at startup. */
export const appConfig: AppConfig = loadConfig(import.meta.env)
