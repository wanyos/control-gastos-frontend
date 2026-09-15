import { describe, it, expect } from 'vitest'

import { bankLabel } from '@/shared/banks'

describe('bankLabel', () => {
  it.each([
    ['bankinter', 'Bankinter'],
    ['n26', 'N26'],
    ['openbank', 'Openbank'],
    ['myinvestor', 'MyInvestor'],
    ['trade-republic', 'Trade Republic'],
    ['revolut', 'Revolut'],
  ])('shows %s as %s', (slug, label) => {
    expect(bankLabel(slug)).toBe(label)
  })

  it('shows an unknown slug as it comes', () => {
    expect(bankLabel('newbank')).toBe('newbank')
  })
})
