import { describe, it, expect, vi, afterEach } from 'vitest'

import type { HttpClient } from '@/services/http'
import { ACCOUNTS_PATH, getAccounts, parseAccounts } from '@/shared/accounts'
import { ValidationError } from '@/shared/errors'

// The five real accounts of the user, with the balances the contract also sends: the
// parser must keep the five fields of a select and drop the rest (design §3).
const RAW = [
  {
    id: 14787,
    iban: 'ES3015447889706651431320',
    bank: 'myinvestor',
    alias: 'myinvestor ···1320',
    type: 'checking',
    initialBalance: '0.00',
    balance: '3206.28',
    balanceAnchor: '3517.90',
    balanceAnchorDate: '2026-08-06',
    createdAt: '2026-08-18T14:08:58.474Z',
    updatedAt: '2026-08-30T06:51:00.819Z',
  },
  {
    id: 14788,
    iban: 'DE10100110012626504136',
    bank: 'n26',
    alias: 'n26 ···4136',
    type: 'checking',
  },
  {
    id: 16563,
    iban: 'ES1300730100500469414073',
    bank: 'openbank',
    alias: 'openbank ···4073',
    type: 'checking',
  },
  {
    id: 19532,
    iban: 'ES1501280074010100032314',
    bank: 'bankinter',
    alias: 'bankinter ···2314',
    type: 'savings',
  },
  {
    id: 22309,
    iban: 'ES9315830001189029762450',
    bank: 'revolut',
    alias: 'revolut ···2450',
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
      id: 14787,
      iban: 'ES3015447889706651431320',
      bank: 'myinvestor',
      alias: 'myinvestor ···1320',
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

    expect(accounts[0]?.id).toBe(14787)
    expect(accounts[0]).not.toHaveProperty('balance')
  })

  it('names the failing field when the contract drifts', () => {
    expect(() => parseAccounts([{ ...RAW[1], id: '14788' }])).toThrow(ValidationError)
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
