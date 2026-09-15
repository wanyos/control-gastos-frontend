import { describe, it, expect, vi, afterEach } from 'vitest'

import { ApiError, API_HTTP, API_NETWORK, ValidationError } from '@/shared/errors'

import {
  getPendingFiles,
  isDriveError,
  parseImportReport,
  parsePendingFiles,
  runImport,
} from '../service'
import {
  DEPOSIT_IMPORTED,
  DRIVE_ERROR_BODY,
  FULL_REPORT,
  PENDING_TWO,
  PRODUCT_FAILED,
  SKIPPED_FILE,
  STATEMENT_FAILED_NO_ERROR,
  STATEMENT_IMPORTED,
  STATEMENT_MISSING_ACCOUNT,
  jsonResponse,
} from './fixtures'

const requestOf = (spy: ReturnType<typeof vi.spyOn>, index = 0) => {
  const [url, init] = spy.mock.calls[index] as [URL, RequestInit | undefined]
  return { url: String(url), init }
}

describe('import service', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPendingFiles', () => {
    it('GETs /api/ingestion/pending and maps the response', async () => {
      const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(PENDING_TWO))

      const pending = await getPendingFiles()

      expect(requestOf(spy).url).toMatch(/\/api\/ingestion\/pending$/)
      expect(requestOf(spy).init?.method).toBeUndefined()
      expect(pending).toEqual(PENDING_TWO)
    })

    it('rejects a response that does not match the contract, naming the field', () => {
      expect(() => parsePendingFiles({ totalPending: '2', banks: [] })).toThrow(
        /^GET \/api\/ingestion\/pending: totalPending is not an integer$/,
      )
      expect(() =>
        parsePendingFiles({ totalPending: 1, banks: [{ bank: 'n26', years: {} }] }),
      ).toThrow(ValidationError)
    })
  })

  describe('runImport (R7)', () => {
    it('POSTs /api/import without body and without Content-Type', async () => {
      const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(FULL_REPORT))

      await runImport()

      expect(spy).toHaveBeenCalledTimes(1)
      const { url, init } = requestOf(spy)
      expect(url).toMatch(/\/api\/import$/)
      expect(init?.method).toBe('POST')
      expect(init?.body).toBeUndefined()
      const headers = new Headers(init?.headers)
      expect(headers.has('content-type')).toBe(false)
    })
  })

  describe('parseImportReport', () => {
    it('maps the whole report, every file shape included', () => {
      const report = parseImportReport(FULL_REPORT)

      expect(report.importedCount).toBe(39)
      expect(report.importedProductCount).toBe(2)
      expect(report.files.map((file) => file.kind)).toEqual([
        'statement',
        'statement',
        'statement',
        'product',
        'product',
        'product',
        'skipped',
      ])
      expect(report.transfers.ambiguous[0]?.movements).toHaveLength(2)
      expect(report.transfers.error).toBeNull()
      expect(report.categorization.conflicts[0]?.matches[1]?.categoryName).toBe('Compras')
      expect(report.categorization.error).toBeNull()

      const [statement] = report.files
      expect(statement).toMatchObject({
        kind: 'statement',
        status: 'imported',
        account: { created: true, balanceAnchor: '1500.00' },
        unparsedRows: [{ row: 42, reason: 'importe no interpretable' }],
        balanceMismatches: [{ difference: '-20.00', check: 'per-line' }],
        error: null,
      })
    })

    it('tells a failed product apart by the product key, even when it is null', () => {
      const report = parseImportReport({
        ...FULL_REPORT,
        files: [PRODUCT_FAILED, DEPOSIT_IMPORTED],
      })

      expect(report.files[0]).toMatchObject({
        kind: 'product',
        status: 'failed',
        product: null,
        snapshot: null,
        error: { code: 'VALIDATION_ERROR' },
      })
      expect(report.files[1]).toMatchObject({ kind: 'product', snapshot: null })
    })

    it('maps a skipped file with its reason and no error', () => {
      const report = parseImportReport(FULL_REPORT)

      expect(report.files[6]).toEqual({
        kind: 'skipped',
        status: 'skipped',
        bank: 'n26',
        year: '2026',
        fileId: '8Wxy',
        name: 'captura.png',
        movedToProcessed: false,
        reason: 'No hay parser para la extensión .png del banco n26',
      })
    })

    it('maps an absent error to null', () => {
      const report = parseImportReport({ ...FULL_REPORT, files: [STATEMENT_FAILED_NO_ERROR] })

      expect(report.files[0]).toMatchObject({ status: 'failed', error: null })
    })

    it('accepts unknown error codes, account types, product types and checks', () => {
      const raw = {
        ...FULL_REPORT,
        files: [
          {
            ...STATEMENT_IMPORTED,
            account: { ...STATEMENT_IMPORTED.account, type: 'brokerage' },
            balanceMismatches: [{ ...STATEMENT_IMPORTED.balanceMismatches[0], check: 'new-check' }],
            error: { code: 'SOMETHING_NEW', message: 'algo nuevo' },
          },
          { ...DEPOSIT_IMPORTED, product: { ...DEPOSIT_IMPORTED.product, type: 'crypto' } },
        ],
        transfers: { ...FULL_REPORT.transfers, error: { code: 'NEW_FAILURE', message: 'x' } },
      }

      const report = parseImportReport(raw)

      expect(report.files[0]).toMatchObject({
        account: { type: 'brokerage' },
        balanceMismatches: [{ check: 'new-check' }],
        error: { code: 'SOMETHING_NEW' },
      })
      expect(report.files[1]).toMatchObject({ product: { type: 'crypto' } })
      expect(report.transfers.error).toEqual({ code: 'NEW_FAILURE', message: 'x' })
    })

    it('accepts empty free text but keeps identifiers and codes strict (review)', () => {
      const [ambiguous] = FULL_REPORT.transfers.ambiguous
      const [conflict] = FULL_REPORT.categorization.conflicts
      if (!ambiguous || !conflict) throw new Error('fixture without ambiguous or conflict')
      const raw = {
        ...FULL_REPORT,
        files: [
          {
            ...STATEMENT_IMPORTED,
            name: '',
            account: { ...STATEMENT_IMPORTED.account, alias: '' },
            unparsedRows: [{ row: 1, reason: '' }],
            balanceMismatches: [{ ...STATEMENT_IMPORTED.balanceMismatches[0], accountAlias: '' }],
          },
          { ...PRODUCT_FAILED, error: { code: 'VALIDATION_ERROR', message: '' } },
          { ...DEPOSIT_IMPORTED, product: { ...DEPOSIT_IMPORTED.product, name: '' } },
          { ...SKIPPED_FILE, reason: '' },
        ],
        transfers: {
          ...FULL_REPORT.transfers,
          ambiguous: [
            {
              ...ambiguous,
              movements: ambiguous.movements.map((m) => ({
                ...m,
                description: '',
                accountAlias: '',
              })),
            },
          ],
        },
        categorization: {
          ...FULL_REPORT.categorization,
          conflicts: [
            {
              ...conflict,
              description: '',
              matches: conflict.matches.map((m) => ({ ...m, matchText: '', categoryName: '' })),
            },
          ],
        },
      }

      const report = parseImportReport(raw)

      expect(report.transfers.ambiguous[0]?.movements[0]?.description).toBe('')
      expect(report.categorization.conflicts[0]?.description).toBe('')
      expect(report.categorization.conflicts[0]?.matches[0]?.categoryName).toBe('')
      expect(report.files[3]).toMatchObject({ kind: 'skipped', reason: '' })
      expect(() =>
        parseImportReport({ ...FULL_REPORT, files: [{ ...STATEMENT_IMPORTED, bank: '' }] }),
      ).toThrow('POST /api/import: files[0].bank is not a non-empty string')
      expect(() =>
        parseImportReport({
          ...FULL_REPORT,
          files: [{ ...STATEMENT_MISSING_ACCOUNT, error: { code: '', message: 'x' } }],
        }),
      ).toThrow('POST /api/import: files[0].error.code is not a non-empty string')
    })

    it('rejects an unknown file status', () => {
      const raw = { ...FULL_REPORT, files: [{ ...STATEMENT_FAILED_NO_ERROR, status: 'pending' }] }

      expect(() => parseImportReport(raw)).toThrow(
        /^POST \/api\/import: files\[0\]\.status is not one of imported \| failed$/,
      )
    })

    it('rejects files that are not an array, with the POST /api/import context (R11)', () => {
      expect(() => parseImportReport({ ...FULL_REPORT, files: {} })).toThrow(ValidationError)
      expect(() => parseImportReport({ ...FULL_REPORT, files: {} })).toThrow(
        'POST /api/import: files is not an array',
      )
    })
  })

  describe('isDriveError (R6, R11, R13)', () => {
    it('is true only for an ApiError whose apiCode is DRIVE_CONNECTION_ERROR', () => {
      expect(
        isDriveError(
          new ApiError('x', API_HTTP, { status: 503, apiCode: 'DRIVE_CONNECTION_ERROR' }),
        ),
      ).toBe(true)
      expect(isDriveError(new ApiError('x', API_HTTP, { status: 503 }))).toBe(false)
      expect(
        isDriveError(
          new ApiError('x', API_HTTP, { status: 500, apiCode: 'INTERNAL_SERVER_ERROR' }),
        ),
      ).toBe(false)
      expect(isDriveError(new ApiError('x', API_NETWORK))).toBe(false)
      expect(isDriveError(new ValidationError('DRIVE_CONNECTION_ERROR'))).toBe(false)
    })

    it('recognizes the 503 the backend sends through the real HTTP client', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(DRIVE_ERROR_BODY, { status: 503 }),
      )

      const error: unknown = await getPendingFiles().catch((e: unknown) => e)

      expect(isDriveError(error)).toBe(true)
    })
  })
})
