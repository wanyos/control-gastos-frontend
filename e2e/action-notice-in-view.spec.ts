import { test, expect } from '@playwright/test'
import type { Locator, Page, Route } from '@playwright/test'

// Feature 27 in a real browser: the line that says what the last action did, with its
// button, stays in view under the top bar when the page is scrolled, on Review,
// Movements and Transfers. jsdom knows nothing about positions, so «in view» can only be
// shown here.
//
// There is no backend: every /api call is answered with page.route. The first route of
// each screen aborts ANY /api call (later routes win), and every call it has to abort is
// written down in a list that each test checks to be empty at the end. The dev server
// proxies /api to a real backend on :3000, so without that first route a PATCH, a POST
// or a DELETE of this file would really be sent.
//
// The page needs somewhere to scroll to: the lists are long (64 rows in Review, 66 lines
// in Movements, 24 pairs in Transfers) and the window is the 1280×720 of the project.

type Raw = Record<string, unknown>

const CHECKING = {
  id: 3,
  iban: 'ES6000491500051234567892',
  bank: 'bankinter',
  alias: 'bankinter ···7892',
  type: 'checking',
}

const SECOND_ACCOUNT = {
  id: 5,
  iban: 'ES9121000418450200051332',
  bank: 'n26',
  alias: 'n26 ···1332',
  type: 'checking',
}

const FOOD = { id: 11, name: 'Food', kind: 'expense', parentId: null }
const GROCERIES = { id: 12, name: 'Groceries', kind: 'expense', parentId: 11 }
const TRANSPORT = { id: 14, name: 'Transport', kind: 'expense', parentId: null }

const CATEGORY_BY_ID = new Map<number, Raw>(
  [FOOD, GROCERIES, TRANSPORT].map((category) => [category.id, category]),
)

const CATEGORIES = [
  {
    ...FOOD,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [{ ...GROCERIES, createdAt: '2026-08-06T18:31:00.000Z', children: [] }],
  },
  { ...TRANSPORT, createdAt: '2026-08-06T18:32:00.000Z', children: [] },
]

/** Made-up card payments and receipts, shaped like the ones a bank statement brings. */
const DESCRIPTIONS = [
  'COMPRA TARJ. PANADERIA EL HORNO',
  'RECIBO AGUAS MUNICIPALES',
  'COMPRA TARJ. FERRETERIA CENTRO',
  'PAGO APARCAMIENTO ESTACION',
  'COMPRA TARJ. FRUTERIA LA HUERTA',
  'RECIBO COMUNIDAD PROPIETARIOS',
  'COMPRA TARJ. LIBRERIA PAPEL',
  'PAGO PEAJE AUTOPISTA',
]

const descriptionOf = (index: number): string =>
  `${DESCRIPTIONS[index % DESCRIPTIONS.length] ?? 'COMPRA TARJ.'} ${String(index + 1).padStart(2, '0')}`

/** Never a round figure: 7.35, 10.52, 13.69… */
const amountOf = (index: number): string => (7.35 + index * 3.17).toFixed(2)

const movement = (id: number, day: string, index: number, extra: Raw = {}): Raw => ({
  id,
  type: 'expense',
  bookingDate: day,
  valueDate: day,
  amount: amountOf(index),
  description: descriptionOf(index),
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: CHECKING.id,
  account: CHECKING,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  excludedFromTotals: false,
  transferId: null,
  daySequence: 1,
  createdAt: '2026-09-12T18:30:00.000Z',
  updatedAt: '2026-09-12T18:30:00.000Z',
  ...extra,
})

/** A rejection of the contract: nothing was written, so the screen reloads nothing. */
const REJECTED = {
  status: 400,
  json: { statusCode: 400, code: 'VALIDATION_ERROR', message: 'La petición no es válida' },
}

interface Write {
  method: string
  path: string
  body: unknown
}

interface Watch {
  /** Every /api call no route of this file foresaw: it was aborted, and it fails the test. */
  aborted: string[]
  /** Every request that was not a GET, as it travelled. */
  writes: Write[]
  consoleErrors: string[]
  pageErrors: Error[]
}

function watchPage(page: Page): Watch {
  const watch: Watch = { aborted: [], writes: [], consoleErrors: [], pageErrors: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (!path.startsWith('/api/') || request.method() === 'GET') return
    const raw = request.postData()
    watch.writes.push({
      method: request.method(),
      path,
      body: raw === null ? null : (JSON.parse(raw) as unknown),
    })
  })
  return watch
}

/** Aborts a call nobody foresaw and writes it down, so the test fails because of it. */
const stopInto =
  (watch: Watch) =>
  (route: Route): Promise<void> => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

/**
 * Nothing reached the first route, nothing threw and nothing was logged as an error.
 * When the test asked for a rejection, Chromium's own line about that 400 is expected.
 */
function expectNothingUnforeseen(watch: Watch, options: { rejection?: boolean } = {}): void {
  expect(watch.aborted).toEqual([])
  expect(watch.pageErrors).toEqual([])
  const errors = options.rejection
    ? watch.consoleErrors.filter((text) => !text.includes('Failed to load resource'))
    : watch.consoleErrors
  expect(errors).toEqual([])
}

