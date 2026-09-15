// Detail of an import report: what to check and what went in (feature 14,
// specs/14-import-report-details/design.md §3). Pure: the components only paint it.

import { holdingTypeLabel } from '@/features/net-worth/issues'
import type { InvestmentProductType } from '@/features/net-worth/types'
import { bankLabel } from '@/shared/banks'
import { formatDate } from '@/shared/money'

import type {
  AmbiguousTransfer,
  BalanceMismatch,
  Categorization,
  CategoryConflict,
  FileReport,
  ImportReport,
  StatementFileReport,
  TransferDetection,
  UnparsedRow,
} from './types'

export const UNREAD_LINES_VISIBLE = 5
export const LIST_ITEMS_VISIBLE = 10

export type DetailSectionId =
  'final-passes' | 'mismatches' | 'unread' | 'transfers' | 'conflicts' | 'imported-files'

export interface DetailSection {
  id: DetailSectionId
  title: string
  count: number
}

/** `and 1 more line`, `and 37 more lines`; null when nothing is hidden. */
export function moreLabel(hidden: number, singular: string, plural: string): string | null {
  if (hidden <= 0) return null
  return `and ${hidden} more ${hidden === 1 ? singular : plural}`
}

export interface FinalPassFailure {
  id: 'transfers' | 'categorization'
  title: string
  /** The backend's original message (Spanish); null when it came empty. */
  details: string | null
}

export const FINAL_PASS_SAFE = 'Your imported movements are safe.'

export function finalPassFailures(report: ImportReport): FinalPassFailure[] {
  const failures: FinalPassFailure[] = []
  const { transfers, categorization } = report
  if (transfers.error !== null) {
    failures.push({
      id: 'transfers',
      title: "Transfer matching didn't finish",
      details: transfers.error.message || null,
    })
  }
  if (categorization.error !== null) {
    failures.push({
      id: 'categorization',
      title: "Automatic categorization didn't finish",
      details: categorization.error.message || null,
    })
  }
  return failures
}

/** The visible sections, in their fixed order. Counts come from the report totals. */
export function detailSections(report: ImportReport): DetailSection[] {
  const candidates: DetailSection[] = [
    { id: 'final-passes', title: 'Final passes', count: finalPassFailures(report).length },
    { id: 'mismatches', title: 'Balance mismatches', count: report.balanceMismatchCount },
    { id: 'unread', title: 'Unread lines', count: report.unparsedCount },
    { id: 'transfers', title: 'Transfers to match', count: report.transfers.ambiguousCount },
    {
      id: 'conflicts',
      title: 'Category rule conflicts',
      count: report.categorization.conflictCount,
    },
    {
      id: 'imported-files',
      title: 'Imported files',
      count: report.files.filter((file) => file.status === 'imported').length,
    },
  ]
  return candidates.filter((section) => section.count > 0)
}

export interface FileHeading {
  name: string
  /** Already readable (bankLabel). */
  bank: string
  year: string
}

const heading = (file: FileReport): FileHeading => ({
  name: file.name,
  bank: bankLabel(file.bank),
  year: file.year,
})

const statements = (report: ImportReport): StatementFileReport[] =>
  report.files.filter((file): file is StatementFileReport => file.kind === 'statement')

export function mismatchGroups(
  report: ImportReport,
): { file: FileHeading; mismatches: BalanceMismatch[] }[] {
  return statements(report)
    .filter((file) => file.balanceMismatches.length > 0)
    .map((file) => ({ file: heading(file), mismatches: file.balanceMismatches }))
}

export function checkLabel(check: string): { name: string; explanation: string | null } {
  switch (check) {
    case 'per-line':
      return {
        name: 'Line-by-line check',
        explanation: "A line's amount doesn't match how the running balance changed.",
      }
    case 'statement-balance':
      return {
        name: 'Statement balance check',
        explanation:
          "The balance at the top of the file doesn't match the saved opening balance plus the movements after it.",
      }
    default:
      return { name: 'Balance check', explanation: null }
  }
}

