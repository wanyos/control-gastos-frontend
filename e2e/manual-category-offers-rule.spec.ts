import { test, expect } from '@playwright/test'
import type { Locator, Page, Route } from '@playwright/test'

// Feature 34 in a real browser: after changing the category of one line of `Movements`
// by hand, the screen asks whether the other movements that contain a text get that
// category too, with what `GET /api/category-rules/preview` says would move. Saying yes
// creates the rule with the usual POST; saying no leaves only the one change.
//
// There is no backend: every /api call is answered with page.route. The first route
// aborts ANY /api call (later routes win) and writes it down in a list that each test
// checks to be empty at the end. The dev server proxies /api to a real backend on :3000,
// so without that first route the PATCH or the POST of this file would really be sent.

type Raw = Record<string, unknown>

const CHECKING = {
  id: 2,
  iban: 'ES7100302053091234567895',
  bank: 'bankinter',
  alias: 'bankinter ···7895',
  type: 'checking',
}

const FOOD = { id: 5, name: 'Food', kind: 'expense', parentId: null }
const EDUCATION = { id: 8, name: 'Educación', kind: 'expense', parentId: null }
const OTHER_EXPENSES = { id: 9, name: 'Otros gastos', kind: 'expense', parentId: null }

const CATEGORY_BY_ID = new Map<number, Raw>(
  [FOOD, EDUCATION, OTHER_EXPENSES].map((category) => [category.id, category]),
)

const CATEGORIES = [FOOD, EDUCATION, OTHER_EXPENSES].map((category, index) => ({
  ...category,
  createdAt: `2026-08-06T18:3${index}:00.000Z`,
  children: [],
}))

/** The month the screen opens on, whatever day the suite runs. */
const currentMonth = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const CHANGED_ID = 9101

/** As the backend compares a rule text: no accents, lower case, no spaces at the ends. */
const normalize = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/**
 * One made-up month. The line changed by hand is the first one. Of the others that
 * contain `academia ficticia norte`, two would move (one without a category, one whose
 * category the closing of the import set) and one would not (set by hand). One more
 * contains only `academia ficticia`.
 */
const monthRows = (month: string): Raw[] => {
  const line = (
    id: number,
    day: string,
    description: string,
    amount: string,
    extra: Raw = {},
  ): Raw => ({
    id,
    type: 'expense',
    bookingDate: `${month}-${day}`,
    valueDate: `${month}-${day}`,
    amount,
    description,
    balanceAfter: null,
    currency: 'EUR',
    note: null,
    accountId: CHECKING.id,
    account: CHECKING,
    categoryId: null,
    categorySource: null,
    category: null,
    paymentMethod: null,
    origin: 'imported',
    status: 'pending_review',
    excludedFromTotals: false,
    deposit: null,
    transferId: null,
    daySequence: 1,
    createdAt: '2026-09-12T18:30:00.000Z',
    updatedAt: '2026-09-12T18:30:00.000Z',
    ...extra,
  })
  return [
    line(CHANGED_ID, '17', 'RECIBO /Academia Ficticia Norte', '86.40'),
    line(9102, '14', 'RECIBO /Academia Ficticia Norte', '86.40', {
      categoryId: OTHER_EXPENSES.id,
      categorySource: 'closing',
      category: OTHER_EXPENSES,
      status: 'confirmed',
    }),
    line(9103, '11', 'RECIBO ACADEMIA FICTICIA NORTE MATRICULA', '42.75'),
    line(9104, '09', 'RECIBO /Academia Ficticia Norte', '86.40', {
      categoryId: EDUCATION.id,
      categorySource: 'manual',
      category: EDUCATION,
      status: 'confirmed',
    }),
    line(9105, '06', 'ACADEMIA FICTICIA SUR CURSO', '31.15'),
    line(9106, '04', 'SUPERMERCADO INVENTADO 4521', '57.83', {
      categoryId: FOOD.id,
      categorySource: 'manual',
      category: FOOD,
      status: 'confirmed',
    }),
    line(9107, '02', '8812 KIOSCO DE PRUEBA', '6.85'),
  ]
}

