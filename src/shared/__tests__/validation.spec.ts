import { describe, it, expect } from 'vitest'

import { ValidationError } from '@/shared/errors'
import { createValidators } from '@/shared/validation'

const CONTEXT = 'GET /api/example'
const v = createValidators(CONTEXT)

/** Runs a check expected to fail and returns its message. */
const messageOf = (check: () => unknown): string => {
  try {
    check()
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    return (error as ValidationError).message
  }
  throw new Error('the check did not throw')
}

describe('createValidators', () => {
  it('reject throws a ValidationError with the context, the path and the expectation', () => {
    expect(messageOf(() => v.reject('a.b', 'a thing'))).toBe(`${CONTEXT}: a.b is not a thing`)
  })

  it.each([
    ['asObject', () => v.asObject([], 'x'), 'an object'],
    ['asObject (null)', () => v.asObject(null, 'x'), 'an object'],
    ['asArray', () => v.asArray({}, 'x'), 'an array'],
    ['asText', () => v.asText('', 'x'), 'a non-empty string'],
    ['asString', () => v.asString(3, 'x'), 'a string'],
    ['asInteger', () => v.asInteger(1.5, 'x'), 'an integer'],
    ['asFlag', () => v.asFlag('true', 'x'), 'a boolean'],
    ['asDecimal', () => v.asDecimal(12.5, 'x'), 'a decimal string with two decimals'],
    [
      'asNullableDecimal',
      () => v.asNullableDecimal('1.5', 'x'),
      'a decimal string with two decimals',
    ],
    ['asDateOnly', () => v.asDateOnly('2026-9-1', 'x'), 'a YYYY-MM-DD date'],
    ['asNullableDateOnly', () => v.asNullableDateOnly(20260901, 'x'), 'a YYYY-MM-DD date'],
    ['asMember', () => v.asMember('c', ['a', 'b'], 'x'), 'one of a | b'],
  ])('%s rejects with its exact message', (_name, check, expected) => {
    expect(messageOf(check)).toBe(`${CONTEXT}: x is not ${expected}`)
  })

  it('returns valid values untouched', () => {
    const object = { a: 1 }

    expect(v.asObject(object, 'x')).toBe(object)
    expect(v.asArray([1], 'x')).toEqual([1])
    expect(v.asText('n26', 'x')).toBe('n26')
    expect(v.asString('', 'x')).toBe('')
    expect(v.asInteger(3, 'x')).toBe(3)
    expect(v.asFlag(false, 'x')).toBe(false)
    expect(v.asDecimal('-40.00', 'x')).toBe('-40.00')
    expect(v.asNullableDecimal(null, 'x')).toBeNull()
    expect(v.asDateOnly('2026-09-15', 'x')).toBe('2026-09-15')
    expect(v.asNullableDateOnly(null, 'x')).toBeNull()
    expect(v.asMember('b', ['a', 'b'], 'x')).toBe('b')
  })
})
