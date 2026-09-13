import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import { groupByNature } from '../breakdown'
import { buildSummarySentence } from '../sentence'
import type { NetWorth } from '../types'
import { coherentNetWorth, emptyNetWorth } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
// Built with formatDate: ICU abbreviates September as `Sept` and may change it.
const AS_OF = formatDate('2026-09-12')

const sentence = (netWorth: NetWorth) => buildSummarySentence(netWorth, groupByNature(netWorth))

describe('buildSummarySentence (R5)', () => {
  it('states total, banks and idle share in the normal case', () => {
    // 3404.90 idle in checking over 39924.05 → 8,5 %
    expect(sentence(coherentNetWorth())).toBe(
      `As of ${AS_OF}, you have 39.924,05${NBSP}€ across 5 banks. ` +
        `8,5${NBSP}% of it is idle in checking accounts.`,
    )
  })

  it('matches the approved example wording', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '90162.46'
    netWorth.accounts.accounts = [
      { id: 1, iban: 'ES01', bank: 'n26', alias: 'Main', type: 'checking', balance: '34532.22' },
      { id: 2, iban: 'ES02', bank: 'openbank', alias: 'Pot', type: 'savings', balance: '55630.24' },
    ]
    // 34532.22 / 90162.46 = 38,300 %
    expect(sentence(netWorth)).toBe(
      `As of ${AS_OF}, you have 90.162,46${NBSP}€ across 2 banks. ` +
        `38,3${NBSP}% of it is idle in checking accounts.`,
    )
  })

  it('uses the singular for one bank', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '100.00'
    netWorth.accounts.accounts = [
      { id: 1, iban: 'ES01', bank: 'n26', alias: 'Main', type: 'checking', balance: '100.00' },
    ]

    expect(sentence(netWorth)).toBe(
      `As of ${AS_OF}, you have 100,00${NBSP}€ across 1 bank. ` +
        `100,0${NBSP}% of it is idle in checking accounts.`,
    )
  })

  it('omits the idle clause without checking accounts', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '6000.00'
    netWorth.accounts.accounts = [
      { id: 3, iban: 'ES03', bank: 'openbank', alias: 'Pot', type: 'savings', balance: '6000.00' },
    ]

    expect(sentence(netWorth)).toBe(`As of ${AS_OF}, you have 6.000,00${NBSP}€ across 1 bank.`)
  })

  it('omits the idle clause when checking accounts add up to zero or less', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '5954.70'
    netWorth.accounts.accounts = [
      { id: 2, iban: 'ES02', bank: 'n26', alias: 'Card', type: 'checking', balance: '-45.30' },
      { id: 3, iban: 'ES03', bank: 'openbank', alias: 'Pot', type: 'savings', balance: '6000.00' },
    ]

    expect(sentence(netWorth)).toBe(`As of ${AS_OF}, you have 5.954,70${NBSP}€ across 2 banks.`)
  })

  it('counts a bank whose only product has no valuation', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '6000.00'
    netWorth.accounts.accounts = [
      { id: 3, iban: 'ES03', bank: 'openbank', alias: 'Pot', type: 'savings', balance: '6000.00' },
    ]
    netWorth.investments.products = [
      {
        id: 12,
        bank: 'myinvestor',
        name: 'World ETF',
        type: 'etf',
        value: null,
        marketValue: null,
        uninvestedCash: null,
        valuedAt: null,
        stale: false,
      },
    ]

    expect(sentence(netWorth)).toContain('across 2 banks.')
  })

  it('only states the figure when the total is zero or negative', () => {
    const netWorth = emptyNetWorth()
    netWorth.total = '-45.30'
    netWorth.accounts.accounts = [
      { id: 2, iban: 'ES02', bank: 'n26', alias: 'Card', type: 'checking', balance: '-45.30' },
    ]

    expect(sentence(netWorth)).toBe(`As of ${AS_OF}, your net worth is -45,30${NBSP}€.`)
  })

  it('says there is nothing yet on an empty base', () => {
    expect(sentence(emptyNetWorth())).toBe(`As of ${AS_OF}, there are no accounts or products yet.`)
  })

  it('never talks about growth or returns', () => {
    expect(sentence(coherentNetWorth())).not.toMatch(/grow|grew|increase|return|last month|since/i)
  })
})
