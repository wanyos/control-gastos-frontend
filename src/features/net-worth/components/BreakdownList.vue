<template>
  <div>
    <ul class="flex flex-col gap-4">
      <li v-for="group in groups" :key="group.id" :data-test="rowTest">
        <div class="mb-2 flex items-center gap-2.5">
          <span
            class="inline-flex size-[26px] flex-none items-center justify-center rounded-sm bg-surface-sunken"
            aria-hidden="true"
          >
            <span class="size-[9px] rounded-full" :class="fillOf(group.id)" />
          </span>
          <span
            class="min-w-0 flex-1 truncate text-sm font-semibold text-ink-strong"
            data-test="group-label"
          >
            {{ group.label }}
          </span>
          <BaseBadge
            v-if="group.id === idleGroupId"
            tone="neutral"
            size="sm"
            data-test="idle-money"
          >
            Idle money
          </BaseBadge>
          <span
            class="font-mono text-sm font-semibold whitespace-nowrap tabular-nums"
            :class="toCents(group.amount) < 0n ? 'text-negative' : 'text-ink-strong'"
            data-test="money"
          >
            {{ formatMoney(group.amount) }}
          </span>
          <span
            v-if="group.sharePermille !== null"
            class="w-14 text-right font-mono text-xs whitespace-nowrap text-ink-muted tabular-nums"
            data-test="share"
          >
            {{ formatPercent(group.sharePermille) }}
          </span>
        </div>
        <ShareBar
          v-if="group.sharePermille !== null"
          :permille="group.sharePermille"
          :fill-class="fillOf(group.id)"
        />
      </li>
    </ul>
    <p
      v-if="mismatchSum !== null"
      class="mt-4 flex items-start gap-2 text-sm text-negative"
      data-test="breakdown-mismatch"
    >
      <BaseBadge tone="negative" size="sm">Mismatch</BaseBadge>
      <span>
        Breakdown doesn't add up: groups total {{ formatMoney(mismatchSum) }}, net worth is
        {{ formatMoney(total) }}.
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
// Rows of "label + amount + % + bar" (layout of design-system CategoryBar,
// without budget). Serves both breakdowns of block B.
import BaseBadge from '@/shared/components/BaseBadge.vue'
import ShareBar from '@/shared/components/ShareBar.vue'
import { formatMoney, formatPercent, toCents } from '@/shared/money'

import type { BreakdownGroup } from '../breakdown'
import type { DecimalString } from '../types'

const props = defineProps<{
  groups: BreakdownGroup[]
  /** Fill utility per group id (full literal class names). */
  fills: Record<string, string>
  total: DecimalString
  /** Sum of the groups when it differs from `total`, otherwise `null`. */
  mismatchSum: DecimalString | null
  rowTest: string
  idleGroupId?: string
}>()

const fillOf = (id: string) => props.fills[id] ?? 'bg-surface-sunken'
</script>