/** Imported and failed statements with unread lines, at most 5 rows each. */
export function unreadLineGroups(
  report: ImportReport,
): { file: FileHeading; rows: UnparsedRow[]; more: string | null }[] {
  return statements(report)
    .filter((file) => file.unparsedCount > 0)
    .map((file) => {
      const rows = file.unparsedRows.slice(0, UNREAD_LINES_VISIBLE)
      return {
        file: heading(file),
        rows,
        more: moreLabel(file.unparsedCount - rows.length, 'line', 'lines'),
      }
    })
}

export function visibleAmbiguous(transfers: TransferDetection): {
  groups: AmbiguousTransfer[]
  more: string | null
} {
  const groups = transfers.ambiguous.slice(0, LIST_ITEMS_VISIBLE)
  return { groups, more: moreLabel(transfers.ambiguousCount - groups.length, 'group', 'groups') }
}

export function visibleConflicts(categorization: Categorization): {
  conflicts: CategoryConflict[]
  more: string | null
} {
  const conflicts = categorization.conflicts.slice(0, LIST_ITEMS_VISIBLE)
  return {
    conflicts,
    more: moreLabel(categorization.conflictCount - conflicts.length, 'movement', 'movements'),
  }
}

/** `expense` → Out, `income` → In; any other type is shown as it comes. */
export function directionLabel(type: string): string {
  if (type === 'expense') return 'Out'
  if (type === 'income') return 'In'
  return type
}

export const TRANSFERS_SENTENCE =
  "These movements could be transfers between your accounts, but they couldn't be paired automatically."
export const CONFLICTS_SENTENCE =
  'These movements match rules for different categories, so they were left without one.'

// The report's product type is open text; only the net worth's known types get a label.
const KNOWN_PRODUCT_TYPES: ReadonlySet<string> = new Set<InvestmentProductType>([
  'fund',
  'etf',
  'managed_portfolio',
  'savings_account',
  'deposit',
])

const isKnownProductType = (type: string): type is InvestmentProductType =>
  KNOWN_PRODUCT_TYPES.has(type)

export function productTypeLabel(type: string): string {
  return isKnownProductType(type) ? holdingTypeLabel(type) : type
}

export type ImportedFileRow =
  | {
      kind: 'statement'
      file: FileHeading
      counts: string
      /** Alias of the account this run created; null when it already existed. */
      newAccount: string | null
      notes: string[]
    }
  | {
      kind: 'product'
      file: FileHeading
      /** Null only if an imported product file came without its product. */
      product: string | null
      typeLabel: string | null
      isNew: boolean
      valueAsOf: string | null
    }

function statementRow(file: StatementFileReport): ImportedFileRow {
  const notes: string[] = []
  if (file.anchored) notes.push('Opening balance set from this file')
  if (file.balancesFilled > 0) {
    notes.push(
      file.balancesFilled === 1
        ? '1 saved balance filled in'
        : `${file.balancesFilled} saved balances filled in`,
    )
  }
  return {
    kind: 'statement',
    file: heading(file),
    counts: `${file.imported} new · ${file.duplicates} already imported`,
    newAccount: file.account?.created === true ? file.account.alias : null,
    notes,
  }
}

/** Imported statements and products, in report order. */
export function importedFileRows(report: ImportReport): ImportedFileRow[] {
  const rows: ImportedFileRow[] = []
  for (const file of report.files) {
    if (file.status !== 'imported') continue
    if (file.kind === 'statement') {
      rows.push(statementRow(file))
    } else if (file.kind === 'product') {
      rows.push({
        kind: 'product',
        file: heading(file),
        product: file.product?.name ?? null,
        typeLabel: file.product ? productTypeLabel(file.product.type) : null,
        isNew: file.product?.created === true,
        valueAsOf: file.snapshot ? `Value as of ${formatDate(file.snapshot.date)}` : null,
      })
    }
  }
  return rows
}
