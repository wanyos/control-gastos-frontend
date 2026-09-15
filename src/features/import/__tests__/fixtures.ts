import { vi } from 'vitest'

// Raw API payloads for the import tests (feature 13), shaped like
// gastos-backend/docs/api-contract.md. Backend messages are in Spanish, as the
// real ones. Tests parse them through the service, so they stay raw JSON here.

/** `GET /api/ingestion/pending` with 2 files in 2 banks. */
export const PENDING_TWO = {
  totalPending: 2,
  banks: [
    {
      bank: 'bankinter',
      years: [
        { year: '2026', pendingCount: 1, pending: [{ fileId: '1AbC', name: 'movs-agosto.xlsx' }] },
      ],
    },
    {
      bank: 'n26',
      years: [
        { year: '2026', pendingCount: 1, pending: [{ fileId: '2DeF', name: 'n26-agosto.csv' }] },
      ],
    },
  ],
}

export const PENDING_NONE = { totalPending: 0, banks: [] }

/** 9 files: over the 8 that are shown unfolded. */
export const PENDING_MANY = {
  totalPending: 9,
  banks: [
    {
      bank: 'bankinter',
      years: [
        {
          year: '2025',
          pendingCount: 2,
          pending: [
            { fileId: 'b1', name: 'movs-2025-11.xlsx' },
            { fileId: 'b2', name: 'movs-2025-12.xlsx' },
          ],
        },
        {
          year: '2026',
          pendingCount: 3,
          pending: [
            { fileId: 'b3', name: 'movs-2026-01.xlsx' },
            { fileId: 'b4', name: 'movs-2026-02.xlsx' },
            { fileId: 'b5', name: 'movs-2026-03.xlsx' },
          ],
        },
      ],
    },
    {
      bank: 'openbank',
      years: [
        {
          year: '2026',
          pendingCount: 4,
          pending: [
            { fileId: 'o1', name: 'openbank-01.xls' },
            { fileId: 'o2', name: 'openbank-02.xls' },
            { fileId: 'o3', name: 'openbank-03.xls' },
            { fileId: 'o4', name: 'openbank-04.xls' },
          ],
        },
      ],
    },
  ],
}

/** A bank the frontend has no readable name for. */
export const PENDING_UNKNOWN_BANK = {
  totalPending: 1,
  banks: [
    {
      bank: 'newbank',
      years: [
        { year: '2026', pendingCount: 1, pending: [{ fileId: 'nb1', name: 'extracto.csv' }] },
      ],
    },
  ],
}

const EMPTY_TRANSFERS = { pairsCreated: 0, ambiguousCount: 0, ambiguous: [] }
const EMPTY_CATEGORIZATION = { categorized: 0, conflictCount: 0, conflicts: [], unmatched: 0 }

const ZERO_TOTALS = {
  importedCount: 0,
  duplicateCount: 0,
  unparsedCount: 0,
  failedCount: 0,
  skippedCount: 0,
  balanceMismatchCount: 0,
  importedProductCount: 0,
  anchoredCount: 0,
  balanceFilledCount: 0,
}

/** A statement that went in: account created, one unread row and one mismatch. */
export const STATEMENT_IMPORTED = {
  bank: 'bankinter',
  year: '2026',
  fileId: '1AbC',
  name: 'movs-agosto.xlsx',
  status: 'imported',
  account: {
    id: 3,
    iban: 'ES2101280000000000000236',
    bank: 'bankinter',
    alias: 'bankinter 0236',
    type: 'checking',
    created: true,
    appliedDefaults: { alias: true, type: true },
    balanceAnchor: '1500.00',
  },
  imported: 39,
  duplicates: 2,
  anchored: true,
  balancesFilled: 0,
  unparsedCount: 1,
  unparsedRows: [{ row: 42, reason: 'importe no interpretable' }],
  balanceMismatches: [
    {
      accountId: 3,
      accountAlias: 'bankinter 0236',
      date: '2026-07-21',
      computed: '-40.00',
      fromFile: '-20.00',
      difference: '-20.00',
      check: 'per-line',
    },
  ],
  movedToProcessed: true,
}

