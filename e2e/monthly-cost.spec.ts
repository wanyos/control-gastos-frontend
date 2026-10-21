import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// What a month costs (feature 32) in a real browser, without a backend: every /api call
// is answered with page.route. The screen only reads. The dev server proxies /api to a
// real backend on :3000, so the safety net below aborts anything not foreseen and writes
// it down: the list must end empty, and every method of the session must be GET.

/**
 * Feature 35: the sidebar asks on every screen how many doubtful movements of own money
 * there are (`GET /api/movements?ownership=doubtful`). Here there are none. Registered
 * after every route of `/api/movements`, so it wins; and kept out of the reads the tests
 * of this file watch.
 */
const isDoubtfulRead = (url: URL): boolean =>
  url.pathname === '/api/movements' && url.searchParams.get('ownership') === 'doubtful'
const NO_DOUBTFUL_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
  totals: { income: '0.00', expense: '0.00', net: '0.00' },
}
const routeNoDoubtful = (page: Page): Promise<void> =>
  page.route(isDoubtfulRead, (route) => route.fulfill({ json: NO_DOUBTFUL_PAGE }))

const MONTHS = [
  '2025-10',
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
]

const monthsOf = (spent: Record<string, string> = {}) =>
  MONTHS.map((month) => ({ month, amount: spent[month] ?? '0.00' }))

const charge = (id: number, bookingDate: string, amount: string, description: string) => ({
  id,
  accountId: 1,
  bookingDate,
  amount,
  description,
})

const bill = (
  key: string,
  periodicity: string,
  usualAmount: string,
  lastDate: string,
  previousMonthAmount: string | null,
  change: string | null,
  monthlyCost: string,
  movements: ReturnType<typeof charge>[],
) => ({
  key,
  name: `RECIBO /${key.toUpperCase()} INVENTADO`,
  periodicity,
  usualAmount,
  count: movements.length,
  lastDate,
  lastMonth: lastDate.slice(0, 7),
  lastMonthAmount: movements[0]?.amount ?? '0.00',
  previousMonth:
    previousMonthAmount === null ? null : (movements[1]?.bookingDate.slice(0, 7) ?? null),
  previousMonthAmount,
  change,
  hasIncreased: change !== null && !change.startsWith('-') && change !== '0.00',
  monthlyCost,
  movements,
})

/** Invented figures that add up: bills 63.48, people 25.00, variable 8.33 → 96.81. */
const RECURRING = {
  period: { from: '2025-10-01', to: '2026-09-30', months: MONTHS },
  monthlyTotal: '96.81',
  bills: [
    bill('agua municipal', 'every_two_months', '42.10', '2026-09-08', '40.20', '1.90', '21.05', [
      charge(901, '2026-09-08', '42.10', 'RECIBO /AGUA MUNICIPAL INVENTADO'),
      charge(850, '2026-07-07', '40.20', 'RECIBO /AGUA MUNICIPAL INVENTADO'),
    ]),
    bill('seguro coche', 'annual', '509.16', '2026-02-11', '509.16', '0.00', '42.43', [
      charge(612, '2026-02-11', '509.16', 'RECIBO /SEGURO COCHE INVENTADO'),
      charge(203, '2025-02-10', '509.16', 'RECIBO /SEGURO COCHE INVENTADO'),
    ]),
    bill('curso inventado', 'once', '75.00', '2024-05-20', null, null, '0.00', [
      charge(98, '2024-05-20', '75.00', 'RECIBO /CURSO INVENTADO INVENTADO'),
    ]),
  ],
  transfersToPeople: {
    months: monthsOf({ '2026-04': '300.00' }),
    monthlyCost: '25.00',
    movements: [charge(700, '2026-04-02', '300.00', 'BIZUM PERSONA INVENTADA')],
  },
  variable: [
    {
      category: { id: 21, name: 'Combustible', parentId: 4 },
      months: monthsOf({ '2026-07': '52.16', '2026-09': '47.83' }),
      monthlyCost: '8.33',
      movements: [
        charge(880, '2026-09-12', '47.83', 'ESTACION SERVICIO INVENTADA'),
        charge(840, '2026-07-05', '52.16', 'ESTACION SERVICIO INVENTADA'),
      ],
    },
  ],
}

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

