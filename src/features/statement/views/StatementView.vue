<template>
  <div class="flex flex-col gap-5" data-test="statement-view">
    <header class="flex flex-col gap-2">
      <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Movements</h1>
      <p class="text-sm text-ink-muted">
        Your whole history, month by month, exactly as the bank reported it.
      </p>
    </header>

    <MonthNav :month="store.month" @change="onMonth" />

    <StatementFilterBar
      :filters="store.filters"
      :accounts="store.accounts"
      :accounts-failed="store.accountsFailed"
      :categories="store.categories"
      :categories-failed="store.categoriesFailed"
      @change="onFilters"
    />

    <MonthTotals
      v-if="store.result"
      :pagination="store.result.pagination"
      :totals="store.result.totals"
      :scope="scope"
    />

    <!-- Between the figures and the list, fixed: what the last write did, with its Undo
         (R11, decisions.md 🔴 4). -->
    <StatementActionNotice
      :summary="store.actionNotice"
      :error="store.actionMessage"
      :undoable="store.lastAction !== null"
      :busy="store.isActing"
      @undo="store.undoLast()"
    />

    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="statement-loading">
      {{ loadingMonthLine(store.month) }}
    </p>

    <BaseCard v-if="failure" data-test="statement-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="statement-error-message">
          {{ failure.message }}
        </p>
        <BaseButton
          v-if="failure.action === 'clear'"
          variant="secondary"
          size="sm"
          data-test="statement-error-clear"
          @click="onFilters({ ...EMPTY_FILTERS })"
        >
          Clear filters
        </BaseButton>
        <BaseButton
          v-else
          variant="secondary"
          size="sm"
          data-test="statement-retry"
          @click="store.show(store.month)"
        >
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <StatementList
      v-if="store.result && !store.isLoading"
      :month="store.month"
      :days="store.days"
      :pagination="store.result.pagination"
      :shown="store.shown"
      :empty-state="emptyState"
      :has-more="store.hasMore"
      :loading-more="store.isLoadingMore"
      :categories="store.categories"
      :editing-id="store.editingId"
      :busy="store.isActing"
      @load-more="store.loadMore()"
      @clear="onFilters({ ...EMPTY_FILTERS })"
      @edit="store.openEditor"
      @categorize="(id, categoryId) => store.categorize(id, categoryId)"
      @create-rule="onCreateRule"
      @close-editor="store.closeEditor()"
    />

    <!-- The rule dialog of the F17 as it is, with the preview of the F18 (R16). Saving
         it writes NOTHING on the movement it was born from (R17). -->
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
  </div>
</template>

<script setup lang="ts">
// The statement screen. The URL is the single writer of the month AND of the filters:
// the nav and the bar rewrite the query and the watcher below turns that into the
// request, so back, forward, reload and a shared link all behave the same (R3, R4, R8).
// Since feature 21 the screen also writes, and only one thing: the category of one
// movement, through the store (R1, C1). Creating a rule from a line writes nothing on
// that line (R17).
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RuleDialog from '@/features/category-rules/components/RuleDialog.vue'
import { proposeMatchText } from '@/features/category-rules/rules'
import { useCategoryRulesStore } from '@/features/category-rules/store'
import type { NewRule } from '@/features/category-rules/types'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import { findCategoryName } from '../actions'
import MonthNav from '../components/MonthNav.vue'
import MonthTotals from '../components/MonthTotals.vue'
import StatementActionNotice from '../components/StatementActionNotice.vue'
import StatementFilterBar from '../components/StatementFilterBar.vue'
import StatementList from '../components/StatementList.vue'
import {
  EMPTY_FILTERS,
  filterScopeLine,
  fromRouteQuery,
  hasActiveFilters,
  toRouteQuery,
} from '../filters'
import type { StatementFilters } from '../filters'
import { loadingMonthLine, statementErrorMessage } from '../months'
import type { MonthKey } from '../months'
import { useStatementStore } from '../store'
import type { Movement } from '../types'

const route = useRoute()
const router = useRouter()
const store = useStatementStore()
const rules = useCategoryRulesStore()

function syncFromRoute(): void {
  const { month, filters } = fromRouteQuery(route.query)
  void store.show(month, filters)
}

onMounted(() => {
  syncFromRoute()
  // One request each per session; a failure only switches its own select off (R14, R15).
  void store.loadAccounts()
  void store.loadCategories()
})

watch(() => route.query, syncFromRoute)

/** A month change IS a step you want to come back from, so it is pushed (R12). */
function onMonth(next: MonthKey): void {
  void router.push({ query: toRouteQuery(next, store.filters) })
}

/** Filters are replaced, not pushed: typing in the search box must not fill the history. */
function onFilters(next: StatementFilters): void {
  void router.replace({ query: toRouteQuery(store.month, next) })
}

const failure = computed(() =>
  store.error ? statementErrorMessage(store.error, hasActiveFilters(store.filters)) : null,
)

/** The names of the two chosen ids, so the scope line reads like the selects (R5). */
const scope = computed(() => {
  const pagination = store.result?.pagination
  if (!pagination || !hasActiveFilters(store.filters)) return undefined
  return filterScopeLine(store.filters, pagination.total, store.month, {
    account: store.accounts?.find((account) => account.id === store.filters.accountId)?.alias,
    category: findCategoryName(store.categories, store.filters.categoryId),
  })
})

// ─── Rules from a line (feature 21: R16, R17) ──────────────────────────────
// The dialog of the F17 as it is. A rule is born from a line, but creating it writes
// nothing on that movement and applies nothing by itself: that is the F17's own gesture.

/** The movement the rule dialog is open for, or null. */
const ruling = ref<Movement | null>(null)

function onCreateRule(movement: Movement): void {
  rules.saveMessage = null
  ruling.value = movement
}

function closeRuleDialog(): void {
  rules.saveMessage = null
  rules.clearPreview()
  ruling.value = null
}

/** How many pending movements without a category the text would look at (F18). */
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

const emptyState = computed<'month' | 'noMatches'>(() =>
  hasActiveFilters(store.filters) ? 'noMatches' : 'month',
)
</script>
