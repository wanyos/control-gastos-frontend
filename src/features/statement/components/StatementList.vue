<template>
  <BaseCard>
    <p v-if="isEmpty" class="py-8 text-center text-sm text-ink-body" data-test="statement-empty">
      {{ emptyMonthLine(month) }}
    </p>

    <template v-else>
      <section v-for="day in days" :key="day.date" data-test="statement-day">
        <h2
          class="sticky top-0 z-10 border-b border-line-subtle bg-surface-card py-1.5 text-xs font-semibold text-ink-muted"
          data-test="statement-day-label"
        >
          {{ day.label }}
        </h2>
        <ul class="flex flex-col divide-y divide-line-subtle">
          <StatementRow v-for="movement in day.movements" :key="movement.id" :movement="movement" />
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
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import { emptyMonthLine, showingLine } from '../months'
import type { MonthKey } from '../months'
import type { DayGroup, Pagination } from '../types'

import StatementRow from './StatementRow.vue'

const props = withDefaults(
  defineProps<{
    month: MonthKey
    days: DayGroup[]
    pagination: Pagination
    /** Rows on screen right now, first page plus whatever `Load more` added. */
    shown: number
    hasMore?: boolean
    loadingMore?: boolean
  }>(),
  { hasMore: false, loadingMore: false },
)

const emit = defineEmits<{ loadMore: [] }>()

/** The API's own count, not the length of the list: the month is what is empty. */
const isEmpty = computed(() => props.pagination.total === 0)
</script>
