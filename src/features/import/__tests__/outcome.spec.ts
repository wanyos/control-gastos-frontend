import { describe, it, expect } from 'vitest'

import { importOutcome } from '../outcome'
import { parseImportReport } from '../service'
import {
  ALL_DUPLICATES_REPORT,
  ALL_FAILED_REPORT,
  CLEAN_REPORT,
  EMPTY_REPORT,
  FULL_REPORT,
  ONLY_PRODUCTS_REPORT,
  PARTIAL_REPORT,
  SKIPPED_FILE,
} from './fixtures'

const outcomeOf = (raw: unknown) => importOutcome(parseImportReport(raw))

const FAILED_PASS = { code: 'INTERNAL_SERVER_ERROR', message: 'fallo en la pasada' }

describe('importOutcome (R9)', () => {
  it('is Import complete when everything went in and there is nothing to check', () => {
    expect(outcomeOf(CLEAN_REPORT)).toEqual({ headline: 'Import complete', tone: 'positive' })
  })

  it('is Partially imported when some files went in and some failed', () => {
    expect(outcomeOf(PARTIAL_REPORT)).toEqual({ headline: 'Partially imported', tone: 'warning' })
    expect(outcomeOf(FULL_REPORT).headline).toBe('Partially imported')
  })

  it('is Nothing was imported when no file went in', () => {
    expect(outcomeOf(ALL_FAILED_REPORT)).toEqual({
      headline: 'Nothing was imported',
      tone: 'negative',
    })
  })

  it('is Nothing was imported for a report without files', () => {
    expect(outcomeOf(EMPTY_REPORT).headline).toBe('Nothing was imported')
  })

  it('is Import complete when every line was already stored (the file still went in)', () => {
    expect(outcomeOf(ALL_DUPLICATES_REPORT).headline).toBe('Import complete')
  })

  it('is Import complete with only product files', () => {
    expect(outcomeOf(ONLY_PRODUCTS_REPORT).headline).toBe('Import complete')
  })

  it.each([
    ['a skipped file', { files: [...CLEAN_REPORT.files, SKIPPED_FILE], skippedCount: 1 }],
    ['unread rows', { unparsedCount: 1 }],
    ['a balance mismatch', { balanceMismatchCount: 1 }],
    ['an ambiguous transfer', { transfers: { ...CLEAN_REPORT.transfers, ambiguousCount: 1 } }],
    [
      'a category conflict',
      { categorization: { ...CLEAN_REPORT.categorization, conflictCount: 1 } },
    ],
    [
      'a failed transfer detection',
      { transfers: { ...CLEAN_REPORT.transfers, error: FAILED_PASS } },
    ],
    [
      'a failed categorization',
      { categorization: { ...CLEAN_REPORT.categorization, error: FAILED_PASS } },
    ],
  ])('is Imported, with a few things to check with %s', (_name, change) => {
    expect(outcomeOf({ ...CLEAN_REPORT, ...change })).toEqual({
      headline: 'Imported, with a few things to check',
      tone: 'warning',
    })
  })
})
