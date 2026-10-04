import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// The month at a glance (feature 25) and the months below it (feature 26) in a real
// browser, without a backend: every /api call is answered with page.route. The screen
// only reads. The dev server proxies /api
// to a real backend on :3000, so the safety net below aborts anything not foreseen and
// writes it down: the list must end empty, and every method of the session must be GET.

type Figures = readonly [income: string, expense: string, net: string, count: number]

/** The real monthly figures read on 2026-10-02: totals and counts, nothing else. */
const MONTHS: Record<string, Figures> = {
  '2025-03': ['4002.93', '8147.47', '-4144.54', 53],
  '2025-04': ['1993.36', '6314.44', '-4321.08', 53],
  '2025-05': ['2254.36', '2573.59', '-319.23', 59],
  '2025-06': ['4249.94', '2371.53', '1878.41', 34],
  '2025-07': ['2212.66', '11527.15', '-9314.49', 42],
  '2025-08': ['2346.16', '10941.80', '-8595.64', 34],
  '2025-09': ['3910.73', '2352.42', '1558.31', 36],
  '2025-10': ['2151.95', '2819.35', '-667.40', 38],
  '2025-11': ['2150.66', '2062.95', '87.71', 31],
  '2025-12': ['5044.85', '3115.81', '1929.04', 49],
  '2026-01': ['3114.10', '1892.53', '1221.57', 35],
  '2026-02': ['2050.19', '1874.57', '175.62', 28],
  '2026-03': ['4392.47', '2532.16', '1860.31', 34],
  '2026-04': ['2536.07', '4396.54', '-1860.47', 42],
  '2026-05': ['7204.68', '4827.26', '2377.42', 49],
  '2026-06': ['5144.33', '5085.22', '59.11', 83],
  '2026-07': ['2785.90', '4096.05', '-1310.15', 93],
  '2026-08': ['2590.26', '4003.89', '-1413.63', 70],
  '2026-09': ['161.82', '966.84', '-805.02', 28],
}

/** Spending with no category, by month: amount and count. */
const UNCATEGORIZED: Record<string, readonly [amount: string, count: number]> = {
  '2026-08': ['3036.33', 48],
  '2026-09': ['625.71', 14],
}

/** The newest movement of the whole base. */
const LATEST = '2026-09-11'

/**
 * What the backend adds up from the oldest of the 24 months that end in `LATEST` to the
 * last complete one: the 18 months of `MONTHS` up to August 2026, added up apart.
 */
const PERIOD = {
  from: '2024-10-01',
  to: '2026-08-31',
  totals: { income: '60135.60', expense: '80934.73', net: '-20799.13' },
  count: 863,
}

const ZERO = { income: '0.00', expense: '0.00', net: '0.00' }

const ACCOUNT = { id: 1, iban: 'ES00', bank: 'bank', alias: 'bank ···0000', type: 'checking' }

/** A movement with every field of the contract and nothing real in it. */
const movement = (id: number, day: string) => ({
  id,
  type: 'expense',
  bookingDate: day,
  valueDate: day,
  amount: '1.00',
  description: `MOVEMENT ${id}`,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: 1,
  account: ACCOUNT,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'confirmed',
  excludedFromTotals: false,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-09-12T18:30:00.000Z',
  updatedAt: '2026-09-12T18:30:00.000Z',
})

const page1 = (pageSize: number, total: number) => ({
  page: 1,
  pageSize,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
})

/**
 * `GET /api/movements`, answered the way the backend would for each question. Null for a
 * question nobody foresaw: the caller stops it.
 */
