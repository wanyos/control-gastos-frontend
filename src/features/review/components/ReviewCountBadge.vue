<template>
  <span
    v-if="count !== null && count > 0"
    class="ml-auto rounded-pill bg-accent/15 px-2 py-0.5 font-mono text-2xs font-semibold tabular-nums text-ink-on-dark"
    data-test="review-count"
  >
    {{ count }}
  </span>
</template>

<script setup lang="ts">
// How many movements are waiting for review, next to the sidebar entry. There is no
// count endpoint: it is `pagination.total` of the smallest possible query, refreshed
// on mount, after an import and whenever the bare queue is loaded (R2). A failed
// query shows nothing at all: an error has no business in the sidebar (R1).
import { computed, onMounted } from 'vue'

import { useReviewStore } from '../store'

const store = useReviewStore()

onMounted(() => {
  void store.refreshPendingCount()
})

const count = computed(() => store.pendingCount)
</script>
