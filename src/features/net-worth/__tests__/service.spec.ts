import { describe, it, expect, vi, afterEach } from 'vitest'

import type { HttpClient } from '@/services/http'
import { appConfig } from '@/shared/config'
import { ApiError, ValidationError } from '@/shared/errors'

import { DEPOSITS_PATH, getDepositEarnings, getNetWorth, NET_WORTH_PATH } from '../service'
import type { DepositProduct, MarketProduct, SavingsAccountProduct } from '../types'

/** The example payload of ../gastos-backend/docs/api-contract.md § GET /api/net-worth. */
function contractPayload() {
  return {
    asOf: '2026-09-06',
    lastDataDate: '2026-08-29',
    total: '23708.90',
    accounts: {
      total: '5500.00',
      accounts: [
        {
          id: 1,
          iban: 'ES9121000418450200051332',
          bank: 'bankinter',
          alias: 'bankinter ···1332',
          type: 'checking',
          balance: '5500.00',
        },
      ],
    },
    investments: {
      total: '18208.90',
      products: [
        {
          id: 1,
          bank: 'myinvestor',
          name: 'Fondo Global',
          type: 'fund',
          value: '12810.75',
          marketValue: '12800.50',
          uninvestedCash: '10.25',
          valuedAt: '2026-08-29',
          stale: false,
        },
        {
          id: 2,
          bank: 'myinvestor',
          name: 'ETF Mundo',
          type: 'etf',
          value: null,
          marketValue: null,
          uninvestedCash: null,
          valuedAt: null,
          stale: false,
        },
        {
          id: 4,
          bank: 'myinvestor',
          name: 'Deposito 12m',
          type: 'deposit',
          value: '10000.00',
          principal: '10000.00',
          expectedGain: '275.00',
          maturityDate: '2026-08-15',
          matured: true,
        },
        {
          id: 5,
          bank: 'trade-republic',
          name: 'Cuenta remunerada',
          type: 'savings_account',
          value: '5208.40',
          valuedAt: '2026-06-30',
          stale: true,
        },
      ],
      issues: [
        { productId: 2, name: 'ETF Mundo', reason: 'no_valuation', valuedAt: null },
        {
          productId: 4,
          name: 'Deposito 12m',
          reason: 'matured_not_closed',
          valuedAt: '2026-08-15',
        },
        {
          productId: 5,
          name: 'Cuenta remunerada',
          reason: 'stale_valuation',
          valuedAt: '2026-06-30',
        },
      ],
    },
  }
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

/** Mocks the HTTP boundary only: the real http client and its URL building run. */
function mockApi(body: unknown, init?: ResponseInit) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(jsonResponse(body, init)))
}