// ─── Review ────────────────────────────────────────────────────────────────

const REVIEW_ROWS = 64
const REVIEW_FIRST_ID = 4101
const REVIEW_LAST_ID = REVIEW_FIRST_ID + REVIEW_ROWS - 1

/**
 * A fake of the review queue with state: the PATCH really changes its rows and the GET
 * answers what is still pending, so a confirmed row is gone from the next answer.
 */
async function routeReview(page: Page, watch: Watch, options: { reject?: boolean } = {}) {
  const rows = new Map<number, Raw>(
    Array.from({ length: REVIEW_ROWS }, (_item, index) => {
      const day = `2026-09-${String(28 - (index % 27)).padStart(2, '0')}`
      return [REVIEW_FIRST_ID + index, movement(REVIEW_FIRST_ID + index, day, index)]
    }),
  )
  const stop = stopInto(watch)

  const answerGet = (route: Route, query: URLSearchParams) => {
    const q = (query.get('q') ?? '').toLowerCase()
    const visible = [...rows.values()].filter(
      (row) => row.status === 'pending_review' && String(row.description).toLowerCase().includes(q),
    )
    const size = Number(query.get('pageSize') ?? '100')
    return route.fulfill({
      json: {
        movements: visible.slice(0, size),
        pagination: {
          page: 1,
          pageSize: size,
          total: visible.length,
          totalPages: Math.max(1, Math.ceil(visible.length / size)),
        },
        totals: { income: '0.00', expense: '6859.52', net: '-6859.52' },
      },
    })
  }

  const answerPatch = (route: Route) => {
    if (options.reject) return route.fulfill(REJECTED)
    const request = route.request()
    const body = JSON.parse(request.postData() ?? '{}') as {
      ids?: number[]
      categoryId?: number | null
      status?: string
    }
    const single = /\/api\/movements\/(\d+)$/.exec(new URL(request.url()).pathname)
    const ids = body.ids ?? [Number(single?.[1])]
    const changed = ids.flatMap((id) => {
      const row = rows.get(id)
      if (!row) return []
      if ('categoryId' in body) {
        row.categoryId = body.categoryId ?? null
        row.category =
          body.categoryId == null ? null : (CATEGORY_BY_ID.get(body.categoryId) ?? null)
      }
      if (body.status !== undefined) row.status = body.status
      return [{ ...row }]
    })
    return route.fulfill({
      json: body.ids ? { updated: changed.length, movements: changed } : changed[0],
    })
  }

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))
  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') return answerPatch(route)
    if (request.method() !== 'GET') return stop(route)
    return answerGet(route, new URL(request.url()).searchParams)
  })
  await page.route('**/api/movements/*', (route) =>
    route.request().method() === 'PATCH' ? answerPatch(route) : stop(route),
  )
  await page.route('**/api/category-rules', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return stop(route)
    const body = JSON.parse(request.postData() ?? '{}') as { matchText: string; categoryId: number }
    return route.fulfill({
      status: 201,
      json: {
        id: 31,
        matchText: body.matchText,
        categoryId: body.categoryId,
        category: CATEGORY_BY_ID.get(body.categoryId) ?? null,
        createdAt: '2026-10-02T09:14:00.000Z',
        updatedAt: '2026-10-02T09:14:00.000Z',
      },
    })
  })
}

const reviewRow = (page: Page, id: number): Locator => page.locator(`[data-movement-id="${id}"]`)

const reviewCategory = (row: Locator): Locator =>
  row.getByTestId('row-category-select').getByRole('combobox')

// ─── Movements ─────────────────────────────────────────────────────────────

const STATEMENT_ROWS = 66
const STATEMENT_FIRST_ID = 5201
const STATEMENT_LAST_ID = STATEMENT_FIRST_ID + STATEMENT_ROWS - 1

/** The month the screen opens on, whatever day the suite runs. */
const currentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * A fake of one month with state: three lines a day from the 22nd back to the 1st, all
 * of them confirmed and under Food. Both PATCH really write on their rows.
 */
