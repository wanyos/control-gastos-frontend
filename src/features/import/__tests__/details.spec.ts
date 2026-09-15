import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import {
  checkLabel,
  detailSections,
  directionLabel,
  finalPassFailures,
  importedFileRows,
  mismatchGroups,
  moreLabel,
  productTypeLabel,
  unreadLineGroups,
  visibleAmbiguous,
  visibleConflicts,
} from '../details'
import { parseImportReport } from '../service'
import {
  AMBIGUOUS_12,
  CATEGORIZATION_ERROR,
  CLEAN_REPORT,
  CONFLICTS_11,
  DETAILS_REPORT,
  EMPTY_REPORT,
  FULL_REPORT,
  IMPORTED_FILES_REPORT,
  STATEMENT_ALL_UNPARSED,
  STATEMENT_IMPORTED,
  STATEMENT_UNREAD_42,
  TRANSFERS_ERROR,
  unreadRows,
} from './fixtures'

const report = (raw: unknown) => parseImportReport(raw)

describe('detailSections (R1, R2)', () => {
  it('lists every section in the fixed order with the report totals as counts', () => {
    const sections = detailSections(report(DETAILS_REPORT))

    expect(sections).toEqual([
      { id: 'final-passes', title: 'Final passes', count: 2 },
      { id: 'mismatches', title: 'Balance mismatches', count: 1 },
      { id: 'unread', title: 'Unread lines', count: 1 },
      { id: 'transfers', title: 'Transfers to match', count: 1 },
      { id: 'conflicts', title: 'Category rule conflicts', count: 1 },
      { id: 'imported-files', title: 'Imported files', count: 3 },
    ])
  })

  it('leaves out the empty sections', () => {
    expect(detailSections(report(FULL_REPORT)).map((s) => s.id)).toEqual([
      'mismatches',
      'unread',
      'transfers',
      'conflicts',
      'imported-files',
    ])
    expect(detailSections(report(CLEAN_REPORT)).map((s) => s.id)).toEqual(['imported-files'])
    expect(detailSections(report(EMPTY_REPORT))).toEqual([])
  })

  it('counts from the totals, not from the listed items', () => {
    const raw = { ...CLEAN_REPORT, unparsedCount: 42, files: [STATEMENT_UNREAD_42] }

    expect(detailSections(report(raw)).find((s) => s.id === 'unread')?.count).toBe(42)
  })
})

describe('finalPassFailures (R3)', () => {
  it('returns nothing when both passes finished', () => {
    expect(finalPassFailures(report(FULL_REPORT))).toEqual([])
  })

  it('returns the transfers failure alone', () => {
    const raw = {
      ...CLEAN_REPORT,
      transfers: { ...CLEAN_REPORT.transfers, error: TRANSFERS_ERROR },
    }

    expect(finalPassFailures(report(raw))).toEqual([
      {
        id: 'transfers',
        title: "Transfer matching didn't finish",
        details: TRANSFERS_ERROR.message,
      },
    ])
  })

  it('returns both failures, transfers first', () => {
    const raw = {
      ...CLEAN_REPORT,
      transfers: { ...CLEAN_REPORT.transfers, error: TRANSFERS_ERROR },
      categorization: { ...CLEAN_REPORT.categorization, error: CATEGORIZATION_ERROR },
    }

    expect(finalPassFailures(report(raw)).map((f) => [f.id, f.title])).toEqual([
      ['transfers', "Transfer matching didn't finish"],
      ['categorization', "Automatic categorization didn't finish"],
    ])
  })

  it('has no details when the original message came empty', () => {
    const raw = {
      ...CLEAN_REPORT,
      categorization: { ...CLEAN_REPORT.categorization, error: { code: 'X', message: '' } },
    }

    expect(finalPassFailures(report(raw))[0]?.details).toBeNull()
  })
})

describe('checkLabel (R5)', () => {
  it('names and explains a per-line check', () => {
    expect(checkLabel('per-line')).toEqual({
      name: 'Line-by-line check',
      explanation: "A line's amount doesn't match how the running balance changed.",
    })
  })

  it('names and explains a statement balance check', () => {
    expect(checkLabel('statement-balance')).toEqual({
      name: 'Statement balance check',
      explanation:
        "The balance at the top of the file doesn't match the saved opening balance plus the movements after it.",
    })
  })

  it('falls back to a generic name without explanation for an unknown check', () => {
    expect(checkLabel('monthly-total')).toEqual({ name: 'Balance check', explanation: null })
  })
})

describe('mismatchGroups (R4)', () => {
  it('groups the mismatches by file with a readable bank', () => {
    const second = {
      ...STATEMENT_IMPORTED,
      bank: 'n26',
      fileId: 'n1',
      name: 'n26-julio.csv',
      balanceMismatches: [
        { ...STATEMENT_IMPORTED.balanceMismatches[0], check: 'statement-balance' },
        { ...STATEMENT_IMPORTED.balanceMismatches[0], date: '2026-07-22' },
      ],
    }
    const raw = { ...FULL_REPORT, balanceMismatchCount: 3, files: [STATEMENT_IMPORTED, second] }

    const groups = mismatchGroups(report(raw))

    expect(groups.map((g) => [g.file, g.mismatches.length])).toEqual([
      [{ name: 'movs-agosto.xlsx', bank: 'Bankinter', year: '2026' }, 1],
      [{ name: 'n26-julio.csv', bank: 'N26', year: '2026' }, 2],
    ])
  })
})

