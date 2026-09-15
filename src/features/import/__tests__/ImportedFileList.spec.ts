import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate } from '@/shared/money'

import ImportedFileList from '../components/ImportedFileList.vue'
import { parseImportReport } from '../service'
import {
  CLEAN_REPORT,
  DEPOSIT_IMPORTED,
  IMPORTED_FILES_REPORT,
  PRODUCT_CRYPTO,
  PRODUCT_IMPORTED,
  STATEMENT_ANCHORED_FILLED,
  STATEMENT_FILLED_ONE,
  STATEMENT_IMPORTED,
} from './fixtures'

const mountList = (...files: unknown[]) =>
  mount(ImportedFileList, { props: { report: parseImportReport({ ...CLEAN_REPORT, files }) } })

const notes = (row: ReturnType<ReturnType<typeof mountList>['get']>) =>
  row.findAll('[data-test="imported-note"]').map((note) => note.text())

describe('ImportedFileList (R9, R10, R11)', () => {
  it('lists only the imported files, in report order', () => {
    const wrapper = mount(ImportedFileList, {
      props: { report: parseImportReport(IMPORTED_FILES_REPORT) },
    })

    expect(wrapper.findAll('[data-test="file-heading-name"]').map((n) => n.text())).toEqual([
      'movs-agosto.xlsx',
      'movs-junio.xlsx',
      'movs-mayo.xlsx',
      'fondo-indexado.json',
      'deposito.json',
      'cripto.json',
    ])
  })

  it('shows a statement with its counts and the account it created', () => {
    const row = mountList(STATEMENT_IMPORTED).get('[data-test="imported-file"]')

    expect(row.get('[data-test="file-heading-name"]').text()).toBe('movs-agosto.xlsx')
    expect(row.get('[data-test="file-heading-origin"]').text()).toBe('Bankinter · 2026')
    expect(row.get('[data-test="imported-counts"]').text()).toBe('39 new · 2 already imported')
    expect(row.get('[data-test="new-account"]').text()).toBe('New account')
    expect(row.get('[data-test="new-account-alias"]').text()).toBe('bankinter 0236')
  })

  it('shows no New account badge when the account already existed', () => {
    const row = mountList(CLEAN_REPORT.files[0]).get('[data-test="imported-file"]')

    expect(row.find('[data-test="new-account"]').exists()).toBe(false)
    expect(notes(row)).toEqual([])
  })

  it('shows an unknown bank slug as it comes', () => {
    const row = mountList({ ...STATEMENT_IMPORTED, bank: 'newbank' }).get(
      '[data-test="imported-file"]',
    )

    expect(row.get('[data-test="file-heading-origin"]').text()).toBe('newbank · 2026')
  })

  it('notes the opening balance and the saved balances filled in, in plural and singular', () => {
    const wrapper = mountList(STATEMENT_IMPORTED, STATEMENT_ANCHORED_FILLED, STATEMENT_FILLED_ONE, {
      ...STATEMENT_FILLED_ONE,
      fileId: 'z',
      balancesFilled: 0,
    })

    const rows = wrapper.findAll('[data-test="imported-file"]')
    expect(rows.map((row) => notes(row))).toEqual([
      ['Opening balance set from this file'],
      ['Opening balance set from this file', '3 saved balances filled in'],
      ['1 saved balance filled in'],
      [],
    ])
  })

  it('shows a fund with its readable type, New product and the value date', () => {
    const row = mountList(PRODUCT_IMPORTED).get('[data-test="imported-file"]')

    expect(row.get('[data-test="imported-product"]').text()).toBe('Fondo indexado · Fund')
    expect(row.get('[data-test="new-product"]').text()).toBe('New product')
    expect(row.get('[data-test="imported-value-as-of"]').text()).toBe(
      `Value as of ${formatDate('2026-08-31')}`,
    )
    expect(row.find('[data-test="imported-counts"]').exists()).toBe(false)
  })

  it('shows a deposit without value date or New product, and an unknown type as it comes', () => {
    const [deposit, crypto] = mountList(DEPOSIT_IMPORTED, PRODUCT_CRYPTO).findAll(
      '[data-test="imported-file"]',
    )

    expect(deposit?.get('[data-test="imported-product"]').text()).toBe(
      'Depósito 12 meses · Fixed-term deposit',
    )
    expect(deposit?.find('[data-test="imported-value-as-of"]').exists()).toBe(false)
    expect(deposit?.find('[data-test="new-product"]').exists()).toBe(false)
    expect(crypto?.get('[data-test="imported-product"]').text()).toBe('Cartera cripto · crypto')
  })
})
