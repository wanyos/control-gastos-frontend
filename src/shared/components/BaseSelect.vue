<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label :for="id" :class="labelHidden ? 'sr-only' : 'text-sm font-medium text-ink-muted'">
      {{ label }}
    </label>
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      class="h-9 w-full min-w-0 rounded-md border border-line-default bg-surface-card px-2 text-sm text-ink-strong shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
    <p v-if="hint" class="text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
// Port of design-system/components/forms/Select.jsx. The native arrow is kept on
// purpose: replacing it means building a listbox, which is a component, not a port.
// The options come from the slot so each caller decides between <option> and <optgroup>.
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    disabled?: boolean
    hint?: string
    /** Keeps the label for assistive technology but off the screen: a row cannot
     * repeat "Category" a hundred times (feature 16). */
    labelHidden?: boolean
  }>(),
  { disabled: false, hint: undefined, labelHidden: false },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const id = useId()
</script>
