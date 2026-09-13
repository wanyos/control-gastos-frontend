<template>
  <span
    class="inline-flex items-center gap-[5px] whitespace-nowrap rounded-pill border border-transparent font-sans leading-[1.4] font-semibold"
    :class="[
      TONES[tone].soft,
      size === 'sm' ? 'px-[7px] py-[2px] text-2xs' : 'px-[9px] py-[3px] text-xs',
    ]"
  >
    <span v-if="dot" class="size-1.5 rounded-full" :class="TONES[tone].dot" />
    <slot />
  </span>
</template>

<script setup lang="ts">
// Port of design-system/components/feedback/Badge.jsx: soft variant only.
export type BadgeTone = 'neutral' | 'brand' | 'positive' | 'negative' | 'warning' | 'info'

withDefaults(
  defineProps<{
    tone?: BadgeTone
    dot?: boolean
    size?: 'sm' | 'md'
  }>(),
  { tone: 'neutral', dot: false, size: 'md' },
)

// Full literal class names: Tailwind scans source as text, so they must not be
// built by concatenation. Raw scale steps of the reference map to the closest
// semantic alias (docs/stack.md).
const TONES: Record<BadgeTone, { soft: string; dot: string }> = {
  neutral: { soft: 'bg-surface-sunken text-ink-body', dot: 'bg-ink-body' },
  brand: { soft: 'bg-brand-subtle text-brand', dot: 'bg-brand' },
  positive: { soft: 'bg-positive-subtle text-positive', dot: 'bg-positive' },
  negative: { soft: 'bg-negative-subtle text-negative', dot: 'bg-negative' },
  warning: { soft: 'bg-warning-subtle text-warning', dot: 'bg-warning' },
  info: { soft: 'bg-info-subtle text-info', dot: 'bg-info' },
}
</script>
