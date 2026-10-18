<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Review</h1>
      <ReviewTotals
        v-if="store.result"
        :pagination="store.result.pagination"
        :totals="store.result.totals"
      />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UncategorizedCount :count="store.uncategorizedCount" />
        <!-- Everything still open, closed in one request (2026-10-16). Only while
             there is something to close: a caught-up queue has nothing to offer. -->
        <BaseButton
          v-if="(store.pendingCount ?? 0) > 0"
          variant="secondary"
          size="sm"
          :disabled="store.isActing || store.categories === null"
          data-test="confirm-all-open"
          @click="closingAll = true"
        >
          Close everything pending…
        </BaseButton>
      </div>
      <p v-if="store.closedAll" class="text-sm text-ink-body" data-test="confirm-all-result">
        {{ closedAllSentence }}
        <button type="button" class="ml-2 underline" @click="store.dismissClosedAll()">
          Dismiss
        </button>
      </p>
    </header>

    <!-- What the last rules pass did (feature 30). In the normal flow, never inside the
         block that sticks under the top bar. -->
    <LastApplyReport
      v-if="rules.lastApply"
      :report="rules.lastApply"
      @dismiss="rules.dismissLastApply()"
    />

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

    <!-- Only while there is something to say: the block has an opaque background, so
         it must not exist empty (feature 27). -->
    <StickyBelowTopBar v-if="hasNotice" :keep-clear-of="touchedRow">
      <RuleCreatedNotice v-if="rules.lastCreated" :saved="rules.lastCreated" />

      <ActionNotice
        v-else
        :summary="store.lastAction?.summary"
        :error="store.actionMessage"
        :busy="store.isActing"
        @undo="onUndo"
      />

      <!-- Under the line of the change and its Undo, never over them (feature 34). -->
      <OtherMovementsQuestion
        v-if="rules.question"
        :question="rules.question"
        :busy="rules.isSaving"
        @text="(text) => rules.checkQuestionText(text)"
        @create="rules.acceptQuestion()"
        @dismiss="rules.dismissQuestion()"
      />
    </StickyBelowTopBar>

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
      :preview="rules.preview"
      @save="onSaveRule"
      @cancel="closeRuleDialog"
      @preview="onPreviewRule"
    />

    <!-- No button of this screen opens it since feature 33, but a pass started in
         Rules may still be running when the screen changes: it has to stay in view. -->
    <ApplyRulesDialog
      :flow="rules.applyFlow"
      @confirm="rules.confirmApply()"
      @close="rules.closeApply()"
    />

    <ConfirmAllDialog
      :open="closingAll"
      :categories="store.categories"
      :busy="store.isActing"
      @confirm="onConfirmAll"
      @cancel="closingAll = false"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ApplyRulesDialog from '@/features/category-rules/components/ApplyRulesDialog.vue'
import LastApplyReport from '@/features/category-rules/components/LastApplyReport.vue'
import OtherMovementsQuestion from '@/features/category-rules/components/OtherMovementsQuestion.vue'
import RuleCreatedNotice from '@/features/category-rules/components/RuleCreatedNotice.vue'
import RuleDialog from '@/features/category-rules/components/RuleDialog.vue'
import { proposeMatchText } from '@/features/category-rules/rules'
import { useCategoryRulesStore } from '@/features/category-rules/store'
import type { NewRule } from '@/features/category-rules/types'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import StickyBelowTopBar from '@/shared/components/StickyBelowTopBar.vue'

import type { ConfirmAllInput } from '@/shared/movements'

import { BULK_CONFIRM_THRESHOLD, countOf, eligibleForCategory, findCategory } from '../actions'
import ActionNotice from '../components/ActionNotice.vue'
import BulkConfirmDialog from '../components/BulkConfirmDialog.vue'
import ConfirmAllDialog from '../components/ConfirmAllDialog.vue'
import MovementList from '../components/MovementList.vue'
import type { EmptyState } from '../components/MovementList.vue'
import ReviewActionBar from '../components/ReviewActionBar.vue'
import ReviewFilterBar from '../components/ReviewFilterBar.vue'
import ReviewPager from '../components/ReviewPager.vue'
import ReviewTotals from '../components/ReviewTotals.vue'
import UncategorizedCount from '../components/UncategorizedCount.vue'
import { EMPTY_FILTERS, fromRouteQuery, hasActiveFilters, toRouteQuery } from '../filters'
import { reviewErrorMessage, useReviewStore } from '../store'
import type { CategoryKind, Movement, MovementAccount, ReviewFilters } from '../types'

