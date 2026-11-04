import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

// What was spent by category (feature 37) in a real browser: reached from the menu, a
// month, a category opened, a year with its monthly average, and the old address of
// Monthly cost (feature 32, removed by feature 37).
//
// There is no backend: every /api call is answered with page.route. The first route
// aborts ANY /api call (later routes win) and writes it down in a list that each test
// checks to be empty at the end. The dev server proxies /api to a real backend on :3000,
// so without that first route an unforeseen call would really be sent.
//
// «Today» is fixed with page.clock, so the month the screen opens on does not depend on
// the day the suite runs. Invented data with the contract's shape: the descriptions are
// made up; the category names are the contract's.

type Raw = Record<string, unknown>

const movement = (id: number, bookingDate: string, amount: string, description: string): Raw => ({
  id,
  bookingDate,
  description,
  amount,
  accountId: 1,
})

const VIVIENDA = { id: 3, name: 'Vivienda', parentId: null, isFixed: true }
const COMBUSTIBLE = { id: 21, name: 'Combustible', parentId: 4, isFixed: false }
const RESTAURANTES = { id: 9, name: 'Restaurantes', parentId: null, isFixed: false }

const pad = (n: number): string => String(n).padStart(2, '0')
const lastDay = (month: string): string => {
  const [year, mm] = month.split('-').map(Number)
  return pad(new Date(Date.UTC(year ?? 0, mm ?? 1, 0)).getUTCDate())
}
const previousMonth = (month: string): string => {
  const [year, mm] = month.split('-').map(Number)
  return mm === 1 ? `${(year ?? 0) - 1}-12` : `${year}-${pad((mm ?? 1) - 1)}`
}

/**
 * The contract's example of a month, moved to `month`: one fixed line, three variable
 * ones (the one with no category is new, `Restaurantes` is gone). It adds up:
 * 612.37 + (87.46 + 14.37 + 0.00) = 714.20.
 */
function monthAnswer(month: string): Raw {
  const compared = previousMonth(month)
  return {
    period: { month, year: null, from: `${month}-01`, to: `${month}-${lastDay(month)}`, months: 1 },
    compared: { from: `${compared}-01`, to: `${compared}-${lastDay(compared)}`, months: 1 },
    compare: 'previous-month',
    amount: '714.20',
    comparedAmount: '688.34',
    difference: '25.86',
    fixed: {
      amount: '612.37',
      comparedAmount: '612.37',
      difference: '0.00',
      lines: [
        {
          category: VIVIENDA,
          amount: '612.37',
          comparedAmount: '612.37',
          difference: '0.00',
          change: null,
          monthlyAmount: null,
          movements: [movement(1802, `${month}-01`, '612.37', 'RECIBO /ALQUILER FICTICIO')],
        },
      ],
    },
    variable: {
      amount: '101.83',
      comparedAmount: '75.97',
      difference: '25.86',
      lines: [
        {
          category: COMBUSTIBLE,
          amount: '87.46',
          comparedAmount: '52.16',
          difference: '35.30',
          change: null,
          monthlyAmount: null,
          movements: [
            movement(1847, `${month}-24`, '39.63', 'ESTACION SERVICIO INVENTADA'),
            movement(1771, `${month}-12`, '47.83', 'ESTACION SERVICIO INVENTADA'),
          ],
        },
        {
          category: null,
          amount: '14.37',
          comparedAmount: '0.00',
          difference: '14.37',
          change: 'new',
          monthlyAmount: null,
          movements: [movement(1819, `${month}-08`, '14.37', 'COMPRA SIN CATEGORIA INVENTADA')],
        },
        {
          category: RESTAURANTES,
          amount: '0.00',
          comparedAmount: '23.81',
          difference: '-23.81',
          change: 'gone',
          monthlyAmount: null,
          movements: [],
        },
      ],
    },
  }
}

/** One charge a month of the same amount, newest first. */
const everyMonth = (lastId: number, day: string, amount: string, description: string): Raw[] =>
  Array.from({ length: 12 }, (_, i) =>
    movement(lastId - i, `2025-${pad(12 - i)}-${day}`, amount, description),
  )

