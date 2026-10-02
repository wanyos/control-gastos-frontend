import { describe, it, expect, afterEach, vi } from 'vitest'

import { ApiError, ValidationError } from '@/shared/errors'

import { getLatestBookingDate, getMonthFigures, getUncategorizedSpending } from '../service'
import { SERVER_ERROR_BODY, json, mockBackend } from './fixtures'

describe('overview service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for the month exactly as the statement does, with no filters (R5)', async () => {
    const api = mockBackend()

    const figures = await getMonthFigures('2026-08')

    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]?.path).toBe('/api/movements')
    expect(api.searches()).toEqual(['from=2026-08-01&to=2026-08-31&pageSize=1'])
    expect(figures).toEqual({
      month: '2026-08',
      totals: { income: '2590.26', expense: '4003.89', net: '-1413.63' },
      movementCount: 70,
    })
  })

  it('reads an empty month as zero movements, not as an error (R9)', async () => {
    mockBackend()

    const figures = await getMonthFigures('2026-10')

    expect(figures.movementCount).toBe(0)
    expect(figures.totals).toEqual({ income: '0.00', expense: '0.00', net: '0.00' })
  })

  it('asks for the uncategorized spending with the two scopes that match the count (R12)', async () => {
    const api = mockBackend()

    const uncategorized = await getUncategorizedSpending('2026-08')

    const query = new URLSearchParams(api.searches()[0])
    expect(Object.fromEntries(query)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
      type: 'expense',
      uncategorized: 'true',
      transfer: 'none',
      excluded: 'none',
      pageSize: '1',
    })
    expect(uncategorized).toEqual({ amount: '3036.33', count: 48 })
  })

  it('reads the date of the newest movement of the base, with no filters (R8)', async () => {
    const api = mockBackend()

    expect(await getLatestBookingDate()).toBe('2026-09-11')
    expect(api.searches()).toEqual(['pageSize=1'])
  })

  it('answers null when the base has no movements (R8)', async () => {
    mockBackend(undefined, null)

    expect(await getLatestBookingDate()).toBeNull()
  })

  it('only ever sends GET to /api/movements, with no body (C1)', async () => {
    const api = mockBackend()

    await getMonthFigures('2026-08')
    await getUncategorizedSpending('2026-08')
    await getLatestBookingDate()

    expect(api.methods()).toEqual(['GET'])
    expect(api.paths()).toEqual(['/api/movements'])
    for (const [, init] of api.spy.mock.calls) {
      expect(init?.body).toBeUndefined()
    }
  })

  it('surfaces a failed read as an ApiError and a drifted answer as a ValidationError', async () => {
    mockBackend((read) =>
      read.kind === 'latest' ? json({ movements: [] })() : json(SERVER_ERROR_BODY, 500)(),
    )

    await expect(getMonthFigures('2026-08')).rejects.toBeInstanceOf(ApiError)
    await expect(getLatestBookingDate()).rejects.toBeInstanceOf(ValidationError)
  })
})