export const STATEMENT_MISSING_ACCOUNT = {
  bank: 'myinvestor',
  year: '2026',
  fileId: '9XyZ',
  name: 'extracto.csv',
  status: 'failed',
  account: null,
  imported: 0,
  duplicates: 0,
  anchored: false,
  balancesFilled: 0,
  unparsedCount: 0,
  unparsedRows: [],
  balanceMismatches: [],
  movedToProcessed: false,
  error: {
    code: 'MISSING_ACCOUNT_DATA',
    message:
      'El archivo no trae IBAN y el banco myinvestor no tiene exactamente una cuenta dada de alta.',
  },
}

/** A failed statement that carries no `error` at all. */
export const STATEMENT_FAILED_NO_ERROR = {
  bank: 'openbank',
  year: '2026',
  fileId: '3GhI',
  name: 'openbank-agosto.xls',
  status: 'failed',
  account: null,
  imported: 0,
  duplicates: 0,
  anchored: false,
  balancesFilled: 0,
  unparsedCount: 0,
  unparsedRows: [],
  balanceMismatches: [],
  movedToProcessed: false,
}

export const PRODUCT_IMPORTED = {
  bank: 'myinvestor',
  year: '2026',
  fileId: '5Qrs',
  name: 'fondo-indexado.json',
  status: 'imported',
  product: { id: 7, bank: 'myinvestor', name: 'Fondo indexado', type: 'fund', created: true },
  snapshot: { date: '2026-08-31', created: true },
  movedToProcessed: true,
}

export const DEPOSIT_IMPORTED = {
  bank: 'myinvestor',
  year: '2026',
  fileId: '6Stu',
  name: 'deposito.json',
  status: 'imported',
  product: {
    id: 8,
    bank: 'myinvestor',
    name: 'Depósito 12 meses',
    type: 'deposit',
    created: false,
  },
  snapshot: null,
  movedToProcessed: true,
}

/** A failed product file: `product` and `snapshot` come as null. */
export const PRODUCT_FAILED = {
  bank: 'trade-republic',
  year: '2026',
  fileId: '7Tuv',
  name: 'cuenta-remunerada-2026-08-31.json',
  status: 'failed',
  product: null,
  snapshot: null,
  movedToProcessed: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Los cinco importes no cuadran: saldo final 1200.00, calculado 1199.50.',
  },
}

/** Defensive case: a file no reader recognizes (uploaded by mistake). */
export const SKIPPED_FILE = {
  bank: 'n26',
  year: '2026',
  fileId: '8Wxy',
  name: 'captura.png',
  status: 'skipped',
  reason: 'No hay parser para la extensión .png del banco n26',
  movedToProcessed: false,
}

/** The whole report: every file shape, one ambiguous transfer and one category conflict. */
export const FULL_REPORT = {
  importedCount: 39,
  duplicateCount: 2,
  unparsedCount: 1,
  failedCount: 3,
  skippedCount: 1,
  balanceMismatchCount: 1,
  importedProductCount: 2,
  anchoredCount: 1,
  balanceFilledCount: 0,
  files: [
    STATEMENT_IMPORTED,
    STATEMENT_MISSING_ACCOUNT,
    STATEMENT_FAILED_NO_ERROR,
    PRODUCT_IMPORTED,
    DEPOSIT_IMPORTED,
    PRODUCT_FAILED,
    SKIPPED_FILE,
  ],
  transfers: {
    pairsCreated: 2,
    ambiguousCount: 1,
    ambiguous: [
      {
        amount: '500.00',
        movements: [
          {
            id: 12,
            accountId: 1,
            accountAlias: 'bankinter 0236',
            type: 'expense',
            bookingDate: '2026-08-01',
            description: 'TRANSFERENCIA',
          },
          {
            id: 40,
            accountId: 2,
            accountAlias: 'openbank 1111',
            type: 'income',
            bookingDate: '2026-08-01',
            description: 'TRANSFERENCIA RECIBIDA',
          },
        ],
      },
    ],
  },
  categorization: {
    categorized: 12,
    conflictCount: 1,
    conflicts: [
      {
        movementId: 210,
        description: 'PAGO SINTETICO EJEMPLO',
        bookingDate: '2026-08-14',
        matches: [
          { ruleId: 3, matchText: 'sintetico', categoryId: 4, categoryName: 'Supermercado' },
          { ruleId: 9, matchText: 'ejemplo', categoryId: 6, categoryName: 'Compras' },
        ],
      },
    ],
    unmatched: 5,
  },
}