/** 2025, a closed year: 7348.44 + (1471.20 + 44.50 + 0.00) = 8864.14, against 8788.12. */
const YEAR_2025: Raw = {
  period: { month: null, year: '2025', from: '2025-01-01', to: '2025-12-31', months: 12 },
  compared: { from: '2024-01-01', to: '2024-12-31', months: 12 },
  compare: 'previous-year',
  amount: '8864.14',
  comparedAmount: '8788.12',
  difference: '76.02',
  fixed: {
    amount: '7348.44',
    comparedAmount: '7200.00',
    difference: '148.44',
    lines: [
      {
        category: VIVIENDA,
        amount: '7348.44',
        comparedAmount: '7200.00',
        difference: '148.44',
        change: null,
        monthlyAmount: '612.37',
        movements: everyMonth(1290, '01', '612.37', 'RECIBO /ALQUILER FICTICIO'),
      },
    ],
  },
  variable: {
    amount: '1515.70',
    comparedAmount: '1588.12',
    difference: '-72.42',
    lines: [
      {
        category: COMBUSTIBLE,
        amount: '1471.20',
        comparedAmount: '1302.40',
        difference: '168.80',
        change: null,
        monthlyAmount: '122.60',
        movements: everyMonth(1250, '14', '122.60', 'ESTACION SERVICIO INVENTADA'),
      },
      {
        category: null,
        amount: '44.50',
        comparedAmount: '0.00',
        difference: '44.50',
        change: 'new',
        monthlyAmount: '3.71',
        movements: [
          movement(1233, '2025-11-21', '9.98', 'COMPRA SIN CATEGORIA INVENTADA'),
          movement(1187, '2025-07-03', '20.15', 'PAGO TARJETA SIN CATEGORIA FICTICIO'),
          movement(1102, '2025-02-17', '14.37', 'COMPRA SIN CATEGORIA INVENTADA'),
        ],
      },
      {
        category: RESTAURANTES,
        amount: '0.00',
        comparedAmount: '285.72',
        difference: '-285.72',
        change: 'gone',
        monthlyAmount: '0.00',
        movements: [],
      },
    ],
  },
}

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

interface Watch {
  /** Every /api call no route of this file foresaw: it was aborted, and it fails the test. */
  aborted: string[]
  /** The querystring of every read of the screen, in order. */
  reads: string[]
  /** Every request to /api that was not a GET. */
  writes: string[]
  consoleErrors: string[]
  pageErrors: Error[]
}

async function prepare(page: Page, today: Date): Promise<Watch> {
  const watch: Watch = { aborted: [], reads: [], writes: [], consoleErrors: [], pageErrors: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/api/') && request.method() !== 'GET') {
      watch.writes.push(`${request.method()} ${path}`)
    }
  })
  const stop = (route: Route): Promise<void> => {
    const request = route.request()
    const url = new URL(request.url())
    watch.aborted.push(`${request.method()} ${url.pathname}${url.search}`)
    return route.abort()
  }

  await page.clock.setFixedTime(today)

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)

  // What the menu, the top bar and the home ask for on the way in.
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: NET_WORTH_SAMPLE }) : stop(route),
  )
  // The number next to Review and the one next to Transfers (feature 35): nothing.
  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.pathname !== '/api/movements') return stop(route)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 50)
    return route.fulfill({
      json: {
        movements: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
        totals: { income: '0.00', expense: '0.00', net: '0.00' },
      },
    })
  })

  // The screen: a month against the previous one, or 2025. Anything else is unforeseen.
  await page.route('**/api/expenses-by-category*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.pathname !== '/api/expenses-by-category') {
      return stop(route)
    }
    const month = url.searchParams.get('month')
    const year = url.searchParams.get('year')
    const compare = url.searchParams.get('compare')
    if (month !== null && year === null && compare === 'previous-month') {
      watch.reads.push(url.search)
      return route.fulfill({ json: monthAnswer(month) })
    }
    if (year === '2025' && month === null && compare === null) {
      watch.reads.push(url.search)
      return route.fulfill({ json: YEAR_2025 })
    }
    return stop(route)
  })

  return watch
}

function expectNothingUnforeseen(watch: Watch): void {
  expect(watch.aborted).toEqual([])
  // The screen only reads.
  expect(watch.writes).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
}

test.use({ testIdAttribute: 'data-test' })

const money = (figure: string): RegExp => new RegExp(`^${figure.replace('.', '\\.')}\\s€$`)

/** Opens the screen the way the human does: from the menu, starting on the home. */
async function openFromMenu(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page).toHaveURL(/\/net-worth$/)
  const entries = page.locator('nav a')
  await expect(entries.nth(5)).toHaveText('Overview')
  await expect(entries.nth(6)).toHaveText('Expenses by category')
  await entries.nth(6).click()
  await expect(page).toHaveURL(/\/expenses-by-category$/)
  await expect(page.getByTestId('expenses-sentence')).toBeVisible()
}