async function routeMovements(page: Page, watch: Watch, options: { reject?: boolean } = {}) {
  const month = currentMonth()
  const rows = Array.from({ length: STATEMENT_ROWS }, (_item, index) => {
    const day = `${month}-${String(22 - Math.floor(index / 3)).padStart(2, '0')}`
    return movement(STATEMENT_FIRST_ID + index, day, index, {
      status: 'confirmed',
      categoryId: FOOD.id,
      category: FOOD,
    })
  })
  const stop = stopInto(watch)

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/accounts', (route) =>
    route.fulfill({ json: [{ ...CHECKING, balance: '2318.46' }] }),
  )
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))

  await page.route('**/api/movements/*', (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return stop(route)
    if (options.reject) return route.fulfill(REJECTED)
    const id = Number(new URL(request.url()).pathname.split('/').at(-1))
    const body = JSON.parse(request.postData() ?? '{}') as { categoryId: number | null }
    const row = rows.find((one) => one.id === id)
    if (!row) return stop(route)
    row.categoryId = body.categoryId
    row.category = body.categoryId === null ? null : (CATEGORY_BY_ID.get(body.categoryId) ?? null)
    return route.fulfill({ json: { ...row } })
  })

  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname !== '/api/movements') return stop(route)

    if (request.method() === 'PATCH') {
      if (options.reject) return route.fulfill(REJECTED)
      const body = JSON.parse(request.postData() ?? '{}') as {
        ids: number[]
        excludedFromTotals: boolean
      }
      const changed = body.ids.flatMap((id) => {
        const row = rows.find((one) => one.id === id)
        if (!row) return []
        row.excludedFromTotals = body.excludedFromTotals
        return [{ ...row }]
      })
      return route.fulfill({ json: { updated: changed.length, movements: changed } })
    }
    if (request.method() !== 'GET') return stop(route)

    const query = url.searchParams
    if (query.get('pageSize') === '1') {
      return route.fulfill({
        json: {
          movements: [],
          pagination: { page: 1, pageSize: 1, total: 7, totalPages: 7 },
          totals: { income: '0.00', expense: '0.00', net: '0.00' },
        },
      })
    }
    if ((query.get('from') ?? '').slice(0, 7) !== month) return stop(route)
    const expense = rows
      .filter((row) => row.excludedFromTotals !== true)
      .reduce((sum, row) => sum + Number(row.amount), 0)
    return route.fulfill({
      json: {
        movements: rows.map((row) => ({ ...row })),
        pagination: { page: 1, pageSize: 200, total: rows.length, totalPages: 1 },
        totals: { income: '0.00', expense: expense.toFixed(2), net: (-expense).toFixed(2) },
      },
    })
  })
}

const statementRow = (page: Page, id: number): Locator => page.locator(`[data-movement-id="${id}"]`)

/** Opens the editor of one line and picks a category in it: the gesture of feature 21. */
async function changeStatementCategory(row: Locator, categoryId: number): Promise<void> {
  await row.getByTestId('statement-row-category-button').click()
  await row.getByTestId('row-category-select').locator('select').selectOption(String(categoryId))
}

// ─── Transfers ─────────────────────────────────────────────────────────────

const PAIRS = 24

interface Pair {
  transferId: string
  movements: [Raw, Raw]
}

const pairOf = (index: number): Pair => {
  const transferId = `pair-${String(index + 1).padStart(2, '0')}`
  const day = `2026-${String(9 - Math.floor(index / 8)).padStart(2, '0')}-${String(27 - (index % 8) * 3).padStart(2, '0')}`
  const amount = (180.4 + index * 37.15).toFixed(2)
  const leg = (id: number, type: string, owner: typeof CHECKING, description: string): Raw =>
    movement(id, day, index, {
      type,
      amount,
      description,
      accountId: owner.id,
      account: owner,
      transferId,
    })
  return {
    transferId,
    movements: [
      leg(7300 + index * 2, 'expense', CHECKING, 'TRANSFERENCIA A CUENTA N26'),
      leg(7301 + index * 2, 'income', SECOND_ACCOUNT, 'TRANSFERENCIA RECIBIDA BANKINTER'),
    ],
  }
}

/** A fake of the transfers API with state: the DELETE takes the pair out, the POST brings it back. */
async function routeTransfers(page: Page, watch: Watch, options: { reject?: boolean } = {}) {
  let pairs = Array.from({ length: PAIRS }, (_item, index) => pairOf(index))
  const unlinked: Pair[] = []
  const stop = stopInto(watch)

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/movements*', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          json: {
            movements: [],
            pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
            totals: { income: '0.00', expense: '0.00', net: '0.00' },
          },
        })
      : stop(route),
  )
  await page.route('**/api/transfers**', (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname

    if (method === 'GET' && path === '/api/transfers') return route.fulfill({ json: { pairs } })
    if (method === 'GET' && path === '/api/transfers/ambiguous') {
      return route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } })
    }
    if (method === 'DELETE' && path.startsWith('/api/transfers/')) {
      if (options.reject) return route.fulfill(REJECTED)
      const transferId = decodeURIComponent(path.slice('/api/transfers/'.length))
      const gone = pairs.find((pair) => pair.transferId === transferId)
      if (!gone) return stop(route)
      pairs = pairs.filter((pair) => pair !== gone)
      unlinked.push(gone)
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'POST' && path === '/api/transfers') {
      const { movementIds } = JSON.parse(request.postData() ?? '{}') as { movementIds: number[] }
      const back = unlinked.find(
        (pair) =>
          pair.movements[0].id === movementIds[0] && pair.movements[1].id === movementIds[1],
      )
      if (!back) return stop(route)
      pairs = [...pairs, back]
      return route.fulfill({ status: 201, json: back })
    }
    return stop(route)
  })
}

// ─── What «in view» means, measured in the browser ─────────────────────────

const BLOCK = '[data-test="sticky-below-top-bar"]'

const scrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY)

/** Goes down to the end of the page, and makes sure the page really had somewhere to go. */
async function goToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  expect(await scrollY(page)).toBeGreaterThan(0)
}

