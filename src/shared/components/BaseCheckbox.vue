<template>
  <label
    :for="id"
    class="inline-flex items-center gap-2 text-sm text-ink-body"
    :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
  >
    <input
      :id="id"
      ref="box"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="ariaLabel"
      class="size-4 shrink-0 rounded-xs accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
      :class="disabled ? '' : 'cursor-pointer'"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    {{ label }}
  </label>
</template>

<script setup lang="ts">
// Port of design-system/components/forms/Checkbox.jsx, on a native input: the
// reference builds its own box with role="checkbox", which costs keyboard and
// assistive-technology behaviour the browser already gives for free. The brand
// check comes from `accent-brand`, so it follows the dark theme's token.
// `indeterminate` is a DOM property, not an attribute: it can only be set on the
// element, which is why the ref and the watcher exist (feature 16).
import { ref, useId, watchEffect } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Empty when the visible text lives elsewhere; then `ariaLabel` names the box. */
    label: string
    /** Some but not all of a group ticked: the box shows a dash. */
    indeterminate?: boolean
    disabled?: boolean
    ariaLabel?: string
  }>(),
  { indeterminate: false, disabled: false, ariaLabel: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const id = useId()
const box = ref<HTMLInputElement | null>(null)

watchEffect(
  () => {
    if (box.value) box.value.indeterminate = props.indeterminate
  },
  // After the render: on the first one the element does not exist yet.
  { flush: 'post' },
)
</script>
