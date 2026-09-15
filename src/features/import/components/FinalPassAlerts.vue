<template>
  <div
    v-if="failures.length > 0"
    class="flex flex-col gap-2"
    data-test="report-section-final-passes"
  >
    <div
      v-for="failure in failures"
      :key="failure.id"
      class="flex flex-col gap-1 rounded-md bg-warning-subtle p-3"
      :data-failure="failure.id"
      data-test="final-pass-failure"
    >
      <p
        class="flex items-center gap-2 text-sm font-semibold text-warning"
        data-test="final-pass-title"
      >
        <TriangleAlert :size="16" class="shrink-0" aria-hidden="true" />
        {{ failure.title }}
      </p>
      <p class="text-sm text-ink-body">{{ FINAL_PASS_SAFE }}</p>
      <details v-if="failure.details !== null" class="text-sm text-ink-muted">
        <summary class="cursor-pointer">Details</summary>
        <p lang="es" class="mt-1 break-words" data-test="final-pass-details">
          {{ failure.details }}
        </p>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
// Transfer matching or categorization that did not finish. Always unfolded; no
// role of its own: the headline is already announced by the dialog's live region.
import { TriangleAlert } from '@lucide/vue'

import { FINAL_PASS_SAFE } from '../details'
import type { FinalPassFailure } from '../details'

defineProps<{ failures: FinalPassFailure[] }>()
</script>
