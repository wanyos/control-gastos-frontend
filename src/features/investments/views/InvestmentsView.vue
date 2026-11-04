<template>
  <div class="flex flex-col gap-6" data-test="investments-view">
    <p v-if="store.gainsLoading" class="text-sm text-ink-muted" data-test="gains-loading">
      Loading your investments…
    </p>

    <BaseCard
      v-else-if="store.gainsError"
      title="Couldn't load your investments"
      data-test="gains-error"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="gains-error-message">
          {{ store.gainsError.message }}
        </p>
        <BaseButton
          variant="secondary"
          size="sm"
          data-test="gains-retry"
          @click="store.loadGains()"
        >
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <template v-else-if="gains">
      <p v-if="isEmpty" class="text-sm text-ink-muted" data-test="gains-empty">
        You have no investments yet.
      </p>

      <template v-else>
        <GainsSummary v-if="gains.live.length > 0" :total="gains.total" />
        <p v-else class="text-sm text-ink-muted" data-test="gains-no-live">
          No live investments right now.
        </p>

        <BaseCard
          v-if="gains.live.length > 0"
          title="Your investments"
          data-test="live-investments"
        >
          <ul class="divide-y divide-line-subtle">
            <GainRow
              v-for="product in sortedLive"
              :key="product.id"
              :product="product"
              variant="live"
              :bar="barOf(product, gains.live)"
              :as-of="gains.asOf"
            />
          </ul>
        </BaseCard>

        <BaseCard v-if="gains.closed.length > 0" title="Closed" data-test="closed-investments">
          <p class="text-sm text-ink-muted" data-test="closed-sentence">
            Not part of the total: when they closed, the money went back to your account.
          </p>
          <ul class="mt-2 divide-y divide-line-subtle">
            <GainRow
              v-for="product in gains.closed"
              :key="product.id"
              :product="product"
              variant="closed"
              :as-of="gains.asOf"
            />
          </ul>
        </BaseCard>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
// The Investments screen (feature 40): what each investment gains or loses and the
// total of the live ones, from GET /api/investments/gains. Read only.
import { computed, onMounted } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import GainRow from '../components/GainRow.vue'
import GainsSummary from '../components/GainsSummary.vue'
import { barOf, sortLive } from '../gains'
import { useInvestmentsStore } from '../store'

const store = useInvestmentsStore()

const gains = computed(() => store.gains)
const isEmpty = computed(
  () => gains.value !== null && gains.value.live.length === 0 && gains.value.closed.length === 0,
)
const sortedLive = computed(() => (gains.value ? sortLive(gains.value.live) : []))

onMounted(() => {
  void store.loadGains()
})
</script>
