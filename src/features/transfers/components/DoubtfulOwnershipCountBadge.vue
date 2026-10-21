<template>
  <span
    v-if="count !== null && count > 0"
    class="ml-auto rounded-pill bg-accent/15 px-2 py-0.5 font-mono text-2xs font-semibold tabular-nums text-ink-on-dark"
    data-test="transfers-doubtful-count"
  >
    {{ count }}
  </span>
</template>

<script setup lang="ts">
// How many doubtful movements of own money wait for an answer, next to the `Transfers`
// entry of the sidebar (feature 35, R11). Same look as the number of `Review`
// (`review/components/ReviewCountBadge.vue`). It is `pagination.total` of the smallest
// query, refreshed on mount, on every read of the list and after an import (R12). Zero
// or a failed query show nothing at all.
import { computed, onMounted } from 'vue'

import { useTransfersStore } from '../store'

const store = useTransfersStore()

onMounted(() => {
  void store.refreshDoubtfulCount()
})

const count = computed(() => store.doubtfulCount)
</script>
