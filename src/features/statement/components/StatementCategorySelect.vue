<template>
  <BaseSelect
    :model-value="modelValue === null ? '' : String(modelValue)"
    label="Category"
    :disabled="isDisabled"
    :hint="failed ? UNAVAILABLE : undefined"
    data-test="filter-category"
    @update:model-value="onChange"
  >
    <option value="">{{ failed ? UNAVAILABLE : 'All categories' }}</option>
    <optgroup v-for="root in categories ?? []" :key="root.id" :label="root.name">
      <option :value="String(root.id)">{{ root.name }}</option>
      <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
        {{ child.name }}
      </option>
    </optgroup>
  </BaseSelect>
</template>

<script setup lang="ts">
// One optgroup per root category, with the root itself as its first option: the
// contract says a parent does NOT drag its children's movements, so both are pickable.
//
// A copy of `review/components/CategorySelect.vue` (design §1.3): the statement may not
// import from another feature (C3), and moving it to `shared/components/` would drag a
// component with filter vocabulary («All categories») into the base drawer. If a third
// screen needs it, that is the moment to move it.
import { computed } from 'vue'

import BaseSelect from '@/shared/components/BaseSelect.vue'

import type { Category } from '../types'

const UNAVAILABLE = 'Categories unavailable'

const props = defineProps<{
  modelValue: number | null
  /** Null while unknown or after a failure. */
  categories: Category[] | null
  failed: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

const isDisabled = computed(() => props.failed || props.categories === null)

function onChange(value: string): void {
  emit('update:modelValue', value === '' ? null : Number(value))
}
</script>
