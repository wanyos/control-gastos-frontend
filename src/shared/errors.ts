// Centralized error handling (feature 2: fundamentos).
// Pattern from docs/conventions.md: AppError base with a `code`, typed
// subtypes, and a single consistent report format `[<code>] <message>`.

export const CONFIG_INVALID = 'CONFIG_INVALID'
export const API_HTTP = 'API_HTTP'
export const API_NETWORK = 'API_NETWORK'
export const VALIDATION = 'VALIDATION'
export const UNKNOWN = 'UNKNOWN'

export class AppError extends Error {
  // Declared here (not via native ErrorOptions) so it type-checks under the
  // vitest tsconfig, whose lib set lacks ES2022.Error.
  readonly cause?: unknown

  constructor(
    message: string,
    readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message)
    this.name = new.target.name
    this.cause = options?.cause
  }
}

export class ConfigError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, CONFIG_INVALID, options)
  }
}

export class ApiError extends AppError {
  readonly status?: number
  /** The backend's stable `code` (e.g. DRIVE_CONNECTION_ERROR), when the body carries one. */
  readonly apiCode?: string

  constructor(
    message: string,
    code: string,
    options?: { status?: number; apiCode?: string; cause?: unknown },
  ) {
    super(message, code, { cause: options?.cause })
    this.status = options?.status
    this.apiCode = options?.apiCode
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, VALIDATION, options)
  }
}

/** Normalizes any thrown value into an AppError without losing information. */
export function toAppError(value: unknown): AppError {
  if (value instanceof AppError) {
    return value
  }
  if (value instanceof Error) {
    return new AppError(value.message, UNKNOWN, { cause: value })
  }
  return new AppError(String(value), UNKNOWN, { cause: value })
}

/** Single consistent format for reporting errors across the app. */
export function formatError(error: AppError): string {
  return `[${error.code}] ${error.message}`
}

/**
 * Global sink for unhandled errors: normalize + report once.
 * Registered as `app.config.errorHandler` in main.ts. console.error is the
 * single output point; replaceable by toast/telemetry without touching callers.
 */
export function handleGlobalError(error: unknown): void {
  console.error(formatError(toAppError(error)))
}
