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
    <template v-for="root in categories ?? []" :key="root.id">
      <optgroup v-if="root.children.length > 0" :label="root.name">
        <option :value="String(root.id)">{{ root.name }}</option>
        <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
          {{ child.name }}
        </option>
      </optgroup>
      <option v-else :value="String(root.id)">{{ root.name }}</option>
    </template>
  </BaseSelect>
</template>

<script setup lang="ts">
// A root with children is an optgroup with the root itself as its first option: the
// contract says a parent does NOT drag its children's movements, so both are pickable.
// A root without children is a single loose option, so its name is read once (F28).
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
