// Drive import data access (feature 13). Uses the shared HTTP client and maps the
// raw responses to the frontend types with the shared boundary checks, so a
// contract drift surfaces as a ValidationError naming the failing field.
// Structure, identifiers, codes and `status` are strict; free text (names, aliases,
// descriptions, reasons, messages) accepts an empty string, because a single empty
// description must not turn a finished import into an unreadable report.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { ApiError } from '@/shared/errors'
import { createValidators } from '@/shared/validation'
import type { RawObject, Validators } from '@/shared/validation'

import type {
  AmbiguousTransfer,
  Categorization,
  CategoryConflict,
  FileError,
  FileReport,
  ImportAccount,
  ImportReport,
  PendingBank,
  PendingFile,
  PendingFiles,
  PendingYear,
  TransferDetection,
} from './types'

export const PENDING_PATH = '/api/ingestion/pending'
export const IMPORT_PATH = '/api/import'

const DRIVE_CONNECTION_ERROR = 'DRIVE_CONNECTION_ERROR'
const ATTEMPTED_STATUSES = ['imported', 'failed'] as const

const pendingChecks = createValidators(`GET ${PENDING_PATH}`)
const reportChecks = createValidators(`POST ${IMPORT_PATH}`)

/** Maps `GET /api/ingestion/pending`, or throws ValidationError. */
export function parsePendingFiles(raw: unknown): PendingFiles {
  const { asObject, asArray, asText, asString, asInteger } = pendingChecks

  const parsePendingFile = (value: unknown, path: string): PendingFile => {
    const file = asObject(value, path)
    return {
      fileId: asText(file.fileId, `${path}.fileId`),
      name: asString(file.name, `${path}.name`),
    }
  }
  const parseYear = (value: unknown, path: string): PendingYear => {
    const year = asObject(value, path)
    return {
      year: asText(year.year, `${path}.year`),
      pendingCount: asInteger(year.pendingCount, `${path}.pendingCount`),
      pending: asArray(year.pending, `${path}.pending`).map((item, i) =>
        parsePendingFile(item, `${path}.pending[${i}]`),
      ),
    }
  }
  const parseBank = (value: unknown, path: string): PendingBank => {
    const bank = asObject(value, path)
    return {
      bank: asText(bank.bank, `${path}.bank`),
      years: asArray(bank.years, `${path}.years`).map((item, i) =>
        parseYear(item, `${path}.years[${i}]`),
      ),
    }
  }

  const body = asObject(raw, 'response')
  return {
    totalPending: asInteger(body.totalPending, 'totalPending'),
    banks: asArray(body.banks, 'banks').map((item, i) => parseBank(item, `banks[${i}]`)),
  }
}

/** `error` absent (or null) → null; present → `{ code, message }` with open-text code. */
function parseOptionalError(v: Validators, value: unknown, path: string): FileError | null {
  if (value === undefined || value === null) {
    return null
  }
  const error = v.asObject(value, path)
  return {
    code: v.asText(error.code, `${path}.code`),
    message: v.asString(error.message, `${path}.message`),
  }
}

function parseAccount(v: Validators, value: unknown, path: string): ImportAccount | null {
  if (value === null) {
    return null
  }
  const account = v.asObject(value, path)
  const defaults = v.asObject(account.appliedDefaults, `${path}.appliedDefaults`)
  return {
    id: v.asInteger(account.id, `${path}.id`),
    iban: v.asText(account.iban, `${path}.iban`),
    bank: v.asText(account.bank, `${path}.bank`),
    alias: v.asString(account.alias, `${path}.alias`),
    type: v.asText(account.type, `${path}.type`),
    created: v.asFlag(account.created, `${path}.created`),
    appliedDefaults: {
      alias: v.asFlag(defaults.alias, `${path}.appliedDefaults.alias`),
      type: v.asFlag(defaults.type, `${path}.appliedDefaults.type`),
    },
    balanceAnchor: v.asNullableDecimal(account.balanceAnchor, `${path}.balanceAnchor`),
  }
}

/**
 * Discriminates in a fixed order: `status: 'skipped'` → skipped; the `product` KEY
 * present (even when null, as in a failed product file) → product; else statement.
 */
