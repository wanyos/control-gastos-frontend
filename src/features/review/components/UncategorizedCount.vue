<template>
  <!-- `leading-5` on purpose: at the default line height this line is 19.5 px tall and
       pushes every row of the queue half a pixel down the page. -->
  <p
    v-if="sentence"
    class="text-sm leading-5 text-ink-muted"
    data-test="review-uncategorized-count"
  >
    {{ sentence }}
  </p>
</template>

<script setup lang="ts">
// How many pending movements have no category, in one sentence (feature 30). The
// number is the backend's and covers the whole queue, whatever filters are on. While
// it is unknown nothing is painted: neither an older number nor an error.
import { computed } from 'vue'

const props = defineProps<{
  /** Null while unknown or when its request failed. */
  count: number | null
}>()

const sentence = computed(() => {
  if (props.count === null) return null
  if (props.count === 0) return 'Every pending movement has a category.'
  return props.count === 1
    ? '1 pending movement has no category.'
    : `${props.count} pending movements have no category.`
})
</script>