const NET_WORTH_SAMPLE = {
  asOf: '2026-09-12',
  lastDataDate: '2026-09-12',
  total: '1500.00',
  accounts: {
    total: '1500.00',
    accounts: [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '1500.00' },
    ],
  },
  investments: { total: '0.00', products: [], issues: [] },
}

async function prepare(page: Page) {
  const watch = {
    requests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
    /** Every /api call this suite did not foresee: the ones the safety net had to stop. */
    aborted: [] as string[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') && !isDoubtfulRead(url)) watch.requests.push(request)
  })

  /** Stops a call nobody foresaw, and writes it down so the test fails because of it. */
  const stop = (route: Route) => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  // The sidebar's pending count: no movement listed, so none needs `deposit: null`.
  await page.route('**/api/movements*', (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() !== 'GET' || url.searchParams.get('status') === null) {
      return stop(route)
    }
    const pageSize = Number(url.searchParams.get('pageSize') ?? 50)
    return route.fulfill({
      json: {
        movements: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
        totals: ZERO,
      },
    })
  })
  await routeNoDoubtful(page)
  await page.route('**/api/recurring-expenses*', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: RECURRING }) : stop(route),
  )

  return watch
}

test.use({ testIdAttribute: 'data-test' })

test('reads the monthly cost from the menu, opens a bill and the folded ones, and only reads', async ({
  page,
}) => {
  const watch = await prepare(page)

  // (a) In through the sidebar, right below Overview.
  await page.goto('/')
  await expect(page).toHaveURL(/\/net-worth$/)
  await page.getByRole('link', { name: 'Monthly cost' }).click()
  await expect(page).toHaveURL(/\/monthly-cost$/)

  // (b) The figure, its period and how many bills went up.
  const total = page.getByTestId('monthly-cost-total')
  await expect(total.getByTestId('money')).toHaveText(/^96,81\s€$/)
  await expect(page.getByTestId('monthly-cost-period')).toHaveText(
    'Monthly average of the 12 complete months before this one: October 2025 to September 2026.',
  )
  await expect(page.getByTestId('monthly-cost-increased')).toHaveText(
    '1 of 3 bills went up since its previous charge.',
  )
  await expect(page.getByTestId('block-subtotal')).toHaveText([
    /^63,48\s€$/,
    /^25,00\s€$/,
    /^8,33\s€$/,
  ])

  // (c) A bill opens below its row with its charges.
  const water = page.getByTestId('bill-row').filter({ hasText: 'Agua municipal' })
  await expect(water.getByTestId('bill-increase')).toHaveText(/^Up 1,90\s€$/)
  await water.getByRole('button', { name: 'Show charges' }).click()
  await expect(water.getByTestId('charge-list-heading')).toHaveText('All 2 charges, newest first')
  await expect(water.getByTestId('charge-amount')).toHaveText([/^42,10\s€$/, /^40,20\s€$/])
  await expect(water.getByRole('button', { name: 'Hide charges' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )

  // (d) The bills with no charges in the period are folded at the end, and open on a click.
  const folded = page.getByTestId('bills-without-charges')
  const course = folded.getByTestId('bill-row')
  await expect(course).toBeHidden()
  await folded.getByText('1 bill with no charges between October 2025 and September 2026').click()
  await expect(course).toBeVisible()
  await expect(course.getByTestId('bill-title')).toHaveText('Curso inventado')
  await expect(course.getByTestId('bill-change-text')).toHaveText('No earlier charge')

  // (e) One read of the screen; nothing unforeseen left the browser, and it only read.
  const reads = watch.requests.filter(
    (request) => new URL(request.url()).pathname === '/api/recurring-expenses',
  )
  expect(reads).toHaveLength(1)
  expect(watch.aborted).toEqual([])
  expect([...new Set(watch.requests.map((request) => request.method()))]).toEqual(['GET'])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})