/**
 * The three things of the definition in requirements.md: the whole rectangle is inside
 * the window, its top edge is not above the bottom edge of the top bar, and nothing
 * covers it (the element at its centre belongs to it). `toBeInViewport` alone is not
 * enough: it takes for seen an element that sits behind the top bar.
 *
 * It measures with `evaluate`, which never scrolls: a click of Playwright would bring
 * the element into view by itself and hide exactly the failure this file is about.
 */
async function expectInView(page: Page, target: Locator): Promise<void> {
  await expect(target).toHaveCount(1)
  await expect
    .poll(() =>
      target.evaluate((element) => {
        const bar = document
          .querySelector('[data-test="topbar-title"]')
          ?.closest('header')
          ?.getBoundingClientRect()
        if (!bar) return ['the top bar was not found']
        const box = element.getBoundingClientRect()
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
        const problems: string[] = []
        if (box.width === 0 || box.height === 0) problems.push('it has no size')
        if (box.top < bar.bottom) {
          problems.push(`its top (${box.top}) is above the bottom of the top bar (${bar.bottom})`)
        }
        if (box.bottom > window.innerHeight) {
          problems.push(`its bottom (${box.bottom}) is below the window (${window.innerHeight})`)
        }
        if (box.left < 0 || box.right > window.innerWidth) {
          problems.push(`it is cut sideways (${box.left} to ${box.right})`)
        }
        if (!hit || !element.contains(hit)) {
          problems.push(
            `at its centre there is <${hit?.tagName.toLowerCase() ?? 'nothing'}> ${hit?.getAttribute('data-test') ?? ''}`,
          )
        }
        return problems
      }),
    )
    .toEqual([])
}

/** The edges of the block around the notice and of the top bar, in window coordinates. */
const edges = (page: Page) =>
  page.evaluate((selector) => {
    const block = document.querySelector(selector)?.getBoundingClientRect()
    const bar = document
      .querySelector('[data-test="topbar-title"]')
      ?.closest('header')
      ?.getBoundingClientRect()
    if (!block || !bar) return null
    return { blockTop: block.top, blockBottom: block.bottom, barBottom: bar.bottom }
  }, BLOCK)

/** On a scrolled page the block starts exactly where the top bar ends (R1–R4). */
async function expectStuckUnderTopBar(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const now = await edges(page)
      return now === null ? null : Math.abs(now.blockTop - now.barBottom)
    })
    .toBeLessThan(0.5)
}

const topOf = (row: Locator): Promise<number> =>
  row.evaluate((element) => element.getBoundingClientRect().top)

/** Scrolls until the top edge of `row` is exactly at the bottom edge of the top bar. */
async function bringUnderTopBar(page: Page, row: Locator, offset = 0): Promise<void> {
  await row.evaluate((element, extra) => {
    const bar = document.querySelector('[data-test="topbar-title"]')?.closest('header')
    if (!bar) throw new Error('the top bar was not found')
    window.scrollBy(
      0,
      element.getBoundingClientRect().top - bar.getBoundingClientRect().bottom - extra,
    )
  }, offset)
}

/** The starting point of R11: the row begins exactly where the top bar ends. */
async function expectAtBottomOfTopBar(page: Page, row: Locator): Promise<void> {
  const barBottom = await page.evaluate(
    () =>
      document
        .querySelector('[data-test="topbar-title"]')
        ?.closest('header')
        ?.getBoundingClientRect().bottom ?? null,
  )
  expect(barBottom).not.toBeNull()
  expect(Math.abs((await topOf(row)) - (barBottom ?? 0))).toBeLessThan(0.5)
}

/** R11: the whole row is below the block, which is stuck under the top bar. */
async function expectRowClearOfNotice(page: Page, row: Locator): Promise<void> {
  await expectStuckUnderTopBar(page)
  await expect
    .poll(async () => {
      const now = await edges(page)
      return now === null ? null : (await topOf(row)) - now.blockBottom
    })
    .toBeGreaterThanOrEqual(0)
}

test.use({ testIdAttribute: 'data-test' })

// ─── Review (R1, R4) ───────────────────────────────────────────────────────

test('Review keeps the summary and its Undo in view after confirming the last row', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeReview(page, watch)
  await page.goto('/review')
  const rows = page.getByTestId('movement-row')
  await expect(rows).toHaveCount(REVIEW_ROWS)

  await goToBottom(page)
  await reviewRow(page, REVIEW_LAST_ID).getByTestId('movement-confirm').click()

  await expect(page.getByTestId('action-summary')).toContainText('1 movement confirmed')
  await expect(rows).toHaveCount(REVIEW_ROWS - 1)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('action-summary'))
  await expectInView(page, page.getByTestId('action-undo'))
  await expectStuckUnderTopBar(page)
  expect(watch.writes).toEqual([
    { method: 'PATCH', path: `/api/movements/${REVIEW_LAST_ID}`, body: { status: 'confirmed' } },
  ])
  expectNothingUnforeseen(watch)
})

