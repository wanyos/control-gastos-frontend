<template>
  <li class="py-3.5" :data-variant="variant" data-test="gain-row">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <span
          class="text-base font-semibold"
          :class="isClosed ? MUTED : 'text-ink-strong'"
          data-test="gain-name"
        >
          {{ product.name }}
        </span>
        <div
          class="mt-0.5 flex flex-wrap gap-x-2 text-xs"
          :class="isClosed ? MUTED : 'text-ink-body'"
        >
          <span data-test="gain-type">{{ typeLabel(product.type) }}</span>
          <span aria-hidden="true">·</span>
          <span data-test="gain-bank">{{ bankLabel(product.bank) }}</span>
        </div>
        <div
          class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
          :class="isClosed ? MUTED : 'text-ink-body'"
        >
          <span v-for="fact in facts" :key="fact" data-test="gain-fact">{{ fact }}</span>
        </div>
        <p
          v-if="dayByDay"
          class="mt-1 text-xs"
          :class="isClosed ? MUTED : 'text-ink-body'"
          data-test="gain-deposit-line"
        >
          {{ dayByDay }}
        </p>
        <p v-if="cancelled" class="mt-1 text-xs text-ink-muted" data-test="gain-cancelled">
          {{ cancelled }}
        </p>
        <p v-if="reason" class="mt-1 text-xs text-ink-muted" data-test="gain-reason">
          {{ reason }}
        </p>
      </div>
      <div class="text-right font-mono whitespace-nowrap tabular-nums">
        <div
          class="text-sm font-semibold"
          :class="figureClass(product.gain)"
          data-test="gain-amount"
        >
          {{ signedMoneyOrDash(product.gain) }}
        </div>
        <div class="mt-0.5 text-xs" :class="figureClass(product.gain)" data-test="gain-percent">
          {{ signedPercentOrDash(product.gainPercent) }}
        </div>
      </div>
    </div>
    <GainBar
      v-if="bar && !isClosed && product.gain !== null"
      class="mt-2.5"
      :side="bar.side"
      :permille="bar.permille"
    />
  </li>
</template>

<script setup lang="ts">
// One investment of the Investments screen (feature 40): live, with its bar and in
// green or red; or closed, all in grey and without a bar (R4, R6-R10).
import { computed } from 'vue'

import { bankLabel } from '@/shared/banks'

import {
  cancelledLine,
  closedFacts,
  depositLine,
  liveFacts,
  reasonLine,
  signedMoneyOrDash,
  signedPercentOrDash,
  toneOf,
  typeLabel,
} from '../gains'
import type { Bar } from '../gains'
import type { ClosedGainsProduct, DateOnly, DecimalString, GainsProduct } from '../types'
import GainBar from './GainBar.vue'

const props = defineProps<{
  product: GainsProduct | ClosedGainsProduct
  variant: 'live' | 'closed'
  /** Only on a live row. */
  bar?: Bar
  asOf: DateOnly
}>()

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const MUTED = 'text-ink-muted'
const TONES = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-ink-strong',
} as const

const isClosed = computed(() => props.variant === 'closed')
const closedProduct = computed(() =>
  'closedOn' in props.product ? (props.product as ClosedGainsProduct) : null,
)
const facts = computed(() =>
  closedProduct.value ? closedFacts(closedProduct.value) : liveFacts(props.product, props.asOf),
)
const dayByDay = computed(() => (isClosed.value ? null : depositLine(props.product)))
const cancelled = computed(() => (closedProduct.value ? cancelledLine(closedProduct.value) : null))
const reason = computed(() => reasonLine(props.product, props.variant))

/** A closed row has no colour; a gap is never painted as a figure. */
function figureClass(gain: DecimalString | null): string {
  if (isClosed.value || gain === null) return MUTED
  return TONES[toneOf(gain)]
}
</script>