interface Watch {
  /** Every /api call no route of this file foresaw: it was aborted, and it fails the test. */
  aborted: string[]
  /** Every request that was not a GET, as `<METHOD> <path> <body>`. */
  writes: string[]
  /** Every `GET /api/category-rules/preview`, as `<matchText> → <categoryId>`. */
  previews: string[]
  consoleErrors: string[]
  pageErrors: Error[]
}

/**
 * A fake of one month with state: the PATCH really writes on its line, and the preview
 * and the POST pick the same movements as the contract says (pending without a category
 * or set by the closing of the import, never by hand or by a rule). The POST moves them.
 */
async function prepare(page: Page): Promise<Watch> {
  const watch: Watch = { aborted: [], writes: [], previews: [], consoleErrors: [], pageErrors: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') watch.consoleErrors.push(msg.text())
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (!path.startsWith('/api/') || request.method() === 'GET') return
    watch.writes.push(`${request.method()} ${path} ${request.postData() ?? ''}`)
  })

  const month = currentMonth()
  const rows = monthRows(month)
  const stop = (route: Route): Promise<void> => {
    const request = route.request()
    watch.aborted.push(`${request.method()} ${new URL(request.url()).pathname}`)
    return route.abort()
  }

  /** What a rule with this text would move now: the contract's choice of movements. */
  const wouldMove = (matchText: string): Raw[] =>
    rows.filter(
      (row) =>
        (row.categoryId === null || row.categorySource === 'closing') &&
        normalize(String(row.description)).includes(matchText),
    )

  const categorization = (
    moved: Raw[],
    categoryId: number,
    ruleId: number | null,
    text: string,
  ) => ({
    categorized: moved.length,
    categorizedMovements: moved.map((row) => ({
      movementId: row.id,
      description: row.description,
      bookingDate: row.bookingDate,
      amount: row.amount,
      type: row.type,
      categoryId,
      categoryName: CATEGORY_BY_ID.get(categoryId)?.name ?? '',
      rules: [{ ruleId, matchText: text }],
    })),
    conflictCount: 0,
    conflicts: [],
    unmatched: rows.length - moved.length,
  })

  // First route: any /api call not answered below is aborted, never proxied to :3000.
  await page.route('**/api/**', stop)
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  await page.route('**/api/accounts', (route) =>
    route.fulfill({ json: [{ ...CHECKING, balance: '3127.58' }] }),
  )
  await page.route('**/api/transfers/ambiguous', (route) =>
    route.fulfill({ json: { ambiguousCount: 0, ambiguous: [] } }),
  )
  await page.route('**/api/categories', (route) => route.fulfill({ json: CATEGORIES }))

  await page.route('**/api/movements/*', (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return stop(route)
    const id = Number(new URL(request.url()).pathname.split('/').at(-1))
    const body = JSON.parse(request.postData() ?? '{}') as { categoryId: number | null }
    const row = rows.find((one) => one.id === id)
    if (!row) return stop(route)
    row.categoryId = body.categoryId
    row.category = body.categoryId === null ? null : (CATEGORY_BY_ID.get(body.categoryId) ?? null)
    row.categorySource = body.categoryId === null ? null : 'manual'
    return route.fulfill({ json: { ...row } })
  })

  await page.route('**/api/movements*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname !== '/api/movements' || request.method() !== 'GET') return stop(route)
    const query = url.searchParams
    if (query.get('pageSize') === '1') {
      return route.fulfill({
        json: {
          movements: [],
          pagination: { page: 1, pageSize: 1, total: 4, totalPages: 4 },
          totals: { income: '0.00', expense: '0.00', net: '0.00' },
        },
      })
    }
    if ((query.get('from') ?? '').slice(0, 7) !== month) return stop(route)
    const expense = rows.reduce((sum, row) => sum + Number(row.amount), 0)
    return route.fulfill({
      json: {
        movements: rows.map((row) => ({ ...row })),
        pagination: { page: 1, pageSize: 200, total: rows.length, totalPages: 1 },
        totals: { income: '0.00', expense: expense.toFixed(2), net: (-expense).toFixed(2) },
      },
    })
  })

  await page.route('**/api/category-rules/preview*', (route) => {
    const request = route.request()
    if (request.method() !== 'GET') return stop(route)
    const query = new URL(request.url()).searchParams
    const matchText = normalize(query.get('matchText') ?? '')
    const categoryId = Number(query.get('categoryId'))
    watch.previews.push(`${matchText} → ${categoryId}`)
    return route.fulfill({
      json: {
        matchText,
        categoryId,
        categorization: categorization(wouldMove(matchText), categoryId, null, matchText),
      },
    })
  })

  await page.route('**/api/category-rules', (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return stop(route)
    const body = JSON.parse(request.postData() ?? '{}') as { matchText: string; categoryId: number }
    const matchText = normalize(body.matchText)
    const category = CATEGORY_BY_ID.get(body.categoryId) ?? null
    const moved = wouldMove(matchText)
    for (const row of moved) {
      row.categoryId = body.categoryId
      row.category = category
      row.categorySource = 'rule'
    }
    return route.fulfill({
      status: 201,
      json: {
        id: 41,
        matchText,
        categoryId: body.categoryId,
        category,
        createdAt: '2026-10-18T09:14:00.000Z',
        updatedAt: '2026-10-18T09:14:00.000Z',
        categorization: categorization(moved, body.categoryId, 41, matchText),
      },
    })
  })

  return watch
}

