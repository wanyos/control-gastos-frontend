import { test, expect } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

// Import dialog (feature 13) in a real browser, without a backend: every /api call
// is answered with page.route. POST /api/import is NEVER let through to a real
// server: it moves files in Drive and rewrites the database.

const NET_WORTH_SAMPLE = {
  asOf: '2026-09-15',
  total: '1500.00',
  accounts: {
    total: '1500.00',
    accounts: [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '1500.00' },
    ],
  },
  investments: { total: '0.00', products: [], issues: [] },
}

const PENDING_TWO = {
  totalPending: 2,
  banks: [
    {
      bank: 'bankinter',
      years: [
        { year: '2026', pendingCount: 1, pending: [{ fileId: 'a1', name: 'movs-agosto.xlsx' }] },
      ],
    },
    {
      bank: 'myinvestor',
      years: [{ year: '2026', pendingCount: 1, pending: [{ fileId: 'b1', name: 'extracto.csv' }] }],
    },
  ],
}

const statement = {
  bank: 'bankinter',
  year: '2026',
  fileId: 'a1',
  name: 'movs-agosto.xlsx',
  status: 'imported',
  account: {
    id: 3,
    iban: 'ES2101280000000000000236',
    bank: 'bankinter',
    alias: 'bankinter 0236',
    type: 'checking',
    created: false,
    appliedDefaults: { alias: false, type: false },
    balanceAnchor: '1500.00',
  },
  imported: 39,
  duplicates: 2,
  anchored: false,
  balancesFilled: 0,
  unparsedCount: 0,
  unparsedRows: [],
  balanceMismatches: [],
  movedToProcessed: true,
}

const PARTIAL_REPORT = {
  importedCount: 39,
  duplicateCount: 2,
  unparsedCount: 0,
  failedCount: 1,
  skippedCount: 0,
  balanceMismatchCount: 0,
  importedProductCount: 0,
  anchoredCount: 0,
  balanceFilledCount: 0,
  files: [
    statement,
    {
      ...statement,
      bank: 'myinvestor',
      fileId: 'b1',
      name: 'extracto.csv',
      status: 'failed',
      account: null,
      imported: 0,
      duplicates: 0,
      movedToProcessed: false,
      error: { code: 'NOT_UTF8', message: 'Los bytes del archivo no son UTF-8 válido.' },
    },
  ],
  transfers: { pairsCreated: 0, ambiguousCount: 0, ambiguous: [] },
  categorization: { categorized: 0, conflictCount: 0, conflicts: [], unmatched: 0 },
}

interface Watch {
  consoleErrors: { text: string; url: string }[]
  pageErrors: Error[]
  importRequests: Request[]
}

async function prepare(page: Page, answerImport: Parameters<Page['route']>[1]): Promise<Watch> {
  const watch: Watch = { consoleErrors: [], pageErrors: [], importRequests: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error')
      watch.consoleErrors.push({ text: msg.text(), url: msg.location().url })
  })
  page.on('pageerror', (error) => watch.pageErrors.push(error))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/import') watch.importRequests.push(request)
  })

  // Safety net first (later routes win): any other API call is aborted, never proxied.
  await page.route('**/api/**', (route) => route.abort())
  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  await page.route('**/api/ingestion/pending', (route) => route.fulfill({ json: PENDING_TWO }))
  await page.route('**/api/import', answerImport)
  return watch
}

async function confirmImport(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('pending-badge')).toHaveText('2 new files')

  await page.getByTestId('import-button').click()
  const dialog = page.getByRole('dialog', { name: 'Import from Google Drive' })
  await expect(dialog).toContainText('2 new files found')
  await dialog.getByRole('button', { name: 'Import 2 files' }).click()
  return dialog
}

test.use({ testIdAttribute: 'data-test' })

test('imports with one POST without body or Content-Type and shows a partial result', async ({
  page,
}) => {
  const watch = await prepare(page, (route) => route.fulfill({ json: PARTIAL_REPORT }))

  const dialog = await confirmImport(page)

  await expect(dialog.getByTestId('outcome-headline')).toHaveText('Partially imported')
  await expect(dialog.getByTestId('file-issue')).toHaveCount(1)
  await expect(dialog.getByTestId('file-issue-message')).toHaveText(
    "The file isn't saved as UTF-8. Save it as UTF-8 and try again.",
  )

  expect(watch.importRequests).toHaveLength(1)
  const [post] = watch.importRequests
  expect(post?.method()).toBe('POST')
  expect(post?.postData()).toBeNull()
  expect(Object.keys((await post?.allHeaders()) ?? {})).not.toContain('content-type')

  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})

