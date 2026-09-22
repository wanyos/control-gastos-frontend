<template>
  <div
    class="flex flex-wrap items-center gap-3 rounded-md border border-line-subtle bg-surface-card px-3 py-2.5"
    data-test="review-actions"
  >
    <span class="text-sm font-semibold text-ink-strong" data-test="selected-count">
      {{ selectedCount }} selected
    </span>

    <div class="w-52">
      <BaseSelect
        :model-value="choice"
        label="Category to apply"
        label-hidden
        :disabled="busy || categories === null"
        data-test="bulk-category"
        @update:model-value="(value) => emit('update:choice', value)"
      >
        <option value="">{{ categories === null ? UNAVAILABLE : PLACEHOLDER }}</option>
        <option value="none">Remove category</option>
        <optgroup v-for="root in categories ?? []" :key="root.id" :label="root.name">
          <option :value="String(root.id)">{{ root.name }}</option>
          <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
            {{ child.name }}
          </option>
        </optgroup>
      </BaseSelect>
    </div>

    <span v-if="choice !== ''" class="text-sm text-ink-body" data-test="applies-to">
      Applies to {{ eligibleCount }} of {{ selectedCount }} selected
    </span>

    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="choice === '' || eligibleCount === 0"
      :loading="busy"
      data-test="apply-category"
      @click="emit('applyCategory')"
    >
      <template #icon><Tag :size="14" aria-hidden="true" /></template>
      Apply category
    </BaseButton>

    <BaseButton size="sm" :loading="busy" data-test="confirm-selected" @click="emit('confirm')">
      <template #icon><Check :size="14" aria-hidden="true" /></template>
      Confirm {{ countOf(selectedCount) }}
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      class="ml-auto"
      :disabled="busy"
      data-test="clear-selection"
      @click="emit('clear')"
    >
      Clear selection
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
// The bulk actions, shown only while something is ticked. It decides nothing: the
// number it can act on is worked out by the view, and it says it out loud before the
// action runs (R6, R7). The button carries the count, so no click is ever blind.
import { Check, Tag } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'

import { countOf } from '../actions'
import type { Category } from '../types'

const PLACEHOLDER = 'Choose a category…'
const UNAVAILABLE = 'Categories unavailable'

defineProps<{
  selectedCount: number
  /** How many of them accept the chosen category; zero disables the action (R7). */
  eligibleCount: number
  /** `''` nothing chosen, `none` remove the category, otherwise the category id. */
  choice: string
  categories: Category[] | null
  busy?: boolean
}>()

const emit = defineEmits<{
  'update:choice': [string]
  applyCategory: []
  confirm: []
  clear: []
}>()
</script>
