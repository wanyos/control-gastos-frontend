<template>
  <section
    class="rounded-lg border border-line-subtle bg-surface-card p-[18px] shadow-sm"
    data-test="gains-summary"
  >
    <span class="text-2xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
      Gain or loss on live investments
    </span>
    <div class="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono tabular-nums">
      <span
        class="text-3xl leading-none font-semibold tracking-[-0.02em]"
        :class="tone"
        data-test="gains-total"
      >
        {{ formatSignedMoney(total.gain) }}
      </span>
      <span
        class="text-lg leading-none font-semibold"
        :class="tone"
        data-test="gains-total-percent"
      >
        {{ signedPercentOrDash(total.gainPercent) }}
      </span>
    </div>
    <p class="mt-3 text-sm text-ink-muted" data-test="gains-invested">
      on {{ formatMoney(total.invested) }} put in
    </p>
    <p v-if="excluded" class="mt-1 text-sm text-ink-muted" data-test="gains-excluded">
      {{ excluded }}
    </p>
  </section>
</template>

<script setup lang="ts">
// The big figure of the Investments screen (feature 40, R2 and R3): the total of the
// live investments exactly as the backend sent it. Props only, no store.
import { computed } from 'vue'

import { formatMoney, formatSignedMoney } from '@/shared/money'

import { excludedLine, signedPercentOrDash, toneOf } from '../gains'
import type { GainsTotal } from '../types'

const props = defineProps<{
  total: GainsTotal
}>()

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const TONES = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-ink-strong',
} as const

const tone = computed(() => TONES[toneOf(props.total.gain)])
const excluded = computed(() => excludedLine(props.total.excluded))
</script>
