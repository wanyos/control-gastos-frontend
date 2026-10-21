import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

// The table of your own accounts (feature 36) in a real browser: reached from the menu,
// adding a row, changing one, closing one, and changing the forms of your name.
//
// There is no backend: every /api call is answered with page.route. The first route
// aborts ANY /api call (later routes win) and writes it down in a list that each test
// checks to be empty at the end. The dev server proxies /api to a real backend on :3000,
// so without that first route the POST, PATCH and PUT of this file would really be sent.
//
// Invented data: account numbers are all zeros (none passes the IBAN check), names and
// texts are made up. The banks are real names: the screen shows banks.

type Raw = Record<string, unknown>

interface Row {
  id: number
  name: string
  bank: string
  accountNumber: string | null
  type: string
  openedAt: string | null
  closedAt: string | null
  texts: string[]
}

const number = (last: number): string => `ES00 0000 0000 0000 0000 ${String(last).padStart(4, '0')}`

/**
 * Twelve rows in the order of the contract (`bank`, `name`, `id`): the six types, three
 * with no texts, two with no number and one closed.
 */
const TWELVE: Row[] = [
  {
    id: 3,
    name: 'Cuenta inventada uno',
    bank: 'Bankinter',
    accountNumber: number(1),
    type: 'checking',
    openedAt: '2019-04-02',
    closedAt: null,
    texts: ['Cuenta Inventada Uno'],
  },
  {
    id: 7,
    name: 'Hucha inventada',
    bank: 'Bankinter',
    accountNumber: null,
    type: 'savings',
    openedAt: null,
    closedAt: null,
    texts: ['Hucha inventada', 'Bankinter'],
  },
  {
    id: 12,
    name: 'Monedero inventado',
    bank: 'Criptan',
    accountNumber: null,
    type: 'crypto',
    openedAt: '2026-10-01',
    closedAt: null,
    texts: [],
  },
  {
    id: 5,
    name: 'Cuenta inventada dos',
    bank: 'ING',
    accountNumber: number(2),
    type: 'checking',
    openedAt: '2015-03-14',
    closedAt: '2024-06-30',
    texts: ['Cuenta Inventada Dos'],
  },
  {
    id: 9,
    name: 'Naranja inventada',
    bank: 'ING',
    accountNumber: number(3),
    type: 'savings',
    openedAt: null,
    closedAt: null,
    texts: [],
  },
  {
    id: 2,
    name: 'Cartera indexada inventada',
    bank: 'MyInvestor',
    accountNumber: number(4),
    type: 'investment',
    openedAt: '2024-03-11',
    closedAt: null,
    texts: ['Cartera Indexada Inventada', 'MyInvestor'],
  },
  {
    id: 10,
    name: 'Deposito inventado',
    bank: 'MyInvestor',
    accountNumber: number(5),
    type: 'deposit',
    openedAt: '2025-01-15',
    closedAt: null,
    texts: ['Deposito Inventado 12M'],
  },
  {
    id: 6,
    name: 'Cuenta inventada tres',
    bank: 'N26',
    accountNumber: number(6),
    type: 'checking',
    openedAt: '2021-07-19',
    closedAt: null,
    texts: ['N26 Inventada'],
  },
  {
    id: 8,
    name: 'Cuenta inventada cuatro',
    bank: 'Openbank',
    accountNumber: number(7),
    type: 'checking',
    openedAt: '2018-02-27',
    closedAt: null,
    texts: [],
  },
  {
    id: 11,
    name: 'Bolsillo inventado',
    bank: 'Revolut',
    accountNumber: number(8),
    type: 'other',
    openedAt: '2022-11-03',
    closedAt: null,
    texts: ['Bolsillo Inventado'],
  },
  {
    id: 1,
    name: 'Cartera inventada',
    bank: 'Trade Republic',
    accountNumber: number(9),
    type: 'investment',
    openedAt: '2023-05-08',
    closedAt: null,
    texts: ['Cartera Inventada', 'Trade Republic'],
  },
  {
    id: 4,
    name: 'Remunerada inventada',
    bank: 'Trade Republic',
    accountNumber: number(10),
    type: 'savings',
    openedAt: '2023-05-08',
    closedAt: null,
    texts: ['Remunerada Inventada'],
  },
]

