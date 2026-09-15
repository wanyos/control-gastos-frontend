// Headline and tone of an import result (feature 13, design.md §6). Pure.

import type { ImportReport } from './types'

export type OutcomeTone = 'positive' | 'warning' | 'negative'

export interface ImportOutcome {
  headline: string
  tone: OutcomeTone
}

/** Something the user should look at, even though every attempted file went in. */
function hasThingsToCheck(report: ImportReport, skipped: number): boolean {
  return (
    skipped > 0 ||
    report.unparsedCount > 0 ||
    report.balanceMismatchCount > 0 ||
    report.transfers.ambiguousCount > 0 ||
    report.categorization.conflictCount > 0 ||
    report.transfers.error !== null ||
    report.categorization.error !== null
  )
}

export function importOutcome(report: ImportReport): ImportOutcome {
  const count = (status: string) => report.files.filter((file) => file.status === status).length
  const imported = count('imported')
  const failed = count('failed')
  const skipped = count('skipped')

  if (imported === 0) {
    return { headline: 'Nothing was imported', tone: 'negative' }
  }
  if (failed > 0) {
    return { headline: 'Partially imported', tone: 'warning' }
  }
  if (hasThingsToCheck(report, skipped)) {
    return { headline: 'Imported, with a few things to check', tone: 'warning' }
  }
  return { headline: 'Import complete', tone: 'positive' }
}
