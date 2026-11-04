import { describe, it, expect, vi, afterEach } from 'vitest'

import { appConfig } from '@/shared/config'
import { ApiError, ValidationError } from '@/shared/errors'

import { GAINS_PATH, getInvestmentGains } from '../service'
import { investmentGains } from './fixtures'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/** Mocks only the HTTP boundary: the service and the http client run for real. */
function mockApi(body: unknown, init?: ResponseInit) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(jsonResponse(body, init)))
}

type RawEntry = Record<string, unknown>
/** Loose on purpose: each test breaks one field of the contract. */
interface RawPayload {
  asOf: unknown
  total: RawEntry & { excluded: RawEntry[] }
  live: RawEntry[]
  closed: RawEntry[]
}

/** The example payload of ../gastos-backend/docs/api-contract.md § GET /api/investments/gains. */
function gainsContractPayload(): RawPayload {
  return {
    asOf: '2026-11-03',
    total: {
      gain: '686.35',
      invested: '22300.00',
      gainPercent: '3.08',
      excluded: [{ productId: 2, name: 'ETF Mundo', reason: 'no_photo' }],
    },
    live: [
      {
        id: 1,
        bank: 'myinvestor',
        name: 'Fondo Global',
        type: 'fund',
        openedAt: '2025-11-03',
        closedAt: null,
        invested: '12300.00',
        currentValue: '12800.50',
        gain: '500.50',
        gainPercent: '4.07',
        uninvestedCash: '10.25',
        valuedAt: '2026-09-30',
        reason: null,
      },
      {
        id: 4,
        bank: 'myinvestor',
        name: 'Deposito 12m',
        type: 'deposit',
        openedAt: '2026-03-02',
        closedAt: '2027-03-01',
        conditions: {
          principal: '10000.00',
          interestRate: '2.75',
          expectedGain: '275.00',
          maturityDate: '2027-03-01',
        },
        invested: '10000.00',
        currentValue: '10185.85',
        gain: '185.85',
        gainPercent: '1.86',
        valuedAt: '2026-11-03',
        reason: null,
      },
      {
        id: 2,
        bank: 'myinvestor',
        name: 'ETF Mundo',
        type: 'etf',
        openedAt: null,
        closedAt: null,
        invested: null,
        currentValue: null,
        gain: null,
        gainPercent: null,
        uninvestedCash: null,
        valuedAt: null,
        reason: 'no_photo',
      },
    ],
    closed: [
      {
        id: 7,
        bank: 'myinvestor',
        name: 'Deposito 3m',
        type: 'deposit',
        openedAt: '2026-06-01',
        closedAt: '2026-09-01',
        closedOn: '2026-09-01',
        conditions: {
          principal: '5000.00',
          interestRate: '2.5',
          expectedGain: '31.25',
          maturityDate: '2026-09-01',
        },
        invested: '5000.00',
        currentValue: '5031.20',
        gain: '31.20',
        gainPercent: '0.62',
        valuedAt: '2026-09-01',
        reason: null,
      },
      {
        id: 3,
        bank: 'myinvestor',
        name: 'Deposito 6m',
        type: 'deposit',
        openedAt: '2026-01-12',
        closedAt: '2026-04-20',
        closedOn: '2026-04-20',
        conditions: {
          principal: '2000.00',
          interestRate: '2.2',
          expectedGain: '22.00',
          maturityDate: '2026-07-12',
        },
        invested: '2000.00',
        currentValue: '2000.00',
        gain: '0.00',
        gainPercent: '0.00',
        valuedAt: '2026-04-20',
        reason: null,
      },
    ],
  }
}

/** What the service rejects with, read once from a fresh mock of the boundary. */
async function rejectionOf(payload: unknown): Promise<unknown> {
  const fetchSpy = mockApi(payload)
  const rejection = await getInvestmentGains().then(
    () => null,
    (error: unknown) => error,
  )
  fetchSpy.mockRestore()
  return rejection
}