/** What each row shows, cell by cell, written by hand: `—` and `No texts` where empty. */
const PAINTED: Record<number, string[]> = {
  3: ['Cuenta inventada uno', 'Bankinter', number(1), 'Checking account', '2 Apr 2019', '—'],
  7: ['Hucha inventada', 'Bankinter', '—', 'Savings account', '—', '—'],
  12: ['Monedero inventado', 'Criptan', '—', 'Crypto', '1 Oct 2026', '—'],
  5: ['Cuenta inventada dos', 'ING', number(2), 'Checking account', '14 Mar 2015', '30 Jun 2024'],
  9: ['Naranja inventada', 'ING', number(3), 'Savings account', '—', '—'],
  2: ['Cartera indexada inventada', 'MyInvestor', number(4), 'Investment', '11 Mar 2024', '—'],
  10: ['Deposito inventado', 'MyInvestor', number(5), 'Deposit', '15 Jan 2025', '—'],
  6: ['Cuenta inventada tres', 'N26', number(6), 'Checking account', '19 Jul 2021', '—'],
  8: ['Cuenta inventada cuatro', 'Openbank', number(7), 'Checking account', '27 Feb 2018', '—'],
  11: ['Bolsillo inventado', 'Revolut', number(8), 'Other', '3 Nov 2022', '—'],
  1: ['Cartera inventada', 'Trade Republic', number(9), 'Investment', '8 May 2023', '—'],
  4: ['Remunerada inventada', 'Trade Republic', number(10), 'Savings account', '8 May 2023', '—'],
}

const STAMP = '2026-10-20T09:15:02.000Z'
const asContract = (row: Row): Raw => ({ ...row, createdAt: STAMP, updatedAt: STAMP })

const VALIDATION_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'El texto debe tener al menos 3 caracteres tras normalizar',
}

interface Write {
  method: string
  path: string
  body: unknown
}

interface Watch {
  /** Every /api call no route of this file foresaw: it was aborted, and it fails the test. */
  aborted: string[]
  /** Every request to /api that was not a GET, with its body read as JSON. */
  writes: Write[]
  /** How many times the table was read. */
  tableReads: number
  consoleErrors: string[]
  pageErrors: Error[]
}

interface Options {
  /** The next PATCH of a row is answered 400, and nothing is written. */
  rejectNextPatch?: boolean
}

const byContractOrder = (a: Row, b: Row): number =>
  a.bank.localeCompare(b.bank) || a.name.localeCompare(b.name) || a.id - b.id

/**
 * A fake with state: a POST adds the row, a PATCH changes only what travels, a PUT
 * replaces the forms of the name. What the screen shows after a write can only come from
 * reading again.
 */
