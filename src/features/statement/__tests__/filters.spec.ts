import { describe, it, expect } from 'vitest'

import {
  EMPTY_FILTERS,
  filterScopeLine,
  fromRouteQuery,
  hasActiveFilters,
  monthQuery,
  noMatchesLine,
  toRouteQuery,
} from '../filters'
import type { StatementFilters } from '../filters'

/** A fixed clock: a URL with a broken month falls back to the month of this date. */
const SEPTEMBER = new Date(2026, 8, 11, 13, 45)

const filters = (patch: Partial<StatementFilters> = {}): StatementFilters => ({
  ...EMPTY_FILTERS,
  ...patch,
})

describe('what counts as an active filter (R2, R11)', () => {
  it('starts with the four filters empty, so entering shows the whole month', () => {
    expect(EMPTY_FILTERS).toEqual({
      accountId: null,
      categoryId: null,
      uncategorized: false,
      q: '',
    })
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('is true for each of the four, one at a time', () => {
    expect(hasActiveFilters(filters({ accountId: 19532 }))).toBe(true)
    expect(hasActiveFilters(filters({ categoryId: 3 }))).toBe(true)
    expect(hasActiveFilters(filters({ uncategorized: true }))).toBe(true)
    expect(hasActiveFilters(filters({ q: 'luz' }))).toBe(true)
  })

  it('a search too short to travel is not an active filter', () => {
    expect(hasActiveFilters(filters({ q: 'l' }))).toBe(false)
    expect(hasActiveFilters(filters({ q: '  ' }))).toBe(false)
  })
})

describe('the query the screen asks for (R1, R3, R4)', () => {
  it('asks for the whole month, page 1, at the contract maximum', () => {
    expect(monthQuery('2026-09')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      page: 1,
      pageSize: 200,
    })
  })

  it('never carries a status or a type: the statement filters by neither', () => {
    const query = monthQuery('2026-09', filters({ accountId: 1, q: 'luz' }))

    expect(query).not.toHaveProperty('status')
    expect(query).not.toHaveProperty('type')
    expect(Object.keys(query).sort()).toEqual(['accountId', 'from', 'page', 'pageSize', 'q', 'to'])
  })

  it('carries the month AND the filters in the same request', () => {
    expect(monthQuery('2026-03', filters({ accountId: 19532 }))).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
      page: 1,
      pageSize: 200,
      accountId: 19532,
    })
    expect(monthQuery('2026-03', filters({ categoryId: 3 })).categoryId).toBe(3)
    expect(monthQuery('2026-03', filters({ uncategorized: true })).uncategorized).toBe(true)
  })

  it('sends the search trimmed and as typed, accents and case included', () => {
    expect(monthQuery('2026-03', filters({ q: '  CAFETERÍA ' })).q).toBe('CAFETERÍA')
    // Under two characters nothing travels; over a hundred nothing travels either.
    expect(monthQuery('2026-03', filters({ q: 'l' }))).not.toHaveProperty('q')
    expect(monthQuery('2026-03', filters({ q: 'a'.repeat(101) }))).not.toHaveProperty('q')
  })

  it('never carries both category keys: uncategorized wins (R9)', () => {
    const query = monthQuery('2026-03', filters({ categoryId: 3, uncategorized: true }))

    expect(query.uncategorized).toBe(true)
    expect(query).not.toHaveProperty('categoryId')
  })

  it('asks for a later page of the same month with the same filters (R3)', () => {
    expect(monthQuery('2026-09', filters({ uncategorized: true }), 2)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      page: 2,
      pageSize: 200,
      uncategorized: true,
    })
  })
})

