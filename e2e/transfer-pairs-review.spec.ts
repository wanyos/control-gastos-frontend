import { test, expect } from '@playwright/test'
import type { Page, Request, Route } from '@playwright/test'

// The transfers screen (feature 24) in a real browser, without a backend: every /api
// call is answered with page.route. This suite LINKS and UNLINKS, and the dev server
// proxies /api to a real backend on :3000, so the safety net matters: it aborts
// anything not foreseen, and no POST or DELETE of this suite ever touches a real pair.

type Raw = Record<string, unknown>

const account = (id: number, bank: string, tail: string) => ({
  id,
  iban: `ES000000000000000000${tail}`,
  bank,
  alias: `${bank} ···${tail}`,
  type: 'checking',
})

const BANKINTER = account(19532, 'bankinter', '2314')
const N26 = account(14788, 'n26', '4136')
const OPENBANK = account(16563, 'openbank', '4073')

const leg = (
  id: number,
  type: 'expense' | 'income',
  owner: typeof BANKINTER,
  bookingDate: string,
  amount: string,
  description: string,
  transferId: string | null,
): Raw => ({
  id,
  type,
  bookingDate,
  valueDate: bookingDate,
  amount,
  description,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: owner.id,
  account: owner,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  excludedFromTotals: false,
  transferId,
  daySequence: 1,
  createdAt: '2026-09-11T19:23:40.908Z',
  updatedAt: '2026-09-11T19:23:50.206Z',
})

interface Pair {
  transferId: string
  movements: [Raw, Raw]
}

const good = (transferId: string, out: number, into: number, day: string): Pair => ({
  transferId,
  movements: [
    leg(out, 'expense', BANKINTER, day, '1000.00', 'TRANS INM/ N26', transferId),
    leg(into, 'income', N26, day, '1000.00', 'JUAN JOSE ROMERO RAMOS - INGRESO', transferId),
  ],
})

/** A fine paid from one account and paid back by somebody else's Bizum to another. */
const FINE: Pair = {
  transferId: 'fine-100',
  movements: [
    leg(33339, 'expense', N26, '2025-06-30', '100.00', 'AYTO MADRID PAGO INTER', 'fine-100'),
    leg(
      24377,
      'income',
      OPENBANK,
      '2025-06-27',
      '100.00',
      'BIZUM DE <persona> CONCEPTO multa',
      'fine-100',
    ),
  ],
}

const fourPairs = (): Pair[] => [
  good('good-1', 42369, 42519, '2026-09-09'),
  good('good-2', 42377, 42526, '2026-08-25'),
  FINE,
  good('good-3', 42383, 21906, '2026-08-06'),
]

interface Doubtful extends Raw {
  id: number
  accountId: number
  type: 'expense' | 'income'
}

const doubtful = (
  id: number,
  type: 'expense' | 'income',
  owner: typeof BANKINTER,
  bookingDate: string,
  description: string,
): Doubtful => ({
  id,
  accountId: owner.id,
  accountAlias: owner.alias,
  type,
  bookingDate,
  description,
})

/** Fabricated: one money out and two candidates for the money in. */
const groupOfThree = () => ({
  amount: '500.00',
  movements: [
    doubtful(812, 'expense', BANKINTER, '2026-08-01', 'TRANSFERENCIA'),
    doubtful(840, 'income', OPENBANK, '2026-08-01', 'TRANSFERENCIA RECIBIDA'),
    doubtful(841, 'income', N26, '2026-08-02', 'ABONO'),
  ],
})

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

const COUNT_PAGE = {
  movements: [],
  pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
  totals: { income: '0.00', expense: '0.00', net: '0.00' },
}

interface Options {
  pairs?: Pair[]
  groups?: ReturnType<typeof groupOfThree>[]
}

/**
 * A small stateful fake of the transfers API: the DELETE really takes the pair out and
 * the POST really makes one, so what the screen shows after a write can only come from
 * asking again — never from patching the list in the client.
 */