describe('unreadLineGroups (R6)', () => {
  const groupsOf = (...files: unknown[]) => unreadLineGroups(report({ ...CLEAN_REPORT, files }))

  it('shows 3 rows and nothing more', () => {
    const [group] = groupsOf({
      ...STATEMENT_UNREAD_42,
      unparsedCount: 3,
      unparsedRows: unreadRows(3),
    })

    expect(group?.rows).toHaveLength(3)
    expect(group?.more).toBeNull()
  })

  it('shows 5 of 6 rows and "and 1 more line"', () => {
    const [group] = groupsOf({
      ...STATEMENT_UNREAD_42,
      unparsedCount: 6,
      unparsedRows: unreadRows(6),
    })

    expect(group?.rows.map((r) => r.row)).toEqual([10, 11, 12, 13, 14])
    expect(group?.more).toBe('and 1 more line')
  })

  it('shows 5 of 42 rows and "and 37 more lines"', () => {
    const [group] = groupsOf(STATEMENT_UNREAD_42)

    expect(group?.rows).toHaveLength(5)
    expect(group?.more).toBe('and 37 more lines')
  })

  it('includes a failed file whose lines could not be read, in report order', () => {
    const groups = groupsOf(CLEAN_REPORT.files[0], STATEMENT_ALL_UNPARSED, STATEMENT_UNREAD_42)

    expect(groups.map((g) => [g.file.name, g.file.bank, g.more])).toEqual([
      ['openbank-julio.xls', 'Openbank', 'and 1 more line'],
      ['movs-julio.xlsx', 'Bankinter', 'and 37 more lines'],
    ])
  })
})

describe('visibleAmbiguous and visibleConflicts (R7, R8)', () => {
  it('keeps every group under the cap', () => {
    const { groups, more } = visibleAmbiguous(report(FULL_REPORT).transfers)

    expect(groups).toHaveLength(1)
    expect(more).toBeNull()
  })

  it('caps ambiguous groups at 10 and tells the rest', () => {
    const { groups, more } = visibleAmbiguous(
      report({ ...CLEAN_REPORT, transfers: AMBIGUOUS_12 }).transfers,
    )

    expect(groups).toHaveLength(10)
    expect(more).toBe('and 2 more groups')
  })

  it('caps conflicts at 10 and tells the rest', () => {
    const parsed = report({ ...CLEAN_REPORT, categorization: CONFLICTS_11 })

    const { conflicts, more } = visibleConflicts(parsed.categorization)

    expect(conflicts).toHaveLength(10)
    expect(more).toBe('and 1 more movement')
  })

  it('keeps every conflict under the cap', () => {
    expect(visibleConflicts(report(FULL_REPORT).categorization)).toMatchObject({ more: null })
  })
})

describe('directionLabel (R7)', () => {
  it.each([
    ['expense', 'Out'],
    ['income', 'In'],
    ['neutral', 'neutral'],
  ])('%s → %s', (type, label) => {
    expect(directionLabel(type)).toBe(label)
  })
})

describe('importedFileRows (R9, R10, R11)', () => {
  const rows = () => importedFileRows(report(IMPORTED_FILES_REPORT))

  it('lists only the imported files, in report order', () => {
    expect(rows().map((row) => [row.kind, row.file.name])).toEqual([
      ['statement', 'movs-agosto.xlsx'],
      ['statement', 'movs-junio.xlsx'],
      ['statement', 'movs-mayo.xlsx'],
      ['product', 'fondo-indexado.json'],
      ['product', 'deposito.json'],
      ['product', 'cripto.json'],
    ])
  })

  it('describes a statement with a new account and its anchor', () => {
    expect(rows()[0]).toEqual({
      kind: 'statement',
      file: { name: 'movs-agosto.xlsx', bank: 'Bankinter', year: '2026' },
      counts: '39 new · 2 already imported',
      newAccount: 'bankinter 0236',
      notes: ['Opening balance set from this file'],
    })
  })

  it('writes the filled balances note in plural and singular, and none at 0', () => {
    const [first, anchoredFilled, filledOne] = rows()

    expect(anchoredFilled).toMatchObject({
      newAccount: null,
      notes: ['Opening balance set from this file', '3 saved balances filled in'],
    })
    expect(filledOne).toMatchObject({ notes: ['1 saved balance filled in'] })
    expect(first?.kind === 'statement' && first.notes).not.toContain('0 saved balances filled in')
  })

  it('has no new account when the account already existed', () => {
    expect(importedFileRows(report(CLEAN_REPORT))[0]).toMatchObject({ newAccount: null, notes: [] })
  })

  it('describes products with their readable type, whether new and the value date', () => {
    const [, , , fund, deposit, crypto] = rows()

    expect(fund).toEqual({
      kind: 'product',
      file: { name: 'fondo-indexado.json', bank: 'MyInvestor', year: '2026' },
      product: 'Fondo indexado',
      typeLabel: 'Fund',
      isNew: true,
      valueAsOf: `Value as of ${formatDate('2026-08-31')}`,
    })
    expect(deposit).toMatchObject({
      typeLabel: 'Fixed-term deposit',
      isNew: false,
      valueAsOf: null,
    })
    expect(crypto).toMatchObject({ typeLabel: 'crypto', file: { bank: 'newbank' } })
  })

  it('labels every product type the net worth knows and passes unknown ones through', () => {
    expect(productTypeLabel('etf')).toBe('ETF')
    expect(productTypeLabel('managed_portfolio')).toBe('Managed portfolio')
    expect(productTypeLabel('savings_account')).toBe('Interest account')
    expect(productTypeLabel('checking')).toBe('checking')
  })
})

describe('moreLabel', () => {
  it('is null when nothing is hidden, singular for 1 and plural otherwise', () => {
    expect(moreLabel(0, 'line', 'lines')).toBeNull()
    expect(moreLabel(-2, 'line', 'lines')).toBeNull()
    expect(moreLabel(1, 'group', 'groups')).toBe('and 1 more group')
    expect(moreLabel(37, 'line', 'lines')).toBe('and 37 more lines')
  })
})
