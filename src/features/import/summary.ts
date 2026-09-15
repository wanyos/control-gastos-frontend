// Texts of the import dialog: counters, final passes line, review sentence and
// what each phase announces (feature 13, design.md §6). Pure.

import { importOutcome } from './outcome'
import type { FailureKind, ImportFlow, ImportReport } from './types'

export interface SummaryCounter {
  id: 'new' | 'duplicates' | 'products' | 'notImported'
  label: string
  value: number
}

/** `1 file`, `3 files`. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** Always the four counters, in this order. */
export function summaryCounters(report: ImportReport): SummaryCounter[] {
  return [
    { id: 'new', label: 'New movements', value: report.importedCount },
    { id: 'duplicates', label: 'Already imported', value: report.duplicateCount },
    { id: 'products', label: 'Investment files updated', value: report.importedProductCount },
    {
      id: 'notImported',
      label: 'Files not imported',
      value: report.failedCount + report.skippedCount,
    },
  ]
}

/** Statement files whose account this run created. */
export function newAccountCount(report: ImportReport): number {
  return report.files.filter((file) => file.kind === 'statement' && file.account?.created === true)
    .length
}

/** `2 transfers matched · 12 categorized · 1 new account`, parts at 0 left out; null when all are 0. */
export function finalPassesLine(report: ImportReport): string | null {
  const parts: string[] = []
  if (report.transfers.pairsCreated > 0) {
    parts.push(`${plural(report.transfers.pairsCreated, 'transfer')} matched`)
  }
  if (report.categorization.categorized > 0) {
    parts.push(`${report.categorization.categorized} categorized`)
  }
  const accounts = newAccountCount(report)
  if (accounts > 0) {
    parts.push(`${plural(accounts, 'new account')}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export function reviewSentence(report: ImportReport): string | null {
  const count = report.importedCount
  if (count === 0) return null
  return count === 1
    ? '1 new movement is waiting for your review'
    : `${count} new movements are waiting for your review`
}

/** Text of the topbar badge: `1 new file`, `3 new files`. */
export function pendingCountLabel(total: number): string {
  return plural(total, 'new file')
}

export function failureTitle(kind: FailureKind): string {
  return kind === 'drive' ? "Couldn't reach Google Drive" : "Couldn't reach the server"
}

export const CHECKING_TEXT = 'Checking Drive for new files…'
export const UP_TO_DATE_TITLE = "You're up to date"
export const UP_TO_DATE_DETAIL = 'No new files in Google Drive.'
export const REPORT_UNREADABLE_TEXT =
  "The import finished, but its report couldn't be read. Your files may have been imported."

export function foundText(total: number): string {
  return `${plural(total, 'new file')} found`
}

export function importingText(total: number): string {
  return `Importing ${plural(total, 'file')}…`
}

/** Label of the confirm button: `Import 2 files`. */
export function importActionLabel(total: number): string {
  return `Import ${plural(total, 'file')}`
}

/** The sentence the live region reads when the dialog enters a phase. */
export function phaseAnnouncement(flow: ImportFlow): string {
  switch (flow.step) {
    case 'closed':
      return ''
    case 'checking':
      return CHECKING_TEXT
    case 'upToDate':
      return `${UP_TO_DATE_TITLE}. ${UP_TO_DATE_DETAIL}`
    case 'confirm':
      return `${foundText(flow.pending.totalPending)}.`
    case 'importing':
      return importingText(flow.fileCount)
    case 'finished':
      return importOutcome(flow.report).headline
    case 'checkFailed':
    case 'importFailed':
      return failureTitle(flow.kind)
    case 'reportUnreadable':
      return REPORT_UNREADABLE_TEXT
  }
}
