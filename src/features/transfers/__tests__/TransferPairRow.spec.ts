import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'

import TransferPairList from '../components/TransferPairList.vue'
import TransferPairRow from '../components/TransferPairRow.vue'
import { parseTransferPairs } from '../service'
import { FINE_100_ID, FOUR_PAIRS, GOOD_1 } from './fixtures'

const PAIRS = parseTransferPairs(FOUR_PAIRS)
const FINE = PAIRS[2]!

describe('TransferPairRow (R3, R4, C2)', () => {
  it('shows both legs, money out first, each with date, account, description and amount', () => {
    const row = mount(TransferPairRow, { props: { pair: FINE } })

    const legs = row.findAll('[data-test="pair-leg"]')
    expect(legs).toHaveLength(2)
    expect(legs.map((leg) => leg.get('[data-test="pair-leg-side"]').text())).toEqual([
      'Money out',
      'Money in',
    ])
    expect(legs[0]?.get('[data-test="pair-leg-date"]').text()).toBe(formatDate('2025-06-30'))
    expect(legs[0]?.get('[data-test="pair-leg-account"]').text()).toBe('n26 ···4136')
    expect(legs[0]?.get('[data-test="pair-leg-description"]').text()).toBe('AYTO MADRID PAGO INTER')
    expect(legs[0]?.get('[data-test="pair-leg-amount"]').text()).toBe(formatMoney('100.00'))
    expect(legs[1]?.get('[data-test="pair-leg-date"]').text()).toBe(formatDate('2025-06-27'))
    expect(legs[1]?.get('[data-test="pair-leg-account"]').text()).toBe('openbank ···4073')
    expect(legs[1]?.get('[data-test="pair-leg-amount"]').text()).toBe(formatMoney('100.00'))
  })

  it('paints the bank description as it comes, marked as Spanish', () => {
    const row = mount(TransferPairRow, { props: { pair: FINE } })

    const description = row.findAll('[data-test="pair-leg-description"]')[1]
    expect(description?.text()).toBe('BIZUM DE <persona> CONCEPTO multa')
    expect(description?.attributes('lang')).toBe('es')
  })

  it('labels a pair with a Bizum leg and says the fact, not a verdict', () => {
    const row = mount(TransferPairRow, { props: { pair: FINE } })

    expect(row.get('[data-test="pair-bizum-badge"]').text()).toBe('Bizum')
    expect(row.get('[data-test="pair-bizum-note"]').text()).toBe(
      'A Bizum usually comes from another person, not from one of your accounts.',
    )
  })

  it('puts no label on a pair without a Bizum', () => {
    const [good] = parseTransferPairs({ pairs: [GOOD_1] })
    const row = mount(TransferPairRow, { props: { pair: good! } })

    expect(row.find('[data-test="pair-bizum"]').exists()).toBe(false)
  })

  it('asks to unlink on click, and waits while a write is in flight', async () => {
    const row = mount(TransferPairRow, { props: { pair: FINE } })

    expect(row.get('[data-test="pair-unlink"]').text()).toBe('Unlink')
    await row.get('[data-test="pair-unlink"]').trigger('click')
    expect(row.emitted('unlink')).toHaveLength(1)

    await row.setProps({ busy: true })
    expect(row.get('[data-test="pair-unlink"]').attributes('disabled')).toBeDefined()
  })
})

describe('TransferPairList (R2, R4)', () => {
  it('with one fine among three good pairs, only the fine is labelled and the order stays', () => {
    const list = mount(TransferPairList, { props: { pairs: PAIRS } })

    const rows = list.findAll('[data-test="transfer-pair"]')
    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.find('[data-test="pair-bizum"]').exists())).toEqual([
      false,
      false,
      true,
      false,
    ])
    // The order is the backend's: the labelled pair did not move.
    expect(
      rows.map((row) => row.findAll('[data-test="pair-leg-date"]').map((date) => date.text())),
    ).toEqual(
      PAIRS.map((pair) => [
        formatDate(pair.expense.bookingDate),
        formatDate(pair.income.bookingDate),
      ]),
    )
  })

  it('says which pair is to be unlinked', async () => {
    const list = mount(TransferPairList, { props: { pairs: PAIRS } })

    await list.findAll('[data-test="pair-unlink"]')[2]?.trigger('click')

    const emitted = (list.emitted('unlink') ?? []) as [{ transferId: string }][]
    expect(emitted.map(([pair]) => pair.transferId)).toEqual([FINE_100_ID])
  })
})
