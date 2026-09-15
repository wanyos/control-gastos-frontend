<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex items-center justify-center whitespace-nowrap border font-sans leading-none font-semibold transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    :class="[
      VARIANTS[variant],
      SIZES[size],
      loading ? 'cursor-progress' : 'disabled:cursor-not-allowed disabled:opacity-50',
    ]"
  >
    <BaseSpinner v-if="loading" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
// Port of design-system/components/forms/Button.jsx (primary, secondary, ghost; sm, md).
// While loading the button is disabled but not dimmed: its text must still read.
import BaseSpinner from './BaseSpinner.vue'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', loading: false, disabled: false, type: 'button' },
)

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-ink-on-brand border-brand shadow-xs enabled:hover:bg-brand-hover enabled:active:bg-brand-active',
  secondary:
    'bg-surface-card text-ink-strong border-line-default shadow-xs enabled:hover:bg-surface-hover',
  ghost: 'bg-transparent text-ink-muted border-transparent enabled:hover:bg-surface-hover',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-sm px-3 text-sm',
  md: 'h-10 gap-2 rounded-md px-4 text-base',
}
</script>
