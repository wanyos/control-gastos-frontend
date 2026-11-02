import { describe, it, expect } from 'vitest'

import { formatDate } from '@/shared/money'

import {
  depositFacts,
  earnedCell,
  extraLine,
  isDoubtful,
  maturityLabel,
  movementsLink,
  statusBadge,
} from '../deposits'
import type { DepositEarning, DepositStatus } from '../types'
import { depositEarnings } from './fixtures'

const NBSP = String.fromCharCode(0xa0)
const euros = (figure: string) => `${figure}${NBSP}€`

function byStatus(status: DepositStatus): DepositEarning {
  const found = depositEarnings().deposits.find((deposit) => deposit.status === status)
  if (!found) throw new Error(`no ${status} deposit in the fixture`)
  return found
}

describe('deposits texts', () => {
  it('names the status of each deposit', () => {
    expect(statusBadge('active')).toEqual({ label: 'Active', tone: 'neutral' })
    expect(statusBadge('matured')).toEqual({ label: 'Matured', tone: 'neutral' })
    expect(statusBadge('cancelled')).toEqual({ label: 'Cancelled', tone: 'neutral' })
    for (const status of ['maturity_not_found', 'ambiguous', 'below_principal'] as const) {
      expect(statusBadge(status)).toEqual({ label: 'Doubtful', tone: 'warning' })
      expect(isDoubtful(status)).toBe(true)
    }
    for (const status of ['active', 'matured', 'cancelled'] as const) {
      expect(isDoubtful(status)).toBe(false)
    }

    expect(earnedCell(byStatus('matured'))).toEqual({ text: euros('7,25'), tone: 'positive' })
    expect(earnedCell(byStatus('active'))).toEqual({ text: 'Not earned yet', tone: 'muted' })
    expect(earnedCell(byStatus('cancelled'))).toEqual({ text: 'Not in the total', tone: 'muted' })
    for (const status of ['maturity_not_found', 'ambiguous', 'below_principal'] as const) {
      expect(earnedCell(byStatus(status))).toEqual({ text: 'Not in the total', tone: 'warning' })
    }
  })

  it('writes the maturity date with the verb of its status', () => {
    expect(maturityLabel(byStatus('active'))).toBe(`Matures ${formatDate('2026-09-01')}`)
    expect(maturityLabel(byStatus('matured'))).toBe(`Matured ${formatDate('2026-06-02')}`)
    expect(maturityLabel(byStatus('cancelled'))).toBe(`Was due ${formatDate('2026-05-04')}`)
    expect(maturityLabel(byStatus('maturity_not_found'))).toBe(
      `Matured ${formatDate('2026-04-21')}`,
    )
    expect(maturityLabel(byStatus('ambiguous'))).toBe(`Matured ${formatDate('2026-06-06')}`)
    expect(maturityLabel(byStatus('below_principal'))).toBe(`Matured ${formatDate('2026-05-19')}`)

    expect(depositFacts(byStatus('active'))).toEqual([
      `Put in ${euros('5.000,00')}`,
      `Opened ${formatDate('2026-06-01')}`,
      `Matures ${formatDate('2026-09-01')}`,
      `Expected ${euros('31,20')}`,
    ])
  })

  it('writes the reason of each doubtful deposit', () => {
    expect(extraLine(byStatus('maturity_not_found'))).toBe(
      'Doubtful · its payment is not in your statement',
    )
    expect(extraLine(byStatus('ambiguous'))).toBe(
      'Doubtful · 2 possible payments in your statement, none chosen',
    )
    expect(extraLine(byStatus('below_principal'))).toBe(
      `Doubtful · it paid back ${euros('3.990,00')}, less than you put in`,
    )

    expect(extraLine(byStatus('cancelled'))).toBe(
      `Cancelled on ${formatDate('2026-03-10')}, before it matured`,
    )
    expect(extraLine({ ...byStatus('cancelled'), closedAt: null })).toBe(
      'Cancelled before it matured',
    )
    expect(extraLine(byStatus('active'))).toBeNull()
    expect(extraLine(byStatus('matured'))).toBeNull()
  })

  it('paints a missing field as a dash, never as zero', () => {
    const gaps: DepositEarning = {
      ...byStatus('active'),
      openedAt: null,
      principal: null,
      expectedGain: null,
      maturityDate: null,
    }

    const facts = depositFacts(gaps)

    expect(facts).toEqual(['Put in —', 'Opened —', 'Matures —', 'Expected —'])
    expect(facts.join(' ')).not.toContain('0,00')
    expect(maturityLabel({ ...byStatus('cancelled'), maturityDate: null })).toBe('Was due —')
  })

  it('links to the month of the maturity only when there is one', () => {
    expect(movementsLink(byStatus('matured'))).toEqual({
      name: 'movements',
      query: { month: '2026-06' },
    })
    expect(movementsLink(byStatus('below_principal'))).toEqual({
      name: 'movements',
      query: { month: '2026-05' },
    })
    for (const status of ['active', 'cancelled', 'maturity_not_found', 'ambiguous'] as const) {
      expect(movementsLink(byStatus(status))).toBeNull()
    }
  })
})