test('Review keeps the summary and its Undo in view after giving a category to the last row', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeReview(page, watch)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(REVIEW_ROWS)

  await goToBottom(page)
  const last = reviewRow(page, REVIEW_LAST_ID)
  await reviewCategory(last).selectOption(String(GROCERIES.id))

  await expect(page.getByTestId('action-summary')).toContainText(
    '1 movement categorized as Groceries',
  )
  // The row stays in the queue, with its new category.
  await expect(last.getByTestId('movement-category')).toHaveText('Groceries')
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('action-summary'))
  await expectInView(page, page.getByTestId('action-undo'))
  await expectStuckUnderTopBar(page)
  expectNothingUnforeseen(watch)
})

test('Review keeps the rule notice and Apply rules now in view from the bottom of the list', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeReview(page, watch)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(REVIEW_ROWS)

  await goToBottom(page)
  await reviewRow(page, REVIEW_LAST_ID).getByTestId('movement-create-rule').click()
  await expect(page.getByTestId('rule-text').getByRole('textbox')).not.toHaveValue('')
  await page.getByTestId('rule-category').getByRole('combobox').selectOption(String(TRANSPORT.id))
  await page.getByTestId('rule-save').click()

  await expect(page.getByTestId('rule-dialog')).toHaveCount(0)
  await expect(page.getByTestId('rule-created-notice')).toContainText('Transport')
  // The two notices of Review never show at once (C5).
  await expect(page.getByTestId('action-summary')).toHaveCount(0)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('rule-created-notice'))
  await expectInView(page, page.getByTestId('apply-rules-now'))
  await expectStuckUnderTopBar(page)
  // Creating a rule writes nothing on any movement.
  expect(watch.writes.map((write) => `${write.method} ${write.path}`)).toEqual([
    'POST /api/category-rules',
  ])
  expectNothingUnforeseen(watch)
})

// ─── Movements (R2, C6) ────────────────────────────────────────────────────

test('Movements keeps the summary and its Undo in view after changing the category of the last line', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)

  await goToBottom(page)
  const last = statementRow(page, STATEMENT_LAST_ID)
  await changeStatementCategory(last, GROCERIES.id)

  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Groceries',
  )
  await expect(last.getByTestId('statement-row-category')).toHaveText('Groceries')
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('statement-action-summary'))
  await expectInView(page, page.getByTestId('statement-action-undo'))
  await expectStuckUnderTopBar(page)
  expect(watch.writes).toEqual([
    {
      method: 'PATCH',
      path: `/api/movements/${STATEMENT_LAST_ID}`,
      body: { categoryId: GROCERIES.id },
    },
  ])
  expectNothingUnforeseen(watch)
})

test('Movements keeps the summary and its Undo in view at the end of the month after excluding a line', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)

  await page.getByTestId('statement-start-selecting').click()
  await goToBottom(page)
  const last = statementRow(page, STATEMENT_LAST_ID)
  await last.getByTestId('statement-row-select').click()

  // `Exclude from totals` is above the list and this feature does not move it (C6):
  // whoever is at the end of the month goes up to press it.
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.getByTestId('statement-selected-count')).toHaveText('1 selected')
  await page.getByTestId('statement-exclude').click()
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    '1 movement excluded from totals',
  )
  await expect(page.getByTestId('statement-selection-bar')).toHaveCount(1)

  // Back at the end of the month, the sentence and its Undo came along.
  await goToBottom(page)
  await expect(last.getByTestId('statement-row-excluded')).toHaveCount(1)
  await expectInView(page, page.getByTestId('statement-action-summary'))
  await expectInView(page, page.getByTestId('statement-action-undo'))
  await expectStuckUnderTopBar(page)
  expect(watch.writes).toEqual([
    {
      method: 'PATCH',
      path: '/api/movements',
      body: { ids: [STATEMENT_LAST_ID], excludedFromTotals: true },
    },
  ])
  expectNothingUnforeseen(watch)
})

// ─── Transfers (R3) ────────────────────────────────────────────────────────

test('Transfers keeps the summary and its Undo in view after unlinking the last pair', async ({
  page,
}) => {
  const watch = watchPage(page)
  await routeTransfers(page, watch)
  await page.goto('/transfers')
  const pairs = page.getByTestId('transfer-pair')
  await expect(pairs).toHaveCount(PAIRS)

  await goToBottom(page)
  await pairs.last().getByTestId('pair-unlink').click()
  await page.getByTestId('unlink-continue').click()

  await expect(page.getByTestId('transfers-action-summary')).toContainText(
    'Pair unlinked. Its two movements count in your totals again.',
  )
  await expect(pairs).toHaveCount(PAIRS - 1)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('transfers-action-summary'))
  await expectInView(page, page.getByTestId('transfers-action-undo'))
  await expectStuckUnderTopBar(page)
  expect(watch.writes).toEqual([{ method: 'DELETE', path: '/api/transfers/pair-24', body: null }])
  expectNothingUnforeseen(watch)
})

// ─── At the top of the page (R6) ───────────────────────────────────────────

