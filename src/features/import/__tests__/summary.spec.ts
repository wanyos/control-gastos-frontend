import { describe, it, expect } from 'vitest'

import { ApiError, API_NETWORK, ValidationError } from '@/shared/errors'

import { parseImportReport, parsePendingFiles } from '../service'
import {
  finalPassesLine,
  importActionLabel,
  newAccountCount,
  pendingCountLabel,
  phaseAnnouncement,
  reviewSentence,
  summaryCounters,
} from '../summary'
import type { ImportFlow } from '../types'
import {
  ALL_DUPLICATES_REPORT,
  CLEAN_REPORT,
  EMPTY_REPORT,
  FULL_REPORT,
  PARTIAL_REPORT,
  PENDING_TWO,
  STATEMENT_IMPORTED,
} from './fixtures'

const report = (raw: unknown) => parseImportReport(raw)

describe('summaryCounters (R9)', () => {
  it('lists the four counters with the report values', () => {
    expect(summaryCounters(report(FULL_REPORT))).toEqual([
      { id: 'new', label: 'New movements', value: 39 },
      { id: 'duplicates', label: 'Already imported', value: 2 },
      { id: 'products', label: 'Investment files updated', value: 2 },
      { id: 'notImported', label: 'Files not imported', value: 4 },
    ])
  })

  it('keeps all four at 0 for an empty report', () => {
    expect(summaryCounters(report(EMPTY_REPORT)).map((c) => c.value)).toEqual([0, 0, 0, 0])
  })
})

describe('finalPassesLine (R9)', () => {
  it('joins transfers, categorized and new accounts', () => {
    expect(finalPassesLine(report(FULL_REPORT))).toBe(
      '2 transfers matched · 12 categorized · 1 new account',
    )
  })

  it('uses the singular and plural and leaves out the parts at 0', () => {
    const raw = {
      ...EMPTY_REPORT,
      files: [STATEMENT_IMPORTED, { ...STATEMENT_IMPORTED, fileId: 'other' }],
      transfers: { ...EMPTY_REPORT.transfers, pairsCreated: 1 },
    }

    expect(finalPassesLine(report(raw))).toBe('1 transfer matched · 2 new accounts')
  })

  it('is null when every part is 0', () => {
    expect(finalPassesLine(report(ALL_DUPLICATES_REPORT))).toBeNull()
  })

  it('counts only statements whose account was created', () => {
    expect(newAccountCount(report(FULL_REPORT))).toBe(1)
    expect(newAccountCount(report(CLEAN_REPORT))).toBe(0)
  })
})

describe('reviewSentence (R9)', () => {
  it('uses the plural', () => {
    expect(reviewSentence(report(FULL_REPORT))).toBe('39 new movements are waiting for your review')
  })

  it('uses the singular', () => {
    expect(reviewSentence(report(CLEAN_REPORT))).toBe('1 new movement is waiting for your review')
  })

  it('is null without new movements', () => {
    expect(reviewSentence(report(ALL_DUPLICATES_REPORT))).toBeNull()
  })
})

describe('pendingCountLabel (R3)', () => {
  it.each([
    [1, '1 new file'],
    [3, '3 new files'],
  ])('%i gives %s', (total, label) => {
    expect(pendingCountLabel(total)).toBe(label)
  })
})

describe('importActionLabel', () => {
  it('names how many files are imported', () => {
    expect(importActionLabel(2)).toBe('Import 2 files')
    expect(importActionLabel(1)).toBe('Import 1 file')
  })
})

describe('phaseAnnouncement (R15)', () => {
  const pending = parsePendingFiles(PENDING_TWO)
  const networkError = new ApiError('x', API_NETWORK)

  const cases: [string, ImportFlow, string][] = [
    ['closed', { step: 'closed' }, ''],
    ['checking', { step: 'checking' }, 'Checking Drive for new files…'],
    ['upToDate', { step: 'upToDate' }, "You're up to date. No new files in Google Drive."],
    ['confirm', { step: 'confirm', pending }, '2 new files found.'],
    ['importing', { step: 'importing', fileCount: 2 }, 'Importing 2 files…'],
    ['importing one file', { step: 'importing', fileCount: 1 }, 'Importing 1 file…'],
    ['finished', { step: 'finished', report: report(PARTIAL_REPORT) }, 'Partially imported'],
    [
      'checkFailed',
      { step: 'checkFailed', kind: 'drive', error: networkError },
      "Couldn't reach Google Drive",
    ],
    [
      'importFailed',
      { step: 'importFailed', kind: 'server', error: networkError },
      "Couldn't reach the server",
    ],
    [
      'reportUnreadable',
      { step: 'reportUnreadable', error: new ValidationError('x') },
      "The import finished, but its report couldn't be read. Your files may have been imported.",
    ],
  ]

  it.each(cases)('%s', (_name, flow, text) => {
    expect(phaseAnnouncement(flow)).toBe(text)
  })
})
