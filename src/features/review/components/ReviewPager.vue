<template>
  <nav
    v-if="pagination.totalPages > 1"
    class="flex items-center justify-between gap-3 pt-4"
    aria-label="Pagination"
    data-test="review-pager"
  >
    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="pagination.page <= 1"
      data-test="pager-previous"
      @click="emit('go', pagination.page - 1)"
    >
      <template #icon><ChevronLeft :size="15" aria-hidden="true" /></template>
      Previous
    </BaseButton>

    <p class="text-sm text-ink-muted" data-test="pager-position">
      Page {{ pagination.page }} of {{ pagination.totalPages }}
    </p>

    <BaseButton
      variant="secondary"
      size="sm"
      :disabled="pagination.page >= pagination.totalPages"
      data-test="pager-next"
      @click="emit('go', pagination.page + 1)"
    >
      <!-- The icon goes in the default slot: BaseButton paints the icon slot first. -->
      Next
      <ChevronRight :size="15" aria-hidden="true" />
    </BaseButton>
  </nav>
</template>

<script setup lang="ts">
// Pages, not infinite scroll: the API returns `total` and `totals` per filter and
// a page is where you left off. Hidden when everything fits in one page.
import { ChevronLeft, ChevronRight } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'

import type { Pagination } from '../types'

defineProps<{ pagination: Pagination }>()

const emit = defineEmits<{ go: [number] }>()
</script>
