<template>
  <!-- Nothing to say yet (too short a text, or no dialog open): no empty block either. -->
  <div
    v-if="preview.step !== 'idle'"
    class="flex flex-col gap-2 border-t border-line-subtle pt-3"
    data-test="rule-preview"
  >
    <p
      v-if="preview.step === 'loading'"
      class="flex items-center gap-2 text-sm text-ink-muted"
      data-test="rule-preview-loading"
    >
      <BaseSpinner label="Counting the movements that match" />
      Counting…
    </p>

    <p
      v-else-if="preview.step === 'failed'"
      class="text-sm text-negative"
      data-test="rule-preview-error"
    >
      {{ preview.message }}
    </p>

    <template v-else-if="preview.step === 'ready'">
      <p class="text-sm text-ink-body" data-test="rule-preview-count">
        {{ matchCountLine(preview.total) }}
      </p>

      <p
        v-if="warning"
        class="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning"
        data-test="rule-preview-warning"
      >
        {{ warning }}
      </p>

      <ul v-if="samples.length > 0" class="flex flex-col gap-1">
        <li
          v-for="sample in samples"
          :key="sample.id"
          class="flex items-baseline gap-2 text-sm"
          data-test="rule-preview-sample"
        >
          <span class="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
            {{ formatDate(sample.bookingDate) }}
          </span>
          <span lang="es" class="min-w-0 flex-1 truncate text-ink-body">
            {{ sample.description }}
          </span>
          <span class="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
            {{ amountOf(sample) }}
          </span>
        </li>
      </ul>

      <p class="text-2xs text-ink-faint" data-test="rule-preview-note">{{ ESTIMATE }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// What a rule text would look at, inside the dialog where it is written (feature 18):
// the count, the warning when it is too broad or empty, and up to five of the
// movements. Dumb on purpose and READ ONLY: it paints what the store fetched with a
// GET and offers no control that writes anything.
import { computed } from 'vue'

import BaseSpinner from '@/shared/components/BaseSpinner.vue'
import { formatDate, formatMoney } from '@/shared/money'
import type { Movement } from '@/shared/movements'

import { PREVIEW_SAMPLE_SIZE, matchCountLine, matchWarning } from '../rules'
import type { MatchPreview } from '../types'

/**
 * The count is what a pass would look at today, not what it will change: the preview
 * asks the search of the backend and a pass runs the rules (design.md §5).
 */
const ESTIMATE = 'Estimate: what a pass would look at today, not what it will change.'

const props = defineProps<{ preview: MatchPreview }>()

const warning = computed(() =>
  props.preview.step === 'ready' ? matchWarning(props.preview.total) : null,
)

/** Never more than five, whatever the backend sent back (R4). */
const samples = computed<Movement[]>(() =>
  props.preview.step === 'ready' ? props.preview.samples.slice(0, PREVIEW_SAMPLE_SIZE) : [],
)

/** The API always sends a positive amount; the sign comes from `type`, as in the queue. */
const amountOf = (movement: Movement): string =>
  formatMoney(movement.type === 'expense' ? `-${movement.amount}` : movement.amount)
</script>
