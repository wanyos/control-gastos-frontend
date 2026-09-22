<template>
  <BaseCard>
    <div
      v-if="emptyState"
      class="flex flex-col items-center gap-3 py-8 text-center"
      data-test="review-empty"
    >
      <p class="text-sm text-ink-body">{{ EMPTY_TEXT[emptyState] }}</p>
      <BaseButton
        v-if="emptyState === 'noMatches'"
        variant="secondary"
        size="sm"
        @click="emit('clear')"
      >
        Clear filters
      </BaseButton>
    </div>

    <template v-else>
      <div
        class="mb-1 flex items-center gap-3 border-b border-line-subtle px-3 pb-2"
        data-test="movement-list-header"
      >
        <BaseCheckbox
          class="w-6 shrink-0"
          label="Select all"
          :model-value="allSelected"
          :indeterminate="someSelected"
          data-test="select-all"
          @update:model-value="(checked) => emit('selectAll', checked)"
        />
        <span class="ml-auto text-xs text-ink-muted" data-test="select-all-count">
          {{ selectedIds.length }} of {{ movements.length }} selected
        </span>
      </div>

      <ul class="flex flex-col divide-y divide-line-subtle" data-test="movement-list">
        <MovementRow
          v-for="movement in movements"
          :key="movement.id"
          :movement="movement"
          :categories="categories"
          :selected="selectedIds.includes(movement.id)"
          :busy="busy"
          @toggle="emit('toggle', movement.id)"
          @confirm="emit('confirm', movement.id)"
          @categorize="(categoryId) => emit('categorize', movement.id, categoryId)"
        />
      </ul>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
// The queue itself. With no matches it paints the right sentence and NO empty
// table: an empty grid tells the user nothing (R12).
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import BaseCheckbox from '@/shared/components/BaseCheckbox.vue'

import MovementRow from './MovementRow.vue'
import type { Category, Movement } from '../types'

export type EmptyState = 'caughtUp' | 'noMatches'

const props = withDefaults(
  defineProps<{
    movements: Movement[]
    /** Set only when the API answered `total: 0`; which sentence depends on the filters. */
    emptyState?: EmptyState
    /** The ids ticked right now; the list owns nothing, the store does (R1). */
    selectedIds?: number[]
    categories?: Category[] | null
    busy?: boolean
  }>(),
  { emptyState: undefined, selectedIds: () => [], categories: null, busy: false },
)

const emit = defineEmits<{
  clear: []
  toggle: [number]
  selectAll: [boolean]
  confirm: [number]
  categorize: [number, number | null]
}>()

/** "Select all" is ticked only with the whole page taken, and in between shows a dash (R2). */
const allSelected = computed(
  () => props.movements.length > 0 && props.selectedIds.length >= props.movements.length,
)

const someSelected = computed(() => props.selectedIds.length > 0 && !allSelected.value)

const EMPTY_TEXT: Record<EmptyState, string> = {
  caughtUp: "You're all caught up. Nothing is waiting for review.",
  noMatches: 'No movements match these filters.',
}
</script>
