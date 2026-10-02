<template>
  <BaseCard v-if="load === 'error' || uncategorized" data-test="overview-uncategorized">
    <p
      v-if="load === 'error'"
      class="text-sm text-ink-body"
      data-test="overview-uncategorized-error"
    >
      {{ UNCATEGORIZED_FAILED }}
    </p>
    <template v-else-if="uncategorized">
      <p class="text-sm text-ink-body tabular-nums" data-test="overview-uncategorized-line">
        {{ uncategorizedLine(uncategorized, expense) }}
      </p>
      <ShareBar
        v-if="permille !== null && permille > 0"
        class="mt-3"
        :permille="permille"
        fill-class="bg-chart-4"
      />
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
// How much of the month's spending can be trusted by category: two backend figures and
// the share one is of the other (R12). If it could not be read, it says so (R14).
import { computed } from 'vue'

import BaseCard from '@/shared/components/BaseCard.vue'
import ShareBar from '@/shared/components/ShareBar.vue'

import { UNCATEGORIZED_FAILED, uncategorizedLine, uncategorizedPermille } from '../reading'
import type { DecimalString, LoadState, Uncategorized } from '../types'

const props = defineProps<{
  load: LoadState
  uncategorized: Uncategorized | null
  /** The month's `totals.expense`, exactly as the backend sent it. */
  expense: DecimalString
}>()

const permille = computed(() =>
  props.uncategorized ? uncategorizedPermille(props.uncategorized, props.expense) : null,
)
</script>