describe('getNetWorth', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the net worth path against the configured API base', async () => {
    const fetchSpy = mockApi(contractPayload())

    await getNetWorth()

    const requested = String(fetchSpy.mock.calls[0]?.[0])
    expect(requested).toBe(new URL(NET_WORTH_PATH, appConfig.apiUrl).toString())
    expect(new URL(requested).pathname).toBe('/api/net-worth')
  })

  it('maps the contract example into the frontend types', async () => {
    mockApi(contractPayload())

    const netWorth = await getNetWorth()

    expect(netWorth.asOf).toBe('2026-09-06')
    expect(netWorth.lastDataDate).toBe('2026-08-29')
    expect(netWorth.total).toBe('23708.90')
    expect(netWorth.accounts.total).toBe('5500.00')
    expect(netWorth.accounts.accounts).toHaveLength(1)
    expect(netWorth.accounts.accounts[0]).toEqual({
      id: 1,
      iban: 'ES9121000418450200051332',
      bank: 'bankinter',
      alias: 'bankinter ···1332',
      type: 'checking',
      balance: '5500.00',
    })
    expect(netWorth.investments.total).toBe('18208.90')
    expect(netWorth.investments.products).toHaveLength(4)
  })

  it('keeps every amount as the decimal string the API sent, never a number', async () => {
    mockApi(contractPayload())

    const netWorth = await getNetWorth()
    const amounts = [
      netWorth.total,
      netWorth.accounts.total,
      netWorth.accounts.accounts[0]?.balance,
      netWorth.investments.total,
      ...netWorth.investments.products.map((product) => product.value),
    ]

    for (const amount of amounts) {
      // A missing value stays null: it is a gap, never a zero and never a number.
      if (amount === null) continue
      expect(typeof amount).toBe('string')
      expect(amount).toMatch(/^-?\d+\.\d{2}$/)
    }
    expect(amounts).toContain(null)
    expect(netWorth.total).toBe('23708.90')
  })

  it('discriminates each product by its type, with the fields of that type', async () => {
    mockApi(contractPayload())

    const { products } = (await getNetWorth()).investments
    const fund = products.find((product) => product.type === 'fund') as MarketProduct
    const deposit = products.find((product) => product.type === 'deposit') as DepositProduct
    const savings = products.find(
      (product) => product.type === 'savings_account',
    ) as SavingsAccountProduct

    expect(fund).toEqual({
      id: 1,
      bank: 'myinvestor',
      name: 'Fondo Global',
      type: 'fund',
      value: '12810.75',
      marketValue: '12800.50',
      uninvestedCash: '10.25',
      valuedAt: '2026-08-29',
      stale: false,
    })
    expect(deposit).toEqual({
      id: 4,
      bank: 'myinvestor',
      name: 'Deposito 12m',
      type: 'deposit',
      value: '10000.00',
      principal: '10000.00',
      expectedGain: '275.00',
      maturityDate: '2026-08-15',
      matured: true,
    })
    expect(savings).toEqual({
      id: 5,
      bank: 'trade-republic',
      name: 'Cuenta remunerada',
      type: 'savings_account',
      value: '5208.40',
      valuedAt: '2026-06-30',
      stale: true,
    })
    expect(savings).not.toHaveProperty('marketValue')
  })

  it('keeps a product without valuation as null instead of zero', async () => {
    mockApi(contractPayload())

    const { products } = (await getNetWorth()).investments
    const etf = products.find((product) => product.type === 'etf') as MarketProduct

    expect(etf.value).toBeNull()
    expect(etf.marketValue).toBeNull()
    expect(etf.uninvestedCash).toBeNull()
    expect(etf.valuedAt).toBeNull()
  })

  it('maps the issues with their closed enum of reasons', async () => {
    mockApi(contractPayload())

    const { issues } = (await getNetWorth()).investments

    expect(issues).toEqual([
      { productId: 2, name: 'ETF Mundo', reason: 'no_valuation', valuedAt: null },
      { productId: 4, name: 'Deposito 12m', reason: 'matured_not_closed', valuedAt: '2026-08-15' },
      {
        productId: 5,
        name: 'Cuenta remunerada',
        reason: 'stale_valuation',
        valuedAt: '2026-06-30',
      },
    ])
  })

  it('accepts an empty database: empty lists and totals at "0.00"', async () => {
    mockApi({
      asOf: '2026-09-06',
      lastDataDate: null,
      total: '0.00',
      accounts: { total: '0.00', accounts: [] },
      investments: { total: '0.00', products: [], issues: [] },
    })

    const netWorth = await getNetWorth()

    expect(netWorth.total).toBe('0.00')
    expect(netWorth.lastDataDate).toBeNull()
    expect(netWorth.accounts.accounts).toEqual([])
    expect(netWorth.investments.products).toEqual([])
    expect(netWorth.investments.issues).toEqual([])
  })

  it('requires lastDataDate: a date or null, never absent (cabo 13)', async () => {
    const { lastDataDate: _date, ...withoutDate } = contractPayload()
    mockApi(withoutDate)

    await expect(getNetWorth()).rejects.toThrowError(/lastDataDate is not a YYYY-MM-DD date/)
  })

  it('throws a ValidationError naming the field when the payload drifts', async () => {
    const payload = contractPayload()
    payload.total = 23708.9 as unknown as string
    mockApi(payload)

    await expect(getNetWorth()).rejects.toBeInstanceOf(ValidationError)
    await expect(getNetWorth()).rejects.toThrowError(/total is not a decimal string/)
  })

  it('throws a ValidationError when a product carries an unknown type', async () => {
    const payload = contractPayload()
    payload.investments.products[0]!.type = 'crypto'
    mockApi(payload)

    await expect(getNetWorth()).rejects.toThrowError(/products\[0\]\.type/)
  })

  it('lets the ApiError of a failed request through untouched', async () => {
    mockApi({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'boom' }, { status: 500 })

    await expect(getNetWorth()).rejects.toBeInstanceOf(ApiError)
    await expect(getNetWorth()).rejects.toMatchObject({ status: 500 })
  })

  it('accepts an injected client so a store can be tested without globals', async () => {
    const requested: string[] = []
    const client: HttpClient = <T>(path: string): Promise<T> => {
      requested.push(path)
      return Promise.resolve(contractPayload() as T)
    }

    const netWorth = await getNetWorth(client)

    expect(requested).toEqual([NET_WORTH_PATH])
    expect(netWorth.total).toBe('23708.90')
  })
})