function parseFile(v: Validators, value: unknown, path: string): FileReport {
  const file: RawObject = v.asObject(value, path)
  const base = {
    bank: v.asText(file.bank, `${path}.bank`),
    year: v.asText(file.year, `${path}.year`),
    fileId: v.asText(file.fileId, `${path}.fileId`),
    name: v.asString(file.name, `${path}.name`),
    movedToProcessed: v.asFlag(file.movedToProcessed, `${path}.movedToProcessed`),
  }

  if (file.status === 'skipped') {
    return {
      ...base,
      kind: 'skipped',
      status: 'skipped',
      reason: v.asString(file.reason, `${path}.reason`),
    }
  }
  const status = v.asMember(file.status, ATTEMPTED_STATUSES, `${path}.status`)

  if ('product' in file) {
    const product = file.product === null ? null : v.asObject(file.product, `${path}.product`)
    const snapshot = file.snapshot === null ? null : v.asObject(file.snapshot, `${path}.snapshot`)
    return {
      ...base,
      kind: 'product',
      status,
      product: product && {
        id: v.asInteger(product.id, `${path}.product.id`),
        bank: v.asText(product.bank, `${path}.product.bank`),
        name: v.asString(product.name, `${path}.product.name`),
        type: v.asText(product.type, `${path}.product.type`),
        created: v.asFlag(product.created, `${path}.product.created`),
      },
      snapshot: snapshot && {
        date: v.asDateOnly(snapshot.date, `${path}.snapshot.date`),
        created: v.asFlag(snapshot.created, `${path}.snapshot.created`),
      },
      error: parseOptionalError(v, file.error, `${path}.error`),
    }
  }

  return {
    ...base,
    kind: 'statement',
    status,
    account: parseAccount(v, file.account, `${path}.account`),
    imported: v.asInteger(file.imported, `${path}.imported`),
    duplicates: v.asInteger(file.duplicates, `${path}.duplicates`),
    anchored: v.asFlag(file.anchored, `${path}.anchored`),
    balancesFilled: v.asInteger(file.balancesFilled, `${path}.balancesFilled`),
    unparsedCount: v.asInteger(file.unparsedCount, `${path}.unparsedCount`),
    unparsedRows: v.asArray(file.unparsedRows, `${path}.unparsedRows`).map((item, i) => {
      const rowPath = `${path}.unparsedRows[${i}]`
      const row = v.asObject(item, rowPath)
      return {
        row: v.asInteger(row.row, `${rowPath}.row`),
        reason: v.asString(row.reason, `${rowPath}.reason`),
      }
    }),
    balanceMismatches: v
      .asArray(file.balanceMismatches, `${path}.balanceMismatches`)
      .map((item, i) => {
        const itemPath = `${path}.balanceMismatches[${i}]`
        const mismatch = v.asObject(item, itemPath)
        return {
          accountId: v.asInteger(mismatch.accountId, `${itemPath}.accountId`),
          accountAlias: v.asString(mismatch.accountAlias, `${itemPath}.accountAlias`),
          date: v.asDateOnly(mismatch.date, `${itemPath}.date`),
          computed: v.asDecimal(mismatch.computed, `${itemPath}.computed`),
          fromFile: v.asDecimal(mismatch.fromFile, `${itemPath}.fromFile`),
          difference: v.asDecimal(mismatch.difference, `${itemPath}.difference`),
          check: v.asText(mismatch.check, `${itemPath}.check`),
        }
      }),
    error: parseOptionalError(v, file.error, `${path}.error`),
  }
}

function parseTransfers(v: Validators, value: unknown, path: string): TransferDetection {
  const transfers = v.asObject(value, path)
  return {
    pairsCreated: v.asInteger(transfers.pairsCreated, `${path}.pairsCreated`),
    ambiguousCount: v.asInteger(transfers.ambiguousCount, `${path}.ambiguousCount`),
    ambiguous: v
      .asArray(transfers.ambiguous, `${path}.ambiguous`)
      .map((item, i): AmbiguousTransfer => {
        const groupPath = `${path}.ambiguous[${i}]`
        const group = v.asObject(item, groupPath)
        return {
          amount: v.asDecimal(group.amount, `${groupPath}.amount`),
          movements: v.asArray(group.movements, `${groupPath}.movements`).map((raw, j) => {
            const mPath = `${groupPath}.movements[${j}]`
            const movement = v.asObject(raw, mPath)
            return {
              id: v.asInteger(movement.id, `${mPath}.id`),
              accountId: v.asInteger(movement.accountId, `${mPath}.accountId`),
              accountAlias: v.asString(movement.accountAlias, `${mPath}.accountAlias`),
              type: v.asText(movement.type, `${mPath}.type`),
              bookingDate: v.asDateOnly(movement.bookingDate, `${mPath}.bookingDate`),
              description: v.asString(movement.description, `${mPath}.description`),
            }
          }),
        }
      }),
    error: parseOptionalError(v, transfers.error, `${path}.error`),
  }
}

