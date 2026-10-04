import { describe, it, expect, afterEach, vi } from 'vitest'

import { API_NETWORK, ApiError } from '@/shared/errors'

import { getMonthFigures, getPeriodTotals } from '../service'
import { PERIOD, SERVER_ERROR_BODY, json, mockBackend, readOf } from './fixtures'

describe('getPeriodTotals (feature 26)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks for the whole run of months in one request and hands over the backend sums (R11)', async () => {
    const api = mockBackend()

    const period = await getPeriodTotals('2024-10', '2026-08')

    expect(api.calls).toHaveLength(1)
    expect(api.calls[0]?.path).toBe('/api/movements')
    expect(api.searches()).toEqual(['from=2024-10-01&to=2026-08-31&pageSize=1'])
    expect(api.count('period')).toBe(1)
    expect(period).toEqual({
      from: '2024-10',
      to: '2026-08',
      totals: { income: '60135.60', expense: '80934.73', net: '-20799.13' },
      movementCount: 863,
    })
    expect(period).toEqual(PERIOD)
  })

  it('ends the range on the last day of the last month, whatever its length', async () => {
    const api = mockBackend((read) =>
      read.kind === 'period' ? json(SERVER_ERROR_BODY, 500)() : undefined,
    )

    await expect(getPeriodTotals('2023-03', '2024-02')).rejects.toBeInstanceOf(ApiError)

    expect(api.searches()).toEqual(['from=2023-03-01&to=2024-02-29&pageSize=1'])
  })

  it('only sends a GET to /api/movements, with no body (C1)', async () => {
    const api = mockBackend()

    await getPeriodTotals('2024-10', '2026-08')

    expect(api.methods()).toEqual(['GET'])
    expect(api.paths()).toEqual(['/api/movements'])
    for (const [, init] of api.spy.mock.calls) {
      expect(init?.body).toBeUndefined()
    }
  })

  it('surfaces a failed read as an ApiError', async () => {
    mockBackend((read) => (read.kind === 'period' ? json(SERVER_ERROR_BODY, 500)() : undefined))

    await expect(getPeriodTotals('2024-10', '2026-08')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('the mocked backend and the period (feature 26)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tells a period from a month by its two ends', () => {
    expect(readOf(new URLSearchParams('from=2024-10-01&to=2026-08-31&pageSize=1')).kind).toBe(
      'period',
    )
    expect(readOf(new URLSearchParams('from=2026-08-01&to=2026-08-31&pageSize=1')).kind).toBe(
      'month',
    )
    expect(readOf(new URLSearchParams('pageSize=1')).kind).toBe('latest')
  })

  it('rejects any other range, so a period worked out wrong cannot pass in silence', async () => {
    const api = mockBackend()

    await expect(getPeriodTotals('2024-10', '2026-09')).rejects.toMatchObject({
      code: API_NETWORK,
    })
    await expect(getPeriodTotals('2024-09', '2026-08')).rejects.toMatchObject({
      code: API_NETWORK,
    })
    expect(api.count('period')).toBe(2)
  })

  it('keeps answering a month as a month', async () => {
    const api = mockBackend()

    const figures = await getMonthFigures('2026-08')

    expect(api.count('month')).toBe(1)
    expect(api.count('period')).toBe(0)
    expect(figures.movementCount).toBe(70)
  })
})
