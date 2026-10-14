// Frontend types for the categorization rules (feature 17), written from
// gastos-backend/docs/api-contract.md → `POST /api/category-rules`,
// `GET /api/category-rules`, `PATCH /api/category-rules/:id`,
// `DELETE /api/category-rules/:id` and `POST /api/category-rules/apply`.
// Types are not shared between features (docs/architecture.md): the apply result
// looks like import's `Categorization`, but it is another endpoint and it is
// declared — and parsed — here.

import type { CategoryKind } from '@/shared/categories'
import type { Movement } from '@/shared/movements'

/** The category as it travels embedded in a rule (no `children`, no `createdAt`). */
export interface RuleCategory {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
}

export interface CategoryRule {
  id: number
  /** As the backend stored it: lowercase, no accents, trimmed. */
  matchText: string
  categoryId: number
  category: RuleCategory
  createdAt: string
  updatedAt: string
}

/** Body of `POST /api/category-rules`: these two fields and nothing else. */
export interface NewRule {
  matchText: string
  categoryId: number
}

/** Body of the PATCH: only what changed travels (R8). */
export interface RuleChanges {
  matchText?: string
  categoryId?: number
}

/** One of the rules that claimed a movement in a conflict. */
export interface RuleMatch {
  ruleId: number
  matchText: string
  categoryId: number
  categoryName: string
}

/** A movement several rules claimed for different categories: left without one. */
export interface RuleConflict {
  movementId: number
  description: string
  bookingDate: string
  matches: RuleMatch[]
}

/** A rule that matched a categorized movement (no category: it is the movement's). */
export interface AppliedRule {
  ruleId: number
  matchText: string
}

/** A movement the pass wrote a category on, as the apply answer lists it (feature 30). */
export interface CategorizedMovement {
  movementId: number
  description: string
  bookingDate: string
  /** Positive decimal string; the sign comes from `type`. */
  amount: string
  type: 'income' | 'expense'
  categoryId: number
  categoryName: string
  rules: AppliedRule[]
}

export interface ApplyResult {
  categorized: number
  /** Exactly `categorized` of them, in the order the API sent them. */
  categorizedMovements: CategorizedMovement[]
  conflictCount: number
  conflicts: RuleConflict[]
  unmatched: number
  /** Present only when the pass failed; its `message` is never kept, let alone painted. */
  error: { code: string } | null
}

/** What the last pass that finished without an error did. Kept in memory only. */
export interface LastApply {
  /** When the POST answered. */
  at: Date
  result: ApplyResult
}

/** What the apply dialog is showing right now. */
export type ApplyFlow =
  | { step: 'closed' }
  | { step: 'confirm' }
  | { step: 'applying' }
  | { step: 'done'; result: ApplyResult }
  | { step: 'failed'; message: string }

/**
 * What the match preview of the dialog is showing right now (feature 18). `text` is
 * kept next to the answer so a count can never be read as belonging to another text.
 * `samples` are movements, the type of `@/shared/movements`: it is literally the same
 * endpoint the review queue reads, so it is not declared again here.
 */
export type MatchPreview =
  | { step: 'idle' }
  | { step: 'loading'; text: string }
  | { step: 'ready'; text: string; total: number; samples: Movement[] }
  | { step: 'failed'; text: string; message: string }