function expectNothingUnforeseen(watch: Watch): void {
  expect(watch.aborted).toEqual([])
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
}

test.use({ testIdAttribute: 'data-test' })

const line = (page: Page, id: number): Locator => page.locator(`[data-movement-id="${id}"]`)

/** Opens the editor of one line and picks a category in it: the gesture of feature 21. */
async function changeCategory(page: Page, id: number, categoryId: number): Promise<void> {
  const row = line(page, id)
  await row.getByTestId('statement-row-category-button').click()
  await row.getByTestId('row-category-select').locator('select').selectOption(String(categoryId))
}

const PATCH_EDUCATION = `PATCH /api/movements/${CHANGED_ID} {"categoryId":${EDUCATION.id}}`

/** Opens `Movements`, changes the first line to Educación and waits for the question. */
async function changeAndSeeTheQuestion(page: Page, watch: Watch): Promise<Locator> {
  await page.goto('/movements')
  await expect(page.getByTestId('statement-row')).toHaveCount(7)
  await changeCategory(page, CHANGED_ID, EDUCATION.id)
  await expect(line(page, CHANGED_ID).getByTestId('statement-row-category')).toHaveText('Educación')
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Educación',
  )
  const question = page.locator(
    '[data-test="sticky-below-top-bar"] [data-test="other-movements-question"]',
  )
  await expect(question).toHaveCount(1)
  await expect(question.getByTestId('other-movements-headline')).toHaveText(
    'Use Educación for the other movements that contain this text too?',
  )
  await expect(question.getByTestId('other-movements-text').getByRole('textbox')).toHaveValue(
    'academia ficticia norte',
  )
  await expect(question.getByTestId('other-movements-count')).toHaveText(
    '2 other movements would move to Educación.',
  )
  expect(watch.previews).toEqual([`academia ficticia norte → ${EDUCATION.id}`])
  // Before any answer, the only write is the change of that one line (R10).
  expect(watch.writes).toEqual([PATCH_EDUCATION])
  return question
}

