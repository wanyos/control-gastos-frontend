import { test, expect } from '@playwright/test'

// Investments screen (feature 40): what each investment gains or loses and the total of
// the live ones, from GET /api/investments/gains. Read only. EVERY /api CALL IS
// INTERCEPTED: the first route aborts any call this spec did not foresee and writes it
// down, so nothing reaches the real backend on :3000 and an unforeseen call turns the
// test red.

// Invented figures, shaped like the contract example, with one product that loses.
// total.gain = 500.50 - 120.40 + 185.85 = 565.95.
const GAINS_SAMPLE = {
  asOf: '2026-11-03',
  total: {
    gain: '565.95',
    invested: '28033.30',
    gainPercent: '2.02',
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
      id: 5,
      bank: 'myinvestor',
      name: 'Cartera Indexada',
      type: 'managed_portfolio',
      openedAt: '2026-01-15',
      closedAt: null,
      invested: '5733.30',
      currentValue: '5612.90',
      gain: '-120.40',
      gainPercent: '-2.1',
      uninvestedCash: null,
      valuedAt: '2026-10-31',
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

/** Money and percents are written with a no-break space before the sign. */
const NBSP = String.fromCharCode(0xa0)

const EMPTY_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
  totals: { income: '0.00', expense: '0.00', net: '0.00' },
}

test.use({ testIdAttribute: 'data-test' })

// The home, answered so the test can enter Investments from the sidebar.
const NET_WORTH_SAMPLE = {
  asOf: '2026-11-03',
  lastDataDate: '2026-11-03',
  total: '2140.37',
  accounts: {
    total: '2140.37',
    accounts: [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '2140.37' },
    ],
  },
  investments: { total: '0.00', products: [], issues: [] },
}

test('opens investments and sees the gain of each product and the total', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  const aborted: string[] = []
  const calls: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/api/')) calls.push(`${request.method()} ${path}`)
  })

  // Safety net first (later routes win).
  await page.route('**/api/**', (route) => {
    aborted.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
    return route.abort()
  })
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  // The topbar and the sidebar ask these on every screen (features 13, 15 and 35).
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/movements*', (route) => route.fulfill({ json: EMPTY_PAGE }))
  await page.route('**/api/investments/gains', (route) => route.fulfill({ json: GAINS_SAMPLE }))

  await page.goto('/')
  await expect(page.getByTestId('topbar-title')).toHaveText('Net Worth')
  expect(calls).not.toContain('GET /api/investments/gains')

  await page.getByRole('link', { name: 'Investments' }).click()

  await expect(page).toHaveURL(/\/investments$/)
  await expect(page.getByTestId('topbar-title')).toHaveText('Investments')

  // The big figure, as the backend sent it.
  const summary = page.getByTestId('gains-summary')
  await expect(summary).toContainText('Gain or loss on live investments')
  await expect(summary.getByTestId('gains-total')).toHaveText(`+565,95${NBSP}€`)
  await expect(summary.getByTestId('gains-total-percent')).toHaveText(`+2,02${NBSP}%`)
  await expect(summary.getByTestId('gains-excluded')).toHaveText(
    'Not included: ETF Mundo (no valuation on file)',
  )

  // The live ones, from the one that gains most to the one that loses most.
  const live = page.getByTestId('live-investments')
  await expect(live.getByTestId('gain-name')).toHaveText([
    'Fondo Global',
    'Deposito 12m',
    'Cartera Indexada',
    'ETF Mundo',
  ])
  await expect(live.getByTestId('gain-amount')).toHaveText([
    `+500,50${NBSP}€`,
    `+185,85${NBSP}€`,
    `-120,40${NBSP}€`,
    '—',
  ])

  // The closed ones apart, in the order they came.
  const closed = page.getByTestId('closed-investments')
  await expect(closed).toContainText('Not part of the total')
  await expect(closed.getByTestId('gain-name')).toHaveText(['Deposito 3m', 'Deposito 6m'])
  await expect(closed.getByTestId('gain-cancelled')).toHaveText(['Cancelled before it matured'])

  // The Deposits card is gone, and so is its read.
  await expect(page.getByTestId('deposit-earnings')).toHaveCount(0)
  expect(calls).not.toContain('GET /api/investments/deposits')

  expect(calls.filter((call) => call === 'GET /api/investments/gains')).toHaveLength(1)
  expect(calls.every((call) => call.startsWith('GET '))).toBe(true)
  expect(aborted).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})
