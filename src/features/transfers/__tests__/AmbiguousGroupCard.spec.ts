import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import AmbiguousGroupCard from '../components/AmbiguousGroupCard.vue'
import { parseAmbiguousGroups } from '../service'
import type { LinkChoice } from '../types'
import { GROUP_OF_2, GROUP_OF_3, GROUP_OF_4, GROUP_ONE_SIDED, ambiguous } from './fixtures'

const groupOf = (raw: Record<string, unknown>) => parseAmbiguousGroups(ambiguous(raw))[0]!

const cardOf = (raw: Record<string, unknown>, choice?: LinkChoice, busy = false) =>
  mount(AmbiguousGroupCard, { props: { group: groupOf(raw), choice, busy } })

type Card = ReturnType<typeof cardOf>

const idsIn = (card: Card, side: 'out' | 'in') =>
  card
    .findAll(`[data-test="doubtful-pick-${side}"]`)
    .map((radio) => Number(radio.attributes('value')))

const checkedIn = (card: Card) =>
  card
    .findAll('input[type="radio"]')
    .filter((radio) => (radio.element as HTMLInputElement).checked)
    .map((radio) => Number(radio.attributes('value')))

const linkButton = (card: Card) => card.get('[data-test="doubtful-link"]')
const isDisabled = (card: Card) => linkButton(card).attributes('disabled') !== undefined

describe('AmbiguousGroupCard (R8, R10, R11, C7)', () => {
  it('shows the amount of the group and its movements in two columns', () => {
    const card = cardOf(GROUP_OF_3)

    expect(card.get('[data-test="doubtful-amount"]').text()).toBe(formatMoney('500.00'))
    expect(card.get('[data-test="doubtful-column-out"] legend').text()).toBe('Money out')
    expect(card.get('[data-test="doubtful-column-in"] legend').text()).toBe('Money in')
    expect(idsIn(card, 'out')).toEqual([812])
    expect(idsIn(card, 'in')).toEqual([840, 841])

    const second = card.findAll(
      '[data-test="doubtful-column-in"] [data-test="doubtful-movement"]',
    )[1]
    expect(second?.get('[data-test="doubtful-date"]').text()).toBe(formatDate('2026-08-02'))
    expect(second?.get('[data-test="doubtful-account"]').text()).toBe('n26 ···4136')
    expect(second?.get('[data-test="doubtful-description"]').text()).toBe('ABONO')
    expect(second?.get('[data-test="doubtful-description"]').attributes('lang')).toBe('es')
  })

  it('a group of 4 keeps two movements per column, in the order received', () => {
    const card = cardOf(GROUP_OF_4)

    expect(idsIn(card, 'out')).toEqual([901, 902])
    expect(idsIn(card, 'in')).toEqual([903, 904])
  })

  it('picks nothing beforehand, not even in a group of exactly two', () => {
    for (const raw of [GROUP_OF_2, GROUP_OF_3, GROUP_OF_4]) {
      const card = cardOf(raw)

      expect(checkedIn(card)).toEqual([])
      expect(isDisabled(card)).toBe(true)
      expect(card.emitted('link')).toBeUndefined()
      expect(card.emitted('choose')).toBeUndefined()
    }
  })

  it('each column is one radio group of its own, so only one per column can be picked', () => {
    const card = cardOf(GROUP_OF_4)

    const names = (side: 'out' | 'in') =>
      card.findAll(`[data-test="doubtful-pick-${side}"]`).map((radio) => radio.attributes('name'))
    expect(new Set(names('out')).size).toBe(1)
    expect(new Set(names('in')).size).toBe(1)
    expect(names('out')[0]).not.toBe(names('in')[0])
    expect(names('out')[0]).toBe('out-901-902-903-904')
  })

  it('keeps the button off with only one column picked', () => {
    expect(isDisabled(cardOf(GROUP_OF_4, { outId: 901, inId: null }))).toBe(true)
    expect(isDisabled(cardOf(GROUP_OF_4, { outId: null, inId: 903 }))).toBe(true)
  })

  it('keeps the button off and says why when both are in the same account', () => {
    const card = cardOf(GROUP_OF_4, { outId: 901, inId: 904 })

    expect(isDisabled(card)).toBe(true)
    expect(card.get('[data-test="doubtful-same"]').text()).toBe(
      'Both movements are in the same account. Pick one from another account.',
    )
    expect(checkedIn(card)).toEqual([901, 904])
  })

  it('turns the button on with one of each column from different accounts', async () => {
    const card = cardOf(GROUP_OF_4, { outId: 902, inId: 904 })

    expect(isDisabled(card)).toBe(false)
    expect(card.find('[data-test="doubtful-same"]').exists()).toBe(false)
    expect(linkButton(card).text()).toBe('Link these two')

    await linkButton(card).trigger('click')
    expect(card.emitted('link')).toHaveLength(1)
  })

  it('reports each pick with its column and its id', async () => {
    const card = cardOf(GROUP_OF_3)

    await card.findAll('[data-test="doubtful-pick-in"]')[1]?.trigger('change')
    await card.get('[data-test="doubtful-pick-out"]').trigger('change')

    expect(card.emitted('choose')).toEqual([
      ['in', 841],
      ['out', 812],
    ])
  })

  it('locks the picks and the button while a write is in flight', () => {
    const card = cardOf(GROUP_OF_3, { outId: 812, inId: 840 }, true)

    expect(isDisabled(card)).toBe(true)
    for (const radio of card.findAll('input[type="radio"]')) {
      expect(radio.attributes('disabled')).toBeDefined()
    }
  })

  it('a group with only one column shows its movements and no button', () => {
    const card = cardOf(GROUP_ONE_SIDED)

    expect(idsIn(card, 'out')).toEqual([951, 952])
    expect(idsIn(card, 'in')).toEqual([])
    expect(card.find('[data-test="doubtful-link"]').exists()).toBe(false)
  })
})