describe('the filters in the URL (R8, R9, R10)', () => {
  it('always writes the month, and nothing for a filter that is not set', () => {
    expect(toRouteQuery('2026-03', EMPTY_FILTERS)).toEqual({ month: '2026-03' })
  })

  it('writes the same keys the review queue already uses', () => {
    expect(toRouteQuery('2026-03', filters({ accountId: 19532, q: ' luz ' }))).toEqual({
      month: '2026-03',
      account: '19532',
      q: 'luz',
    })
    expect(toRouteQuery('2026-03', filters({ categoryId: 3 })).category).toBe('3')
    expect(toRouteQuery('2026-03', filters({ uncategorized: true })).uncategorized).toBe('true')
  })

  it('never writes a page key: the statement does not paginate', () => {
    expect(toRouteQuery('2026-03', filters({ accountId: 1 }))).not.toHaveProperty('page')
  })

  it('never writes both category keys', () => {
    const query = toRouteQuery('2026-03', filters({ categoryId: 3, uncategorized: true }))

    expect(query.uncategorized).toBe('true')
    expect(query).not.toHaveProperty('category')
  })

  it('reads back what it writes', () => {
    const state = {
      month: '2026-03',
      filters: filters({ accountId: 19532, categoryId: 3, q: 'luz' }),
    }
    const written = toRouteQuery(state.month, state.filters)

    expect(fromRouteQuery(written as Record<string, string>, SEPTEMBER)).toEqual(state)
  })

  it('drops the category when the URL also says uncategorized, before asking (R10)', () => {
    const read = fromRouteQuery(
      { month: '2026-03', category: '3', uncategorized: 'true' },
      SEPTEMBER,
    )

    expect(read.filters.uncategorized).toBe(true)
    expect(read.filters.categoryId).toBeNull()
    // And the request that leaves carries only one of the two keys.
    expect(monthQuery(read.month, read.filters)).not.toHaveProperty('categoryId')
  })

  it('ignores rubbish in silence instead of failing', () => {
    expect(
      fromRouteQuery(
        { month: '2026-13', account: 'abc', category: '0', uncategorized: 'yes' },
        SEPTEMBER,
      ),
    ).toEqual({ month: '2026-09', filters: EMPTY_FILTERS })
  })

  it('drops a search of more than a hundred characters, which the backend rejects', () => {
    const read = fromRouteQuery({ month: '2026-03', q: 'a'.repeat(101) }, SEPTEMBER)

    expect(read.filters.q).toBe('')
    expect(monthQuery(read.month, read.filters)).not.toHaveProperty('q')
  })

  it('takes the first value of a repeated key', () => {
    expect(fromRouteQuery({ account: ['19532', '1'] }, SEPTEMBER).filters.accountId).toBe(19532)
  })
})

describe('the sentences of the filters (R5, R13)', () => {
  it('names the count, the month and what was filtered, in that order', () => {
    expect(
      filterScopeLine(filters({ uncategorized: true, q: 'luz' }), 12, '2026-03', {
        account: 'bankinter ···0236',
      }),
    ).toBe('12 movements match these filters in March 2026 · Uncategorized · "luz"')

    expect(
      filterScopeLine(filters({ accountId: 1, categoryId: 3 }), 4, '2026-03', {
        account: 'bankinter ···0236',
        category: 'Food',
      }),
    ).toBe(
      '4 movements match these filters in March 2026 · Category Food · Account bankinter ···0236',
    )
  })

  it('falls back to the id when the name is not known (a deleted account)', () => {
    expect(filterScopeLine(filters({ accountId: 77, categoryId: 3 }), 1, '2026-03')).toBe(
      '1 movement matches these filters in March 2026 · Category #3 · Account #77',
    )
  })

  it('counts in singular and plural, and says zero when nothing matched', () => {
    expect(filterScopeLine(filters({ uncategorized: true }), 1, '2026-03')).toContain(
      '1 movement matches',
    )
    expect(filterScopeLine(filters({ uncategorized: true }), 0, '2026-03')).toContain(
      '0 movements match',
    )
  })

  it('tells nothing matched apart from an empty month', () => {
    expect(noMatchesLine('2026-03')).toBe('No movements match these filters in March 2026.')
  })
})
