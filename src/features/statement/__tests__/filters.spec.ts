import { describe, it, expect } from 'vitest'

import {
  EMPTY_FILTERS,
  filterScopeLine,
  fromRouteQuery,
  hasActiveFilters,
  hiddenCountLine,
  hiddenCountQuery,
  monthQuery,
  noMatchesLine,
  nothingLeftLine,
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
      hideNoise: false,
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
    ).toEqual({ month: '2026-09', hideNoise: false, filters: EMPTY_FILTERS })
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

describe('the noise switch (feature 23: R1, R2, R4, R5, R7, C5)', () => {
  it('asks for nothing extra while it is off: the whole month comes back', () => {
    const query = monthQuery('2026-07', filters({ accountId: 19532 }))

    expect(query).not.toHaveProperty('excluded')
    expect(query).not.toHaveProperty('transfer')
    // And the same thing said out loud, because off is the default (R1).
    expect(monthQuery('2026-07', EMPTY_FILTERS, 1, false)).toEqual(monthQuery('2026-07'))
  })

  it('adds excluded=none AND transfer=none to the filters already there (R2, R10)', () => {
    expect(monthQuery('2026-07', filters({ accountId: 19532, q: 'luz' }), 1, true)).toEqual({
      from: '2026-07-01',
      to: '2026-07-31',
      page: 1,
      pageSize: 200,
      accountId: 19532,
      q: 'luz',
      excluded: 'none',
      transfer: 'none',
    })
  })

  it('carries the switch to the later pages of the same month too (R2)', () => {
    const query = monthQuery('2026-07', EMPTY_FILTERS, 3, true)

    expect(query.page).toBe(3)
    expect(query.excluded).toBe('none')
    expect(query.transfer).toBe('none')
  })

  it('is not a filter of the bar: `Clear filters` and the empty sentence ignore it (C5)', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(EMPTY_FILTERS).not.toHaveProperty('hideNoise')
  })

  describe('the count query (R7)', () => {
    it('is the same month and the same filters WITHOUT hiding anything, one row', () => {
      const filter = filters({ accountId: 19532, uncategorized: true, q: 'luz' })

      expect(hiddenCountQuery('2026-07', filter)).toEqual({
        from: '2026-07-01',
        to: '2026-07-31',
        page: 1,
        pageSize: 1,
        accountId: 19532,
        uncategorized: true,
        q: 'luz',
      })
    })

    it('never carries the two scopes: it is the total the switch is measured against', () => {
      const query = hiddenCountQuery('2026-07', EMPTY_FILTERS)

      expect(query).not.toHaveProperty('excluded')
      expect(query).not.toHaveProperty('transfer')
      expect(query.pageSize).toBe(1)
    })
  })

  describe('the switch in the URL (R4, R5)', () => {
    it('writes `hide=true` on, and no key at all off', () => {
      expect(toRouteQuery('2026-07', EMPTY_FILTERS, true)).toEqual({
        month: '2026-07',
        hide: 'true',
      })
      expect(toRouteQuery('2026-07', EMPTY_FILTERS, false)).toEqual({ month: '2026-07' })
      expect(toRouteQuery('2026-07', EMPTY_FILTERS)).not.toHaveProperty('hide')
    })

    it('keeps the month and the four filters exactly as they were (R4)', () => {
      expect(
        toRouteQuery('2026-07', filters({ accountId: 19532, uncategorized: true, q: 'luz' }), true),
      ).toEqual({
        month: '2026-07',
        hide: 'true',
        account: '19532',
        uncategorized: 'true',
        q: 'luz',
      })
    })

    it('reads back what it writes, filters included', () => {
      const state = {
        month: '2026-07',
        hideNoise: true,
        filters: filters({ accountId: 19532, q: 'luz' }),
      }
      const written = toRouteQuery(state.month, state.filters, state.hideNoise)

      expect(fromRouteQuery(written as Record<string, string>, SEPTEMBER)).toEqual(state)
    })

    it.each(['1', 'yes', 'TRUE', '', 'false'])(
      'reads `hide=%s` as off, and asks for the whole month (R5)',
      (raw) => {
        const read = fromRouteQuery({ month: '2026-07', hide: raw }, SEPTEMBER)

        expect(read.hideNoise).toBe(false)
        expect(monthQuery(read.month, read.filters, 1, read.hideNoise)).not.toHaveProperty(
          'excluded',
        )
      },
    )

    it('is off when the address does not mention it at all (R1)', () => {
      expect(fromRouteQuery({ month: '2026-07' }, SEPTEMBER).hideNoise).toBe(false)
    })
  })

  describe('the sentences of the switch (R7, R8, R12)', () => {
    it('says how many movements are held back, in singular and plural', () => {
      expect(hiddenCountLine(1)).toBe('Hiding 1 movement')
      expect(hiddenCountLine(34)).toBe('Hiding 34 movements')
      expect(hiddenCountLine(0)).toBe('Hiding 0 movements')
    })

    it('never says an amount: there is no «how much» in any response (R8, C3)', () => {
      for (const line of [hiddenCountLine(1), hiddenCountLine(34)]) {
        expect(line).not.toContain('€')
        expect(line).not.toMatch(/\d+[.,]\d\d/)
      }
    })

    it('names both causes when nothing is left to show (R12)', () => {
      expect(nothingLeftLine('2026-07', true)).toBe(
        'Nothing left to show in July 2026: what these filters match is hidden.',
      )
      expect(nothingLeftLine('2026-07', false)).toBe(
        'Nothing left to show in July 2026: everything in this month is hidden.',
      )
    })
  })
})
