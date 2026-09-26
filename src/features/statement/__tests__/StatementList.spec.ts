import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { parseMovementPage } from '@/shared/movements'

import StatementList from '../components/StatementList.vue'
import { groupByDay } from '../months'
import { BIG_MONTH_PAGE_ONE, EMPTY_MONTH_PAGE, MONTH_PAGE } from './fixtures'

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

  it('has no control that writes a movement (C1)', () => {
    const list = mountList()

    expect(list.findAll('input')).toHaveLength(0)
    expect(list.findAll('select')).toHaveLength(0)
    expect(list.findAll('button')).toHaveLength(0)
  })
})
