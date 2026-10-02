<template>
  <p
    class="font-display text-xl leading-snug font-bold tracking-[-0.01em] text-ink-strong"
    data-test="overview-sentence"
  >
    {{ text }}
  </p>
</template>

<script setup lang="ts">
// The month already interpreted: the first thing read, before any figure (R4).
defineProps<{
  /** Built by `monthSentence`; this component only paints it. */
  text: string
}>()
</script>
