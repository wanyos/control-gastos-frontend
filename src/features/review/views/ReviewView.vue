<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Review</h1>
      <ReviewTotals
        v-if="store.result"
        :pagination="store.result.pagination"
        :totals="store.result.totals"
      />
    </header>

    <ReviewFilterBar
      :filters="store.filters"
      :accounts="accounts"
      :categories="store.categories"
      :categories-failed="store.categoriesFailed"
      @change="onFilters"
    />

    <ReviewActionBar
      v-if="store.selectedIds.length > 0"
      :selected-count="store.selectedIds.length"
      :eligible-count="eligibleCount"
      :choice="choice"
      :categories="store.categories"
      :busy="store.isActing"
      @update:choice="(value) => (choice = value)"
      @apply-category="onApplyCategory"
      @confirm="onConfirmSelected"
      @clear="store.clearSelection()"
    />

    <RuleCreatedNotice
      v-if="rules.lastCreated"
      :rule="rules.lastCreated"
      @apply="rules.openApply()"
    />

    <ActionNotice
      v-else
      :summary="store.lastAction?.summary"
      :error="store.actionMessage"
      :busy="store.isActing"
      @undo="onUndo"
    />

    <p v-if="store.notice" class="text-sm text-ink-muted" data-test="review-notice">
      {{ store.notice }}
    </p>

    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="review-loading">
      Loading the review queue…
    </p>

    <BaseCard v-else-if="failure" data-test="review-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="review-error-message">{{ failure.message }}</p>
        <BaseButton
          v-if="failure.action === 'clear'"
          variant="secondary"
          size="sm"
          data-test="review-error-clear"
          @click="onFilters({ ...EMPTY_FILTERS })"
        >
          Clear filters
        </BaseButton>
        <BaseButton
          v-else
          variant="secondary"
          size="sm"
          data-test="review-error-retry"
          @click="store.load()"
        >
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <template v-else-if="store.result">
      <div ref="listTop">
        <MovementList
          :movements="store.result.movements"
          :empty-state="emptyState"
          :selected-ids="store.selectedIds"
          :categories="store.categories"
          :busy="store.isActing"
          @clear="onFilters({ ...EMPTY_FILTERS })"
          @toggle="store.toggleSelection"
          @select-all="store.selectPage"
          @confirm="onConfirmOne"
          @categorize="onCategorizeOne"
          @create-rule="onCreateRule"
        />
      </div>
      <ReviewPager :pagination="store.result.pagination" @go="onPage" />
    </template>

    <RuleDialog
      v-if="ruling"
      :open="true"
      mode="create"
      :description="ruling.description"
      :initial-text="proposeMatchText(ruling.description)"
      :initial-category-id="ruling.categoryId"
      :kind="ruling.type === 'income' ? 'income' : 'expense'"
      :categories="store.categories"
      :busy="rules.isSaving"
      :message="rules.saveMessage"
      @save="onSaveRule"
      @cancel="closeRuleDialog"
    />

    <ApplyRulesDialog
      :flow="rules.applyFlow"
      @confirm="rules.confirmApply()"
      @close="rules.closeApply()"
    />

    <BulkConfirmDialog
      v-if="pending"
      :open="true"
      :count="pending === 'confirm' ? store.selectedIds.length : eligibleCount"
      :action="pending"
      :category-name="chosenCategory?.name"
      @confirm="runPending"
      @cancel="pending = null"
    />
  </div>
</template>

<script setup lang="ts">
// The review queue screen. The URL is the single writer of the filters: a control
// change rewrites the query, and the watcher below turns that into the request.
// So back, forward, reload and a shared link all behave the same (R10).
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ApplyRulesDialog from '@/features/category-rules/components/ApplyRulesDialog.vue'
import RuleCreatedNotice from '@/features/category-rules/components/RuleCreatedNotice.vue'
import RuleDialog from '@/features/category-rules/components/RuleDialog.vue'
import { proposeMatchText } from '@/features/category-rules/rules'
import { useCategoryRulesStore } from '@/features/category-rules/store'
import type { NewRule } from '@/features/category-rules/types'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import { BULK_CONFIRM_THRESHOLD, eligibleForCategory, findCategory } from '../actions'
import ActionNotice from '../components/ActionNotice.vue'
import BulkConfirmDialog from '../components/BulkConfirmDialog.vue'
import MovementList from '../components/MovementList.vue'
import type { EmptyState } from '../components/MovementList.vue'
import ReviewActionBar from '../components/ReviewActionBar.vue'
import ReviewFilterBar from '../components/ReviewFilterBar.vue'
import ReviewPager from '../components/ReviewPager.vue'
import ReviewTotals from '../components/ReviewTotals.vue'
import { EMPTY_FILTERS, fromRouteQuery, hasActiveFilters, toRouteQuery } from '../filters'
import { reviewErrorMessage, useReviewStore } from '../store'
import type { CategoryKind, Movement, MovementAccount, ReviewFilters } from '../types'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()
const rules = useCategoryRulesStore()

