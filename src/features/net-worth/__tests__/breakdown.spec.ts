import { describe, it, expect } from 'vitest'

import { sumAmounts, toCents } from '@/shared/money'

import { bankLabel, groupByBank, groupByNature, sumOfGroups } from '../breakdown'
import type { BreakdownGroup } from '../breakdown'
import { parseNetWorth } from '../service'
import type { NetWorth } from '../types'
import { coherentNetWorth, emptyNetWorth } from './fixtures'

const memberIds = (group: BreakdownGroup | undefined) =>
  group?.members.map((member) => `${member.kind}:${member.id}`)

const allMemberKeys = (groups: BreakdownGroup[]) =>
  groups.flatMap((group) => memberIds(group) ?? [])

/** Every account plus every product with a value: what must be in each breakdown. */
const valuedKeys = (netWorth: NetWorth) => [
  ...netWorth.accounts.accounts.map((account) => `account:${account.id}`),
  ...netWorth.investments.products
    .filter((product) => product.value !== null)
    .map((product) => `product:${product.id}`),
]

describe('groupByNature', () => {
  it('puts each account and product type in the group fixed by the spec (R7)', () => {
    const groups = groupByNature(coherentNetWorth())
    const byId = new Map(groups.map((group) => [group.id, group]))

    expect(groups.map((group) => group.id)).toEqual(['checking', 'savings', 'market', 'deposits'])
    expect(groups.map((group) => group.label)).toEqual([
      'Checking accounts',
      'Savings',
      'Market investments',
      'Fixed-term deposits',
    ])
    // checking accounts
    expect(memberIds(byId.get('checking'))).toEqual(['account:1', 'account:2'])
    // savings accounts + savings_account products
    expect(memberIds(byId.get('savings'))).toEqual(['account:3', 'product:15'])
    // fund, etf and managed_portfolio with a value (the null ETF 12 is out)
    expect(memberIds(byId.get('market'))).toEqual(['product:11', 'product:13'])
    expect(memberIds(byId.get('deposits'))).toEqual(['product:14'])
  })

  it('sums each group exactly in cents, negative balances included (R7)', () => {
    const groups = groupByNature(coherentNetWorth())

    expect(groups.map((group) => group.amount)).toEqual([
      '3404.90',
      '11208.40',
      '15310.75',
      '10000.00',
    ])
    // 3404.90 / 39924.05 = 8,528 % → 85 tenths
    expect(groups[0]?.sharePermille).toBe(85)
  })

  it('omits a group without members instead of inventing a zero', () => {
    const netWorth = coherentNetWorth()
    netWorth.investments.products = netWorth.investments.products.filter(
      (product) => product.type !== 'deposit',
    )

    expect(groupByNature(netWorth).map((group) => group.id)).toEqual([
      'checking',
      'savings',
      'market',
    ])
    expect(groupByNature(emptyNetWorth())).toEqual([])
  })

  it('has no shares when the total is not positive', () => {
    const netWorth = emptyNetWorth()
    netWorth.accounts.accounts = [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '-10.00' },
    ]
    netWorth.total = '-10.00'

    expect(groupByNature(netWorth)[0]?.sharePermille).toBeNull()
  })
})

describe('breakdown invariant (R8)', () => {
  it('adds up exactly to total in both breakdowns', () => {
    const netWorth = coherentNetWorth()

    expect(toCents(sumOfGroups(groupByNature(netWorth)))).toBe(toCents(netWorth.total))
    expect(toCents(sumOfGroups(groupByBank(netWorth)))).toBe(toCents(netWorth.total))
  })

  it('places every valued account and product in exactly one group of each breakdown', () => {
    const netWorth = coherentNetWorth()
    const expected = [...valuedKeys(netWorth)].sort()

    expect([...allMemberKeys(groupByNature(netWorth))].sort()).toEqual(expected)
    expect([...allMemberKeys(groupByBank(netWorth))].sort()).toEqual(expected)
  })
})

describe('value: null products (R13)', () => {
  it('are in no group, and removing them changes no amount', () => {
    const withGap = coherentNetWorth()
    const withoutGap = coherentNetWorth()
    withoutGap.investments.products = withoutGap.investments.products.filter(
      (product) => product.value !== null,
    )

    expect(allMemberKeys(groupByNature(withGap))).not.toContain('product:12')
    expect(allMemberKeys(groupByBank(withGap))).not.toContain('product:12')
    expect(groupByNature(withGap)).toEqual(groupByNature(withoutGap))
    expect(groupByBank(withGap)).toEqual(groupByBank(withoutGap))
  })

  it('leave a bank whose only products are gaps out of the bank breakdown', () => {
    const netWorth = coherentNetWorth()
    const gap = netWorth.investments.products.find((product) => product.id === 12)
    if (gap) gap.bank = 'new-bank'

    expect(groupByBank(netWorth).map((group) => group.id)).not.toContain('new-bank')
  })
})

describe('groupByBank (R11)', () => {
  it('uses readable names for the five real slugs, ordered by amount', () => {
    const groups = groupByBank(coherentNetWorth())

    expect(groups.map((group) => group.label)).toEqual([
      'MyInvestor',
      'Openbank',
      'Trade Republic',
      'Bankinter',
      'N26',
    ])
    expect(groups.map((group) => group.amount)).toEqual([
      '25310.75',
      '6000.00',
      '5208.40',
      '3450.20',
      '-45.30',
    ])
  })

  it('breaks amount ties by label', () => {
    const netWorth = emptyNetWorth()
    netWorth.accounts.accounts = [
      { id: 1, iban: 'ES01', bank: 'openbank', alias: 'A', type: 'checking', balance: '10.00' },
      { id: 2, iban: 'ES02', bank: 'bankinter', alias: 'B', type: 'checking', balance: '10.00' },
    ]
    netWorth.total = '20.00'

    expect(groupByBank(netWorth).map((group) => group.label)).toEqual(['Bankinter', 'Openbank'])
  })

  it('shows an unknown slug as it comes', () => {
    expect(bankLabel('trade-republic')).toBe('Trade Republic')
    expect(bankLabel('some-new-bank')).toBe('some-new-bank')
  })
})

describe('fixtures', () => {
  it('add up and pass the contract boundary check, unlike the contract example', () => {
    const netWorth = coherentNetWorth()
    const balances = netWorth.accounts.accounts.map((account) => account.balance)
    const values = netWorth.investments.products.flatMap((product) =>
      product.value === null ? [] : [product.value],
    )

    expect(parseNetWorth(JSON.parse(JSON.stringify(netWorth)))).toEqual(netWorth)
    expect(sumAmounts(balances)).toBe(netWorth.accounts.total)
    expect(sumAmounts(values)).toBe(netWorth.investments.total)
    expect(sumAmounts([netWorth.accounts.total, netWorth.investments.total])).toBe(netWorth.total)
  })
})
