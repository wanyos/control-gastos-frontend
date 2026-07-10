import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  AppError,
  ConfigError,
  ApiError,
  ValidationError,
  toAppError,
  formatError,
  handleGlobalError,
  CONFIG_INVALID,
  API_HTTP,
  VALIDATION,
  UNKNOWN,
} from '@/shared/errors'

describe('error hierarchy (R5)', () => {
  it('AppError extends Error and carries code and message', () => {
    const error = new AppError('something broke', 'SOME_CODE')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('SOME_CODE')
    expect(error.message).toBe('something broke')
  })

  it('ConfigError is an AppError with code CONFIG_INVALID', () => {
    const error = new ConfigError('missing variable')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ConfigError)
    expect(error.code).toBe(CONFIG_INVALID)
    expect(error.message).toBe('missing variable')
  })

  it('ApiError is an AppError carrying code and status', () => {
    const error = new ApiError('not found', API_HTTP, { status: 404 })

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe(API_HTTP)
    expect(error.status).toBe(404)
  })

  it('ValidationError is an AppError with code VALIDATION', () => {
    const error = new ValidationError('bad payload')

    expect(error).toBeInstanceOf(AppError)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe(VALIDATION)
  })
})

describe('toAppError (R6)', () => {
  it('returns the same instance when given an AppError', () => {
    const original = new ConfigError('already normalized')

    expect(toAppError(original)).toBe(original)
  })

  it('wraps a plain Error preserving message and cause', () => {
    const original = new Error('plain failure')

    const normalized = toAppError(original)

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe(UNKNOWN)
    expect(normalized.message).toBe('plain failure')
    expect(normalized.cause).toBe(original)
  })

  it('wraps a thrown string preserving it as message and cause', () => {
    const normalized = toAppError('thrown string')

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe(UNKNOWN)
    expect(normalized.message).toBe('thrown string')
    expect(normalized.cause).toBe('thrown string')
  })

  it('wraps an unknown value preserving it as cause', () => {
    const weird = { reason: 'unexpected' }

    const normalized = toAppError(weird)

    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.code).toBe(UNKNOWN)
    expect(normalized.cause).toBe(weird)
  })
})

describe('formatError and handleGlobalError (R7)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats errors as [<code>] <message>', () => {
    const error = new ApiError('server exploded', API_HTTP, { status: 500 })

    expect(formatError(error)).toBe('[API_HTTP] server exploded')
  })

  it('reports an Error once through the sink with the consistent format', () => {
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleGlobalError(new Error('component blew up'))

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith('[UNKNOWN] component blew up')
  })

  it('reports a non-Error value once with the consistent format', () => {
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleGlobalError('string failure')

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith('[UNKNOWN] string failure')
  })

  it('keeps the code of an AppError when reporting', () => {
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleGlobalError(new ConfigError('bad env'))

    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith('[CONFIG_INVALID] bad env')
  })
})
