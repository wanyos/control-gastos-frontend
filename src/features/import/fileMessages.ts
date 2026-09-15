// English explanation of why a file was not imported (feature 13, design.md §7).
// The texts are a closed map but `code` is open: an unknown code falls back to a
// generic text and its original backend message stays available in Details. Pure.

import type { FileReport, ImportReport } from './types'

const MESSAGES: Record<string, string> = {
  MISSING_ACCOUNT_DATA:
    "The file has no IBAN and its bank doesn't have exactly one account yet. Add the IBAN to the file once.",
  INVALID_IBAN: "The IBAN in the file isn't valid. Fix it and try again.",
  NOT_UTF8: "The file isn't saved as UTF-8. Save it as UTF-8 and try again.",
  UNEXPECTED_ENCODING:
    "The file isn't in the encoding its bank uses. See the details for how to fix it.",
  EMPTY_STATEMENT: 'The file has no movements. Check that you downloaded the right period.',
  ALL_ROWS_UNPARSED:
    "None of the file's lines could be read. The bank may have changed its format.",
  VALIDATION_ERROR: "The file doesn't match what this bank's reader expects. See the details.",
  DRIVE_CONNECTION_ERROR: "This file couldn't be downloaded from Google Drive. Try again.",
  INTERNAL_SERVER_ERROR: 'Something went wrong on the server with this file. Try again.',
}

const GENERIC_MESSAGE = "This file couldn't be imported."
const SKIPPED_MESSAGE = "This bank or file type isn't supported yet."

export function fileIssueMessage(file: FileReport): string {
  if (file.kind === 'skipped') {
    return SKIPPED_MESSAGE
  }
  const code = file.error?.code
  return (
    (code !== undefined && Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : undefined) ??
    GENERIC_MESSAGE
  )
}

/** The backend's original text (Spanish): `error.message` or `reason`; null when absent or empty. */
export function fileIssueDetails(file: FileReport): string | null {
  const original = file.kind === 'skipped' ? file.reason : file.error?.message
  return original ? original : null
}

/** Failed and skipped files, in report order. */
export function issueFiles(report: ImportReport): FileReport[] {
  return report.files.filter((file) => file.status !== 'imported')
}
