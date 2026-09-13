<template>
  <BaseCard v-if="issues.length > 0" title="Data warnings" data-test="data-warnings">
    <ul class="flex flex-col gap-3">
      <li
        v-for="issue in issues"
        :key="`${issue.productId}-${issue.reason}`"
        class="flex items-start gap-2.5"
        data-test="data-warning"
      >
        <BaseBadge tone="warning" dot size="sm">Warning</BaseBadge>
        <span class="text-sm text-ink-body">{{ issueMessage(issue) }}</span>
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
// Panel for investments.issues: one readable warning per entry, no panel when empty.
import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import { issueMessage } from '../issues'
import type { NetWorthIssue } from '../types'

defineProps<{
  issues: NetWorthIssue[]
}>()
</script>
