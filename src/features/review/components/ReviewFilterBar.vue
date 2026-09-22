<template>
  <section class="flex flex-col gap-3" data-test="review-filters">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div class="lg:col-span-2">
        <BaseInput
          :model-value="search"
          label="Search"
          placeholder="Part of the description"
          :invalid="searchError !== undefined"
          :hint="searchError ?? SEARCH_HELP"
          data-test="review-search"
          @update:model-value="onSearch"
        >
          <template #icon><Search :size="15" class="text-ink-muted" aria-hidden="true" /></template>
        </BaseInput>
      </div>

      <BaseSelect
        :model-value="filters.accountId === null ? '' : String(filters.accountId)"
        label="Account"
        data-test="filter-account"
        @update:model-value="emitChange({ accountId: $event === '' ? null : Number($event) })"
      >
        <option value="">All accounts</option>
        <option v-for="account in accountOptions" :key="account.id" :value="String(account.id)">
          {{ account.label }}
        </option>
      </BaseSelect>

      <BaseSelect
        :model-value="filters.type"
        label="Type"
        data-test="filter-type"
        @update:model-value="emitChange({ type: $event as ReviewFilters['type'] })"
      >
        <option value="">All types</option>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
        <option value="neutral">Neutral</option>
      </BaseSelect>

      <BaseInput
        :model-value="filters.from"
        label="From"
        type="date"
        data-test="filter-from"
        @update:model-value="emitChange({ from: $event })"
      />

      <BaseInput
        :model-value="filters.to"
        label="To"
        type="date"
        data-test="filter-to"
        @update:model-value="emitChange({ to: $event })"
      />

      <CategorySelect
        :model-value="filters.categoryId"
        :categories="categories"
        :failed="categoriesFailed"
        @update:model-value="onCategory"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <BaseCheckbox
        :model-value="filters.uncategorized"
        label="Uncategorized"
        data-test="filter-uncategorized"
        @update:model-value="onUncategorized"
      />

      <BaseButton
        v-if="hasActiveFilters(filters)"
        variant="ghost"
        size="sm"
        data-test="clear-filters"
        @click="emit('change', { ...EMPTY_FILTERS })"
      >
        Clear filters
      </BaseButton>
    </div>
    <!-- The F16's action bar goes here, under the filters. Nothing is built yet. -->
  </section>
</template>

<script setup lang="ts">
// Dumb by design: it holds no filter state, it announces the whole next filter set
// with `change`. The only thing it owns is the typing timer of the search box.
import { onBeforeUnmount, ref, watch } from 'vue'
import { Search } from '@lucide/vue'

import { bankLabel } from '@/shared/banks'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'

import CategorySelect from './CategorySelect.vue'
import { EMPTY_FILTERS, SEARCH_DEBOUNCE_MS, hasActiveFilters, searchTerm } from '../filters'
import type { Category, MovementAccount, ReviewFilters } from '../types'

const SEARCH_HELP = 'Searches the description, ignoring case and accents'

const props = defineProps<{
  filters: ReviewFilters
  /** The accounts present in the loaded page: no extra request just to fill a select. */
  accounts: MovementAccount[]
  categories: Category[] | null
  categoriesFailed: boolean
}>()

const emit = defineEmits<{ change: [ReviewFilters] }>()

const search = ref(props.filters.q)
const searchError = ref<string | undefined>(undefined)
let timer: ReturnType<typeof setTimeout> | undefined

// The URL (back button, a shared link) is the other writer of the filters.
watch(
  () => props.filters.q,
  (q) => {
    if (q !== search.value) {
      search.value = q
      searchError.value = undefined
    }
  },
)

onBeforeUnmount(() => clearTimeout(timer))

function emitChange(patch: Partial<ReviewFilters>): void {
  emit('change', { ...props.filters, q: search.value, ...patch })
}

/** Waits for the typing to stop, and never sends a search the backend would reject. */
function onSearch(value: string): void {
  search.value = value
  clearTimeout(timer)
  const { error } = searchTerm(value)
  searchError.value = error
  if (error !== undefined) return
  timer = setTimeout(() => emitChange({ q: value }), SEARCH_DEBOUNCE_MS)
}

/** Choosing a category clears Uncategorized: sending both is a 400 (R6). */
function onCategory(categoryId: number | null): void {
  emitChange({
    categoryId,
    uncategorized: categoryId === null ? props.filters.uncategorized : false,
  })
}

function onUncategorized(uncategorized: boolean): void {
  emitChange({ uncategorized, categoryId: uncategorized ? null : props.filters.categoryId })
}

interface AccountOption {
  id: number
  label: string
}

/** The accounts of the page, plus the chosen one when the page no longer holds it. */
const accountOptions = ref<AccountOption[]>([])

watch(
  () => [props.accounts, props.filters.accountId] as const,
  ([accounts, accountId]) => {
    const options = new Map<number, AccountOption>()
    for (const account of accounts) {
      options.set(account.id, {
        id: account.id,
        label: `${bankLabel(account.bank)} · ${account.alias}`,
      })
    }
    if (accountId !== null && !options.has(accountId)) {
      options.set(accountId, { id: accountId, label: `Account #${accountId}` })
    }
    accountOptions.value = [...options.values()].sort((a, b) => a.label.localeCompare(b.label))
  },
  { immediate: true, deep: true },
)
</script>
