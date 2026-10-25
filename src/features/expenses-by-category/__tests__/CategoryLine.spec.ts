import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import CategoryLine from '../components/CategoryLine.vue'
import { parseExpensesByCategory } from '../service'
import type { ExpenseLine, PeriodMode } from '../types'
import { rawMonth, rawYear } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const eur = (figure: string): string => `${figure}${NBSP}€`

const month = parseExpensesByCategory(rawMonth())
const year = parseExpensesByCategory(rawYear())

/** Combustible, the line with no category (new) and Restaurantes (gone). */
const [fuel, uncategorized, gone] = month.variable.lines as [ExpenseLine, ExpenseLine, ExpenseLine]
const [housing] = month.fixed.lines as [ExpenseLine]

function mountLine(line: ExpenseLine, mode: PeriodMode = 'month', total = month.amount) {
  return mount(CategoryLine, {
    props: { line, total, mode, fillClass: 'bg-chart-3' },
    attachTo: document.body,
  })
}

type Line = ReturnType<typeof mountLine>

const text = (wrapper: Line, name: string): string => wrapper.get(`[data-test="${name}"]`).text()
const has = (wrapper: Line, name: string): boolean => wrapper.find(`[data-test="${name}"]`).exists()

describe('CategoryLine', () => {
  it('marks a new category and one that is gone apart from the rest', () => {
    const fresh = mountLine(uncategorized)
    expect(text(fresh, 'line-name')).toBe('No category')
    expect(text(fresh, 'line-badge')).toBe('New')
    expect(fresh.get('[data-test="line-badge"]').classes()).toContain('text-info')

    const left = mountLine(gone)
    expect(text(left, 'line-name')).toBe('Restaurantes')
    expect(text(left, 'line-badge')).toBe('Gone')
    expect(left.get('[data-test="line-badge"]').classes()).toContain('text-ink-body')

    // The rest carry no mark.
    expect(has(mountLine(fuel), 'line-badge')).toBe(false)
    expect(has(mountLine(housing), 'line-badge')).toBe(false)
  })

  it('draws the bar as the share of the period total', () => {
    // 87.46 of 714.20 is 12,2 %.
    const line = mountLine(fuel)
    expect(line.get('[data-test="share-bar-fill"]').attributes('style')).toContain('width: 12.2%')
    expect(line.get('[data-test="share-bar-fill"]').classes()).toContain('bg-chart-3')
    expect(text(line, 'line-share')).toBe(`12,2${NBSP}%`)
    expect(text(line, 'line-amount')).toBe(eur('87,46'))
    expect(text(line, 'line-compared')).toBe(eur('52,16'))
    expect(text(line, 'line-difference')).toBe(`+${eur('35,30')}`)
    expect(line.get('[data-test="line-difference"]').classes()).toContain('text-negative')

    // The fixed line is most of the month: 85,7 %.
    expect(text(mountLine(housing), 'line-share')).toBe(`85,7${NBSP}%`)
    expect(mountLine(housing).get('[data-test="line-difference"]').classes()).toContain(
      'text-ink-muted',
    )

    // A gone line has no bar, and spending less reads in the positive tone.
    const left = mountLine(gone)
    expect(left.get('[data-test="share-bar-fill"]').attributes('style')).toContain('width: 0%')
    expect(text(left, 'line-share')).toBe(`0,0${NBSP}%`)
    expect(text(left, 'line-difference')).toBe(`-${eur('23,81')}`)
    expect(left.get('[data-test="line-difference"]').classes()).toContain('text-positive')

    // With nothing spent in the period, every bar is empty.
    expect(text(mountLine(gone, 'month', '0.00'), 'line-share')).toBe(`0,0${NBSP}%`)
  })

  it('shows the monthly average only in a year', () => {
    const [yearFuel] = year.variable.lines as [ExpenseLine]

    const inYear = mountLine(yearFuel, 'year', year.amount)
    expect(text(inYear, 'line-monthly')).toBe(eur('122,60'))
    expect(text(inYear, 'line-amount')).toBe(eur('1.471,20'))

    expect(has(mountLine(fuel, 'month'), 'line-monthly')).toBe(false)
  })

  it('opens a category and lists its movements with date, description and amount', async () => {
    const line = mountLine(fuel)
    const toggle = line.get('[data-test="line-toggle"]')
    expect(toggle.text()).toBe('Show movements')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(has(line, 'line-movements')).toBe(false)

    await toggle.trigger('click')

    expect(toggle.text()).toBe('Hide movements')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const rows = line.findAll('[data-test="line-movement"]')
    // In the order they come: newest first, as the backend sends them.
    expect(
      rows.map((row) => [
        row.get('[data-test="line-movement-date"]').text(),
        row.get('[data-test="line-movement-description"]').text(),
        row.get('[data-test="line-movement-amount"]').text(),
      ]),
    ).toEqual([
      [formatDate('2026-09-24'), 'ESTACION SERVICIO INVENTADA', formatMoney('39.63')],
      [formatDate('2026-09-12'), 'ESTACION SERVICIO INVENTADA', formatMoney('47.83')],
    ])
    expect(line.emitted('update:open')).toEqual([[true]])

    await toggle.trigger('click')
    expect(has(line, 'line-movements')).toBe(false)
  })

  it('a gone category has no movements to open', () => {
    const left = mountLine(gone)

    expect(has(left, 'line-toggle')).toBe(false)
    expect(left.text()).not.toContain('Show movements')
    expect(has(left, 'line-movements')).toBe(false)
  })
})