const route = useRoute()
const router = useRouter()
const store = useReviewStore()
const rules = useCategoryRulesStore()

const listTop = ref<HTMLElement | null>(null)

/** The sources the two notices and the question read; nothing new is stored in the store. */
const hasNotice = computed(
  () =>
    rules.lastCreated !== null ||
    rules.question !== null ||
    Boolean(store.lastAction?.summary) ||
    Boolean(store.actionMessage),
)

/** `[data-movement-id="<id>"]` of the single row just acted on; null after a bulk action. */
const touchedRow = ref<string | null>(null)

const rowSelector = (id: number): string => `[data-movement-id="${id}"]`

function syncFromRoute(): void {
  const { filters, page } = fromRouteQuery(route.query)
  store.filters = filters
  store.page = page
  void store.load()
}

onMounted(() => {
  syncFromRoute()
  void store.loadCategories()
  // Its own small request: the page above travels with the filters of the URL.
  void store.refreshUncategorizedCount()
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
  touchedRow.value = null
  rules.dismissCreated()
  // Several rows at once ask nothing: each may give another text (feature 34, R9).
  rules.dismissQuestion()
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

// ─── Closing everything still open (2026-10-16) ───────────────────────────

const closingAll = ref(false)

async function onConfirmAll(input: ConfirmAllInput): Promise<void> {
  touchedRow.value = null
  rules.dismissCreated()
  rules.dismissQuestion()
  if (await store.confirmAll(input)) closingAll.value = false
}

const closedAllSentence = computed(() => {
  const done = store.closedAll
  if (!done) return ''
  const categorized = done.categorized.expense + done.categorized.income
  return `Closed: ${countOf(done.confirmed)} confirmed, ${categorized} given a category.`
})

// ─── Rules (feature 17) ────────────────────────────────────────────────────
// A rule is born from a row. The screen writes nothing on that movement; since
// feature 33 the backend moves the movements the rule matches when it is created,
// and the line of the created rule says how many.

/** The movement the rule dialog is open for, or null. */
const ruling = ref<Movement | null>(null)

function onCreateRule(movement: Movement): void {
  touchedRow.value = rowSelector(movement.id)
  rules.dismissQuestion()
  rules.saveMessage = null
  ruling.value = movement
}

function closeRuleDialog(): void {
  rules.saveMessage = null
  rules.clearPreview()
  ruling.value = null
}

/**
 * How many pending movements without a category the text would look at (R11). Read
 * only: an empty text means the dialog has nothing to ask about, so the count is
 * forgotten instead (R2).
 */
function onPreviewRule(text: string): void {
  const movement = ruling.value
  if (!movement) return
  if (text === '') {
    rules.clearPreview()
    return
  }
  void rules.previewMatches(text, movement.type === 'income' ? 'income' : 'expense')
}

async function onSaveRule(rule: NewRule): Promise<void> {
  if (await rules.create(rule)) {
    rules.clearPreview()
    ruling.value = null
  }
}

/** The newest notice wins: a queue action puts the rule one away (design.md §7). */
function onConfirmOne(id: number): void {
  touchedRow.value = rowSelector(id)
  rules.dismissCreated()
  rules.dismissQuestion()
  void store.confirmOne(id)
}

/**
 * A change by hand of one row. When the PATCH went through with a category, the screen
 * asks whether the other movements that contain a text get it too (feature 34, R1).
 */
async function onCategorizeOne(id: number, categoryId: number | null): Promise<void> {
  touchedRow.value = rowSelector(id)
  rules.dismissCreated()
  rules.dismissQuestion()
  const updated = await store.categorizeOne(id, categoryId)
  if (!updated || categoryId === null) return
  await rules.offerRule({
    movementId: updated.id,
    description: updated.description,
    type: updated.type,
    categoryId,
    categoryName: updated.category?.name ?? findCategory(store.categories, categoryId)?.name ?? '',
  })
}

function onUndo(): void {
  rules.dismissCreated()
  rules.dismissQuestion()
  void store.undoLast()
}

/** The question is about a change of this screen: leaving it closes it (R13). */
onBeforeUnmount(() => rules.dismissQuestion())

/** The account selector is filled from the loaded page: no GET /api/accounts (design.md §8). */
const accounts = computed<MovementAccount[]>(() =>
  (store.result?.movements ?? []).map((movement) => movement.account),
)
</script>