function answerMovements(query: URLSearchParams): unknown {
  const pageSize = Number(query.get('pageSize') ?? 50)
  const from = query.get('from')
  const to = query.get('to')

  // The sidebar's pending count (feature 15).
  if (query.get('status') !== null) {
    return { movements: [], pagination: page1(pageSize, 0), totals: ZERO }
  }
  // No range: the newest movement of the base.
  if (from === null) {
    return { movements: [movement(1, LATEST)], pagination: page1(pageSize, 1607), totals: ZERO }
  }

  const month = from.slice(0, 7)
  // A range over several months: only the period of the months below is foreseen.
  if (to !== null && to.slice(0, 7) !== month) {
    if (from !== PERIOD.from || to !== PERIOD.to) return null
    return {
      movements: [movement(3, PERIOD.to)],
      pagination: page1(pageSize, PERIOD.count),
      totals: PERIOD.totals,
    }
  }
  if (query.get('uncategorized') === 'true') {
    const [amount, count] = UNCATEGORIZED[month] ?? ['0.00', 0]
    const net = amount === '0.00' ? '0.00' : `-${amount}`
    return {
      movements: [],
      pagination: page1(pageSize, count),
      totals: { income: '0.00', expense: amount, net },
    }
  }

  // The month with no filters: the overview asks one row, the statement a whole page.
  const [income, expense, net, count] = MONTHS[month] ?? ['0.00', '0.00', '0.00', 0]
  return {
    movements: count > 0 ? [movement(2, `${month}-01`)] : [],
    pagination: page1(pageSize, count),
    totals: { income, expense, net },
  }
}

const NET_WORTH_SAMPLE = {
  asOf: '2026-09-12',
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
    if (new URL(request.url()).pathname.startsWith('/api/')) watch.requests.push(request)
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
  // What the statement asks for on mount, reached through the link of this screen.
  await page.route('**/api/accounts', (route) =>
    route.fulfill({ json: [{ ...ACCOUNT, balance: '0.00' }] }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } }),
  )
  await page.route('**/api/movements*', (route) => {
    if (route.request().method() !== 'GET') return stop(route)
    const answer = answerMovements(new URL(route.request().url()).searchParams)
    return answer === null ? stop(route) : route.fulfill({ json: answer })
  })

  return watch
}

/** The reads this screen makes: one row of `GET /api/movements`, without a status. */
const overviewReads = (watch: Awaited<ReturnType<typeof prepare>>) =>
  watch.requests
    .map((request) => new URL(request.url()))
    .filter(
      (url) =>
        url.pathname === '/api/movements' &&
        url.searchParams.get('pageSize') === '1' &&
        url.searchParams.get('status') === null,
    )

test.use({ testIdAttribute: 'data-test' })