async function prepare(page: Page, options: Options = {}): Promise<Watch> {
  const watch: Watch = {
    aborted: [],
    writes: [],
    tableReads: 0,
    consoleErrors: [],
    pageErrors: [],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (!path.startsWith('/api/') || request.method() === 'GET') return
    const data = request.postData()
    watch.writes.push({
      method: request.method(),
      path,
      body: data === null ? undefined : JSON.parse(data),
    })
  })
  const stop = (route: Route): Promise<void> => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

  const rows: Row[] = TWELVE.map((row) => ({ ...row, texts: [...row.texts] }))
  let names = ['Inventado Titular', 'Titular Inventado']
  let rejectNextPatch = options.rejectNextPatch ?? false

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)

  // What the menu, the top bar and the Transfers screen ask for on the way in.
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/transfers', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: { pairs: [] } }) : stop(route),
  )
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } })
      : stop(route),
  )
  // The number next to Review and, since feature 35, the one next to Transfers: nothing.
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

  // The table: GET reads it, POST adds a row.
  await page.route('**/api/own-accounts', (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      watch.tableReads += 1
      return route.fulfill({ json: { ownAccounts: rows.map(asContract) } })
    }
    if (request.method() !== 'POST') return stop(route)
    const body = JSON.parse(request.postData() ?? '{}') as Partial<Row>
    const row: Row = {
      id: Math.max(...rows.map((one) => one.id)) + 1,
      name: String(body.name),
      bank: String(body.bank),
      accountNumber: body.accountNumber ?? null,
      type: String(body.type),
      openedAt: body.openedAt ?? null,
      closedAt: body.closedAt ?? null,
      texts: body.texts ?? [],
    }
    rows.push(row)
    rows.sort(byContractOrder)
    return route.fulfill({ status: 201, json: asContract(row) })
  })

  // One row: PATCH changes only what travels.
  await page.route('**/api/own-accounts/*', (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return stop(route)
    const id = Number(new URL(request.url()).pathname.split('/').at(-1))
    const row = rows.find((one) => one.id === id)
    if (!row) return stop(route)
    if (rejectNextPatch) {
      rejectNextPatch = false
      return route.fulfill({ status: 400, json: VALIDATION_BODY })
    }
    Object.assign(row, JSON.parse(request.postData() ?? '{}'))
    rows.sort(byContractOrder)
    return route.fulfill({ json: asContract(row) })
  })

  // The forms of your name. Registered last, so it wins over the one-row route above.
  await page.route('**/api/own-accounts/holder-names', (route) => {
    const request = route.request()
    if (request.method() === 'GET') return route.fulfill({ json: { names } })
    if (request.method() !== 'PUT') return stop(route)
    const body = JSON.parse(request.postData() ?? '{}') as { names: string[] }
    // The contract answers the saved list in alphabetical order.
    names = [...body.names].sort((a, b) => a.localeCompare(b))
    return route.fulfill({ json: { names } })
  })

  return watch
}

/**
 * `rejected`: the browser itself logs the 400 that a test asked for on purpose
 * ("Failed to load resource"); only that line is let through.
 */
function expectNothingUnforeseen(watch: Watch, rejected = false): void {
  expect(watch.aborted).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(
    rejected
      ? watch.consoleErrors.filter((text) => !text.includes('Failed to load resource'))
      : watch.consoleErrors,
  ).toEqual([])
}

test.use({ testIdAttribute: 'data-test' })

const rowIds = (page: Page) =>
  page
    .getByTestId('own-account-row')
    .evaluateAll((rows) => rows.map((row) => Number(row.getAttribute('data-own-account-id'))))

const rowOf = (page: Page, id: number) => page.locator(`[data-own-account-id="${id}"]`)

const field = (page: Page, testId: string) => page.getByTestId(testId).locator('input')

/** Opens the screen the way the human does: from the menu, starting on another screen. */
async function openFromMenu(page: Page): Promise<void> {
  await page.goto('/transfers')
  const entries = page.locator('nav a')
  await expect(entries.nth(3)).toHaveText('Transfers')
  await expect(entries.nth(4)).toHaveText('My accounts')
  await entries.nth(4).click()
  await expect(page).toHaveURL(/\/own-accounts$/)
  await expect(page.getByTestId('own-account-row')).toHaveCount(12)
}

test('reaches My accounts from the menu and sees every row with its data', async ({ page }) => {
  const watch = await prepare(page)

  await openFromMenu(page)

  await expect(page.getByTestId('topbar-title')).toHaveText('My accounts')
  await expect(page.getByTestId('own-accounts-view').locator('h1')).toHaveText('My accounts')
  await expect(page.getByTestId('own-accounts-intro')).toContainText('Your accounts and products')
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText('My accounts')
  expect(await rowIds(page)).toEqual(TWELVE.map((row) => row.id))
  for (const row of TWELVE) {
    const painted = rowOf(page, row.id)
    const [name, bank, accountNumber, type, opened, closed] = PAINTED[row.id] ?? []
    await expect(painted.getByTestId('cell-name')).toHaveText(name ?? '')
    await expect(painted.getByTestId('cell-bank')).toHaveText(bank ?? '')
    await expect(painted.getByTestId('cell-number')).toHaveText(accountNumber ?? '')
    await expect(painted.getByTestId('cell-type')).toHaveText(type ?? '')
    await expect(painted.getByTestId('cell-opened')).toHaveText(opened ?? '')
    await expect(painted.getByTestId('cell-closed')).toHaveText(closed ?? '')
    if (row.texts.length === 0) {
      await expect(painted.getByTestId('own-account-no-texts')).toHaveText('No texts')
      await expect(painted.getByTestId('own-account-text')).toHaveCount(0)
    } else {
      await expect(painted.getByTestId('own-account-text')).toHaveText(row.texts)
    }
  }
  await expect(page.getByTestId('holder-name')).toHaveText([
    'Inventado Titular',
    'Titular Inventado',
  ])
  // Only reading: nothing was written.
  expect(watch.writes).toEqual([])
  expectNothingUnforeseen(watch)
})