test('reaches Expenses by category from the menu, sees the month and opens a category', async ({
  page,
}) => {
  const watch = await prepare(page, new Date('2026-09-20T12:00:00'))

  await openFromMenu(page)

  // (a) The screen, its entry marked in the menu, and one read of the current month.
  await expect(page.getByTestId('topbar-title')).toHaveText('Expenses by category')
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText('Expenses by category')
  expect(watch.reads).toEqual(['?month=2026-09&compare=previous-month'])

  // (b) The sentence, then the total with the previous month.
  await expect(page.getByTestId('expenses-sentence')).toHaveText(
    /^So far in September 2026 you spent 714,20\s€, 25,86\s€ more than in the whole of August 2026\.$/,
  )
  await expect(page.getByTestId('expenses-total').getByTestId('money')).toHaveText(money('714,20'))
  await expect(page.getByTestId('expenses-compared')).toHaveText(
    /^August 2026: 688,34\s€ · \+25,86\s€$/,
  )

  // (c) Fixed, then Variable, each with its lines in the order they came.
  await expect(page.getByTestId('group-title')).toHaveText(['Fixed', 'Variable'])
  await expect(page.getByTestId('group-fixed').getByTestId('line-name')).toHaveText(['Vivienda'])
  const variable = page.getByTestId('group-variable')
  await expect(variable.getByTestId('group-amount')).toHaveText(money('101,83'))
  await expect(variable.getByTestId('line-name')).toHaveText([
    'Combustible',
    'No category',
    'Restaurantes',
  ])
  // No `A month` column in a month.
  await expect(page.getByTestId('line-monthly')).toHaveCount(0)

  // (d) A category opens below its line with its movements of the month.
  const fuel = variable.getByTestId('category-line').filter({ hasText: 'Combustible' })
  await expect(fuel.getByTestId('line-movement')).toHaveCount(0)
  await fuel.getByRole('button', { name: 'Show movements' }).click()
  await expect(fuel.getByTestId('line-movement-date')).toHaveText(['24 Sept 2026', '12 Sept 2026'])
  await expect(fuel.getByTestId('line-movement-description')).toHaveText([
    'ESTACION SERVICIO INVENTADA',
    'ESTACION SERVICIO INVENTADA',
  ])
  await expect(fuel.getByTestId('line-movement-amount')).toHaveText([
    money('39,63'),
    money('47,83'),
  ])
  await expect(fuel.getByRole('button', { name: 'Hide movements' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  // The gone category has nothing to open.
  const gone = variable.getByTestId('category-line').filter({ hasText: 'Restaurantes' })
  await expect(gone.getByTestId('line-badge')).toHaveText('Gone')
  await expect(gone.getByTestId('line-toggle')).toHaveCount(0)

  // Opening asked nothing: still one read.
  expect(watch.reads).toEqual(['?month=2026-09&compare=previous-month'])
  expectNothingUnforeseen(watch)
})

test('switches to a year and sees the monthly average of each category', async ({ page }) => {
  // January: one step back is December 2025, so the year asked is a closed one.
  const watch = await prepare(page, new Date('2026-01-20T12:00:00'))

  await openFromMenu(page)
  await page.getByTestId('statement-prev').click()
  await expect(page).toHaveURL(/\?month=2025-12&compare=previous-month$/)
  await expect(page.getByTestId('statement-month-label')).toHaveText('December 2025')

  await page.getByTestId('period-mode-year').click()

  await expect(page).toHaveURL(/\/expenses-by-category\?year=2025$/)
  await expect(page.getByTestId('period-year-label')).toHaveText('2025')
  await expect(page.getByTestId('period-compare')).toHaveCount(0)
  await expect(page.getByTestId('expenses-sentence')).toHaveText(
    /^In 2025 you spent 8\.864,14\s€, 76,02\s€ more than in 2024\.$/,
  )
  await expect(page.getByTestId('expenses-total').getByTestId('money')).toHaveText(
    money('8.864,14'),
  )
  // Every line carries its monthly average, under an `A month` column.
  await expect(page.getByTestId('group-columns').first()).toContainText('A month')
  await expect(page.getByTestId('line-name')).toHaveText([
    'Vivienda',
    'Combustible',
    'No category',
    'Restaurantes',
  ])
  await expect(page.getByTestId('line-monthly')).toHaveText([
    money('612,37'),
    money('122,60'),
    money('3,71'),
    money('0,00'),
  ])

  expect(watch.reads).toEqual([
    '?month=2026-01&compare=previous-month',
    '?month=2025-12&compare=previous-month',
    '?year=2025',
  ])
  expectNothingUnforeseen(watch)
})

test('the old Monthly cost address opens the net worth', async ({ page }) => {
  const watch = await prepare(page, new Date('2026-09-20T12:00:00'))

  await page.goto('/monthly-cost')

  await expect(page).toHaveURL(/\/net-worth$/)
  await expect(page.getByTestId('topbar-title')).toHaveText('Net Worth')
  await expect(page.locator('nav a').first()).toHaveText('Net Worth')
  await expect(page.locator('nav a', { hasText: 'Monthly cost' })).toHaveCount(0)
  await expect(page.locator('nav a', { hasText: 'Expenses by category' })).toHaveCount(1)
  // The screen of spending was not read.
  expect(watch.reads).toEqual([])
  expectNothingUnforeseen(watch)
})
