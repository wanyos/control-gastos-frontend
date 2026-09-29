<template>
  <div
    class="flex flex-wrap items-center gap-3 rounded-md border border-line-subtle bg-surface-card px-3 py-2.5"
    data-test="statement-selection-bar"
  >
    <span class="text-sm font-semibold text-ink-strong" data-test="statement-selected-count">
      {{ selectedCount }} selected
    </span>

    <BaseButton
      size="sm"
      :disabled="selectedCount === 0"
      :loading="busy"
      data-test="statement-exclude"
      @click="emit('exclude')"
    >
      <template #icon><EyeOff :size="14" aria-hidden="true" /></template>
      Exclude from totals
    </BaseButton>

    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="selectedCount === 0 || busy"
      data-test="statement-include"
      @click="emit('include')"
    >
      <template #icon><Eye :size="14" aria-hidden="true" /></template>
      Include in totals
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="busy || shownCount === 0"
      data-test="statement-select-all"
      @click="emit('select-all')"
    >
      Select all shown
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="busy || selectedCount === 0"
      data-test="statement-clear-selection"
      @click="emit('clear')"
    >
      Clear selection
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      class="ml-auto"
      :disabled="busy"
      data-test="statement-selection-done"
      @click="emit('done')"
    >
      Done
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
// The bar of the selection mode: how many rows are ticked and the two actions that
// write (R5). It decides nothing and it counts nothing — the store knows which of the
// ticked rows really change — and every control goes dead while a write is in flight,
// so a second click cannot start a second request (C5).
//
// A reduced copy of `review/components/ReviewActionBar.vue`, for the same reason the
// F21 copied its notice line: this feature imports nothing from another feature, and
// dropping a bar with one screen's vocabulary into the `Base*` drawer would tie both.
import { Eye, EyeOff } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'

defineProps<{
  /** Rows ticked right now. */
  selectedCount: number
  /** Rows on screen, so `Select all shown` knows whether it has anything to do. */
  shownCount: number
  /** A write is in flight (C5). */
  busy?: boolean
}>()

const emit = defineEmits<{
  exclude: []
  include: []
  'select-all': []
  clear: []
  done: []
}>()
</script>