async function prepare(page: Page, options: Options = {}) {
  let pairs = options.pairs ?? fourPairs()
  let groups = options.groups ?? []
  /** Unlinked pairs, so a POST with their two ids can bring them back. */
  const undone: Pair[] = []
  let made = 0

  const watch = {
    requests: [] as Request[],
    consoleErrors: [] as string[],
    pageErrors: [] as Error[],
    /** Every /api call this suite did not foresee: the ones the safety net had to stop. */
    aborted: [] as string[],
    /** Every write as it travelled: method, path and raw body. */
    writes: [] as { method: string; path: string; body: string | null }[],
  }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  /** Stops a call nobody foresaw, and writes it down so the test fails because of it. */
  const stop = (route: Route) => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) watch.requests.push(request)
  })

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  // Without it a POST or a DELETE would reach the real backend and change real pairs.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  await page.route('**/api/movements*', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: COUNT_PAGE }) : stop(route),
  )

  await page.route('**/api/transfers**', (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname

    if (method === 'GET' && path === '/api/transfers') {
      return route.fulfill({ json: { pairs } })
    }
    if (method === 'GET' && path === '/api/transfers/ambiguous') {
      return route.fulfill({ json: { ambiguousCount: groups.length, ambiguous: groups } })
    }

    if (method === 'POST' && path === '/api/transfers') {
      watch.writes.push({ method, path, body: request.postData() })
      const { movementIds } = JSON.parse(request.postData() ?? '{}') as { movementIds: number[] }
      const [outId, inId] = movementIds
      const back = undone.find(
        (pair) => pair.movements[0].id === outId && pair.movements[1].id === inId,
      )
      if (back) {
        pairs = [back, ...pairs]
        return route.fulfill({ status: 201, json: back })
      }
      const group = groups.find((one) => one.movements.some((movement) => movement.id === outId))
      const out = group?.movements.find((movement) => movement.id === outId)
      const into = group?.movements.find((movement) => movement.id === inId)
      if (!group || !out || !into) {
        return route.fulfill({
          status: 404,
          json: { statusCode: 404, code: 'NOT_FOUND', message: 'No existe el movimiento' },
        })
      }
      made += 1
      const transferId = `made-by-hand-${made}`
      const owner = (id: number) => [BANKINTER, N26, OPENBANK].find((one) => one.id === id)!
      const pair: Pair = {
        transferId,
        movements: [
          leg(
            out.id,
            'expense',
            owner(out.accountId),
            String(out.bookingDate),
            group.amount,
            String(out.description),
            transferId,
          ),
          leg(
            into.id,
            'income',
            owner(into.accountId),
            String(into.bookingDate),
            group.amount,
            String(into.description),
            transferId,
          ),
        ],
      }
      pairs = [pair, ...pairs]
      undone.push(pair)
      // Linking two of the three resolves the group: the third one is no longer doubtful.
      groups = groups.filter((one) => one !== group)
      return route.fulfill({ status: 201, json: pair })
    }

    if (method === 'DELETE' && path.startsWith('/api/transfers/')) {
      watch.writes.push({ method, path, body: request.postData() })
      const transferId = decodeURIComponent(path.slice('/api/transfers/'.length))
      const gone = pairs.find((pair) => pair.transferId === transferId)
      if (!gone) {
        return route.fulfill({
          status: 404,
          json: { statusCode: 404, code: 'NOT_FOUND', message: 'Ningún movimiento lleva ese id' },
        })
      }
      pairs = pairs.filter((pair) => pair !== gone)
      undone.push(gone)
      return route.fulfill({ status: 204, body: '' })
    }

    return stop(route)
  })

  return watch
}

type Watch = Awaited<ReturnType<typeof prepare>>

/** The whole session may only read, link and unlink — and write only on /api/transfers. */
function expectOnlyTransferWrites(watch: Watch, methods: string[]) {
  const calls = watch.requests.map((request) => ({
    method: request.method(),
    url: new URL(request.url()),
  }))
  expect([...new Set(calls.map((call) => call.method))].sort()).toEqual(methods)
  for (const call of calls) {
    if (call.method !== 'GET') expect(call.url.pathname.startsWith('/api/transfers')).toBe(true)
  }
  // Every /api call was foreseen and answered here. One that was not would have been
  // stopped by the safety net — instead of proxied to the real backend — and listed.
  expect(watch.aborted).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
}