function parseCategorization(v: Validators, value: unknown, path: string): Categorization {
  const categorization = v.asObject(value, path)
  return {
    categorized: v.asInteger(categorization.categorized, `${path}.categorized`),
    conflictCount: v.asInteger(categorization.conflictCount, `${path}.conflictCount`),
    conflicts: v
      .asArray(categorization.conflicts, `${path}.conflicts`)
      .map((item, i): CategoryConflict => {
        const cPath = `${path}.conflicts[${i}]`
        const conflict = v.asObject(item, cPath)
        return {
          movementId: v.asInteger(conflict.movementId, `${cPath}.movementId`),
          description: v.asString(conflict.description, `${cPath}.description`),
          bookingDate: v.asDateOnly(conflict.bookingDate, `${cPath}.bookingDate`),
          matches: v.asArray(conflict.matches, `${cPath}.matches`).map((raw, j) => {
            const mPath = `${cPath}.matches[${j}]`
            const match = v.asObject(raw, mPath)
            return {
              ruleId: v.asInteger(match.ruleId, `${mPath}.ruleId`),
              matchText: v.asString(match.matchText, `${mPath}.matchText`),
              categoryId: v.asInteger(match.categoryId, `${mPath}.categoryId`),
              categoryName: v.asString(match.categoryName, `${mPath}.categoryName`),
            }
          }),
        }
      }),
    unmatched: v.asInteger(categorization.unmatched, `${path}.unmatched`),
    error: parseOptionalError(v, categorization.error, `${path}.error`),
  }
}

/** Maps the whole `POST /api/import` report, or throws ValidationError. */
export function parseImportReport(raw: unknown): ImportReport {
  const v = reportChecks
  const body = v.asObject(raw, 'response')
  return {
    importedCount: v.asInteger(body.importedCount, 'importedCount'),
    duplicateCount: v.asInteger(body.duplicateCount, 'duplicateCount'),
    unparsedCount: v.asInteger(body.unparsedCount, 'unparsedCount'),
    failedCount: v.asInteger(body.failedCount, 'failedCount'),
    skippedCount: v.asInteger(body.skippedCount, 'skippedCount'),
    balanceMismatchCount: v.asInteger(body.balanceMismatchCount, 'balanceMismatchCount'),
    importedProductCount: v.asInteger(body.importedProductCount, 'importedProductCount'),
    anchoredCount: v.asInteger(body.anchoredCount, 'anchoredCount'),
    balanceFilledCount: v.asInteger(body.balanceFilledCount, 'balanceFilledCount'),
    files: v.asArray(body.files, 'files').map((item, i) => parseFile(v, item, `files[${i}]`)),
    transfers: parseTransfers(v, body.transfers, 'transfers'),
    categorization: parseCategorization(v, body.categorization, 'categorization'),
  }
}

/** Lists the files waiting in Drive. No side effects on the backend. */
export async function getPendingFiles(client: HttpClient = http): Promise<PendingFiles> {
  return parsePendingFiles(await client<unknown>(PENDING_PATH))
}

/**
 * Runs the import. No body and no Content-Type on purpose: the backend answers
 * 400 to an empty body declared as JSON. The call is synchronous and has no timeout.
 */
export async function runImport(client: HttpClient = http): Promise<ImportReport> {
  return parseImportReport(await client<unknown>(IMPORT_PATH, { method: 'POST' }))
}

/** True when the backend said it could not talk to Google Drive. */
export function isDriveError(error: unknown): boolean {
  return error instanceof ApiError && error.apiCode === DRIVE_CONNECTION_ERROR
}
