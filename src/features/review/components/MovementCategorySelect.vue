<template>
  <div class="w-44 shrink-0">
    <BaseSelect
      :model-value="movement.categoryId === null ? '' : String(movement.categoryId)"
      label="Category"
      label-hidden
      :disabled="isDisabled"
      :hint="movement.type === 'neutral' ? NEUTRAL_HINT : undefined"
      data-test="row-category-select"
      @update:model-value="onChange"
    >
      <option value="">No category</option>
      <optgroup v-for="root in allowed" :key="root.id" :label="root.name">
        <option :value="String(root.id)">{{ root.name }}</option>
        <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
          {{ child.name }}
        </option>
      </optgroup>
    </BaseSelect>
  </div>
</template>

<script setup lang="ts">
// The category of one row. It only offers what the contract accepts for this
// movement — the categories whose `kind` matches its `type` — so a choice that would
// come back as a 400 cannot even be made (R4). Choosing saves on its own: there is no
// Save button (decisions.md 🔴 2).
import { computed } from 'vue'

import BaseSelect from '@/shared/components/BaseSelect.vue'

import type { Category, Movement } from '../types'

const NEUTRAL_HINT = "Neutral movements can't be categorized"

const props = defineProps<{
  movement: Movement
  /** Null while unknown or after a failure: then there is nothing to choose from. */
  categories: Category[] | null
  disabled?: boolean
}>()

const emit = defineEmits<{ change: [number | null] }>()

const isDisabled = computed(
  () => props.disabled === true || props.movement.type === 'neutral' || props.categories === null,
)

/** Only the trees of the kind this movement accepts; a neutral one accepts none. */
const allowed = computed<Category[]>(() =>
  (props.categories ?? []).filter((category) => category.kind === props.movement.type),
)

function onChange(value: string): void {
  emit('change', value === '' ? null : Number(value))
}
</script>
