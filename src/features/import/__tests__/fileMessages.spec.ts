import { describe, it, expect } from 'vitest'

import { fileIssueDetails, fileIssueMessage, issueFiles } from '../fileMessages'
import { parseImportReport } from '../service'
import {
  FULL_REPORT,
  PRODUCT_FAILED,
  SKIPPED_FILE,
  STATEMENT_FAILED_NO_ERROR,
  STATEMENT_MISSING_ACCOUNT,
} from './fixtures'

const GENERIC = "This file couldn't be imported."

const fileWith = (raw: object) => {
  const [file] = parseImportReport({ ...FULL_REPORT, files: [raw] }).files
  if (!file) throw new Error('no file')
  return file
}

const failedWithCode = (code: string) =>
  fileWith({ ...STATEMENT_MISSING_ACCOUNT, error: { code, message: 'mensaje original' } })

describe('fileIssueMessage (R10)', () => {
  it.each([
    [
      'MISSING_ACCOUNT_DATA',
      "The file has no IBAN and its bank doesn't have exactly one account yet. Add the IBAN to the file once.",
    ],
    ['INVALID_IBAN', "The IBAN in the file isn't valid. Fix it and try again."],
    ['NOT_UTF8', "The file isn't saved as UTF-8. Save it as UTF-8 and try again."],
    [
      'UNEXPECTED_ENCODING',
      "The file isn't in the encoding its bank uses. See the details for how to fix it.",
    ],
    ['EMPTY_STATEMENT', 'The file has no movements. Check that you downloaded the right period.'],
    [
      'ALL_ROWS_UNPARSED',
      "None of the file's lines could be read. The bank may have changed its format.",
    ],
    [
      'VALIDATION_ERROR',
      "The file doesn't match what this bank's reader expects. See the details.",
    ],
    ['DRIVE_CONNECTION_ERROR', "This file couldn't be downloaded from Google Drive. Try again."],
    ['INTERNAL_SERVER_ERROR', 'Something went wrong on the server with this file. Try again.'],
  ])('%s', (code, text) => {
    expect(fileIssueMessage(failedWithCode(code))).toBe(text)
  })

  it('falls back to a generic text for an unknown code', () => {
    expect(fileIssueMessage(failedWithCode('SOMETHING_NEW'))).toBe(GENERIC)
    expect(fileIssueMessage(failedWithCode('constructor'))).toBe(GENERIC)
  })

  it('falls back to a generic text when the file carries no error', () => {
    expect(fileIssueMessage(fileWith(STATEMENT_FAILED_NO_ERROR))).toBe(GENERIC)
  })

  it('explains a skipped file', () => {
    expect(fileIssueMessage(fileWith(SKIPPED_FILE))).toBe(
      "This bank or file type isn't supported yet.",
    )
  })

  it('explains a failed product file by its code', () => {
    expect(fileIssueMessage(fileWith(PRODUCT_FAILED))).toBe(
      "The file doesn't match what this bank's reader expects. See the details.",
    )
  })
})

describe('fileIssueDetails (R10)', () => {
  it('is the original error message, the skip reason, or null', () => {
    expect(fileIssueDetails(fileWith(STATEMENT_MISSING_ACCOUNT))).toBe(
      STATEMENT_MISSING_ACCOUNT.error.message,
    )
    expect(fileIssueDetails(fileWith(SKIPPED_FILE))).toBe(SKIPPED_FILE.reason)
    expect(fileIssueDetails(fileWith(STATEMENT_FAILED_NO_ERROR))).toBeNull()
    expect(fileIssueDetails(fileWith({ ...SKIPPED_FILE, reason: '' }))).toBeNull()
  })
})

describe('issueFiles (R10)', () => {
  it('keeps failed and skipped files in report order', () => {
    const names = issueFiles(parseImportReport(FULL_REPORT)).map((file) => file.name)

    expect(names).toEqual([
      'extracto.csv',
      'openbank-agosto.xls',
      'cuenta-remunerada-2026-08-31.json',
      'captura.png',
    ])
  })
})