test.use({ testIdAttribute: 'data-test' })

test('reaches the screen from the sidebar and sees every pair, only the fine labelled', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/')
  const entries = page.locator('nav a')
  await expect(entries.nth(2)).toHaveText('Rules')
  await expect(entries.nth(3)).toHaveText('Transfers')
  await entries.nth(3).click()

  await expect(page).toHaveURL(/\/transfers$/)
  await expect(page.getByTestId('pairs-heading')).toHaveText('Linked pairs (4)')
  const rows = page.getByTestId('transfer-pair')
  await expect(rows).toHaveCount(4)
  await expect(page.getByTestId('pair-bizum')).toHaveCount(1)
  // The labelled pair stays where the backend put it: third.
  await expect(rows.nth(2).getByTestId('pair-bizum-badge')).toHaveText('Bizum')
  await expect(rows.nth(2).getByTestId('pair-bizum-note')).toHaveText(
    'A Bizum usually comes from another person, not from one of your accounts.',
  )
  await expect(rows.nth(2).getByTestId('pair-leg-description')).toHaveText([
    'AYTO MADRID PAGO INTER',
    'BIZUM DE <persona> CONCEPTO multa',
  ])
  await expect(rows.nth(2).getByTestId('pair-leg-account')).toHaveText([
    'n26 ···4136',
    'openbank ···4073',
  ])
  await expect(rows.nth(2).getByTestId('pair-leg-amount').first()).toContainText('100,00')

  // With no doubtful group the section is one fixed sentence (R9).
  await expect(page.getByTestId('doubtful-empty')).toHaveText(
    "No doubtful transfers. When an import finds money that looks like a transfer between your accounts but can't tell which movements go together, the group shows up here.",
  )

  // Opening the screen wrote nothing.
  expect(watch.writes).toEqual([])
  expectOnlyTransferWrites(watch, ['GET'])
})

test('unlinking asks first, Cancel sends nothing, and Undo links the pair back', async ({
  page,
}) => {
  const watch = await prepare(page)

  await page.goto('/transfers')
  const rows = page.getByTestId('transfer-pair')
  await expect(rows).toHaveCount(4)

  await rows.nth(2).getByTestId('pair-unlink').click()
  await expect(page.getByTestId('unlink-confirm')).toContainText('Unlink this pair?')
  await expect(page.getByTestId('unlink-confirm-consequence')).toHaveText(
    'Both movements will count in your totals again.',
  )
  await expect(page.getByTestId('unlink-confirm-memory')).toHaveText(
    "The next import won't pair these two again.",
  )
  await expect(page.getByTestId('unlink-cancel')).toBeFocused()

  await page.getByTestId('unlink-cancel').click()

  await expect(page.getByTestId('unlink-confirm')).toHaveCount(0)
  await expect(rows).toHaveCount(4)
  expect(watch.writes).toEqual([])

  await rows.nth(2).getByTestId('pair-unlink').click()
  await page.getByTestId('unlink-continue').click()

  await expect(page.getByTestId('transfers-action-summary')).toContainText(
    'Pair unlinked. Its two movements count in your totals again.',
  )
  await expect(page.getByTestId('pairs-heading')).toHaveText('Linked pairs (3)')
  await expect(page.getByTestId('pair-bizum')).toHaveCount(0)
  expect(watch.writes).toEqual([{ method: 'DELETE', path: '/api/transfers/fine-100', body: null }])

  await page.getByTestId('transfers-action-undo').click()

  await expect(page.getByTestId('transfers-action-summary')).toHaveText('Pair linked again.')
  await expect(page.getByTestId('transfers-action-undo')).toHaveCount(0)
  await expect(page.getByTestId('pairs-heading')).toHaveText('Linked pairs (4)')
  await expect(page.getByTestId('pair-bizum')).toHaveCount(1)
  expect(watch.writes).toHaveLength(2)
  expect(watch.writes[1]).toEqual({
    method: 'POST',
    path: '/api/transfers',
    body: '{"movementIds":[33339,24377]}',
  })

  expectOnlyTransferWrites(watch, ['DELETE', 'GET', 'POST'])
})

