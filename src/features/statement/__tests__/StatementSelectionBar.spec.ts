import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import StatementSelectionBar from '../components/StatementSelectionBar.vue'

const mountBar = (props: Record<string, unknown> = {}) =>
  mount(StatementSelectionBar, {
    props: { selectedCount: 3, shownCount: 12, ...props },
  })

const isDisabled = (wrapper: ReturnType<typeof mountBar>, test: string): boolean =>
  (wrapper.get(`[data-test="${test}"]`).element as HTMLButtonElement).disabled

describe('StatementSelectionBar (R5, C5)', () => {
  it('says how many rows are ticked', () => {
    expect(mountBar().get('[data-test="statement-selected-count"]').text()).toBe('3 selected')
    expect(
      mountBar({ selectedCount: 1 }).get('[data-test="statement-selected-count"]').text(),
    ).toBe('1 selected')
  })

  it('offers the two actions, both named in English', () => {
    const bar = mountBar()

    expect(bar.get('[data-test="statement-exclude"]').text()).toBe('Exclude from totals')
    expect(bar.get('[data-test="statement-include"]').text()).toBe('Include in totals')
  })

  it('raises one event per control', async () => {
    const bar = mountBar()

    await bar.get('[data-test="statement-exclude"]').trigger('click')
    await bar.get('[data-test="statement-include"]').trigger('click')
    await bar.get('[data-test="statement-select-all"]').trigger('click')
    await bar.get('[data-test="statement-clear-selection"]').trigger('click')
    await bar.get('[data-test="statement-selection-done"]').trigger('click')

    expect(bar.emitted('exclude')).toHaveLength(1)
    expect(bar.emitted('include')).toHaveLength(1)
    expect(bar.emitted('select-all')).toHaveLength(1)
    expect(bar.emitted('clear')).toHaveLength(1)
    expect(bar.emitted('done')).toHaveLength(1)
  })

  it('leaves the two actions dead while nothing is ticked', () => {
    const bar = mountBar({ selectedCount: 0 })

    expect(isDisabled(bar, 'statement-exclude')).toBe(true)
    expect(isDisabled(bar, 'statement-include')).toBe(true)
    expect(isDisabled(bar, 'statement-clear-selection')).toBe(true)
    // Selecting everything and leaving the mode are still possible.
    expect(isDisabled(bar, 'statement-select-all')).toBe(false)
    expect(isDisabled(bar, 'statement-selection-done')).toBe(false)
  })

  it('has nothing to select when the month on screen is empty', () => {
    expect(isDisabled(mountBar({ shownCount: 0 }), 'statement-select-all')).toBe(true)
  })

  it('goes entirely dead while a write is in flight (C5)', () => {
    const bar = mountBar({ busy: true })

    for (const control of [
      'statement-exclude',
      'statement-include',
      'statement-select-all',
      'statement-clear-selection',
      'statement-selection-done',
    ]) {
      expect(isDisabled(bar, control)).toBe(true)
    }
  })

  it('never paints a figure or an amount: it only counts rows', () => {
    const text = mountBar().text()

    expect(text).not.toContain('€')
    expect(text).toContain('3 selected')
  })
})