/** The example payload of ../gastos-backend/docs/api-contract.md § GET /api/investments/deposits. */
function depositsContractPayload() {
  return {
    asOf: '2026-06-15',
    deposits: [
      {
        id: 7,
        bank: 'myinvestor',
        name: 'Deposito 3m',
        openedAt: '2026-06-01',
        closedAt: '2026-09-01',
        principal: '5000.00',
        expectedGain: '31.20',
        maturityDate: '2026-09-01',
        status: 'active',
        earned: null as string | null,
        maturity: null as unknown,
        candidateMovementIds: [] as number[],
      },
      {
        id: 5,
        bank: 'myinvestor',
        name: 'Deposito 1m',
        openedAt: '2026-05-02',
        closedAt: '2026-06-02',
        principal: '4000.00',
        expectedGain: '7.10',
        maturityDate: '2026-06-02',
        status: 'matured',
        earned: '7.25' as string | null,
        maturity: { movementId: 812, date: '2026-06-02', amount: '4007.25' } as unknown,
        candidateMovementIds: [] as number[],
      },
      {
        id: 3,
        bank: 'myinvestor',
        name: 'Deposito 6m',
        openedAt: '2025-11-04',
        closedAt: '2026-03-10',
        principal: '2000.00',
        expectedGain: '22.00',
        maturityDate: '2026-05-04',
        status: 'cancelled',
        earned: null as string | null,
        maturity: null as unknown,
        candidateMovementIds: [] as number[],
      },
    ],
    total: '7.25',
  }
}