test('pairs two movements of a doubtful group of three, and Undo unlinks them', async ({
  page,
}) => {
  const watch = await prepare(page, { groups: [groupOfThree()] })

  await page.goto('/transfers')
  const group = page.getByTestId('doubtful-group')
  await expect(group).toHaveCount(1)
  await expect(group.getByTestId('doubtful-amount')).toContainText('500,00')
  await expect(group.getByTestId('doubtful-pick-out')).toHaveCount(1)
  await expect(group.getByTestId('doubtful-pick-in')).toHaveCount(2)

  // Nothing is picked beforehand and the button is off until one of each is.
  await expect(group.locator('input[type="radio"]:checked')).toHaveCount(0)
  const link = group.getByTestId('doubtful-link')
  await expect(link).toBeDisabled()
  await group.getByTestId('doubtful-pick-in').nth(1).check()
  await expect(link).toBeDisabled()
  await group.getByTestId('doubtful-pick-out').check()
  await expect(link).toBeEnabled()
  expect(watch.writes).toEqual([])

  await link.click()

  await expect(page.getByTestId('transfers-action-summary')).toContainText(
    'Linked as a transfer. These two movements no longer count in your totals.',
  )
  expect(watch.writes).toEqual([
    { method: 'POST', path: '/api/transfers', body: '{"movementIds":[812,841]}' },
  ])
  // Both lists were asked for again: the group is gone and the new pair is listed.
  await expect(page.getByTestId('doubtful-group')).toHaveCount(0)
  await expect(page.getByTestId('doubtful-empty')).toBeVisible()
  await expect(page.getByTestId('pairs-heading')).toHaveText('Linked pairs (5)')

  await page.getByTestId('transfers-action-undo').click()

  await expect(page.getByTestId('transfers-action-summary')).toHaveText('Link undone.')
  await expect(page.getByTestId('pairs-heading')).toHaveText('Linked pairs (4)')
  expect(watch.writes[1]).toEqual({
    method: 'DELETE',
    path: '/api/transfers/made-by-hand-1',
    body: null,
  })

  expectOnlyTransferWrites(watch, ['DELETE', 'GET', 'POST'])
})

test('two picks from the same account never reach the server', async ({ page }) => {
  const sameAccount = {
    amount: '300.00',
    movements: [
      doubtful(901, 'expense', BANKINTER, '2026-07-01', 'TRASPASO A'),
      doubtful(903, 'income', N26, '2026-07-01', 'INGRESO A'),
      doubtful(902, 'expense', OPENBANK, '2026-07-02', 'TRASPASO B'),
      doubtful(904, 'income', BANKINTER, '2026-07-02', 'INGRESO B'),
    ],
  }
  const watch = await prepare(page, { groups: [sameAccount] })

  await page.goto('/transfers')
  const group = page.getByTestId('doubtful-group')
  await group.getByTestId('doubtful-pick-out').nth(0).check()
  await group.getByTestId('doubtful-pick-in').nth(1).check()

  await expect(group.getByTestId('doubtful-same')).toHaveText(
    'Both movements are in the same account. Pick one from another account.',
  )
  await expect(group.getByTestId('doubtful-link')).toBeDisabled()

  // Picking another one of the same column replaces the pick: one per column.
  await group.getByTestId('doubtful-pick-in').nth(0).check()
  await expect(group.locator('input[type="radio"]:checked')).toHaveCount(2)
  await expect(group.getByTestId('doubtful-same')).toHaveCount(0)
  await expect(group.getByTestId('doubtful-link')).toBeEnabled()

  expect(watch.writes).toEqual([])
  expectOnlyTransferWrites(watch, ['GET'])
})
