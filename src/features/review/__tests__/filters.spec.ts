import { describe, it, expect } from 'vitest'

import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  SEARCH_TOO_LONG,
  fromRouteQuery,
  hasActiveFilters,
  searchTerm,
  toQuery,
  toRouteQuery,
} from '../filters'
import type { ReviewFilters } from '../types'

const filters = (overrides: Partial<ReviewFilters> = {}): ReviewFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
})

describe('toQuery (R3, R5, R6)', () => {
  it('always asks for the pending queue, 100 per page', () => {
    expect(toQuery(EMPTY_FILTERS, 1)).toEqual({
      status: 'pending_review',
      page: 1,
      pageSize: PAGE_SIZE,
    })
  })

  it('sends only the filters that have a value (R5)', () => {
    expect(toQuery(filters({ accountId: 3, type: 'expense' }), 2)).toEqual({
      status: 'pending_review',
      page: 2,
      pageSize: PAGE_SIZE,
      accountId: 3,
      type: 'expense',
    })
  })

  it('sends the dates and the category when they are set', () => {
    expect(toQuery(filters({ from: '2026-08-01', to: '2026-08-31', categoryId: 7 }), 1)).toEqual({
      status: 'pending_review',
      page: 1,
      pageSize: PAGE_SIZE,
      from: '2026-08-01',
      to: '2026-08-31',
      categoryId: 7,
    })
  })

  it('never sends categoryId and uncategorized together (R6)', () => {
    const query = toQuery(filters({ categoryId: 7, uncategorized: true }), 1)

    expect(query.uncategorized).toBe(true)
    expect(query.categoryId).toBeUndefined()
  })

  it('sends the trimmed search, and nothing under two characters (R8)', () => {
    expect(toQuery(filters({ q: '  ca  ' }), 1).q).toBe('ca')
    expect(toQuery(filters({ q: 'a' }), 1).q).toBeUndefined()
    expect(toQuery(filters({ q: 'x'.repeat(101) }), 1).q).toBeUndefined()
  })
})

describe('searchTerm (R8)', () => {
  it('trims the extremes', () => {
    expect(searchTerm('  ca  ')).toEqual({ value: 'ca' })
  })

  it('sends nothing, and no error, with a single useful character', () => {
    expect(searchTerm('a')).toEqual({})
    expect(searchTerm('   ')).toEqual({})
    expect(searchTerm('')).toEqual({})
  })

  it('accepts exactly 100 characters', () => {
    expect(searchTerm('x'.repeat(100))).toEqual({ value: 'x'.repeat(100) })
  })

  it('measures the maximum on the raw text: 99 letters and 3 spaces is too long', () => {
    expect(searchTerm(`${'x'.repeat(99)}   `)).toEqual({ error: SEARCH_TOO_LONG })
  })

  it('keeps the accents and the case as typed: the backend ignores both', () => {
    expect(searchTerm(' CAFETERÍA ')).toEqual({ value: 'CAFETERÍA' })
  })
})

describe('hasActiveFilters (R12)', () => {
  it('is false for the bare queue', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it.each([
    ['account', { accountId: 3 }],
    ['from', { from: '2026-08-01' }],
    ['to', { to: '2026-08-31' }],
    ['type', { type: 'income' as const }],
    ['category', { categoryId: 7 }],
    ['uncategorized', { uncategorized: true }],
    ['search', { q: 'luz' }],
  ])('is true with a %s filter', (_name, overrides) => {
    expect(hasActiveFilters(filters(overrides))).toBe(true)
  })

  it('ignores a search too short to travel', () => {
    expect(hasActiveFilters(filters({ q: 'a' }))).toBe(false)
  })
})

describe('the URL query (R10)', () => {
  it('writes only what is set, and omits the first page', () => {
    expect(toRouteQuery(EMPTY_FILTERS, 1)).toEqual({})
    expect(toRouteQuery(filters({ accountId: 3, q: ' luz ' }), 2)).toEqual({
      account: '3',
      q: 'luz',
      page: '2',
    })
  })

  it('writes uncategorized instead of the category when both are set (R6)', () => {
    expect(toRouteQuery(filters({ categoryId: 7, uncategorized: true }), 1)).toEqual({
      uncategorized: 'true',
    })
  })

  it('round-trips every filter', () => {
    const chosen = filters({
      accountId: 3,
      from: '2026-08-01',
      to: '2026-08-31',
      type: 'expense',
      categoryId: 7,
      q: 'luz',
    })

    const query = toRouteQuery(chosen, 4)
    expect(fromRouteQuery(query as Record<string, string>)).toEqual({ filters: chosen, page: 4 })
  })

  it('restores the filters of a hand-written URL', () => {
    expect(fromRouteQuery({ account: '1', page: '2', q: 'luz' })).toEqual({
      filters: filters({ accountId: 1, q: 'luz' }),
      page: 2,
    })
  })

  it.each([
    ['page=abc', { page: 'abc' }],
    ['page=0', { page: '0' }],
    ['page=-1', { page: '-1' }],
  ])('falls back to page 1 with %s', (_name, query) => {
    expect(fromRouteQuery(query).page).toBe(1)
  })

  it('drops values that are not what they claim to be', () => {
    const { filters: restored } = fromRouteQuery({
      account: '-1',
      type: 'foo',
      from: '31-08-2026',
      category: 'seven',
    })

    expect(restored).toEqual(EMPTY_FILTERS)
  })

  it('drops a search longer than the limit instead of restoring an impossible one', () => {
    expect(fromRouteQuery({ q: 'x'.repeat(101) }).filters.q).toBe('')
  })

  it('takes the first value when a key is repeated', () => {
    expect(fromRouteQuery({ account: ['2', '5'] }).filters.accountId).toBe(2)
  })

  it('never lets the URL bring the category and uncategorized together (R6)', () => {
    const { filters: restored } = fromRouteQuery({ category: '7', uncategorized: 'true' })

    expect(restored.uncategorized).toBe(true)
    expect(restored.categoryId).toBeNull()
  })
})
