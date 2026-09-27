import { describe, it, expect } from 'vitest'

import {
  SEARCH_MAX,
  SEARCH_MIN,
  SEARCH_TOO_LONG,
  firstQueryValue,
  positiveIntegerQuery,
  searchTerm,
} from '../movement-filters'

describe('the guards of the search text (R7)', () => {
  it('keeps the contract limits', () => {
    expect(SEARCH_MIN).toBe(2)
    expect(SEARCH_MAX).toBe(100)
    expect(SEARCH_TOO_LONG).toBe('Search is limited to 100 characters')
  })

  it('does not travel under two characters, and it is not an error either', () => {
    expect(searchTerm('')).toEqual({})
    expect(searchTerm('l')).toEqual({})
    // Measured over the trimmed text: a letter between spaces is still one letter.
    expect(searchTerm('  l  ')).toEqual({})
  })

  it('sends the trimmed text as typed, accents and case included', () => {
    expect(searchTerm('luz')).toEqual({ value: 'luz' })
    expect(searchTerm('  CAFETERÍA  ')).toEqual({ value: 'CAFETERÍA' })
  })

  it('warns over a hundred characters measured as typed, and sends nothing', () => {
    const tooLong = `${'a'.repeat(99)}  `

    expect(tooLong.length).toBe(101)
    expect(searchTerm(tooLong)).toEqual({ error: SEARCH_TOO_LONG })
    // Exactly a hundred is still fine: the limit is inclusive.
    expect(searchTerm('a'.repeat(100))).toEqual({ value: 'a'.repeat(100) })
  })
})

describe('reading the querystring (R10)', () => {
  it('takes the first value of a repeated key and ignores what is not a string', () => {
    expect(firstQueryValue('luz')).toBe('luz')
    expect(firstQueryValue(['luz', 'agua'])).toBe('luz')
    expect(firstQueryValue(undefined)).toBeUndefined()
    expect(firstQueryValue(null)).toBeUndefined()
    expect(firstQueryValue([null])).toBeUndefined()
  })

  it('reads a positive integer, and undefined for anything else', () => {
    expect(positiveIntegerQuery('3')).toBe(3)
    expect(positiveIntegerQuery(['7', '9'])).toBe(7)
    expect(positiveIntegerQuery('0')).toBeUndefined()
    expect(positiveIntegerQuery('-1')).toBeUndefined()
    expect(positiveIntegerQuery('1.5')).toBeUndefined()
    expect(positiveIntegerQuery('abc')).toBeUndefined()
    expect(positiveIntegerQuery('')).toBeUndefined()
    expect(positiveIntegerQuery(undefined)).toBeUndefined()
  })
})