const listTop = ref<HTMLElement | null>(null)

function syncFromRoute(): void {
  const { filters, page } = fromRouteQuery(route.query)
  store.filters = filters
  store.page = page
  void store.load()
}

onMounted(() => {
  syncFromRoute()
  void store.loadCategories()
})

watch(() => route.query, syncFromRoute)

/** Filters are replaced, not pushed: typing in the search box must not fill the history. */
function onFilters(next: ReviewFilters): void {
  void router.replace({ query: toRouteQuery(next, 1) })
}

/** A page change IS a step you want to come back from, so it is pushed. */
function onPage(page: number): void {
  void router.push({ query: toRouteQuery(store.filters, page) })
  listTop.value?.scrollIntoView?.({ block: 'start' })
}

const failure = computed(() => (store.error ? reviewErrorMessage(store.error, store.page) : null))

const emptyState = computed<EmptyState | undefined>(() => {
  if (!store.result || store.result.pagination.total > 0) return undefined
  return hasActiveFilters(store.filters) ? 'noMatches' : 'caughtUp'
})

// ─── Bulk actions ──────────────────────────────────────────────────────────
// `choice` is what the bar's selector shows: '' nothing, 'none' remove the category,
// otherwise the id. The view works out who it reaches; the store sends it.

const choice = ref('')
/** The bulk action waiting for the extra confirmation, or null (R8). */
const pending = ref<'confirm' | 'category' | null>(null)

const chosenCategory = computed(() =>
  choice.value === '' || choice.value === 'none'
    ? null
    : findCategory(store.categories, Number(choice.value)),
)

/** The `kind` the choice demands: null removes the category, undefined means no choice. */
const chosenKind = computed<CategoryKind | null | undefined>(() => {
  if (choice.value === '') return undefined
  if (choice.value === 'none') return null
  return chosenCategory.value?.kind
})

const eligibleCount = computed(() => {
  const kind = chosenKind.value
  return kind === undefined ? 0 : eligibleForCategory(store.selection, kind).length
})

/** From the threshold up, a bulk action asks first; below it, the button's number is enough. */
function askOrRun(action: 'confirm' | 'category', count: number): void {
  if (count >= BULK_CONFIRM_THRESHOLD) {
    pending.value = action
    return
  }
  void run(action)
}

function run(action: 'confirm' | 'category'): Promise<void> {
  rules.dismissCreated()
  if (action === 'confirm') return store.confirmSelected()
  return store.categorizeSelected(choice.value === 'none' ? null : Number(choice.value))
}

function runPending(): void {
  const action = pending.value
  pending.value = null
  if (action) void run(action)
}

const onConfirmSelected = (): void => askOrRun('confirm', store.selectedIds.length)
const onApplyCategory = (): void => askOrRun('category', eligibleCount.value)

// ─── Rules (feature 17) ────────────────────────────────────────────────────
// A rule is born from a row, but creating it writes nothing on that movement
// (decisions.md 🔴 5) and applies nothing by itself (🔴 3).

/** The movement the rule dialog is open for, or null. */
const ruling = ref<Movement | null>(null)

function onCreateRule(movement: Movement): void {
  rules.saveMessage = null
  ruling.value = movement
}

function closeRuleDialog(): void {
  rules.saveMessage = null
  ruling.value = null
}

async function onSaveRule(rule: NewRule): Promise<void> {
  if (await rules.create(rule)) ruling.value = null
}

/** The newest notice wins: a queue action puts the rule one away (design.md §7). */
function onConfirmOne(id: number): void {
  rules.dismissCreated()
  void store.confirmOne(id)
}

function onCategorizeOne(id: number, categoryId: number | null): void {
  rules.dismissCreated()
  void store.categorizeOne(id, categoryId)
}

function onUndo(): void {
  rules.dismissCreated()
  void store.undoLast()
}

/** The account selector is filled from the loaded page: no GET /api/accounts (design.md §8). */
const accounts = computed<MovementAccount[]>(() =>
  (store.result?.movements ?? []).map((movement) => movement.account),
)
</script>
