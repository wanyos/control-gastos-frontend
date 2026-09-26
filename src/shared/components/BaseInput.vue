<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-ink-muted">{{ label }}</label>
    <div class="flex items-center gap-2">
      <slot name="icon" />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :aria-invalid="invalid || undefined"
        class="h-9 w-full min-w-0 rounded-md border bg-surface-card px-3 text-sm text-ink-strong shadow-xs placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :class="invalid ? 'border-negative' : 'border-line-default'"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="hint" class="text-xs" :class="invalid ? 'text-negative' : 'text-ink-muted'">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
// Port of design-system/components/forms/Input.jsx: text, date and month, label always
// present and tied to the field by id (these are filter controls, none goes unlabeled).
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: 'text' | 'date' | 'month'
    placeholder?: string
    /** Shown under the field; painted as an error when `invalid`. */
    hint?: string
    invalid?: boolean
  }>(),
  { type: 'text', placeholder: undefined, hint: undefined, invalid: false },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const id = useId()
</script>