test('adding an account sends it and the new row appears', async ({ page }) => {
  const watch = await prepare(page)
  await openFromMenu(page)

  await page.getByTestId('own-accounts-add').click()
  const dialog = page.getByTestId('account-dialog')
  await expect(dialog).toBeVisible()
  await field(page, 'account-name').fill('Monedero inventado dos')
  await field(page, 'account-bank').fill('Criptan')
  await page.getByTestId('account-type').locator('select').selectOption('crypto')
  await field(page, 'account-opened').fill('2026-10-21')
  await dialog.getByTestId('text-list-add').click()
  await dialog.getByTestId('text-list-field').locator('input').fill('Monedero Inventado Dos')
  await page.getByTestId('account-save').click()

  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('own-account-row')).toHaveCount(13)
  // Only the filled fields travel: no number, no closing date.
  expect(watch.writes).toEqual([
    {
      method: 'POST',
      path: '/api/own-accounts',
      body: {
        name: 'Monedero inventado dos',
        bank: 'Criptan',
        type: 'crypto',
        openedAt: '2026-10-21',
        texts: ['Monedero Inventado Dos'],
      },
    },
  ])
  // The new row came from reading the table again, in the place the backend put it.
  const added = rowOf(page, 13)
  await expect(added.getByTestId('cell-name')).toHaveText('Monedero inventado dos')
  await expect(added.getByTestId('cell-bank')).toHaveText('Criptan')
  await expect(added.getByTestId('cell-number')).toHaveText('—')
  await expect(added.getByTestId('cell-type')).toHaveText('Crypto')
  await expect(added.getByTestId('cell-opened')).toHaveText('21 Oct 2026')
  await expect(added.getByTestId('own-account-text')).toHaveText(['Monedero Inventado Dos'])
  expect((await rowIds(page)).indexOf(13)).toBe(3)
  expect(watch.tableReads).toBe(2)
  expectNothingUnforeseen(watch)
})

test('editing the texts of a row sends the whole list and the row shows them', async ({ page }) => {
  const watch = await prepare(page)
  await openFromMenu(page)

  await rowOf(page, 7).getByTestId('own-account-edit').click()
  const dialog = page.getByTestId('account-dialog')
  await expect(dialog).toBeVisible()
  const texts = dialog.getByTestId('text-list-field').locator('input')
  await expect(texts).toHaveCount(2)
  await expect(texts.nth(0)).toHaveValue('Hucha inventada')
  await expect(texts.nth(1)).toHaveValue('Bankinter')
  // Change the second text and add a third one.
  await texts.nth(1).fill('Hucha Inventada Ahorro')
  await dialog.getByTestId('text-list-add').click()
  await texts.nth(2).fill('Traspaso Hucha Inventada')
  await page.getByTestId('account-save').click()

  await expect(dialog).toBeHidden()
  // Only the texts travel, and the list goes whole.
  expect(watch.writes).toEqual([
    {
      method: 'PATCH',
      path: '/api/own-accounts/7',
      body: { texts: ['Hucha inventada', 'Hucha Inventada Ahorro', 'Traspaso Hucha Inventada'] },
    },
  ])
  await expect(rowOf(page, 7).getByTestId('own-account-text')).toHaveText([
    'Hucha inventada',
    'Hucha Inventada Ahorro',
    'Traspaso Hucha Inventada',
  ])
  expect(watch.tableReads).toBe(2)
  expectNothingUnforeseen(watch)
})