test('in Movements saying yes creates the rule and the line says how many movements it moved', async ({
  page,
}) => {
  const watch = await prepare(page)
  const question = await changeAndSeeTheQuestion(page, watch)

  // Which ones, folded until asked for; unfolding them asks nothing (R4).
  const requestsBefore = watch.previews.length
  await expect(question.getByTestId('other-movements-list')).toHaveCount(0)
  await question.getByTestId('other-movements-show').click()
  const items = question.getByTestId('other-movements-item')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('RECIBO /Academia Ficticia Norte')
  await expect(items.nth(0)).toContainText('86,40')
  await expect(items.nth(1)).toContainText('RECIBO ACADEMIA FICTICIA NORTE MATRICULA')
  await expect(items.nth(1)).toContainText('42,75')
  expect(watch.previews).toHaveLength(requestsBefore)
  expect(watch.writes).toEqual([PATCH_EDUCATION])

  await question.getByTestId('other-movements-create').click()

  // The green line of the created rule, with the number, where the question was (R11).
  await expect(page.getByTestId('rule-created-line')).toHaveText(
    'Rule “academia ficticia norte” → Educación created: 2 movements categorized.',
  )
  await expect(page.getByTestId('other-movements-question')).toHaveCount(0)
  await expect(
    page.locator('[data-test="sticky-below-top-bar"] [data-test="rule-created-notice"]'),
  ).toHaveCount(1)
  // It takes the place of the line of the change and its Undo, as in Review.
  await expect(page.getByTestId('statement-action-summary')).toHaveCount(0)
  await expect(page.getByTestId('statement-action-undo')).toHaveCount(0)
  // The month was asked for again and shows what the rule moved; the line set by hand
  // and the one of another text did not move.
  await expect(line(page, 9102).getByTestId('statement-row-category')).toHaveText('Educación')
  await expect(line(page, 9103).getByTestId('statement-row-category')).toHaveText('Educación')
  await expect(line(page, 9105).getByTestId('statement-row-category')).not.toHaveText('Educación')

  // Exactly the change of the one line and one POST with the text of the box (R10).
  expect(watch.writes).toEqual([
    PATCH_EDUCATION,
    `POST /api/category-rules {"matchText":"academia ficticia norte","categoryId":${EDUCATION.id}}`,
  ])
  expectNothingUnforeseen(watch)
})

test('saying no sends nothing after the change of the one movement', async ({ page }) => {
  const watch = await prepare(page)
  const question = await changeAndSeeTheQuestion(page, watch)

  await question.getByTestId('other-movements-dismiss').click()

  await expect(page.getByTestId('other-movements-question')).toHaveCount(0)
  // The line of the change and its Undo are still there; nothing else moved.
  await expect(page.getByTestId('statement-action-summary')).toContainText(
    'Categorized as Educación',
  )
  await expect(page.getByTestId('statement-action-undo')).toHaveCount(1)
  await expect(page.getByTestId('rule-created-notice')).toHaveCount(0)
  await expect(line(page, 9102).getByTestId('statement-row-category')).toHaveText('Otros gastos')
  await expect(line(page, 9103).getByTestId('statement-row-category')).not.toHaveText('Educación')

  expect(watch.writes).toEqual([PATCH_EDUCATION])
  expect(watch.previews).toEqual([`academia ficticia norte → ${EDUCATION.id}`])
  expectNothingUnforeseen(watch)
})

test('editing the text asks the preview again and the count follows it', async ({ page }) => {
  const watch = await prepare(page)
  const question = await changeAndSeeTheQuestion(page, watch)
  const box = question.getByTestId('other-movements-text').getByRole('textbox')

  // A shorter text also takes the course of the south academy.
  await box.fill('academia ficticia')
  await expect(question.getByTestId('other-movements-count')).toHaveText(
    '3 other movements would move to Educación.',
  )
  await question.getByTestId('other-movements-show').click()
  await expect(question.getByTestId('other-movements-item')).toHaveCount(3)
  await expect(question.getByTestId('other-movements-list')).toContainText(
    'ACADEMIA FICTICIA SUR CURSO',
  )

  // A text no other movement contains: it says so and Create rule stays on (R7).
  await box.fill('academia inventada')
  await expect(question.getByTestId('other-movements-none')).toHaveText(
    'No other movement would move with this text right now.',
  )
  await expect(question.getByTestId('other-movements-create')).toBeEnabled()

  // One preview per text typed, each with the same category; still only the PATCH.
  expect(watch.previews).toEqual([
    `academia ficticia norte → ${EDUCATION.id}`,
    `academia ficticia → ${EDUCATION.id}`,
    `academia inventada → ${EDUCATION.id}`,
  ])
  expect(watch.writes).toEqual([PATCH_EDUCATION])
  expectNothingUnforeseen(watch)
})
