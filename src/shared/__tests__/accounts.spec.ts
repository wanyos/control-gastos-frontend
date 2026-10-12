import { describe, it, expect, vi, afterEach } from 'vitest'

import type { HttpClient } from '@/services/http'
import { ACCOUNTS_PATH, accountLabel, getAccounts, parseAccounts } from '@/shared/accounts'
import { ValidationError } from '@/shared/errors'

// Five made-up accounts shaped like the response, with the balances the contract also
// sends: the parser must keep the five fields of a select and drop the rest (design §3).
// Every value is invented; the IBANs only have the shape (country code and length).
const RAW = [
  {
    id: 6204,
    iban: 'ES5303394718260591745806',
    bank: 'myinvestor',
    alias: 'myinvestor ···5806',
    type: 'checking',
    initialBalance: '0.00',
    balance: '2874.61',
    balanceAnchor: '3049.15',
    balanceAnchorDate: '2026-07-23',
    createdAt: '2026-07-29T09:41:17.302Z',
    updatedAt: '2026-08-11T18:26:45.660Z',
  },
  {
    id: 6205,
    iban: 'DE47250190883140627719',
    bank: 'n26',
    alias: 'n26 ···7719',
    type: 'checking',
  },
  {
    id: 7318,
    iban: 'ES0802614479335018623954',
    bank: 'openbank',
    alias: 'openbank ···3954',
    type: 'checking',
  },
  {
    id: 8127,
    iban: 'ES7104628351902774066182',
    bank: 'bankinter',
    alias: 'bankinter ···6182',
    type: 'savings',
  },
  {
    id: 9456,
    iban: 'ES3609173640582291478431',
    bank: 'revolut',
    alias: 'revolut ···8431',
    type: 'checking',
  },
]

describe('shared/accounts (R14)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps the five accounts keeping only what a select needs', () => {
    const accounts = parseAccounts(RAW)

    expect(accounts).toHaveLength(5)
    expect(accounts[0]).toEqual({
      id: 6204,
      iban: 'ES5303394718260591745806',
      bank: 'myinvestor',
      alias: 'myinvestor ···5806',
      type: 'checking',
    })
    expect(accounts.map((account) => account.bank)).toEqual([
      'myinvestor',
      'n26',
      'openbank',
      'bankinter',
      'revolut',
    ])
  })

  it('ignores the balances, so a change in them cannot blank the filter', () => {
    const accounts = parseAccounts([{ ...RAW[0], balance: null, balanceAnchorDate: 'nope' }])

    expect(accounts[0]?.id).toBe(6204)
    expect(accounts[0]).not.toHaveProperty('balance')
  })

  it('names the failing field when the contract drifts', () => {
    expect(() => parseAccounts([{ ...RAW[1], id: '6205' }])).toThrow(ValidationError)
    expect(() => parseAccounts([{ ...RAW[1], id: 1.5 }])).toThrow(
      `GET ${ACCOUNTS_PATH}: [0].id is not an integer`,
    )
    expect(() => parseAccounts({ accounts: [] })).toThrow(
      `GET ${ACCOUNTS_PATH}: response is not an array`,
    )
  })

  it('getAccounts does one GET to /api/accounts and nothing else (C1)', async () => {
    const spy = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue(RAW)

    const accounts = await getAccounts(spy as unknown as HttpClient)

    expect(spy).toHaveBeenCalledExactlyOnceWith(ACCOUNTS_PATH)
    expect(accounts).toHaveLength(5)
  })
})

// Made-up IBANs: only their shape (country code and length) is real.
describe('accountLabel (feature 28)', () => {
  it('names an account as the readable bank and the last four digits of its IBAN', () => {
    expect(accountLabel({ bank: 'bankinter', iban: 'ES4701289461870317452907' })).toBe(
      'Bankinter ···2907',
    )
  })

  it('does not use the alias, which already carries the bank', () => {
    const [account] = parseAccounts([
      {
        id: 41,
        iban: 'ES4701289461870317452907',
        bank: 'bankinter',
        alias: 'bankinter ···2907',
        type: 'checking',
      },
    ])

    expect(accountLabel(account!)).toBe('Bankinter ···2907')
    expect(accountLabel(account!).toLowerCase().split('bankinter')).toHaveLength(2)
  })

  it('tells two accounts of the same bank apart by their last four digits', () => {
    const everyday = { bank: 'openbank', iban: 'ES6200734085916620385174' }
    const savings = { bank: 'openbank', iban: 'ES8500736713402957106638' }

    expect(accountLabel(everyday)).toBe('Openbank ···5174')
    expect(accountLabel(savings)).toBe('Openbank ···6638')
    expect(accountLabel(everyday)).not.toBe(accountLabel(savings))
  })

  it('shows an unknown bank slug as it comes, and ignores spaces in the IBAN', () => {
    expect(accountLabel({ bank: 'sabadell', iban: 'ES21 0081 5536 4100 0172 9463' })).toBe(
      'sabadell ···9463',
    )
  })

  it('names only the bank when the IBAN does not end in four digits', () => {
    expect(accountLabel({ bank: 'n26', iban: 'ES00' })).toBe('N26')
    expect(accountLabel({ bank: 'n26', iban: '517' })).toBe('N26')
    expect(accountLabel({ bank: 'n26', iban: '   ' })).toBe('N26')
    expect(accountLabel({ bank: 'bankinter', iban: 'ES47-0128-9461-8703-1745-29-07' })).toBe(
      'Bankinter',
    )
    expect(accountLabel({ bank: 'sabadell', iban: 'ES2' })).toBe('sabadell')
  })
})