test('closing an account sends its closing date and the row shows it', async ({ page }) => {
  const watch = await prepare(page)
  await openFromMenu(page)

  await expect(rowOf(page, 3).getByTestId('cell-closed')).toHaveText('—')
  await rowOf(page, 3).getByTestId('own-account-edit').click()
  const dialog = page.getByTestId('account-dialog')
  await expect(dialog).toBeVisible()
  await field(page, 'account-closed').fill('2026-10-21')
  await page.getByTestId('account-save').click()

  await expect(dialog).toBeHidden()
  expect(watch.writes).toEqual([
    { method: 'PATCH', path: '/api/own-accounts/3', body: { closedAt: '2026-10-21' } },
  ])
  await expect(rowOf(page, 3).getByTestId('cell-closed')).toHaveText('21 Oct 2026')
  // The rest of the row is as it was.
  await expect(rowOf(page, 3).getByTestId('cell-opened')).toHaveText('2 Apr 2019')
  await expect(rowOf(page, 3).getByTestId('own-account-text')).toHaveText(['Cuenta Inventada Uno'])
  expectNothingUnforeseen(watch)
})

test('changing the forms of your name sends them and shows the saved list', async ({ page }) => {
  const watch = await prepare(page)
  await openFromMenu(page)

  await expect(page.getByTestId('holder-name')).toHaveText([
    'Inventado Titular',
    'Titular Inventado',
  ])
  await page.getByTestId('holder-names-edit').click()
  const dialog = page.getByTestId('names-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('text-list-add').click()
  await dialog.getByTestId('text-list-field').locator('input').nth(2).fill('Inventado T')
  await page.getByTestId('names-save').click()

  await expect(dialog).toBeHidden()
  // The whole list travels, as typed.
  expect(watch.writes).toEqual([
    {
      method: 'PUT',
      path: '/api/own-accounts/holder-names',
      body: { names: ['Inventado Titular', 'Titular Inventado', 'Inventado T'] },
    },
  ])
  // The block shows what came back, in the backend's order, not in the typed one.
  await expect(page.getByTestId('holder-name')).toHaveText([
    'Inventado T',
    'Inventado Titular',
    'Titular Inventado',
  ])
  // The table was not touched.
  await expect(page.getByTestId('own-account-row')).toHaveCount(12)
  expectNothingUnforeseen(watch)
})

test('a rejected save says so and the table stays as it was', async ({ page }) => {
  const watch = await prepare(page, { rejectNextPatch: true })
  await openFromMenu(page)

  await rowOf(page, 6).getByTestId('own-account-edit').click()
  const dialog = page.getByTestId('account-dialog')
  await expect(dialog).toBeVisible()
  await field(page, 'account-name').fill('Cuenta inventada tres bis')
  await page.getByTestId('account-save').click()

  // The window stays open with what was typed and a sentence of ours.
  await expect(page.getByTestId('account-error')).toHaveText(
    "Nothing was saved: the server didn't accept one of the fields.",
  )
  await expect(dialog).toBeVisible()
  await expect(field(page, 'account-name')).toHaveValue('Cuenta inventada tres bis')
  await expect(page.getByText(VALIDATION_BODY.message)).toHaveCount(0)
  expect(watch.writes).toEqual([
    { method: 'PATCH', path: '/api/own-accounts/6', body: { name: 'Cuenta inventada tres bis' } },
  ])

  await page.getByTestId('account-cancel').click()
  await expect(dialog).toBeHidden()
  // A 400 wrote nothing: the table is the same twelve rows, and it was not read again.
  expect(await rowIds(page)).toEqual(TWELVE.map((row) => row.id))
  await expect(rowOf(page, 6).getByTestId('cell-name')).toHaveText('Cuenta inventada tres')
  expect(watch.tableReads).toBe(1)
  expectNothingUnforeseen(watch, true)
})
