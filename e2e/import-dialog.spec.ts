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