test('warns that some files may be in when the import gets a Drive 503', async ({ page }) => {
  const watch = await prepare(page, (route) =>
    route.fulfill({
      status: 503,
      json: {
        statusCode: 503,
        code: 'DRIVE_CONNECTION_ERROR',
        message: 'No se puede conectar con Google Drive',
      },
    }),
  )

  const dialog = await confirmImport(page)

  await expect(dialog.getByTestId('failure-title')).toHaveText("Couldn't reach Google Drive")
  await expect(dialog.getByTestId('failure-detail')).toHaveText(
    'Some files may already have been imported. Trying again is safe: nothing is imported twice.',
  )
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible()

  expect(watch.importRequests).toHaveLength(1)
  expect(watch.pageErrors).toEqual([])
  // The only console error allowed is the browser reporting the expected 503.
  expect(watch.consoleErrors.filter((error) => !error.url.endsWith('/api/import'))).toEqual([])
})

// Feature 14: a large report must not push the title or Close out of the window.
// Built here, not imported from the unit fixtures: those load vitest.
function largeReport() {
  const files = Array.from({ length: 40 }, (_, i) => ({
    ...statement,
    fileId: `large-${i}`,
    name: `movs-${String(i + 1).padStart(2, '0')}.xlsx`,
    ...(i === 0
      ? {
          unparsedCount: 30,
          unparsedRows: Array.from({ length: 30 }, (_row, row) => ({
            row: row + 2,
            reason: 'fecha no interpretable',
          })),
        }
      : {}),
  }))
  return {
    ...PARTIAL_REPORT,
    importedCount: 39 * 40,
    duplicateCount: 2 * 40,
    unparsedCount: 30,
    failedCount: 0,
    files,
    transfers: {
      pairsCreated: 0,
      ambiguousCount: 12,
      ambiguous: Array.from({ length: 12 }, (_, i) => ({
        amount: `${100 + i}.00`,
        movements: [
          {
            id: 100 + i * 2,
            accountId: 1,
            accountAlias: 'bankinter 0236',
            type: 'expense',
            bookingDate: '2026-08-02',
            description: `TRANSFERENCIA EMITIDA ${i}`,
          },
          {
            id: 101 + i * 2,
            accountId: 2,
            accountAlias: 'openbank 1111',
            type: 'income',
            bookingDate: '2026-08-02',
            description: `TRANSFERENCIA RECIBIDA ${i}`,
          },
        ],
      })),
    },
    categorization: {
      categorized: 0,
      conflictCount: 11,
      conflicts: Array.from({ length: 11 }, (_, i) => ({
        movementId: 500 + i,
        description: `COMPRA EJEMPLO ${i}`,
        bookingDate: '2026-08-10',
        matches: [
          { ruleId: 1, matchText: 'compra', categoryId: 4, categoryName: 'Supermercado' },
          { ruleId: 2, matchText: 'ejemplo', categoryId: 6, categoryName: 'Compras' },
        ],
      })),
      unmatched: 0,
    },
  }
}

test('keeps the title and Close in view with a large report fully unfolded', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const watch = await prepare(page, (route) => route.fulfill({ json: largeReport() }))

  const dialog = await confirmImport(page)

  await expect(dialog.getByTestId('outcome-headline')).toHaveText(
    'Imported, with a few things to check',
  )
  const details = dialog.getByTestId('import-details')
  const summaries = details.locator('summary')
  await expect(summaries).toHaveCount(4)
  for (const summary of await summaries.all()) await summary.click()
  await expect(details.locator('details[open]')).toHaveCount(4)
  await expect(dialog.getByTestId('unread-line')).toHaveCount(5)
  await expect(dialog.getByTestId('imported-file')).toHaveCount(40)

  const body = dialog.getByTestId('dialog-body')
  await body.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  const scroll = await body.evaluate((element) => ({
    top: element.scrollTop,
    overflowing: element.scrollHeight > element.clientHeight,
  }))
  expect(scroll.overflowing).toBe(true)
  expect(scroll.top).toBeGreaterThan(0)

  await expect(dialog.getByTestId('import-close')).toBeInViewport()
  await expect(dialog.getByRole('heading', { name: 'Import from Google Drive' })).toBeInViewport()
  const box = await dialog.boundingBox()
  expect(box?.height ?? Infinity).toBeLessThanOrEqual(720)

  expect(watch.importRequests).toHaveLength(1)
  expect(watch.pageErrors).toEqual([])
  expect(watch.consoleErrors).toEqual([])
})
