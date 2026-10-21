<template>
  <fieldset class="flex min-w-0 flex-col gap-2" data-test="text-list">
    <legend class="mb-1.5 text-sm font-medium text-ink-muted">{{ label }}</legend>

    <div
      v-for="(text, index) in modelValue"
      :key="index"
      class="flex items-start gap-2"
      data-test="text-list-item"
    >
      <BaseInput
        class="flex-1"
        :model-value="text"
        :label="`${itemLabel} ${index + 1}`"
        :hint="problems[index] ?? undefined"
        :invalid="problems[index] != null"
        lang="es"
        data-test="text-list-field"
        @update:model-value="(value) => change(index, value)"
      />
      <BaseButton
        class="mt-6"
        variant="secondary"
        size="sm"
        data-test="text-list-remove"
        @click="remove(index)"
      >
        {{ REMOVE }}
      </BaseButton>
    </div>

    <div>
      <BaseButton variant="secondary" size="sm" data-test="text-list-add" @click="add">
        {{ addLabel }}
      </BaseButton>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
// A list of text fields, one per text, each with Remove, and an Add button at the end
// (R8). Used by the account window and by the window of the forms of the name. Dumb:
// it hands every change up as a new list.
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'

import { REMOVE } from '../texts'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    /** The title of the whole list. */
    label: string
    /** The label of each field, followed by its number. */
    itemLabel: string
    addLabel: string
    /** The sentence under each field, or null when it is fine. */
    problems?: (string | null)[]
  }>(),
  { problems: () => [] },
)

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

function change(index: number, value: string): void {
  emit(
    'update:modelValue',
    props.modelValue.map((text, at) => (at === index ? value : text)),
  )
}

function remove(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, at) => at !== index),
  )
}

function add(): void {
  emit('update:modelValue', [...props.modelValue, ''])
}
</script>
