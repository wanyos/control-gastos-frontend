import { describe, it, expect, vi, afterEach } from 'vitest'

import type { HttpClient } from '@/services/http'
import { CATEGORIES_PATH, getCategories, parseCategories } from '@/shared/categories'
import { ValidationError } from '@/shared/errors'

// The category tree moved here from `features/review` in feature 17 (C4). The
// review suite still exercises it through `review/service`, which re-exports it;
// this spec proves the module works on its own, wherever it is imported from.

const TREE = [
  {
    id: 1,
    name: 'Food',
    kind: 'expense',
    parentId: null,
    createdAt: '2026-08-06T18:30:00.000Z',
    children: [
      {
        id: 2,
        name: 'Groceries',
        kind: 'expense',
        parentId: 1,
        createdAt: '2026-08-06T18:31:00.000Z',
        children: [],
      },
    ],
  },
]

describe('shared/categories', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps the tree with its children', () => {
    const categories = parseCategories(TREE)

    expect(categories).toHaveLength(1)
    expect(categories[0]?.name).toBe('Food')
    expect(categories[0]?.kind).toBe('expense')
    expect(categories[0]?.children.map((child) => child.id)).toEqual([2])
    expect(categories[0]?.children[0]?.parentId).toBe(1)
  })

  it('names the failing field when the contract drifts', () => {
    expect(() => parseCategories([{ ...TREE[0], kind: 'both' }])).toThrow(ValidationError)
    expect(() => parseCategories({ categories: [] })).toThrow(
      `GET ${CATEGORIES_PATH}: response is not an array`,
    )
  })

  it('getCategories does one GET to /api/categories', async () => {
    const spy = vi.fn<(path: string) => Promise<unknown>>().mockResolvedValue(TREE)

    const categories = await getCategories(spy as unknown as HttpClient)

    expect(spy).toHaveBeenCalledExactlyOnceWith(CATEGORIES_PATH)
    expect(categories[0]?.id).toBe(1)
  })
})