/**
 * The block, the element before it and the element after it, as the browser laid them
 * out. The neighbours are read from the DOM (`previousElementSibling` and
 * `nextElementSibling`) and named by the `data-test` they carry or contain, so the test
 * says which two blocks surround the notice, not just that something does.
 */
const neighbours = (page: Page, above: string, below: string) =>
  page.evaluate(
    ({ selector, aboveTest, belowTest }) => {
      const block = document.querySelector(selector)
      const before = block?.previousElementSibling
      const after = block?.nextElementSibling
      const bar = document.querySelector('[data-test="topbar-title"]')?.closest('header')
      if (!block || !before || !after || !bar) return null
      const carries = (element: Element, name: string): boolean =>
        element.matches(name) || element.querySelector(name) !== null
      return {
        aboveIsTheExpectedOne: carries(before, aboveTest),
        belowIsTheExpectedOne: carries(after, belowTest),
        aboveBottom: before.getBoundingClientRect().bottom,
        blockTop: block.getBoundingClientRect().top,
        blockBottom: block.getBoundingClientRect().bottom,
        belowTop: after.getBoundingClientRect().top,
        barBottom: bar.getBoundingClientRect().bottom,
        scrollY: window.scrollY,
      }
    },
    { selector: BLOCK, aboveTest: above, belowTest: below },
  )

async function expectBetween(page: Page, above: string, below: string): Promise<void> {
  const now = await neighbours(page, above, below)
  if (now === null) throw new Error('the block or one of its two neighbours is missing')
  expect(now.scrollY).toBe(0)
  expect(now.aboveIsTheExpectedOne).toBe(true)
  expect(now.belowIsTheExpectedOne).toBe(true)
  // In the flow of the page, touching neither neighbour.
  expect(now.blockTop).toBeGreaterThanOrEqual(now.aboveBottom)
  expect(now.belowTop).toBeGreaterThanOrEqual(now.blockBottom)
  // And not stuck: its top edge is below the bottom edge of the top bar.
  expect(now.blockTop).toBeGreaterThan(now.barBottom)
}

test('at the top of the page the notice sits between the same blocks as before', async ({
  page,
}) => {
  const watch = watchPage(page)

  await routeReview(page, watch)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(REVIEW_ROWS)
  await reviewCategory(reviewRow(page, REVIEW_FIRST_ID)).selectOption(String(GROCERIES.id))
  await expect(page.getByTestId('action-summary')).toContainText(
    '1 movement categorized as Groceries',
  )
  await expectBetween(page, '[data-test="review-filters"]', '[data-test="movement-list"]')
  await expectInView(page, page.getByTestId('action-summary'))

  // With rows ticked, what sits right above the notice is the bar of the bulk actions.
  await reviewRow(page, REVIEW_FIRST_ID)
    .getByTestId('movement-select')
    .getByRole('checkbox')
    .check()
  await expect(page.getByTestId('review-actions')).toHaveCount(1)
  await expectBetween(page, '[data-test="review-actions"]', '[data-test="movement-list"]')

  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)
  await changeStatementCategory(statementRow(page, STATEMENT_FIRST_ID), GROCERIES.id)
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Groceries',
  )
  await expectBetween(
    page,
    '[data-test="statement-totals"]',
    '[data-test="statement-start-selecting"]',
  )
  await expectInView(page, page.getByTestId('statement-action-summary'))

  await routeTransfers(page, watch)
  await page.goto('/transfers')
  const pairs = page.getByTestId('transfer-pair')
  await expect(pairs).toHaveCount(PAIRS)
  await pairs.first().getByTestId('pair-unlink').click()
  await page.getByTestId('unlink-continue').click()
  await expect(page.getByTestId('transfers-action-summary')).toContainText('Pair unlinked.')
  await expectBetween(page, 'h1', '[data-test="doubtful-section"]')
  await expectInView(page, page.getByTestId('transfers-action-summary'))

  expectNothingUnforeseen(watch)
})

// ─── Undo from the bottom (R7, C1) ─────────────────────────────────────────

