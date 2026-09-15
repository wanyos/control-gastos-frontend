// Boundary checks for API responses, shared by every feature's service (feature 13;
// extracted from net-worth, feature 7). A contract drift surfaces as a
// ValidationError naming the failing field instead of leaking `undefined` into the UI.

import { ValidationError } from '@/shared/errors'

export type RawObject = Record<string, unknown>

export interface Validators {
  reject(path: string, expected: string): never
  asObject(value: unknown, path: string): RawObject
  asArray(value: unknown, path: string): unknown[]
  /** Non-empty string: identifiers and codes. */
  asText(value: unknown, path: string): string
  /** Any string, empty included: free text the contract does not promise to fill. */
  asString(value: unknown, path: string): string
  asInteger(value: unknown, path: string): number
  asFlag(value: unknown, path: string): boolean
  /** Amounts stay strings end to end: parsing them as numbers would lose cents. */
  asDecimal(value: unknown, path: string): string
  asNullableDecimal(value: unknown, path: string): string | null
  asDateOnly(value: unknown, path: string): string
  asNullableDateOnly(value: unknown, path: string): string | null
  asMember<T extends string>(value: unknown, allowed: readonly T[], path: string): T
}

const DECIMAL = /^-?\d+\.\d{2}$/
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Messages read `${context}: ${path} is not ${expected}`, e.g. `GET /api/net-worth: total is not …`. */
export function createValidators(context: string): Validators {
  function reject(path: string, expected: string): never {
    throw new ValidationError(`${context}: ${path} is not ${expected}`)
  }

  function asObject(value: unknown, path: string): RawObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      reject(path, 'an object')
    }
    return value as RawObject
  }

  function asArray(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      reject(path, 'an array')
    }
    return value
  }

  function asText(value: unknown, path: string): string {
    if (typeof value !== 'string' || value === '') {
      reject(path, 'a non-empty string')
    }
    return value
  }

  function asString(value: unknown, path: string): string {
    if (typeof value !== 'string') {
      reject(path, 'a string')
    }
    return value
  }

  function asInteger(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      reject(path, 'an integer')
    }
    return value
  }

  function asFlag(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') {
      reject(path, 'a boolean')
    }
    return value
  }

  function asDecimal(value: unknown, path: string): string {
    if (typeof value !== 'string' || !DECIMAL.test(value)) {
      reject(path, 'a decimal string with two decimals')
    }
    return value
  }

  function asNullableDecimal(value: unknown, path: string): string | null {
    return value === null ? null : asDecimal(value, path)
  }

  function asDateOnly(value: unknown, path: string): string {
    if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
      reject(path, 'a YYYY-MM-DD date')
    }
    return value
  }

  function asNullableDateOnly(value: unknown, path: string): string | null {
    return value === null ? null : asDateOnly(value, path)
  }

  function asMember<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
    if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
      reject(path, `one of ${allowed.join(' | ')}`)
    }
    return value as T
  }

  return {
    reject,
    asObject,
    asArray,
    asText,
    asString,
    asInteger,
    asFlag,
    asDecimal,
    asNullableDecimal,
    asDateOnly,
    asNullableDateOnly,
    asMember,
  }
}