describe('getDepositEarnings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks the deposits path with no method, body or query', async () => {
    const fetchSpy = mockApi(depositsContractPayload())

    await getDepositEarnings()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [input, init] = fetchSpy.mock.calls[0] ?? []
    const requested = new URL(String(input))
    expect(requested.toString()).toBe(new URL(DEPOSITS_PATH, appConfig.apiUrl).toString())
    expect(requested.pathname).toBe('/api/investments/deposits')
    expect(requested.search).toBe('')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(init?.body).toBeUndefined()
  })

  it('maps every deposit field of the contract example', async () => {
    mockApi(depositsContractPayload())

    const earnings = await getDepositEarnings()

    expect(earnings).toEqual({
      asOf: '2026-06-15',
      deposits: [
        {
          id: 7,
          bank: 'myinvestor',
          name: 'Deposito 3m',
          openedAt: '2026-06-01',
          closedAt: '2026-09-01',
          principal: '5000.00',
          expectedGain: '31.20',
          maturityDate: '2026-09-01',
          status: 'active',
          earned: null,
          maturity: null,
          candidateMovementIds: [],
        },
        {
          id: 5,
          bank: 'myinvestor',
          name: 'Deposito 1m',
          openedAt: '2026-05-02',
          closedAt: '2026-06-02',
          principal: '4000.00',
          expectedGain: '7.10',
          maturityDate: '2026-06-02',
          status: 'matured',
          earned: '7.25',
          maturity: { movementId: 812, date: '2026-06-02', amount: '4007.25' },
          candidateMovementIds: [],
        },
        {
          id: 3,
          bank: 'myinvestor',
          name: 'Deposito 6m',
          openedAt: '2025-11-04',
          closedAt: '2026-03-10',
          principal: '2000.00',
          expectedGain: '22.00',
          maturityDate: '2026-05-04',
          status: 'cancelled',
          earned: null,
          maturity: null,
          candidateMovementIds: [],
        },
      ],
      total: '7.25',
    })
  })

  it('keeps the gaps of a deposit as null and the candidates of an ambiguous one', async () => {
    const payload = depositsContractPayload()
    Object.assign(payload.deposits[0]!, {
      openedAt: null,
      closedAt: null,
      principal: null,
      expectedGain: null,
      maturityDate: null,
    })
    Object.assign(payload.deposits[2]!, { status: 'ambiguous', candidateMovementIds: [903, 917] })
    mockApi(payload)

    const [active, , ambiguous] = (await getDepositEarnings()).deposits

    expect(active).toMatchObject({
      openedAt: null,
      closedAt: null,
      principal: null,
      expectedGain: null,
      maturityDate: null,
    })
    expect(ambiguous?.candidateMovementIds).toEqual([903, 917])
  })

  it('accepts no deposits at all, with the total at "0.00"', async () => {
    mockApi({ asOf: '2026-06-15', deposits: [], total: '0.00' })

    expect(await getDepositEarnings()).toEqual({ asOf: '2026-06-15', deposits: [], total: '0.00' })
  })

  it('rejects an unknown deposit status', async () => {
    const payload = depositsContractPayload()
    payload.deposits[0]!.status = 'closed'
    mockApi(payload)

    await expect(getDepositEarnings()).rejects.toBeInstanceOf(ValidationError)
    await expect(getDepositEarnings()).rejects.toThrowError(
      /GET \/api\/investments\/deposits: deposits\[0\]\.status is not one of/,
    )
  })

  it('rejects earned on a deposit that is not matured', async () => {
    const payload = depositsContractPayload()
    payload.deposits[0]!.earned = '0.00'
    mockApi(payload)

    await expect(getDepositEarnings()).rejects.toBeInstanceOf(ValidationError)
    await expect(getDepositEarnings()).rejects.toThrowError(/deposits\[0\]\.earned is not null/)
  })

  it('rejects a matured deposit without its earned figure or its maturity', async () => {
    const withoutEarned = depositsContractPayload()
    withoutEarned.deposits[1]!.earned = null
    mockApi(withoutEarned)
    await expect(getDepositEarnings()).rejects.toThrowError(
      /deposits\[1\]\.earned is not a decimal/,
    )
    vi.restoreAllMocks()

    const withoutMaturity = depositsContractPayload()
    withoutMaturity.deposits[1]!.maturity = null
    mockApi(withoutMaturity)
    await expect(getDepositEarnings()).rejects.toThrowError(
      /deposits\[1\]\.maturity is not an object/,
    )
  })

  it('rejects a maturity on a status that does not carry one', async () => {
    const payload = depositsContractPayload()
    payload.deposits[2]!.maturity = { movementId: 700, date: '2026-05-04', amount: '2000.00' }
    mockApi(payload)

    await expect(getDepositEarnings()).rejects.toThrowError(/deposits\[2\]\.maturity is not null/)
  })

  it('rejects a response whose total is not the sum of the matured deposits', async () => {
    const payload = depositsContractPayload()
    // 7.25 plus the expected gain of the active one: more than the matured ones add up to.
    payload.total = '38.45'
    mockApi(payload)

    await expect(getDepositEarnings()).rejects.toBeInstanceOf(ValidationError)
    await expect(getDepositEarnings()).rejects.toThrowError(
      /total is not the sum of the earned of the matured deposits/,
    )
  })

  it('lets the ApiError of a failed deposits request through untouched', async () => {
    mockApi({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'boom' }, { status: 500 })

    await expect(getDepositEarnings()).rejects.toBeInstanceOf(ApiError)
  })
})
