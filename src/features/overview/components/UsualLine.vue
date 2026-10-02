<template>
  <div class="flex flex-col items-start gap-1.5" data-test="overview-usual">
    <BaseBadge v-if="comparison.verdict" size="sm" data-test="overview-verdict">
      {{ verdictLabel(comparison.verdict) }}
    </BaseBadge>
    <p class="text-xs text-ink-muted tabular-nums" data-test="overview-usual-text">
      {{ usualLineText(comparison) }}
    </p>
  </div>
</template>

<script setup lang="ts">
// Whether the figure above was a usual one: a label and the distance to the median of
// the previous months (R10). Neutral on purpose: more income is neither good nor bad.
import BaseBadge from '@/shared/components/BaseBadge.vue'

import { usualLineText, verdictLabel } from '../reading'
import type { UsualComparison } from '../types'

defineProps<{ comparison: UsualComparison }>()
</script>
