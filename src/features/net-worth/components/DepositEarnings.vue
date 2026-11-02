<template>
  <section data-test="deposit-earnings">
    <p v-if="loading" class="text-sm text-ink-muted" data-test="deposits-loading">
      Loading your deposits…
    </p>

    <BaseCard v-else-if="error" title="Couldn't load your deposits" data-test="deposits-error">
      <p class="text-sm text-ink-body">{{ error.message }}</p>
    </BaseCard>

    <BaseCard v-else-if="earnings" title="Deposits">
      <p
        v-if="earnings.deposits.length === 0"
        class="text-sm text-ink-muted"
        data-test="deposits-empty"
      >
        You have no deposits yet.
      </p>

      <template v-else>
        <div>
          <span class="text-2xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
            Earned by your deposits
          </span>
          <div
            class="mt-2 font-mono text-2xl leading-none font-semibold tracking-[-0.02em] text-ink-strong tabular-nums"
            data-test="deposits-total"
          >
            {{ formatMoney(earnings.total) }}
          </div>
          <p class="mt-2 text-sm text-ink-muted" data-test="deposits-sentence">
            Only deposits that matured with their payment in your statement add up here. This figure
            is not part of your net worth: that interest already counts as income in Overview and
            Movements.
          </p>
        </div>

        <ul class="mt-4 divide-y divide-line-subtle border-t border-line-subtle">
          <DepositRow v-for="deposit in earnings.deposits" :key="deposit.id" :deposit="deposit" />
        </ul>
      </template>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
// The Deposits part of Net Worth (feature 38). Props only, no store: it shows the
// backend total as it comes and adds it to nothing.
import BaseCard from '@/shared/components/BaseCard.vue'
import type { AppError } from '@/shared/errors'
import { formatMoney } from '@/shared/money'

import type { DepositEarnings } from '../types'
import DepositRow from './DepositRow.vue'

defineProps<{
  earnings: DepositEarnings | null
  loading: boolean
  error: AppError | null
}>()
</script>