test('reads a month at a glance, moves between months and matches the statement', async ({
  page,
}) => {
  const watch = await prepare(page)

  // (a) In through the sidebar; the home is still the net worth.
  await page.goto('/')
  await expect(page).toHaveURL(/\/net-worth$/)
  await page.getByRole('link', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByTestId('overview-sentence')).toBeVisible()

  await page.getByTestId('statement-month-input').locator('input').fill('2026-08')

  await expect(page).toHaveURL(/\/overview\?month=2026-08$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^In August 2026, 2\.590\s€ came in and 4\.004\s€ went out: you spent 1\.414\s€ more than came in\.$/,
  )
  await expect(page.getByTestId('overview-in').getByTestId('money')).toHaveText(/^2\.590,26\s€$/)
  await expect(page.getByTestId('overview-out').getByTestId('money')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('overview-net').getByTestId('money')).toHaveText(/^-1\.413,63\s€$/)
  await expect(page.getByTestId('overview-rate').getByTestId('money')).toHaveText(/^-54,6\s%$/)
  await expect(page.getByTestId('overview-in').getByTestId('overview-verdict')).toHaveText(
    'About usual',
  )
  await expect(page.getByTestId('overview-in').getByTestId('overview-usual-text')).toHaveText(
    /^12,2\s% below your usual month \(2\.950,00\s€\)$/,
  )
  await expect(page.getByTestId('overview-out').getByTestId('overview-verdict')).toHaveText(
    'More than usual',
  )
  await expect(page.getByTestId('overview-out').getByTestId('overview-usual-text')).toHaveText(
    /^34,9\s% above your usual month \(2\.967,58\s€\)$/,
  )
  await expect(page.getByTestId('overview-caption')).toHaveText(
    "Your usual month is the middle value of the previous 12 months, worked out here from each month's totals.",
  )
  await expect(page.getByTestId('overview-uncategorized-line')).toHaveText(
    /^3\.036,33\s€ of this month's 4\.003,89\s€ spending has no category yet \(75,8\s%, 48 movements\)\.$/,
  )
  // The sentence comes before any figure.
  const sentenceTop = (await page.getByTestId('overview-sentence').boundingBox())?.y ?? 0
  const figuresTop = (await page.getByTestId('overview-figures').boundingBox())?.y ?? 0
  expect(sentenceTop).toBeLessThan(figuresTop)

  // (b) September: the data ends on the 11th, so the month is incomplete.
  await page.getByTestId('statement-next').click()

  await expect(page).toHaveURL(/\/overview\?month=2026-09$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^September 2026 is incomplete: your data ends on 11 Sept? 2026\. So far, 162\s€ came in and 967\s€ went out\.$/,
  )
  await expect(page.getByTestId('overview-rate').getByTestId('money')).toHaveText('—')
  await expect(page.getByTestId('overview-rate-note')).toHaveText(
    'Not shown: the month is incomplete.',
  )
  await expect(page.getByTestId('overview-caption')).toHaveText(
    'No comparison for an incomplete month.',
  )
  await expect(page.getByTestId('overview-verdict')).toHaveCount(0)

  // (c) A reload keeps the month; back returns to August.
  await page.reload()

  await expect(page).toHaveURL(/\/overview\?month=2026-09$/)
  await expect(page.getByTestId('overview-in').getByTestId('money')).toHaveText(/^161,82\s€$/)

  await page.goBack()

  await expect(page).toHaveURL(/\/overview\?month=2026-08$/)
  await expect(page.getByTestId('overview-out').getByTestId('money')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('overview-out').getByTestId('overview-verdict')).toHaveText(
    'More than usual',
  )

  // (d) The link opens the statement of the same month, and its figures are the same.
  await page.getByRole('link', { name: 'See the movements of August 2026' }).click()

  await expect(page).toHaveURL(/\/movements\?month=2026-08$/)
  await expect(page.getByTestId('statement-totals-in')).toHaveText(/^2\.590,26\s€$/)
  await expect(page.getByTestId('statement-totals-out')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('statement-totals-net')).toHaveText(/^-1\.413,63\s€$/)

  // (e) Nothing unforeseen left the browser, and the whole session only read.
  expect(overviewReads(watch).length).toBeGreaterThanOrEqual(15)
  expect(watch.aborted).toEqual([])
  expect([...new Set(watch.requests.map((request) => request.method()))]).toEqual(['GET'])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('a month after the last data says so, and shows no figures in the part of the month', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/overview?month=2026-10')

  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^No movements in October 2026\. Your data ends on 11 Sept? 2026\.$/,
  )
  await expect(page.getByTestId('overview-figures')).toHaveCount(0)
  await expect(page.getByTestId('overview-caption')).toHaveCount(0)
  await expect(page.getByTestId('overview-uncategorized')).toHaveCount(0)
  await expect(page.getByTestId('overview-statement-link')).toHaveCount(0)
  // The month and the date of the last data, the 24 months below and their sum.
  expect(overviewReads(watch)).toHaveLength(27)

  expect(watch.aborted).toEqual([])
  expect(watch.requests.every((request) => request.method() === 'GET')).toBe(true)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('reads the previous months below the month and moves on a click', async ({ page }) => {
  const watch = await prepare(page)
  const row = (month: string) =>
    page.locator(`[data-test="previous-months-row"][data-month="${month}"]`)
  const marked = page.locator('[data-test="previous-months-row"][aria-current="true"]')

  await page.goto('/overview?month=2026-08')

  // (a) What was saved first, in the sums of the backend, and the month it leaves out.
  const block = page.getByTestId('previous-months')
  await expect(block.getByRole('heading', { name: 'Month by month' })).toBeVisible()
  await expect(page.getByTestId('previous-months-sentence')).toHaveText(
    /^From October 2024 to August 2026, 60\.136\s€ came in and 80\.935\s€ went out: you spent 20\.799\s€ more than came in\.$/,
  )
  await expect(page.getByTestId('previous-months-left-out')).toHaveText(
    'September 2026 is left out: it is incomplete.',
  )

  // (b) 24 rows, from September 2026 down to October 2024.
  const rows = page.getByTestId('previous-months-row')
  await expect(rows).toHaveCount(24)
  await expect(rows.first()).toHaveAttribute('data-month', '2026-09')
  await expect(rows.last()).toHaveAttribute('data-month', '2024-10')

  // (c) August is the month shown above, and the only row marked.
  await expect(marked).toHaveCount(1)
  await expect(row('2026-08')).toHaveAttribute('aria-current', 'true')
  await expect(row('2026-08').getByTestId('previous-months-shown')).toHaveText('Shown above')
  await expect(row('2026-08').getByTestId('previous-months-in')).toHaveText(/^2\.590,26\s€$/)
  await expect(row('2026-08').getByTestId('previous-months-out')).toHaveText(/^4\.003,89\s€$/)
  await expect(row('2026-08').getByTestId('previous-months-net')).toHaveText(/^-1\.413,63\s€$/)
  await expect(row('2026-08').getByTestId('previous-months-net')).toHaveAttribute(
    'data-net',
    'negative',
  )
  // The same three figures the month shows above.
  await expect(page.getByTestId('overview-in').getByTestId('money')).toHaveText(/^2\.590,26\s€$/)
  await expect(page.getByTestId('overview-out').getByTestId('money')).toHaveText(/^4\.003,89\s€$/)
  await expect(page.getByTestId('overview-net').getByTestId('money')).toHaveText(/^-1\.413,63\s€$/)
  // The longest bar is the highest figure of the complete months: what went out in July 2025.
  await expect(
    row('2025-07').getByTestId('previous-months-bar-out').getByTestId('share-bar-fill'),
  ).toHaveAttribute('style', /width: 100%/)

  // (d) September is incomplete: its figures, no bars, and where the data ends.
  await expect(row('2026-09').getByTestId('previous-months-incomplete')).toHaveText('Incomplete')
  await expect(row('2026-09').getByTestId('previous-months-out')).toHaveText(/^966,84\s€$/)
  await expect(row('2026-09').getByTestId('share-bar-fill')).toHaveCount(0)
  await expect(row('2026-09').getByTestId('previous-months-data-ends')).toHaveText(
    /^Data ends on 11 Sept? 2026$/,
  )
  await expect(row('2026-09').getByTestId('previous-months-net')).not.toHaveAttribute('data-net')

  // (e) A month with no movements is empty, not a zero.
  await expect(page.getByTestId('previous-months-empty')).toHaveCount(5)
  await expect(row('2024-10').getByTestId('previous-months-empty')).toHaveText('No movements')
  await expect(row('2024-10').getByTestId('previous-months-in')).toHaveCount(0)
  await expect(row('2024-10').getByTestId('share-bar-fill')).toHaveCount(0)

  // (f) Pressing January puts it above, and the page goes up to the month nav.
  await row('2025-03').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('statement-nav')).not.toBeInViewport()

  await row('2026-01').getByTestId('previous-months-link').click()

  await expect(page).toHaveURL(/\/overview\?month=2026-01$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(
    /^In January 2026, 3\.114\s€ came in and 1\.893\s€ went out: you saved 1\.222\s€, 39,2\s% of what came in\.$/,
  )
  await expect(page.getByTestId('statement-nav')).toBeInViewport()
  await expect(row('2026-01')).toHaveAttribute('aria-current', 'true')
  await expect(marked).toHaveCount(1)
  await expect(rows).toHaveCount(24)

  // (g) Back returns to August.
  await page.goBack()

  await expect(page).toHaveURL(/\/overview\?month=2026-08$/)
  await expect(page.getByTestId('overview-sentence')).toHaveText(/^In August 2026, /)
  await expect(row('2026-08')).toHaveAttribute('aria-current', 'true')
  await expect(marked).toHaveCount(1)

  // (h) One request for the whole period, nothing unforeseen, and the session only read.
  const periods = overviewReads(watch).filter(
    (url) => url.searchParams.get('to')?.slice(0, 7) !== url.searchParams.get('from')?.slice(0, 7),
  )
  expect(periods.map((url) => url.search)).toEqual(['?from=2024-10-01&to=2026-08-31&pageSize=1'])
  expect(watch.aborted).toEqual([])
  expect([...new Set(watch.requests.map((request) => request.method()))]).toEqual(['GET'])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})
