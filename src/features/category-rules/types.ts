// Frontend types for the categorization rules (feature 17), written from
// gastos-backend/docs/api-contract.md → `POST /api/category-rules`,
// `GET /api/category-rules`, `PATCH /api/category-rules/:id`,
// `DELETE /api/category-rules/:id`, `POST /api/category-rules/apply` and, since
// feature 33, `GET /api/category-rules/suggestions`.
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

/** One movement a suggested rule would take (feature 33). Amount positive; sign from `kind`. */
export interface SuggestedMovement {
  movementId: number
  description: string
  bookingDate: string
  amount: string
}

/** One element of `GET /api/category-rules/suggestions` (feature 33). */
export interface SuggestedRule {
  /** Already normalized: the `matchText` the POST would store. */
  matchText: string
  kind: 'expense' | 'income'
  /** Always the length of `movements`: a list that does not add up is rejected. */
  movementCount: number
  movements: SuggestedMovement[]
  /** Movements categorized by hand that also contain the text: they never move. */
  manualMatches: number
}

/** A rule the POST or the PATCH saved, with what the pass that ran with it moved. */
export interface SavedRule {
  rule: CategoryRule
  result: ApplyResult
}

/** Which action produced the result in the box (feature 33). */
export type ResultCause = 'apply' | 'create' | 'update'

/** What the last pass that finished did, whoever ran it. Kept in memory only. */
export interface LastApply {
  /** When the POST (or the PATCH) answered. */
  at: Date
  result: ApplyResult
  cause: ResultCause
  /** The rule created or changed; null when `cause` is `apply`. */
  rule: CategoryRule | null
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

// ─── The question after a change of category by hand (feature 34) ────────────

/** A movement the preview says the new rule would move (feature 34). */
export interface PreviewMovement {
  movementId: number
  description: string
  bookingDate: string
  /** Positive decimal string; the sign comes from `type`. */
  amount: string
  type: 'expense' | 'income'
}

/** What `GET /api/category-rules/preview` answered, reduced to what the question paints. */
export interface RulePreview {
  /** Normalized, as the POST would store it. */
  matchText: string
  categoryId: number
  /** Only the ones whose `rules` carry `ruleId: null`: the ones THIS rule would move. */
  movements: PreviewMovement[]
}

/** What the box of the question is showing for the text it holds. */
export type QuestionCheck =
  | { step: 'loading'; text: string }
  | { step: 'ready'; text: string; preview: RulePreview }
  | { step: 'tooShort'; text: string }
  /** The preview answered 409: another rule already uses the text. */
  | { step: 'taken'; text: string }
  | { step: 'failed'; text: string }

/** The open question after a change of category by hand (feature 34). */
export interface OtherMovementsQuestionState {
  movementId: number
  kind: 'expense' | 'income'
  categoryId: number
  categoryName: string
  check: QuestionCheck
  /** The English sentence of a failed create (R12), or null. */
  failure: string | null
}

/** What the view hands to the store after a change by hand. */
export interface ManualChange {
  movementId: number
  description: string
  type: 'expense' | 'income' | 'neutral'
  categoryId: number
  categoryName: string
}
