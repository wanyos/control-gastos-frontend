<template>
  <section class="rounded-lg border border-line-subtle bg-surface-card p-[18px] shadow-sm">
    <div class="flex items-center justify-between">
      <span class="text-2xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
        {{ label }}
      </span>
      <span
        v-if="$slots.icon"
        class="inline-flex size-[30px] items-center justify-center rounded-md bg-brand-subtle text-brand"
      >
        <slot name="icon" />
      </span>
    </div>
    <div
      class="mt-2.5 font-mono text-3xl leading-none font-semibold tracking-[-0.02em] text-ink-strong tabular-nums"
      data-test="money"
    >
      {{ value }}
    </div>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// Port of design-system/components/finance/StatCard.jsx, without delta (there is
// no history) and without a currency suffix (the value comes already formatted).
defineProps<{
  label: string
  /** Already formatted figure. */
  value: string
}>()
</script>
