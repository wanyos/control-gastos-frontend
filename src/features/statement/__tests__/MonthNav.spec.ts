import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MonthNav from '../components/MonthNav.vue'
import { currentMonth, shiftMonth } from '../months'

const mountNav = (month: string) => mount(MonthNav, { props: { month } })

describe('MonthNav (R2)', () => {
  it('shows the month it is on', () => {
    expect(mountNav('2026-03').get('[data-test="statement-month-label"]').text()).toBe('March 2026')
  })

  it('the arrows emit the neighbouring month, crossing the year', async () => {
    const nav = mountNav('2026-01')

    await nav.get('[data-test="statement-prev"]').trigger('click')
    await nav.get('[data-test="statement-next"]').trigger('click')

    expect(nav.emitted('change')).toEqual([['2025-12'], ['2026-02']])
  })

  it('never blocks going back: the frontend does not know where the history starts', () => {
    const nav = mountNav('2024-01')

    expect(nav.get('[data-test="statement-prev"]').attributes('disabled')).toBeUndefined()
  })

  it('turns Next off on the current month, and on again on a past one', () => {
    const now = mountNav(currentMonth())
    const past = mountNav(shiftMonth(currentMonth(), -1))

    expect(now.get('[data-test="statement-next"]').attributes('disabled')).toBeDefined()
    expect(past.get('[data-test="statement-next"]').attributes('disabled')).toBeUndefined()
  })

  it('names both arrows for a screen reader', () => {
    const nav = mountNav('2026-03')

    expect(nav.get('[data-test="statement-prev"]').attributes('aria-label')).toBe('Previous month')
    expect(nav.get('[data-test="statement-next"]').attributes('aria-label')).toBe('Next month')
  })

  it('jumps to the month chosen in the picker', async () => {
    const nav = mountNav('2026-09')
    const input = nav.get('[data-test="statement-month-input"] input')

    expect(input.attributes('type')).toBe('month')
    expect((input.element as HTMLInputElement).value).toBe('2026-09')
    await input.setValue('2024-01')

    expect(nav.emitted('change')).toEqual([['2024-01']])
  })

  it('ignores a half-typed or cleared month instead of loading nonsense', async () => {
    const nav = mountNav('2026-09')
    const input = nav.get('[data-test="statement-month-input"] input')

    await input.setValue('')
    await input.setValue('2026-')
    await input.setValue('2026-13')

    expect(nav.emitted('change')).toBeUndefined()
  })
})
