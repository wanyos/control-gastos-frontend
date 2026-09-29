<template>
  <BaseCard>
    <div
      v-if="isEmpty"
      class="flex flex-col items-center gap-3 py-8 text-center"
      :data-test="isFiltered ? 'statement-no-matches' : 'statement-empty'"
    >
      <p class="text-sm text-ink-body">
        {{ isFiltered ? noMatchesLine(month) : emptyMonthLine(month) }}
      </p>
      <BaseButton
        v-if="isFiltered"
        variant="secondary"
        size="sm"
        data-test="statement-empty-clear"
        @click="emit('clear')"
      >
        Clear filters
      </BaseButton>
    </div>

    <template v-else>
      <section v-for="day in days" :key="day.date" data-test="statement-day">
        <h2
          class="sticky top-0 z-10 border-b border-line-subtle bg-surface-card py-1.5 text-xs font-semibold text-ink-muted"
          data-test="statement-day-label"
        >
          {{ day.label }}
        </h2>
        <ul class="flex flex-col divide-y divide-line-subtle">
          <StatementRow
            v-for="movement in day.movements"
            :key="movement.id"
            :movement="movement"
            :categories="categories"
            :editing="movement.id === editingId"
            :busy="busy"
            :selectable="selectable"
            :selected="selectedIds.includes(movement.id)"
            @edit="emit('edit', movement.id)"
            @toggle="emit('toggle', movement.id)"
            @categorize="(categoryId) => emit('categorize', movement.id, categoryId)"
            @create-rule="emit('create-rule', movement)"
            @close-editor="emit('close-editor')"
          />
        </ul>
      </section>

      <div
        v-if="hasMore"
        class="flex flex-wrap items-center justify-between gap-3 pt-4"
        data-test="statement-more"
      >
        <p class="text-sm text-ink-muted" data-test="statement-showing">
          {{ showingLine(shown, pagination.total) }}
        </p>
        <BaseButton
          variant="secondary"
          size="sm"
          :loading="loadingMore"
          data-test="statement-load-more"
          @click="emit('loadMore')"
        >
          Load more
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
// The month, day by day. An empty month says so and paints NO list and NO day
// header: an empty grid tells the user nothing (R11). `Load more` appends the rest of
// the month at the end and never touches the figures, which are the month's (R13).
// Feature 20: nothing matching a filter is a DIFFERENT sentence from an empty month,
// and it offers the way out (R13). Feature 21: the list owns no logic about writing —
// it passes the editor's state down and the row's three events up. Feature 22 adds the
// selection the same way: the mode and the ticked ids go down, the toggle goes up, and
// a marked movement is NOT hidden, filtered or moved — it stays exactly where the API
// put it (R9).
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import { noMatchesLine } from '../filters'
import { emptyMonthLine, showingLine } from '../months'
import type { MonthKey } from '../months'
import type { Category, DayGroup, Movement, Pagination } from '../types'

import StatementRow from './StatementRow.vue'

const props = withDefaults(
  defineProps<{
    month: MonthKey
    days: DayGroup[]
    pagination: Pagination
    /** Rows on screen right now, first page plus whatever `Load more` added. */
    shown: number
    /** Which empty sentence to paint when the API answered `total: 0`. */
    emptyState?: 'month' | 'noMatches'
    hasMore?: boolean
    loadingMore?: boolean
    /** Feature 21: what the row editor needs, passed straight down. */
    categories?: Category[] | null
    /** The row whose editor is open, or null: only one at a time (C2). */
    editingId?: number | null
    /** A write is in flight (C2). */
    busy?: boolean
    /** Feature 22: the selection mode is on, so every row shows its checkbox (R4). */
    selectable?: boolean
    /** Feature 22: the ids ticked right now. */
    selectedIds?: number[]
  }>(),
  {
    emptyState: 'month',
    hasMore: false,
    loadingMore: false,
    categories: null,
    editingId: null,
    busy: false,
    selectable: false,
    selectedIds: () => [],
  },
)

const emit = defineEmits<{
  loadMore: []
  clear: []
  edit: [number]
  categorize: [number, number | null]
  'create-rule': [Movement]
  'close-editor': []
  toggle: [number]
}>()

/** The API's own count, not the length of the list: the month is what is empty. */
const isEmpty = computed(() => props.pagination.total === 0)

const isFiltered = computed(() => props.emptyState === 'noMatches')
</script>
