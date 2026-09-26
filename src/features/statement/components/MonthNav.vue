<template>
  <div class="flex flex-wrap items-end gap-3" data-test="statement-nav">
    <BaseButton
      variant="secondary"
      size="sm"
      aria-label="Previous month"
      data-test="statement-prev"
      @click="emit('change', shiftMonth(month, -1))"
    >
      <template #icon><ChevronLeft :size="15" aria-hidden="true" /></template>
      Previous
    </BaseButton>

    <p
      class="min-w-40 text-center font-display text-base font-bold text-ink-strong"
      data-test="statement-month-label"
    >
      {{ formatMonthLabel(month) }}
    </p>

    <BaseButton
      variant="secondary"
      size="sm"
      aria-label="Next month"
      :disabled="isAtOrAfterCurrentMonth(month)"
      data-test="statement-next"
      @click="emit('change', shiftMonth(month, 1))"
    >
      Next
      <ChevronRight :size="15" aria-hidden="true" />
    </BaseButton>

    <div class="ml-auto w-48" data-test="statement-month-input">
      <BaseInput
        type="month"
        label="Jump to month"
        :model-value="month"
        @update:model-value="onJump"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Two arrows for the everyday gesture and a month picker for the long jump, so
// getting to January 2024 is not twenty clicks (decisions.md 🔴 1). The nav loads
// nothing: it emits the month and the view writes it in the URL, the single source
// of truth of what is on screen (R2, R3).
import { ChevronLeft, ChevronRight } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'

import { formatMonthLabel, isAtOrAfterCurrentMonth, shiftMonth } from '../months'
import type { MonthKey } from '../months'

defineProps<{ month: MonthKey }>()

const emit = defineEmits<{ change: [MonthKey] }>()

/**
 * A native month field can be half typed (`2026-`) or cleared: only a whole month
 * travels. Going back has no floor — the frontend does not know where the history
 * starts, and an earlier month simply comes back empty (design.md §5).
 */
function onJump(value: string): void {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) emit('change', value)
}
</script>
