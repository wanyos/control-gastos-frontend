// The category tree, shared by every feature that needs it (feature 17). It started
// in `features/review` (feature 15) and moved here untouched when a second feature —
// the categorization rules — needed the same list: architecture.md says a piece two
// features need lives in `shared/`. `review/types.ts` and `review/service.ts`
// re-export it, so nothing that was already importing it had to change.

import { http } from '@/services/http'
import type { HttpClient } from '@/services/http'
import { createValidators } from '@/shared/validation'

export const CATEGORIES_PATH = '/api/categories'

export type CategoryKind = 'expense' | 'income'

export const CATEGORY_KINDS: readonly CategoryKind[] = ['expense', 'income']

/** A root category with its children embedded (subcategories are one level deep). */
export interface Category {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
  createdAt: string
  children: Category[]
}

const categoryChecks = createValidators(`GET ${CATEGORIES_PATH}`)

/** Maps `GET /api/categories`, or throws ValidationError. Recursive: one extra level would not break it. */
export function parseCategories(raw: unknown): Category[] {
  const v = categoryChecks

  const parseNode = (value: unknown, path: string): Category => {
    const category = v.asObject(value, path)
    return {
      id: v.asInteger(category.id, `${path}.id`),
      name: v.asString(category.name, `${path}.name`),
      kind: v.asMember(category.kind, CATEGORY_KINDS, `${path}.kind`),
      parentId:
        category.parentId === null ? null : v.asInteger(category.parentId, `${path}.parentId`),
      createdAt: v.asText(category.createdAt, `${path}.createdAt`),
      children: v
        .asArray(category.children, `${path}.children`)
        .map((child, i) => parseNode(child, `${path}.children[${i}]`)),
    }
  }

  return v.asArray(raw, 'response').map((item, i) => parseNode(item, `[${i}]`))
}

/** Lists the root categories with their children. Read only. */
export async function getCategories(client: HttpClient = http): Promise<Category[]> {
  return parseCategories(await client<unknown>(CATEGORIES_PATH))
}