test('Undo pressed from the bottom of the list puts the row back', async ({ page }) => {
  const watch = watchPage(page)

  await routeReview(page, watch)
  await page.goto('/review')
  const rows = page.getByTestId('movement-row')
  await expect(rows).toHaveCount(REVIEW_ROWS)
  await goToBottom(page)
  await reviewRow(page, REVIEW_LAST_ID).getByTestId('movement-confirm').click()
  await expect(rows).toHaveCount(REVIEW_ROWS - 1)
  await expect(reviewRow(page, REVIEW_LAST_ID)).toHaveCount(0)
  await expectInView(page, page.getByTestId('action-undo'))

  await page.getByTestId('action-undo').click()

  await expect(rows).toHaveCount(REVIEW_ROWS)
  await expect(reviewRow(page, REVIEW_LAST_ID)).toHaveCount(1)
  // The same two requests as before this feature: the change, and its opposite.
  expect(watch.writes).toEqual([
    { method: 'PATCH', path: `/api/movements/${REVIEW_LAST_ID}`, body: { status: 'confirmed' } },
    {
      method: 'PATCH',
      path: '/api/movements',
      body: { ids: [REVIEW_LAST_ID], status: 'pending_review' },
    },
  ])
  // The page was not taken back to the top.
  expect(await scrollY(page)).toBeGreaterThan(0)

  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)
  await goToBottom(page)
  const last = statementRow(page, STATEMENT_LAST_ID)
  await expect(last.getByTestId('statement-row-category')).toHaveText('Food')
  await changeStatementCategory(last, GROCERIES.id)
  await expect(last.getByTestId('statement-row-category')).toHaveText('Groceries')
  await expectInView(page, page.getByTestId('statement-action-undo'))

  await page.getByTestId('statement-action-undo').click()

  await expect(last.getByTestId('statement-row-category')).toHaveText('Food')
  await expect(page.getByTestId('statement-action-summary')).toContainText('Change undone')
  expect(watch.writes.slice(2)).toEqual([
    {
      method: 'PATCH',
      path: `/api/movements/${STATEMENT_LAST_ID}`,
      body: { categoryId: GROCERIES.id },
    },
    { method: 'PATCH', path: `/api/movements/${STATEMENT_LAST_ID}`, body: { categoryId: FOOD.id } },
  ])
  expect(await scrollY(page)).toBeGreaterThan(0)
  // The sentence of the undo is still in view from down there.
  await expectInView(page, page.getByTestId('statement-action-summary'))

  expectNothingUnforeseen(watch)
})

// ─── A failed action (R5) ──────────────────────────────────────────────────

test('a failed action shows its error in view from the bottom of the list', async ({ page }) => {
  const watch = watchPage(page)

  await routeReview(page, watch, { reject: true })
  await page.goto('/review')
  const rows = page.getByTestId('movement-row')
  await expect(rows).toHaveCount(REVIEW_ROWS)
  await goToBottom(page)
  await reviewRow(page, REVIEW_LAST_ID).getByTestId('movement-confirm').click()
  await expect(page.getByTestId('action-error')).toHaveText(
    "Nothing changed. Some of those movements don't accept that category.",
  )
  await expect(rows).toHaveCount(REVIEW_ROWS)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('action-error'))
  await expectStuckUnderTopBar(page)

  await routeMovements(page, watch, { reject: true })
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)
  await goToBottom(page)
  await changeStatementCategory(statementRow(page, STATEMENT_LAST_ID), GROCERIES.id)
  await expect(page.getByTestId('statement-action-error')).toHaveText(
    "Nothing changed. That movement doesn't accept that category.",
  )
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('statement-action-error'))
  await expectStuckUnderTopBar(page)

  await routeTransfers(page, watch, { reject: true })
  await page.goto('/transfers')
  const pairs = page.getByTestId('transfer-pair')
  await expect(pairs).toHaveCount(PAIRS)
  await goToBottom(page)
  await pairs.last().getByTestId('pair-unlink').click()
  await page.getByTestId('unlink-continue').click()
  await expect(page.getByTestId('transfers-action-error')).toHaveText(
    'Nothing changed. The server rejected that pair.',
  )
  await expect(pairs).toHaveCount(PAIRS)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectInView(page, page.getByTestId('transfers-action-error'))
  await expectStuckUnderTopBar(page)

  expect(watch.writes.map((write) => `${write.method} ${write.path}`)).toEqual([
    `PATCH /api/movements/${REVIEW_LAST_ID}`,
    `PATCH /api/movements/${STATEMENT_LAST_ID}`,
    'DELETE /api/transfers/pair-24',
  ])
  expectNothingUnforeseen(watch, { rejection: true })
})

// ─── The row that was just changed (R9, R11) ───────────────────────────────

test('the notice does not cover the row that was just changed', async ({ page }) => {
  const watch = watchPage(page)

  // A row in the middle of the queue, brought up until its top edge is exactly at the
  // bottom edge of the top bar: where the notice is about to appear.
  await routeReview(page, watch)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(REVIEW_ROWS)
  const reviewTarget = reviewRow(page, REVIEW_FIRST_ID + 30)
  await bringUnderTopBar(page, reviewTarget)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectAtBottomOfTopBar(page, reviewTarget)
  await expect(page.locator(BLOCK)).toHaveCount(0)
  await reviewCategory(reviewTarget).selectOption(String(GROCERIES.id))
  await expect(page.getByTestId('action-summary')).toContainText(
    '1 movement categorized as Groceries',
  )
  await expectRowClearOfNotice(page, reviewTarget)
  await expectInView(page, page.getByTestId('action-summary'))

  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)
  const statementTarget = statementRow(page, STATEMENT_FIRST_ID + 31)
  await bringUnderTopBar(page, statementTarget)
  expect(await scrollY(page)).toBeGreaterThan(0)
  await expectAtBottomOfTopBar(page, statementTarget)
  await expect(page.locator(BLOCK)).toHaveCount(0)
  await changeStatementCategory(statementTarget, GROCERIES.id)
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Groceries',
  )
  await expectRowClearOfNotice(page, statementTarget)
  await expectInView(page, page.getByTestId('statement-action-summary'))

  expectNothingUnforeseen(watch)
})

