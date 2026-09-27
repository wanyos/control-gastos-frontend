<template>
  <section class="flex flex-col gap-3" data-test="statement-filters">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <BaseInput
        :model-value="search"
        label="Search"
        placeholder="Part of the description"
        :invalid="searchError !== undefined"
        :hint="searchError ?? SEARCH_HELP"
        data-test="statement-search"
        @update:model-value="onSearch"
      >
        <template #icon><Search :size="15" class="text-ink-muted" aria-hidden="true" /></template>
      </BaseInput>

      <BaseSelect
        :model-value="filters.accountId === null ? '' : String(filters.accountId)"
        label="Account"
        :disabled="accountsDisabled"
        :hint="accountsFailed ? ACCOUNTS_UNAVAILABLE : undefined"
        data-test="filter-account"
        @update:model-value="emitChange({ accountId: $event === '' ? null : Number($event) })"
      >
        <option value="">{{ accountsFailed ? ACCOUNTS_UNAVAILABLE : 'All accounts' }}</option>
        <option v-for="account in accountOptions" :key="account.id" :value="String(account.id)">
          {{ account.label }}
        </option>
      </BaseSelect>

      <StatementCategorySelect
        :model-value="filters.categoryId"
        :categories="categories"
        :failed="categoriesFailed"
        @update:model-value="onCategory"
      />

      <div class="flex items-end justify-between gap-3 pb-2">
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
    </div>
  </section>
</template>

<script setup lang="ts">
// The statement's own bar, with its FOUR controls and no more: no type (the sign of
// the amount already says it), no status (the statement shows pending and confirmed
// alike) and no date range (the month rules) — decisions.md 🔴 1.
//
// Dumb by design: it holds no filter state, it announces the whole next filter set
// with `change`. The only thing it owns is the typing timer of the search box.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Search } from '@lucide/vue'

import { bankLabel } from '@/shared/banks'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'
import { searchTerm } from '@/shared/movement-filters'
import { SEARCH_DEBOUNCE_MS } from '@/shared/movements'

import StatementCategorySelect from './StatementCategorySelect.vue'
import { EMPTY_FILTERS, hasActiveFilters } from '../filters'
import type { StatementFilters } from '../filters'
import type { AccountSummary, Category } from '../types'

const SEARCH_HELP = 'Searches the description, ignoring case and accents'
const ACCOUNTS_UNAVAILABLE = 'Accounts unavailable'

const props = defineProps<{
  filters: StatementFilters
  /** Every account there is, not only the ones in the loaded month (R14). Null while unknown. */
  accounts: AccountSummary[] | null
  accountsFailed: boolean
  categories: Category[] | null
  categoriesFailed: boolean
}>()

const emit = defineEmits<{ change: [StatementFilters] }>()

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

function emitChange(patch: Partial<StatementFilters>): void {
  emit('change', { ...props.filters, q: search.value, ...patch })
}

/** Waits for the typing to stop, and never sends a search the backend would reject (R7). */
function onSearch(value: string): void {
  search.value = value
  clearTimeout(timer)
  const { error } = searchTerm(value)
  searchError.value = error
  if (error !== undefined) return
  timer = setTimeout(() => emitChange({ q: value }), SEARCH_DEBOUNCE_MS)
}

/** Choosing a category clears Uncategorized: sending both is a 400 (R9). */
function onCategory(categoryId: number | null): void {
  emitChange({
    categoryId,
    uncategorized: categoryId === null ? props.filters.uncategorized : false,
  })
}

function onUncategorized(uncategorized: boolean): void {
  emitChange({ uncategorized, categoryId: uncategorized ? null : props.filters.categoryId })
}

const accountsDisabled = computed(() => props.accountsFailed || props.accounts === null)

/** Every account, plus the chosen one when the list no longer holds it (a stale URL). */
const accountOptions = computed(() => {
  const options = new Map<number, { id: number; label: string }>()
  for (const account of props.accounts ?? []) {
    options.set(account.id, {
      id: account.id,
      label: `${bankLabel(account.bank)} · ${account.alias}`,
    })
  }
  const chosen = props.filters.accountId
  if (chosen !== null && !options.has(chosen)) {
    options.set(chosen, { id: chosen, label: `Account #${chosen}` })
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label))
})
</script>
