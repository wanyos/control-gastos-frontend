import { describe, it, expect } from 'vitest'

import { API_NETWORK, ApiError, AppError, ValidationError } from '@/shared/errors'

import {
  BULK_CONFIRM_THRESHOLD,
  MAX_IDS,
  actionErrorMessage,
  actionSummary,
  eligibleForCategory,
  needsReload,
  undoPlan,
} from '../actions'
import { parseMovementPage } from '../service'
import type { Movement } from '../types'
import { EXPENSE, FOOD, GROCERIES, INCOME, NEUTRAL, PAGE_OF_THREE, changed } from './fixtures'

const parse = (raw: object[]): Movement[] =>
  parseMovementPage({ ...PAGE_OF_THREE, movements: raw }).movements

const ids = (movements: Movement[]) => movements.map((movement) => movement.id)

describe('the contract limits', () => {
  it('caps a request at the 200 ids of the contract, and asks from 20 up', () => {
    expect(MAX_IDS).toBe(200)
    expect(BULK_CONFIRM_THRESHOLD).toBe(20)
  })
})

describe('eligibleForCategory (R7)', () => {
  const SECOND_EXPENSE = changed(EXPENSE, { id: 13, categoryId: null, category: null })
  const selection = parse([EXPENSE, SECOND_EXPENSE, INCOME, NEUTRAL])

  it('keeps only the movements whose type matches the kind of the category', () => {
    expect(ids(eligibleForCategory(selection, 'expense'))).toEqual([10, 13])
    expect(ids(eligibleForCategory(selection, 'income'))).toEqual([11])
  })

  it('never lets a neutral movement through, whatever the kind', () => {
    for (const kind of ['expense', 'income', null] as const) {
      expect(ids(eligibleForCategory(selection, kind))).not.toContain(12)
    }
  })

  it('removing the category applies to everything but the neutrals', () => {
    expect(ids(eligibleForCategory(selection, null))).toEqual([10, 13, 11])
  })

  it('answers with nothing when no movement accepts the category', () => {
    expect(eligibleForCategory(parse([NEUTRAL]), 'expense')).toEqual([])
  })
})

describe('undoPlan (R13)', () => {
  it('turns a confirmation of three into one group back to pending', () => {
    const before = parse([EXPENSE, INCOME, NEUTRAL])

    expect(undoPlan(before, { status: 'confirmed' })).toEqual([
      { ids: [10, 11, 12], changes: { status: 'pending_review' } },
    ])
  })

  it('splits a categorization into one group per previous category', () => {
    const before = parse([
      EXPENSE, // had Food
      changed(EXPENSE, { id: 13, categoryId: null, category: null }),
      changed(EXPENSE, { id: 14, categoryId: 2, category: GROCERIES }),
      changed(EXPENSE, { id: 15, categoryId: 1, category: FOOD }),
    ])

    expect(undoPlan(before, { categoryId: 2 })).toEqual([
      { ids: [10, 15], changes: { categoryId: 1 } },
      { ids: [13], changes: { categoryId: null } },
      { ids: [14], changes: { categoryId: 2 } },
    ])
  })

  it('restores only the fields the action changed', () => {
    const before = parse([EXPENSE])

    expect(undoPlan(before, { categoryId: null })).toEqual([
      { ids: [10], changes: { categoryId: 1 } },
    ])
    expect(undoPlan(before, { status: 'confirmed' })).toEqual([
      { ids: [10], changes: { status: 'pending_review' } },
    ])
  })

  it('has nothing to undo when nothing was sent', () => {
    expect(undoPlan([], { status: 'confirmed' })).toEqual([])
  })
})

describe('actionSummary (R13)', () => {
  it('counts in singular and in plural', () => {
    expect(actionSummary(1, { status: 'confirmed' })).toBe('1 movement confirmed')
    expect(actionSummary(3, { status: 'confirmed' })).toBe('3 movements confirmed')
  })

  it('says what an undo did', () => {
    expect(actionSummary(2, { status: 'pending_review' })).toBe('2 movements moved back to pending')
  })

  it('names the category, and says so when it was removed', () => {
    expect(actionSummary(4, { categoryId: 2 }, 'Groceries')).toBe(
      '4 movements categorized as Groceries',
    )
    expect(actionSummary(1, { categoryId: null })).toBe('1 movement left without a category')
  })
})

describe('actionErrorMessage (R12)', () => {
  const apiError = (status: number) => new ApiError(`HTTP ${status}`, 'API_HTTP', { status })

  it('says nothing changed when the backend rejected the category', () => {
    expect(actionErrorMessage(apiError(400))).toBe(
      "Nothing changed. Some of those movements don't accept that category.",
    )
  })

  it('says nothing changed and that it reloads when something no longer exists', () => {
    expect(actionErrorMessage(apiError(404))).toBe(
      'Nothing changed: a movement or the category no longer exists. Reloading the list.',
    )
  })

  it('says nothing changed when the server was unreachable', () => {
    expect(actionErrorMessage(new ApiError('down', API_NETWORK))).toBe(
      "Couldn't reach the server. Nothing changed.",
    )
  })

  it('admits it cannot tell when the answer could not be read', () => {
    expect(actionErrorMessage(new ValidationError('boom'))).toBe(
      "The server answered, but the reply couldn't be read. Reloading the list to show what really happened.",
    )
  })

  it('falls back to a generic sentence for anything else', () => {
    expect(actionErrorMessage(new AppError('boom', 'UNKNOWN'))).toBe(
      'Something went wrong. Reloading the list to show what really happened.',
    )
  })

  it('never carries the backend message, which comes in Spanish and names ids', () => {
    const backend = new ApiError('HTTP 400: El movimiento 12 es neutral', 'API_HTTP', {
      status: 400,
    })

    expect(actionErrorMessage(backend)).not.toContain('movimiento')
  })

  it('only reloads when the change may have gone through', () => {
    expect(needsReload(apiError(400))).toBe(false)
    expect(needsReload(new ApiError('down', API_NETWORK))).toBe(false)
    expect(needsReload(apiError(404))).toBe(true)
    expect(needsReload(new ValidationError('boom'))).toBe(true)
    expect(needsReload(new AppError('boom', 'UNKNOWN'))).toBe(true)
  })
})
