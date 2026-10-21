import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'
import { parseMovementPage } from '@/shared/movements'
import type { Movement } from '@/shared/movements'

import DoubtfulOwnershipRow from '../components/DoubtfulOwnershipRow.vue'
import { DOUBTFUL_OWN_IN, DOUBTFUL_OWN_OUT, doubtfulPage } from './fixtures'

const read = (raw: Record<string, unknown>): Movement =>
  parseMovementPage(doubtfulPage(raw)).movements[0]!

const rowOf = (raw: Record<string, unknown>, busy = false) =>
  mount(DoubtfulOwnershipRow, { props: { movement: read(raw), busy } })

describe('DoubtfulOwnershipRow (feature 35, R3, R10)', () => {
  it('shows the date, account, description, signed amount and reason of a doubtful movement', () => {
    const row = rowOf(DOUBTFUL_OWN_OUT)

    expect(row.attributes('data-movement-id')).toBe('9101')
    expect(row.get('[data-test="ownership-date"]').text()).toBe(formatDate('2026-10-13'))
    expect(row.get('[data-test="ownership-account"]').text()).toBe('Bankinter ···6182')
    expect(row.get('[data-test="ownership-description"]').text()).toBe(
      'TRANSF /BANCO FICTICIO NORTE',
    )
    expect(row.get('[data-test="ownership-description"]').attributes('lang')).toBe('es')
    // An expense, with its sign; an income, without one and green.
    expect(row.get('[data-test="ownership-amount"]').text()).toBe(formatMoney('-350.00'))
    expect(row.get('[data-test="ownership-amount"]').classes()).toContain('text-ink-strong')
    const income = rowOf(DOUBTFUL_OWN_IN).get('[data-test="ownership-amount"]')
    expect(income.text()).toBe(formatMoney('120.50'))
    expect(income.classes()).toContain('text-positive')
    // Which text matched, and of which of your accounts.
    expect(row.get('[data-test="ownership-reason"]').text()).toBe(
      'Names "Banco Ficticio Norte", the bank of your account "Cartera inventada"',
    )
    // The reason without the name of the account, and without the text.
    const ownership = DOUBTFUL_OWN_OUT.ownership as Record<string, unknown>
    const noName = { ...DOUBTFUL_OWN_OUT, ownership: { ...ownership, ownAccountName: null } }
    expect(rowOf(noName).get('[data-test="ownership-reason"]').text()).toBe(
      'Names "Banco Ficticio Norte", the bank of one of your accounts',
    )
    const noText = {
      ...DOUBTFUL_OWN_OUT,
      ownership: { ...ownership, ownAccountName: null, ownAccountId: null, matchedText: null },
    }
    expect(rowOf(noText).get('[data-test="ownership-reason"]').text()).toBe(
      'Names the bank of one of your accounts',
    )
    // The two answers, named after the movement for a screen reader.
    expect(row.get('[data-test="ownership-mine"]').text()).toBe("It's mine")
    expect(row.get('[data-test="ownership-mine"]').attributes('aria-label')).toBe(
      "It's mine: TRANSF /BANCO FICTICIO NORTE",
    )
    expect(row.get('[data-test="ownership-not-mine"]').text()).toBe('Not mine')
  })

  it('emits one answer per click', async () => {
    const row = rowOf(DOUBTFUL_OWN_OUT)

    await row.get('[data-test="ownership-mine"]').trigger('click')
    await row.get('[data-test="ownership-not-mine"]').trigger('click')

    expect(row.emitted('answer')).toEqual([['mine'], ['not_mine']])
  })

  it('disables both answers while a write is in flight', async () => {
    const row = rowOf(DOUBTFUL_OWN_OUT, true)

    expect(row.get('[data-test="ownership-mine"]').attributes('disabled')).toBeDefined()
    expect(row.get('[data-test="ownership-not-mine"]').attributes('disabled')).toBeDefined()
    await row.get('[data-test="ownership-mine"]').trigger('click')
    await row.get('[data-test="ownership-not-mine"]').trigger('click')
    expect(row.emitted('answer')).toBeUndefined()

    const free = rowOf(DOUBTFUL_OWN_OUT, false)
    expect(free.get('[data-test="ownership-mine"]').attributes('disabled')).toBeUndefined()
    expect(free.get('[data-test="ownership-not-mine"]').attributes('disabled')).toBeUndefined()
  })
})
