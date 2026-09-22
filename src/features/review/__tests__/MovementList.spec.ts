import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MovementList from '../components/MovementList.vue'
import { parseMovementPage } from '../service'
import { PAGE_OF_THREE } from './fixtures'

const movements = parseMovementPage(PAGE_OF_THREE).movements

describe('MovementList (R3, R12)', () => {
  it('paints one row per movement, in the order the API sent them', () => {
    // The fixture is deliberately out of date order: the client must not re-sort.
    const wrapper = mount(MovementList, { props: { movements } })

    const rows = wrapper.findAll('[data-test="movement-row"]')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.get('[data-test="movement-description"]').text())).toEqual([
      'CAFETERÍA CENTRAL',
      'NOMINA JULIO',
      'AJUSTE DE SALDO',
    ])
    expect(movements.map((movement) => movement.bookingDate)).toEqual([
      '2026-07-31',
      '2026-07-30',
      '2026-08-02',
    ])
  })

  it('says the queue is empty instead of painting an empty table', () => {
    const wrapper = mount(MovementList, { props: { movements: [], emptyState: 'caughtUp' } })

    expect(wrapper.get('[data-test="review-empty"]').text()).toBe(
      "You're all caught up. Nothing is waiting for review.",
    )
    expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)
    expect(wrapper.findAll('button')).toHaveLength(0)
    // Nothing to select either: the header only exists over a list (R2).
    expect(wrapper.find('[data-test="select-all"]').exists()).toBe(false)
  })

  describe('selecting the page (R1, R2)', () => {
    const listOf = (selectedIds: number[]) =>
      mount(MovementList, { props: { movements, selectedIds } })

    it('takes the whole page with one tick, and lets it go the same way', async () => {
      const wrapper = listOf([])

      await wrapper.get('[data-test="select-all"] input').setValue(true)
      expect(wrapper.emitted('selectAll')).toEqual([[true]])

      const full = listOf([10, 11, 12])
      await full.get('[data-test="select-all"] input').setValue(false)
      expect(full.emitted('selectAll')).toEqual([[false]])
    })

    it('is ticked only with the whole page taken, and shows a dash in between', () => {
      const none = listOf([])
      const some = listOf([10])
      const all = listOf([10, 11, 12])

      const box = (wrapper: ReturnType<typeof listOf>) =>
        wrapper.get('[data-test="select-all"] input').element as HTMLInputElement

      expect([box(none).checked, box(none).indeterminate]).toEqual([false, false])
      expect([box(some).checked, box(some).indeterminate]).toEqual([false, true])
      expect([box(all).checked, box(all).indeterminate]).toEqual([true, false])
    })

    it('counts what is ticked out of what is on the page', () => {
      expect(listOf([10, 11]).get('[data-test="select-all-count"]').text()).toBe('2 of 3 selected')
    })

    it('marks the ticked rows and passes every row event up with its id', async () => {
      const wrapper = listOf([11])

      const rows = wrapper.findAll('[data-test="movement-row"]')
      expect(rows[1]?.classes()).toContain(['bg', 'surface', 'sunken'].join('-'))

      await wrapper.findAll('[data-test="movement-select"] input')[0]?.setValue(true)
      await wrapper.findAll('[data-test="movement-confirm"]')[2]?.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([[10]])
      expect(wrapper.emitted('confirm')).toEqual([[12]])
    })
  })

  it('offers Clear filters when it is the filters that match nothing', async () => {
    const wrapper = mount(MovementList, { props: { movements: [], emptyState: 'noMatches' } })

    expect(wrapper.get('[data-test="review-empty"]').text()).toContain(
      'No movements match these filters.',
    )
    expect(wrapper.findAll('[data-test="movement-row"]')).toHaveLength(0)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
