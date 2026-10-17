<template>
  <li class="flex flex-col gap-2 py-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span class="min-w-0 flex-1 text-sm font-semibold text-ink-strong" data-test="group-title">
        {{ title }}
      </span>
      <span
        class="font-mono text-sm font-semibold text-ink-strong tabular-nums"
        data-test="group-monthly-cost"
      >
        {{ formatMoney(monthlyCost) }}
      </span>
      <BaseButton
        variant="secondary"
        size="sm"
        :aria-expanded="open ? 'true' : 'false'"
        data-test="group-toggle"
        @click="open = !open"
      >
        {{ open ? HIDE_CHARGES : SHOW_CHARGES }}
      </BaseButton>
    </div>

    <ChargeList
      v-if="open"
      :heading="chargesHeading('period', charges.length)"
      :charges="charges"
    />
  </li>
</template>

<script setup lang="ts">
// One row with a name, what it costs a month and its charges of the period below it:
// the group of transfers to people and each entry of the variable spending (R11–R13).
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatMoney } from '@/shared/money'

import { HIDE_CHARGES, SHOW_CHARGES, chargesHeading } from '../texts'
import type { Charge, DecimalString } from '../types'
import ChargeList from './ChargeList.vue'

defineProps<{
  title: string
  monthlyCost: DecimalString
  charges: Charge[]
}>()
const open = defineModel<boolean>('open', { default: false })
</script>
