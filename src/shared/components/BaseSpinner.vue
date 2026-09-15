<template>
  <span v-if="label" role="status" class="inline-flex">
    <span
      aria-hidden="true"
      class="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <span class="sr-only">{{ label }}</span>
  </span>
  <span
    v-else
    aria-hidden="true"
    class="inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<script setup lang="ts">
// Port of the Spinner inside design-system/components/forms/Button.jsx. Decorative
// unless it gets a label; with reduced motion it stops turning (the text still says
// what is going on).
withDefaults(defineProps<{ size?: number; label?: string }>(), { size: 14, label: undefined })
</script>
