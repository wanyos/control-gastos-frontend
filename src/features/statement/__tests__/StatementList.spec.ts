import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseCategories } from '@/shared/categories'
import { parseMovementPage } from '@/shared/movements'

import StatementList from '../components/StatementList.vue'
import { groupByDay } from '../months'
import { BIG_MONTH_PAGE_ONE, CATEGORIES, EMPTY_MONTH_PAGE, MONTH_PAGE, excluded } from './fixtures'

const tree = parseCategories(CATEGORIES)

const page = parseMovementPage(MONTH_PAGE)
const big = parseMovementPage(BIG_MONTH_PAGE_ONE)
const empty = parseMovementPage(EMPTY_MONTH_PAGE)

const mountList = (props: Partial<InstanceType<typeof StatementList>['$props']> = {}) =>
  mount(StatementList, {
    props: {
      month: '2026-09',
      days: groupByDay(page.movements),
      pagination: page.pagination,
      shown: page.movements.length,
      ...props,
    },
  })

describe('StatementList (R8, R11, R13)', () => {
  it('opens one day header per day, in the order the API sent them', () => {
    const list = mountList()
    const labels = list.findAll('[data-test="statement-day-label"]').map((day) => day.text())

    expect(labels).toEqual(['11 Sept 2026', '4 Sept 2026', '2 Sept 2026'])
    expect(list.findAll('[data-test="statement-row"]')).toHaveLength(5)
  })

  it('shows every movement of the month under its day', () => {
    const days = mountList().findAll('[data-test="statement-day"]')

    expect(days).toHaveLength(3)
    expect(days[0]?.findAll('[data-test="statement-row"]')).toHaveLength(2)
    expect(days[1]?.findAll('[data-test="statement-row"]')).toHaveLength(1)
  })

  it('an empty month says so and paints no list and no day header (R11)', () => {
    const list = mountList({ days: [], pagination: empty.pagination, shown: 0 })

    expect(list.get('[data-test="statement-empty"]').text()).toBe('No movements in September 2026.')
    expect(list.findAll('[data-test="statement-row"]')).toHaveLength(0)
    expect(list.findAll('[data-test="statement-day"]')).toHaveLength(0)
    expect(list.findAll('[data-test="statement-load-more"]')).toHaveLength(0)
  })

  it('offers Load more only when the month does not fit in one page (R13)', () => {
    expect(mountList().find('[data-test="statement-load-more"]').exists()).toBe(false)

    const list = mountList({
      days: groupByDay(big.movements),
      pagination: big.pagination,
      shown: big.movements.length,
      hasMore: true,
    })

    expect(list.get('[data-test="statement-load-more"]').text()).toContain('Load more')
    expect(list.get('[data-test="statement-showing"]').text()).toBe('Showing 2 of 412')
  })

  it('asks for the rest of the month when Load more is clicked', async () => {
    const list = mountList({
      days: groupByDay(big.movements),
      pagination: big.pagination,
      shown: 2,
      hasMore: true,
    })

    await list.get('[data-test="statement-load-more"]').trigger('click')

    expect(list.emitted('loadMore')).toHaveLength(1)
  })

  // Feature 21: the only control of a row is its category badge; no row carries a
  // selector until its editor is asked for (R2, C1).
  it('has no control that writes a movement but the category badges (C1)', () => {
    const list = mountList()

    expect(list.findAll('input')).toHaveLength(0)
    expect(list.findAll('select')).toHaveLength(0)
    expect(list.findAll('[data-test="statement-row-category-button"]')).toHaveLength(4)
    expect(list.findAll('[data-test="row-category-editor"]')).toHaveLength(0)
  })

  describe('passing the editor up and down (feature 21: R3, R7)', () => {
    it('opens the editor only in the row that is being edited', () => {
      const list = mountList({ editingId: 10, categories: tree })

      expect(list.findAll('[data-test="row-category-editor"]')).toHaveLength(1)
      expect(list.findAll('[data-test="statement-row-category-button"]')).toHaveLength(3)
    })

    it('says which row wants to be edited', async () => {
      const list = mountList()

      await list.findAll('[data-test="statement-row-category-button"]')[0]?.trigger('click')

      expect(list.emitted('edit')).toEqual([[10]])
    })

    it('carries the chosen category up with the id of its row', async () => {
      const list = mountList({ editingId: 10, categories: tree })

      await list.get('select').setValue('2')

      expect(list.emitted('categorize')).toEqual([[10, 2]])
    })

    it('carries the rule request up with the whole movement, and the close', async () => {
      const list = mountList({ editingId: 10, categories: tree })

      await list.get('[data-test="row-create-rule"]').trigger('click')
      await list.get('[data-test="row-category-close"]').trigger('click')

      const asked = list.emitted('create-rule')?.[0]?.[0] as { id: number } | undefined
      expect(asked?.id).toBe(10)
      expect(list.emitted('close-editor')).toHaveLength(1)
    })

    it('makes every row wait while a write is in flight (C2)', () => {
      const list = mountList({ editingId: 10, categories: tree, busy: true })

      expect(list.get('select').attributes('disabled')).toBeDefined()
    })
  })

  // --- The selection and the mark (feature 22) ---

  describe('passing the selection down (R5, R8, R9)', () => {
    it('shows no checkbox at all while the mode is off (R4)', () => {
      const list = mountList()

      expect(list.findAll('[data-test="statement-row-select"]')).toHaveLength(0)
    })

    it('shows one checkbox per row while the mode is on, and ticks the chosen ones', () => {
      const list = mountList({ selectable: true, selectedIds: [10, 12] })

      expect(list.findAll('[data-test="statement-row-select"]')).toHaveLength(5)
      const ticked = list
        .findAll('[data-test="statement-row-select"] input')
        .map((box) => (box.element as HTMLInputElement).checked)
      expect(ticked).toEqual([true, false, true, false, false])
    })

    it('raises the toggle of the row it came from', async () => {
      const list = mountList({ selectable: true })

      await list.findAll('[data-test="statement-row-select"] input')[2]?.setValue(true)

      expect(list.emitted('toggle')).toEqual([[12]])
    })

    it('neither hides, nor filters, nor reorders a marked movement (R9)', () => {
      const marked = parseMovementPage({
        ...MONTH_PAGE,
        movements: [
          excluded(MONTH_PAGE.movements[0] as Record<string, unknown>),
          MONTH_PAGE.movements[1] as Record<string, unknown>,
          excluded(MONTH_PAGE.movements[2] as Record<string, unknown>),
          MONTH_PAGE.movements[3] as Record<string, unknown>,
          MONTH_PAGE.movements[4] as Record<string, unknown>,
        ],
      })

      const list = mountList({ days: groupByDay(marked.movements), pagination: marked.pagination })

      expect(list.findAll('[data-test="statement-row"]')).toHaveLength(5)
      expect(
        list.findAll('[data-test="statement-row-description"]').map((row) => row.text()),
      ).toEqual([
        'CAFETERÍA CENTRAL',
        'COMPRA SUPERMERCADO',
        'NOMINA SEPTIEMBRE',
        'TRANSFERENCIA A MYINVESTOR',
        'AJUSTE DE SALDO',
      ])
      expect(list.findAll('[data-test="statement-row-excluded"]')).toHaveLength(2)
      expect(list.findAll('[data-test="statement-day-label"]').map((day) => day.text())).toEqual([
        '11 Sept 2026',
        '4 Sept 2026',
        '2 Sept 2026',
      ])
    })
  })
})
