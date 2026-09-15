<template>
  <div class="flex flex-col gap-4" data-test="import-summary">
    <p class="flex items-center gap-2" data-test="outcome">
      <component
        :is="TONE_ICONS[outcome.tone].icon"
        :size="20"
        :class="TONE_ICONS[outcome.tone].class"
        aria-hidden="true"
      />
      <span class="font-display text-lg font-bold text-ink-strong" data-test="outcome-headline">
        {{ outcome.headline }}
      </span>
    </p>

    <dl class="grid grid-cols-2 gap-3">
      <div
        v-for="counter in counters"
        :key="counter.id"
        class="flex flex-col gap-1 rounded-md border border-line-subtle px-3 py-2.5"
        :data-counter="counter.id"
        data-test="summary-counter"
      >
        <dt class="text-xs text-ink-muted">{{ counter.label }}</dt>
        <dd class="font-mono text-xl font-semibold text-ink-strong tabular-nums">
          {{ counter.value }}
        </dd>
      </div>
    </dl>

    <p v-if="finalLine" class="text-sm text-ink-muted" data-test="final-passes">{{ finalLine }}</p>
    <p v-if="review" class="text-base text-ink-body" data-test="review-sentence">{{ review }}</p>
  </div>
</template>

<script setup lang="ts">
// Result of an import: headline, the four counters, the final passes line and the
// review sentence. The detail of what to check is feature 14.
import { computed } from 'vue'
import { CircleCheck, CircleX, TriangleAlert } from '@lucide/vue'
import type { LucideIcon } from '@lucide/vue'

import { importOutcome } from '../outcome'
import type { OutcomeTone } from '../outcome'
import { finalPassesLine, reviewSentence, summaryCounters } from '../summary'
import type { ImportReport } from '../types'

const props = defineProps<{ report: ImportReport }>()

const TONE_ICONS: Record<OutcomeTone, { icon: LucideIcon; class: string }> = {
  positive: { icon: CircleCheck, class: 'text-positive' },
  warning: { icon: TriangleAlert, class: 'text-warning' },
  negative: { icon: CircleX, class: 'text-negative' },
}

const outcome = computed(() => importOutcome(props.report))
const counters = computed(() => summaryCounters(props.report))
const finalLine = computed(() => finalPassesLine(props.report))
const review = computed(() => reviewSentence(props.report))
</script>
