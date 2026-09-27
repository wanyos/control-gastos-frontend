import { describe, it, expect } from 'vitest'

import { API_HTTP, API_NETWORK, ApiError, AppError, ValidationError } from '@/shared/errors'
import { needsReload, parseMovement } from '@/shared/movements'
import type { Movement } from '@/shared/movements'
import { parseCategories } from '@/shared/categories'
import { createValidators } from '@/shared/validation'

import {
  UNDONE_SUMMARY,
  actionSummary,
  findCategoryName,
  hasCategoryFilter,
  matchesCategoryFilter,
  writeErrorMessage,
} from '../actions'
import { EMPTY_FILTERS } from '../filters'
import type { StatementFilters } from '../filters'
import { CATEGORIES, EXPENSE, changed } from './fixtures'

const checks = createValidators('test')
const parse = (raw: Record<string, unknown>): Movement => parseMovement(checks, raw, 'movement')

const filters = (patch: Partial<StatementFilters>): StatementFilters => ({
  ...EMPTY_FILTERS,
  ...patch,
})

const categorized = parse(changed(EXPENSE, { categoryId: 4, category: null }))
const uncategorized = parse(changed(EXPENSE, { categoryId: null, category: null }))

describe('hasCategoryFilter (R9)', () => {
  it('is true only when the category filter narrows the month', () => {
    expect(hasCategoryFilter(EMPTY_FILTERS)).toBe(false)
    expect(hasCategoryFilter(filters({ accountId: 2, q: 'luz' }))).toBe(false)
    expect(hasCategoryFilter(filters({ uncategorized: true }))).toBe(true)
    expect(hasCategoryFilter(filters({ categoryId: 1 }))).toBe(true)
  })
})

describe('matchesCategoryFilter (R8)', () => {
  it('with `uncategorized` put, only a movement without a category belongs', () => {
    const only = filters({ uncategorized: true })

    expect(matchesCategoryFilter(uncategorized, only)).toBe(true)
    expect(matchesCategoryFilter(categorized, only)).toBe(false)
  })

  it('with a category put, only that same category belongs', () => {
    expect(matchesCategoryFilter(categorized, filters({ categoryId: 4 }))).toBe(true)
    expect(matchesCategoryFilter(categorized, filters({ categoryId: 1 }))).toBe(false)
    expect(matchesCategoryFilter(uncategorized, filters({ categoryId: 4 }))).toBe(false)
  })

  it('without a category filter every movement belongs, whatever else filters', () => {
    expect(matchesCategoryFilter(categorized, EMPTY_FILTERS)).toBe(true)
    expect(matchesCategoryFilter(uncategorized, EMPTY_FILTERS)).toBe(true)
    expect(matchesCategoryFilter(categorized, filters({ accountId: 1, q: 'cafe' }))).toBe(true)
  })
})

describe('findCategoryName', () => {
  const tree = parseCategories(CATEGORIES)

  it('finds a root and a child, and says nothing about an id that is gone', () => {
    expect(findCategoryName(tree, 1)).toBe('Food')
    expect(findCategoryName(tree, 2)).toBe('Groceries')
    expect(findCategoryName(tree, 99)).toBeUndefined()
    expect(findCategoryName(tree, null)).toBeUndefined()
    expect(findCategoryName(null, 1)).toBeUndefined()
  })
})

describe('actionSummary (R11)', () => {
  it('names the category it was given, in the singular', () => {
    expect(actionSummary(2, 'Groceries')).toBe('Categorized as Groceries')
  })

  it('says the category was removed when it was removed', () => {
    expect(actionSummary(null)).toBe('Category removed')
    expect(actionSummary(null, 'Groceries')).toBe('Category removed')
  })

  it('falls back without naming an id when the tree does not know the name', () => {
    expect(actionSummary(7)).toBe('Categorized as a category')
    expect(actionSummary(7)).not.toContain('7')
  })

  it('the undo has its own sentence', () => {
    expect(UNDONE_SUMMARY).toBe('Change undone')
  })
})

describe('writeErrorMessage (R14, R15)', () => {
  const apiError = (status: number, message = `HTTP ${status}`) =>
    new ApiError(message, API_HTTP, { status })

  it('a 400 says nothing changed, in the singular', () => {
    expect(writeErrorMessage(apiError(400))).toBe(
      "Nothing changed. That movement doesn't accept that category.",
    )
  })

  it('a 404 says nothing changed and that the month is being reloaded', () => {
    expect(writeErrorMessage(apiError(404))).toBe(
      'Nothing changed: the movement or the category no longer exists. Reloading the month.',
    )
  })

  it('a network failure says nothing changed', () => {
    expect(writeErrorMessage(new ApiError('down', API_NETWORK))).toBe(
      "Couldn't reach the server. Nothing changed.",
    )
  })

  it('an unreadable answer and anything else reload the month', () => {
    expect(writeErrorMessage(new ValidationError('response.id is not an integer'))).toBe(
      "The server answered, but the reply couldn't be read. Reloading the month to show what really happened.",
    )
    expect(writeErrorMessage(new AppError('boom', 'UNKNOWN'))).toBe(
      'Something went wrong. Reloading the month to show what really happened.',
    )
    expect(writeErrorMessage(apiError(500))).toBe(
      'Something went wrong. Reloading the month to show what really happened.',
    )
  })

  it('never paints the backend sentence, which comes in Spanish and names ids', () => {
    const backend = apiError(400, 'HTTP 400: El movimiento 14 es neutral')

    const sentence = writeErrorMessage(backend)

    expect(sentence).not.toContain('movimiento')
    expect(sentence).not.toContain('14')
  })

  it('only a 400 and a network failure are sure nothing was written (R15)', () => {
    expect(needsReload(apiError(400))).toBe(false)
    expect(needsReload(new ApiError('down', API_NETWORK))).toBe(false)
    expect(needsReload(apiError(404))).toBe(true)
    expect(needsReload(new ValidationError('nope'))).toBe(true)
    expect(needsReload(new AppError('boom', 'UNKNOWN'))).toBe(true)
  })
})
