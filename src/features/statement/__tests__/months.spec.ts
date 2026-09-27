import { describe, it, expect } from 'vitest'

import { ApiError, ValidationError } from '@/shared/errors'
import { API_HTTP } from '@/shared/errors'
import { parseMovementPage } from '@/shared/movements'

import {
  STATEMENT_PAGE_SIZE,
  currentMonth,
  emptyMonthLine,
  formatMonthLabel,
  groupByDay,
  isAtOrAfterCurrentMonth,
  loadingMonthLine,
  monthFromRouteQuery,
  monthRange,
  monthToRouteQuery,
  movementCountLine,
  shiftMonth,
  showingLine,
  statementErrorMessage,
} from '../months'
import { MONTH_PAGE } from './fixtures'

/** A fixed clock: the current month must not depend on the day the suite runs. */
const SEPTEMBER = new Date(2026, 8, 11, 13, 45)

describe('the month (R1, R2, R4)', () => {
  it('reads the current month in local time', () => {
    expect(currentMonth(SEPTEMBER)).toBe('2026-09')
    expect(currentMonth(new Date(2024, 0, 1, 0, 30))).toBe('2024-01')
    // The last hours of a month stay in that month, they do not roll to the next.
    expect(currentMonth(new Date(2026, 6, 31, 23, 59))).toBe('2026-07')
  })

  it('builds the range with both ends included, whatever the length of the month', () => {
    expect(monthRange('2026-09')).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(monthRange('2026-07')).toEqual({ from: '2026-07-01', to: '2026-07-31' })
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('gets February of a leap year right', () => {
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
  })

  it('refuses a month that is not YYYY-MM instead of inventing a range', () => {
    expect(() => monthRange('2026-13')).toThrow(ValidationError)
    expect(() => monthRange('nope')).toThrow(ValidationError)
  })

  it('jumps months crossing the year in both directions', () => {
    expect(shiftMonth('2026-09', -1)).toBe('2026-08')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-03', -14)).toBe('2025-01')
    expect(shiftMonth('2024-01', -1)).toBe('2023-12')
  })

  it('labels the month in English, without slipping to the month before', () => {
    expect(formatMonthLabel('2026-09')).toBe('September 2026')
    expect(formatMonthLabel('2026-01')).toBe('January 2026')
    expect(formatMonthLabel('2024-12')).toBe('December 2024')
  })

  it('knows when there is nothing to look at ahead', () => {
    expect(isAtOrAfterCurrentMonth('2026-09', SEPTEMBER)).toBe(true)
    expect(isAtOrAfterCurrentMonth('2026-10', SEPTEMBER)).toBe(true)
    expect(isAtOrAfterCurrentMonth('2026-08', SEPTEMBER)).toBe(false)
    expect(isAtOrAfterCurrentMonth('2024-01', SEPTEMBER)).toBe(false)
  })
})

describe('the month in the URL (R3, R4)', () => {
  it('reads a valid month', () => {
    expect(monthFromRouteQuery({ month: '2026-03' }, SEPTEMBER)).toBe('2026-03')
  })

  it.each([
    ['a month out of range', '2026-13'],
    ['a short year', '26-09'],
    ['a full date', '2026-09-11'],
    ['empty', ''],
    ['nonsense', 'nope'],
  ])('falls back to the current month with no error: %s', (_case, raw) => {
    expect(monthFromRouteQuery({ month: raw }, SEPTEMBER)).toBe('2026-09')
  })

  it('falls back when the key is missing or repeated as an array', () => {
    expect(monthFromRouteQuery({}, SEPTEMBER)).toBe('2026-09')
    expect(monthFromRouteQuery({ month: null }, SEPTEMBER)).toBe('2026-09')
    expect(monthFromRouteQuery({ month: ['2026-13', '2026-03'] }, SEPTEMBER)).toBe('2026-09')
  })

  it('reads back what it writes', () => {
    const written = monthToRouteQuery('2026-03')

    expect(written).toEqual({ month: '2026-03' })
    expect(monthFromRouteQuery({ month: String(written.month) }, SEPTEMBER)).toBe('2026-03')
  })
})

// `monthQuery` moved to `filters.ts` in feature 20, where the filters live: its tests
// went with it (`__tests__/filters.spec.ts`). The page size is still declared here.
describe('the page size of the screen (R13)', () => {
  it('asks the contract maximum, so a whole month arrives in one request', () => {
    expect(STATEMENT_PAGE_SIZE).toBe(200)
  })
})

describe('grouping by day (R8)', () => {
  const movements = parseMovementPage(MONTH_PAGE).movements

  it('opens a day header where the date changes, keeping the API order', () => {
    const days = groupByDay(movements)

    expect(days.map((day) => day.date)).toEqual(['2026-09-11', '2026-09-04', '2026-09-02'])
    expect(days.map((day) => day.movements.length)).toEqual([2, 1, 2])
    expect(days[0]?.movements.map((row) => row.id)).toEqual([10, 11])
  })

  it('formats the day label with the shared date format', () => {
    expect(groupByDay(movements)[0]?.label).toBe('11 Sept 2026')
  })

  it('never re-sorts: an out-of-order list comes back out of order', () => {
    const shuffled = [movements[2], movements[0], movements[3]].flatMap((row) => (row ? [row] : []))

    expect(groupByDay(shuffled).map((day) => day.date)).toEqual([
      '2026-09-04',
      '2026-09-11',
      '2026-09-02',
    ])
  })

  it('handles a single movement and an empty list', () => {
    expect(groupByDay(movements.slice(0, 1))).toHaveLength(1)
    expect(groupByDay([])).toEqual([])
  })
})

describe('the sentences (R11, R12, R13)', () => {
  it('counts movements in singular and plural', () => {
    expect(movementCountLine(93)).toBe('93 movements')
    expect(movementCountLine(1)).toBe('1 movement')
    expect(movementCountLine(0)).toBe('0 movements')
  })

  it('says how much of the month is on screen', () => {
    expect(showingLine(200, 412)).toBe('Showing 200 of 412')
  })

  it('names the month it found nothing in, and the month it is loading', () => {
    expect(emptyMonthLine('2026-09')).toBe('No movements in September 2026.')
    expect(loadingMonthLine('2026-09')).toBe('Loading September 2026…')
  })

  // Feature 20: the sentence comes with the button that goes with it, because a
  // rejected filter is fixed by dropping it, not by asking again.
  it('tells a load failure in English, never with the backend message', () => {
    const spanish = 'El parámetro «from» no es una fecha válida'

    expect(statementErrorMessage(new ApiError(spanish, API_HTTP, { status: 400 }))).toEqual({
      message: 'The backend rejected that month.',
      action: 'retry',
    })
    expect(statementErrorMessage(new ValidationError('totals.net is not a decimal'))).toEqual({
      message: "The server answered, but the statement couldn't be read.",
      action: 'retry',
    })
    expect(statementErrorMessage(new ApiError('Failed to fetch', 'API_NETWORK'))).toEqual({
      message: "Couldn't reach the server.",
      action: 'retry',
    })
    expect(statementErrorMessage(new ApiError(spanish, API_HTTP, { status: 500 }))).toEqual({
      message: 'Something went wrong loading this month.',
      action: 'retry',
    })
  })

  it('offers Clear filters for a filter the backend cannot serve (R10, R13)', () => {
    const spanish = 'No existe la cuenta 3'

    expect(statementErrorMessage(new ApiError(spanish, API_HTTP, { status: 404 }))).toEqual({
      message: 'That account or category no longer exists.',
      action: 'clear',
    })
    // The same 404 with no filters still offers to clear: the id came from the URL.
    expect(
      statementErrorMessage(new ApiError(spanish, API_HTTP, { status: 404 }), false).action,
    ).toBe('clear')
    expect(statementErrorMessage(new ApiError(spanish, API_HTTP, { status: 400 }), true)).toEqual({
      message: 'The backend rejected these filters.',
      action: 'clear',
    })
  })

  it('never leaks the backend sentence into any message', () => {
    const spanish = 'El parámetro «from» no es una fecha válida'
    const messages = [
      new ApiError(spanish, API_HTTP, { status: 400 }),
      new ApiError(spanish, API_HTTP, { status: 500 }),
      new ValidationError(spanish),
      new ApiError(spanish, API_HTTP, { status: 404 }),
    ].flatMap((error) => [statementErrorMessage(error), statementErrorMessage(error, true)])

    for (const { message } of messages) {
      expect(message).not.toContain('parámetro')
      expect(message).not.toContain('existe')
    }
  })
})