/** How far below the top bar the next row is left: its upper part is behind the notice. */
const PARTLY_UNDER = 30

/** The row starts above the bottom edge of the block: the notice is covering part of it. */
async function expectPartlyUnderNotice(page: Page, row: Locator): Promise<void> {
  const now = await edges(page)
  if (now === null) throw new Error('there is no notice on the page')
  expect(await topOf(row)).toBeLessThan(now.blockBottom)
}

// tasks.md does not ask for this test. It is here because R11 speaks of the notice
// «appearing or changing», and the test above only covers it appearing. Two cases with
// the notice ALREADY stuck under the top bar: acting on another row, and acting a
// second time on the same row.
test('the notice does not cover a row changed while the notice is already showing', async ({
  page,
}) => {
  const watch = watchPage(page)

  await routeReview(page, watch)
  await page.goto('/review')
  await expect(page.getByTestId('movement-row')).toHaveCount(REVIEW_ROWS)
  const reviewFirst = reviewRow(page, REVIEW_FIRST_ID + 30)
  await bringUnderTopBar(page, reviewFirst)
  await reviewCategory(reviewFirst).selectOption(String(GROCERIES.id))
  await expect(page.getByTestId('action-summary')).toContainText('categorized as Groceries')
  await expectStuckUnderTopBar(page)

  // Another row, with its upper part behind the notice that is already there.
  const reviewOther = reviewRow(page, REVIEW_FIRST_ID + 36)
  await bringUnderTopBar(page, reviewOther, PARTLY_UNDER)
  await expectPartlyUnderNotice(page, reviewOther)
  await reviewCategory(reviewOther).selectOption(String(TRANSPORT.id))
  await expect(page.getByTestId('action-summary')).toContainText('categorized as Transport')
  await expectRowClearOfNotice(page, reviewOther)

  // The same row a second time, again with its upper part behind the notice.
  await bringUnderTopBar(page, reviewOther, PARTLY_UNDER)
  await expectPartlyUnderNotice(page, reviewOther)
  await reviewCategory(reviewOther).selectOption(String(GROCERIES.id))
  await expect(page.getByTestId('action-summary')).toContainText('categorized as Groceries')
  await expectRowClearOfNotice(page, reviewOther)

  await routeMovements(page, watch)
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(STATEMENT_ROWS)
  const statementFirst = statementRow(page, STATEMENT_FIRST_ID + 31)
  await bringUnderTopBar(page, statementFirst)
  await changeStatementCategory(statementFirst, GROCERIES.id)
  await expect(page.getByTestId('statement-action-summary')).toContainText('Groceries')
  await expectStuckUnderTopBar(page)

  const statementOther = statementRow(page, STATEMENT_FIRST_ID + 37)
  await bringUnderTopBar(page, statementOther, PARTLY_UNDER)
  await expectPartlyUnderNotice(page, statementOther)
  await changeStatementCategory(statementOther, TRANSPORT.id)
  await expect(page.getByTestId('statement-action-summary')).toContainText('Transport')
  await expectRowClearOfNotice(page, statementOther)

  await bringUnderTopBar(page, statementOther, PARTLY_UNDER)
  await expectPartlyUnderNotice(page, statementOther)
  await changeStatementCategory(statementOther, GROCERIES.id)
  await expect(page.getByTestId('statement-action-summary')).toContainText('Groceries')
  await expectRowClearOfNotice(page, statementOther)

  expectNothingUnforeseen(watch)
})

// ─── An open dialog (R10) ──────────────────────────────────────────────────

test('an open dialog paints over the notice', async ({ page }) => {
  const watch = watchPage(page)
  await routeReview(page, watch)
  await page.goto('/review')
  const rows = page.getByTestId('movement-row')
  await expect(rows).toHaveCount(REVIEW_ROWS)

  await goToBottom(page)
  await reviewRow(page, REVIEW_LAST_ID).getByTestId('movement-confirm').click()
  await expect(rows).toHaveCount(REVIEW_ROWS - 1)
  await expectInView(page, page.getByTestId('action-summary'))
  await expectStuckUnderTopBar(page)

  await reviewRow(page, REVIEW_LAST_ID - 1)
    .getByTestId('movement-create-rule')
    .click()
  await expect(page.getByTestId('rule-dialog')).toBeVisible()

  // The notice is still stuck under the top bar, and what the browser paints at its
  // centre is the dialog's darkened background, not the notice.
  await expect(page.getByTestId('action-summary')).toHaveCount(1)
  await expectStuckUnderTopBar(page)
  const atCentre = await page.evaluate((selector) => {
    const block = document.querySelector(selector)
    const scrim = document.querySelector('[data-test="dialog-scrim"]')
    if (!block || !scrim) return null
    const box = block.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return {
      insideTheNotice: hit !== null && block.contains(hit),
      insideTheDialog: hit !== null && scrim.contains(hit),
    }
  }, BLOCK)
  expect(atCentre).toEqual({ insideTheNotice: false, insideTheDialog: true })

  expectNothingUnforeseen(watch)
})
