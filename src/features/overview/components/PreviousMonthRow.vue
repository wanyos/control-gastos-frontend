<template>
  <tr
    class="border-t border-line-subtle"
    :aria-current="row.isShown ? 'true' : undefined"
    :data-month="row.month"
    data-test="previous-months-row"
  >
    <!-- The left edge marks the month shown above; the row's background never changes. -->
    <th
      scope="row"
      class="border-l-2 py-2.5 pr-4 pl-3 text-left text-sm font-normal whitespace-nowrap"
      :class="row.isShown ? 'border-line-brand' : 'border-transparent'"
    >
      <span class="flex flex-wrap items-center gap-2">
        <!--
          Its own <a>: the 24 links only differ in the query, so RouterLink would mark
          every one of them as the current page. No colour utility: base.css paints it.
        -->
        <RouterLink
          v-slot="{ href, navigate }"
          custom
          :to="{ query: monthToRouteQuery(row.month) }"
        >
          <a :href="href" data-test="previous-months-link" @click="onPress($event, navigate)">
            {{ row.label }}
          </a>
        </RouterLink>
        <BaseBadge v-if="row.isShown" tone="brand" size="sm" data-test="previous-months-shown">
          {{ SHOWN_ABOVE }}
        </BaseBadge>
        <BaseBadge
          v-if="row.state === 'incomplete'"
          tone="warning"
          size="sm"
          data-test="previous-months-incomplete"
        >
          {{ INCOMPLETE }}
        </BaseBadge>
      </span>
    </th>

    <td
      v-if="row.totals === null"
      colspan="4"
      class="py-2.5 pr-3 text-sm text-ink-muted"
      data-test="previous-months-empty"
    >
      {{ NO_MOVEMENTS }}
    </td>

    <template v-else>
      <td class="w-full min-w-32 py-2.5 pr-4 align-middle">
        <div
          v-if="row.incomePermille !== null && row.expensePermille !== null"
          class="flex flex-col gap-1"
        >
          <ShareBar
            :permille="row.incomePermille"
            fill-class="bg-chart-8"
            data-test="previous-months-bar-in"
          />
          <ShareBar
            :permille="row.expensePermille"
            fill-class="bg-chart-5"
            data-test="previous-months-bar-out"
          />
        </div>
        <p
          v-else-if="row.state === 'incomplete' && dataEnds"
          class="text-xs text-ink-muted tabular-nums"
          data-test="previous-months-data-ends"
        >
          {{ dataEnds }}
        </p>
      </td>
      <td :class="AMOUNT_CELL" class="text-ink-strong" data-test="previous-months-in">
        {{ formatMoney(row.totals.income) }}
      </td>
      <td :class="AMOUNT_CELL" class="text-ink-strong" data-test="previous-months-out">
        {{ formatMoney(row.totals.expense) }}
      </td>
      <td
        :class="[AMOUNT_CELL, NET_INK[row.netSign ?? 'zero']]"
        :data-net="row.netSign ?? undefined"
        data-test="previous-months-net"
      >
        {{ formatMoney(row.totals.net) }}
      </td>
    </template>
  </tr>
</template>

<script setup lang="ts">
// One of the 24 months below the month. The three amounts are the backend's strings,
// formatted and never recomputed (R2); only a complete month has bars and a sign (R3,
// R4, R9); an empty month has neither bars nor amounts (R10). It only reads.
import { RouterLink } from 'vue-router'

import { monthToRouteQuery } from '@/features/statement/months'
import BaseBadge from '@/shared/components/BaseBadge.vue'
import ShareBar from '@/shared/components/ShareBar.vue'
import { formatMoney } from '@/shared/money'

import { INCOMPLETE, NO_MOVEMENTS, SHOWN_ABOVE } from '../previousMonths'
import type { MonthKey, MonthRow, NetSign } from '../types'

const props = defineProps<{
  row: MonthRow
  /** `Data ends on …`, shown where the bars of an incomplete month would be. */
  dataEnds: string | null
}>()

const emit = defineEmits<{
  /** The name of a month was pressed; the link itself changes the URL. */
  select: [month: MonthKey]
}>()

/** Tells the screen only when the press did change the month, not when it opened a tab. */
function onPress(event: MouseEvent, navigate: (event?: MouseEvent) => unknown): void {
  void navigate(event)
  if (event.defaultPrevented) emit('select', props.row.month)
}

// Full literal class names: Tailwind scans source as text (docs/stack.md).
const AMOUNT_CELL = 'py-2.5 pl-4 text-right font-mono text-sm whitespace-nowrap tabular-nums'

const NET_INK: Record<NetSign, string> = {
  negative: 'text-negative',
  positive: 'text-positive',
  zero: 'text-ink-strong',
}
</script>