describe('getInvestmentGains', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks the gains path with no method, body or query', async () => {
    const fetchSpy = mockApi(gainsContractPayload())

    await getInvestmentGains()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [input, init] = fetchSpy.mock.calls[0] ?? []
    const requested = new URL(String(input))
    expect(requested.toString()).toBe(new URL(GAINS_PATH, appConfig.apiUrl).toString())
    expect(requested.pathname).toBe('/api/investments/gains')
    expect(requested.search).toBe('')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(init?.body).toBeUndefined()
  })

  it('maps every field of the contract example', async () => {
    mockApi(gainsContractPayload())

    // The contract example, field by field: nothing renamed, dropped or recalculated.
    expect(await getInvestmentGains()).toEqual(gainsContractPayload())
  })

  it('keeps the products of the test sample as they come', async () => {
    mockApi(investmentGains())

    expect(await getInvestmentGains()).toEqual(investmentGains())
  })

  it('keeps an unpadded percent of a valuation as it comes', async () => {
    const payload = gainsContractPayload()
    payload.live[0]!.gainPercent = '0.9'
    mockApi(payload)

    expect((await getInvestmentGains()).live[0]?.gainPercent).toBe('0.9')
  })

  it('accepts no products at all, with the total at zero and no percent', async () => {
    const empty = {
      asOf: '2026-11-03',
      total: { gain: '0.00', invested: '0.00', gainPercent: null, excluded: [] },
      live: [],
      closed: [],
    }
    mockApi(empty)

    expect(await getInvestmentGains()).toEqual(empty)
  })

  it('rejects a product whose type is not an investment', async () => {
    const live = gainsContractPayload()
    live.live[0]!.type = 'savings_account'
    const liveRejection = await rejectionOf(live)
    expect(liveRejection).toBeInstanceOf(ValidationError)
    expect(String(liveRejection)).toMatch(
      /GET \/api\/investments\/gains: live\[0\]\.type is not one of fund \| etf/,
    )

    const closed = gainsContractPayload()
    closed.closed[1]!.type = 'savings_account'
    const closedRejection = await rejectionOf(closed)
    expect(closedRejection).toBeInstanceOf(ValidationError)
    expect(String(closedRejection)).toMatch(/closed\[1\]\.type is not one of/)
  })

  it('rejects a response whose total gain is not the sum of the live gains', async () => {
    const payload = gainsContractPayload()
    // 686.35 plus the closed Deposito 3m: a closed product never adds up.
    payload.total.gain = '717.55'

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(
      /total\.gain is not the sum of the gains of the live products/,
    )
  })

  it('rejects a reason that is not in the closed list', async () => {
    const payload = gainsContractPayload()
    payload.live[2]!.reason = 'no_valuation'

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(/live\[2\]\.reason is not one of no_photo/)
  })

  it('rejects an amount that is not a two-decimal string or null', async () => {
    const payload = gainsContractPayload()
    payload.live[0]!.invested = 12300

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(
      /live\[0\]\.invested is not a decimal string with two decimals/,
    )
  })

  it('rejects a percent that is not a plain decimal string or null', async () => {
    const payload = gainsContractPayload()
    payload.live[0]!.gainPercent = '4,07'
    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(/live\[0\]\.gainPercent is not a percent string or null/)

    const total = gainsContractPayload()
    total.total.gainPercent = 3.08
    const totalRejection = await rejectionOf(total)
    expect(totalRejection).toBeInstanceOf(ValidationError)
    expect(String(totalRejection)).toMatch(/total\.gainPercent is not a percent string or null/)
  })

  it('rejects a closed product without its close date', async () => {
    const payload = gainsContractPayload()
    delete payload.closed[0]!.closedOn

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(/closed\[0\]\.closedOn is not a YYYY-MM-DD date/)
  })

  it('rejects a deposit without its conditions', async () => {
    const payload = gainsContractPayload()
    delete payload.live[1]!.conditions

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(/live\[1\]\.conditions is not an object/)
  })

  it('rejects an excluded product without a known reason', async () => {
    const payload = gainsContractPayload()
    payload.total.excluded[0]!.reason = null

    const rejection = await rejectionOf(payload)
    expect(rejection).toBeInstanceOf(ValidationError)
    expect(String(rejection)).toMatch(/total\.excluded\[0\]\.reason is not one of/)
  })

  it('lets the ApiError of a failed gains request through untouched', async () => {
    mockApi({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'boom' }, { status: 500 })

    await expect(getInvestmentGains()).rejects.toBeInstanceOf(ApiError)
  })
})