/** Edge: nothing was pending by the time the import ran. */
export const EMPTY_REPORT = {
  ...ZERO_TOTALS,
  files: [],
  transfers: EMPTY_TRANSFERS,
  categorization: EMPTY_CATEGORIZATION,
}

/** Edge: every line was already stored. */
export const ALL_DUPLICATES_REPORT = {
  ...ZERO_TOTALS,
  duplicateCount: 12,
  files: [
    {
      ...STATEMENT_IMPORTED,
      account: { ...STATEMENT_IMPORTED.account, created: false },
      imported: 0,
      duplicates: 12,
      anchored: false,
      unparsedCount: 0,
      unparsedRows: [],
      balanceMismatches: [],
    },
  ],
  transfers: EMPTY_TRANSFERS,
  categorization: EMPTY_CATEGORIZATION,
}

/** Edge: only product files, all stored. */
export const ONLY_PRODUCTS_REPORT = {
  ...ZERO_TOTALS,
  importedProductCount: 2,
  files: [PRODUCT_IMPORTED, DEPOSIT_IMPORTED],
  transfers: EMPTY_TRANSFERS,
  categorization: EMPTY_CATEGORIZATION,
}

/** Edge: every file failed. */
export const ALL_FAILED_REPORT = {
  ...ZERO_TOTALS,
  failedCount: 2,
  files: [STATEMENT_MISSING_ACCOUNT, PRODUCT_FAILED],
  transfers: EMPTY_TRANSFERS,
  categorization: EMPTY_CATEGORIZATION,
}

/** 1 statement in, 1 statement failed with NOT_UTF8. */
export const PARTIAL_REPORT = {
  ...ZERO_TOTALS,
  importedCount: 39,
  duplicateCount: 2,
  failedCount: 1,
  anchoredCount: 1,
  files: [
    { ...STATEMENT_IMPORTED, unparsedCount: 0, unparsedRows: [], balanceMismatches: [] },
    {
      ...STATEMENT_MISSING_ACCOUNT,
      error: { code: 'NOT_UTF8', message: 'Los bytes del archivo no son UTF-8 válido.' },
    },
  ],
  transfers: { ...EMPTY_TRANSFERS, pairsCreated: 2 },
  categorization: { ...EMPTY_CATEGORIZATION, categorized: 12 },
}

/** Everything went in and there is nothing to check. */
export const CLEAN_REPORT = {
  ...ZERO_TOTALS,
  importedCount: 1,
  files: [
    {
      ...STATEMENT_IMPORTED,
      account: { ...STATEMENT_IMPORTED.account, created: false },
      imported: 1,
      duplicates: 0,
      anchored: false,
      unparsedCount: 0,
      unparsedRows: [],
      balanceMismatches: [],
    },
  ],
  transfers: EMPTY_TRANSFERS,
  categorization: EMPTY_CATEGORIZATION,
}

