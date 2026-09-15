// Frontend types for the Drive import (feature 13), written from
// gastos-backend/docs/api-contract.md: `GET /api/ingestion/pending`,
// `POST /api/import` and the `categorization` shape of `POST /api/category-rules/apply`.
// The report is typed whole: this feature paints part of it, feature 14 the rest.

import type { AppError } from '@/shared/errors'

/** Decimal amount as the API sends it (`"-40.00"`): never parsed into a number. */
export type DecimalString = string
/** `YYYY-MM-DD`. */
export type DateOnly = string

// GET /api/ingestion/pending

export interface PendingFile {
  fileId: string
  name: string
}

export interface PendingYear {
  year: string
  pendingCount: number
  pending: PendingFile[]
}

export interface PendingBank {
  bank: string
  years: PendingYear[]
}

export interface PendingFiles {
  totalPending: number
  banks: PendingBank[]
}

// POST /api/import

/** `code` is open text: a new backend code must not break the report. */
export interface FileError {
  code: string
  message: string
}

interface FileReportBase {
  bank: string
  year: string
  fileId: string
  name: string
  movedToProcessed: boolean
}

export interface ImportAccount {
  id: number
  iban: string
  bank: string
  alias: string
  /** Open text. */
  type: string
  created: boolean
  appliedDefaults: { alias: boolean; type: boolean }
  balanceAnchor: DecimalString | null
}

export interface UnparsedRow {
  row: number
  reason: string
}

export interface BalanceMismatch {
  accountId: number
  accountAlias: string
  date: DateOnly
  computed: DecimalString
  fromFile: DecimalString
  difference: DecimalString
  /** Open text (`per-line`, `statement-balance`). */
  check: string
}

export interface StatementFileReport extends FileReportBase {
  kind: 'statement'
  status: 'imported' | 'failed'
  account: ImportAccount | null
  imported: number
  duplicates: number
  anchored: boolean
  balancesFilled: number
  unparsedCount: number
  unparsedRows: UnparsedRow[]
  balanceMismatches: BalanceMismatch[]
  /** Absent in the JSON → null. */
  error: FileError | null
}

export interface ImportProduct {
  id: number
  bank: string
  name: string
  /** Open text. */
  type: string
  created: boolean
}

export interface ProductFileReport extends FileReportBase {
  kind: 'product'
  status: 'imported' | 'failed'
  /** Null when the file failed. */
  product: ImportProduct | null
  /** Null for a deposit or a failure. */
  snapshot: { date: DateOnly; created: boolean } | null
  error: FileError | null
}

export interface SkippedFileReport extends FileReportBase {
  kind: 'skipped'
  status: 'skipped'
  reason: string
}

export type FileReport = StatementFileReport | ProductFileReport | SkippedFileReport

export interface AmbiguousMovement {
  id: number
  accountId: number
  accountAlias: string
  type: string
  bookingDate: DateOnly
  description: string
}

export interface AmbiguousTransfer {
  amount: DecimalString
  movements: AmbiguousMovement[]
}

export interface TransferDetection {
  pairsCreated: number
  ambiguousCount: number
  ambiguous: AmbiguousTransfer[]
  error: FileError | null
}

export interface CategoryMatch {
  ruleId: number
  matchText: string
  categoryId: number
  categoryName: string
}

export interface CategoryConflict {
  movementId: number
  description: string
  bookingDate: DateOnly
  matches: CategoryMatch[]
}

export interface Categorization {
  categorized: number
  conflictCount: number
  conflicts: CategoryConflict[]
  unmatched: number
  error: FileError | null
}

export interface ImportReport {
  importedCount: number
  duplicateCount: number
  unparsedCount: number
  failedCount: number
  skippedCount: number
  balanceMismatchCount: number
  importedProductCount: number
  anchoredCount: number
  balanceFilledCount: number
  files: FileReport[]
  transfers: TransferDetection
  categorization: Categorization
}

// The dialog's state machine (design.md §5)

export type FailureKind = 'drive' | 'server'

export type ImportFlow =
  | { step: 'closed' }
  | { step: 'checking' }
  | { step: 'upToDate' }
  | { step: 'confirm'; pending: PendingFiles }
  | { step: 'importing'; fileCount: number }
  | { step: 'finished'; report: ImportReport }
  | { step: 'checkFailed'; kind: FailureKind; error: AppError }
  | { step: 'importFailed'; kind: FailureKind; error: AppError }
  | { step: 'reportUnreadable'; error: AppError }

export type ImportStep = ImportFlow['step']