export const DRIVE_ERROR_BODY = {
  statusCode: 503,
  code: 'DRIVE_CONNECTION_ERROR',
  message: 'No se puede conectar con Google Drive',
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

// Fetch boundary helpers shared by the store and component tests.

export type Answer = () => Promise<Response>

/** A fetch whose answers are chosen per test; every call is recorded as `METHOD path`. */
export function mockApi(answers: { pending?: Answer; import?: Answer; netWorth?: Answer }) {
  const calls: string[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const path = new URL(String(input)).pathname
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${path}`)
    const answer =
      path === '/api/ingestion/pending'
        ? answers.pending
        : path === '/api/import'
          ? answers.import
          : answers.netWorth
    return answer ? answer() : Promise.reject(new TypeError(`unexpected ${method} ${path}`))
  })
  const count = (call: string) => calls.filter((c) => c === call).length
  return { calls, spy, count }
}

export const json =
  (body: unknown, status = 200): Answer =>
  () =>
    Promise.resolve(jsonResponse(body, { status }))
export const networkDown: Answer = () => Promise.reject(new TypeError('Failed to fetch'))

/** A response that only arrives when the test says so. */
export function deferred() {
  let resolve: (response: Response) => void = () => {}
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { answer: () => promise, resolve }
}

export const GET_PENDING = 'GET /api/ingestion/pending'
export const POST_IMPORT = 'POST /api/import'
export const GET_NET_WORTH = 'GET /api/net-worth'

// Feature 14: report details. Invented data shaped like the contract; backend
// texts in Spanish. The F13 fixtures above are reused, never edited.

/** A clean imported statement to build the other reports on. */
const CLEAN_STATEMENT = CLEAN_REPORT.files[0]!

/** Every detail section has something: FULL_REPORT plus both final pass failures. */
export const DETAILS_REPORT = {
  ...FULL_REPORT,
  transfers: {
    ...FULL_REPORT.transfers,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Fallo al emparejar traspasos: tiempo agotado.',
    },
  },
  categorization: {
    ...FULL_REPORT.categorization,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Fallo al aplicar las reglas de categoría.' },
  },
}

export const TRANSFERS_ERROR = {
  code: 'INTERNAL_SERVER_ERROR',
  message: 'No se pudo completar la detección de traspasos.',
}
export const CATEGORIZATION_ERROR = {
  code: 'INTERNAL_SERVER_ERROR',
  message: 'No se pudo completar la categorización automática.',
}

/** `n` unread rows starting at line 10. */
export const unreadRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    row: 10 + i,
    reason: `fecha no interpretable (${i + 1})`,
  }))

/** An imported statement with 42 unread lines. */
export const STATEMENT_UNREAD_42 = {
  ...CLEAN_STATEMENT,
  fileId: 'u42',
  name: 'movs-julio.xlsx',
  unparsedCount: 42,
  unparsedRows: unreadRows(42),
}

/** A statement where no line could be read: failed, with its 6 rows. */
export const STATEMENT_ALL_UNPARSED = {
  ...STATEMENT_MISSING_ACCOUNT,
  bank: 'openbank',
  fileId: 'u6',
  name: 'openbank-julio.xls',
  unparsedCount: 6,
  unparsedRows: unreadRows(6),
  error: { code: 'ALL_ROWS_UNPARSED', message: 'Ninguna fila del extracto se pudo interpretar.' },
}

/** Anchored and 3 saved balances filled in. */
export const STATEMENT_ANCHORED_FILLED = {
  ...CLEAN_STATEMENT,
  fileId: 'af3',
  name: 'movs-junio.xlsx',
  anchored: true,
  balancesFilled: 3,
}

/** 1 saved balance filled in, not anchored. */
export const STATEMENT_FILLED_ONE = {
  ...CLEAN_STATEMENT,
  fileId: 'f1',
  name: 'movs-mayo.xlsx',
  anchored: false,
  balancesFilled: 1,
}

/** A product type the net worth labels do not know. */
export const PRODUCT_CRYPTO = {
  ...PRODUCT_IMPORTED,
  fileId: 'c1',
  name: 'cripto.json',
  bank: 'newbank',
  product: { id: 11, bank: 'newbank', name: 'Cartera cripto', type: 'crypto', created: false },
}

const ambiguousGroup = (i: number) => ({
  amount: `${100 + i}.00`,
  movements: [
    {
      id: 1000 + i * 2,
      accountId: 1,
      accountAlias: 'bankinter 0236',
      type: 'expense',
      bookingDate: '2026-08-02',
      description: `TRANSFERENCIA EMITIDA ${i}`,
    },
    {
      id: 1001 + i * 2,
      accountId: 2,
      accountAlias: 'openbank 1111',
      type: 'income',
      bookingDate: '2026-08-02',
      description: `TRANSFERENCIA RECIBIDA ${i}`,
    },
  ],
})

/** 12 ambiguous groups: over the 10 shown. */
export const AMBIGUOUS_12 = {
  pairsCreated: 0,
  ambiguousCount: 12,
  ambiguous: Array.from({ length: 12 }, (_, i) => ambiguousGroup(i + 1)),
}

const conflict = (i: number) => ({
  movementId: 500 + i,
  description: `COMPRA EJEMPLO ${i}`,
  bookingDate: '2026-08-10',
  matches: [
    { ruleId: 1, matchText: 'compra', categoryId: 4, categoryName: 'Supermercado' },
    { ruleId: 2, matchText: 'ejemplo', categoryId: 6, categoryName: 'Compras' },
  ],
})

/** 11 category conflicts: over the 10 shown. */
export const CONFLICTS_11 = {
  categorized: 0,
  conflictCount: 11,
  conflicts: Array.from({ length: 11 }, (_, i) => conflict(i + 1)),
  unmatched: 0,
}

/** One report per condition that makes the F13 headline say "with a few things to check". */
export const THINGS_TO_CHECK_REPORTS: [string, unknown][] = [
  ['a skipped file', { ...CLEAN_REPORT, skippedCount: 1, files: [CLEAN_STATEMENT, SKIPPED_FILE] }],
  [
    'unread lines',
    { ...CLEAN_REPORT, unparsedCount: 42, files: [CLEAN_STATEMENT, STATEMENT_UNREAD_42] },
  ],
  [
    'a balance mismatch',
    {
      ...CLEAN_REPORT,
      balanceMismatchCount: 1,
      files: [{ ...CLEAN_STATEMENT, balanceMismatches: STATEMENT_IMPORTED.balanceMismatches }],
    },
  ],
  ['ambiguous transfers', { ...CLEAN_REPORT, transfers: AMBIGUOUS_12 }],
  ['category conflicts', { ...CLEAN_REPORT, categorization: CONFLICTS_11 }],
  [
    'a transfers error',
    { ...CLEAN_REPORT, transfers: { ...EMPTY_TRANSFERS, error: TRANSFERS_ERROR } },
  ],
  [
    'a categorization error',
    { ...CLEAN_REPORT, categorization: { ...EMPTY_CATEGORIZATION, error: CATEGORIZATION_ERROR } },
  ],
]

/** Only imported files, with the per-file notes and every product shape. */
export const IMPORTED_FILES_REPORT = {
  ...CLEAN_REPORT,
  importedCount: 41,
  duplicateCount: 2,
  unparsedCount: 1,
  balanceMismatchCount: 1,
  importedProductCount: 3,
  anchoredCount: 2,
  balanceFilledCount: 4,
  files: [
    STATEMENT_IMPORTED,
    STATEMENT_ANCHORED_FILLED,
    STATEMENT_FILLED_ONE,
    PRODUCT_IMPORTED,
    DEPOSIT_IMPORTED,
    PRODUCT_CRYPTO,
    PRODUCT_FAILED,
  ],
  failedCount: 1,
}
