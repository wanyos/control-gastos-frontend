<template>
  <div class="flex flex-col gap-4 pb-2" data-test="apply-result">
    <ul class="flex flex-col gap-1">
      <li
        v-for="line in lines"
        :key="line"
        class="font-mono text-sm tabular-nums text-ink-strong"
        data-test="apply-figure"
      >
        {{ line }}
      </li>
    </ul>

    <RuleConflictList
      v-if="result.conflicts.length > 0"
      :conflicts="result.conflicts"
      :conflict-count="result.conflictCount"
    />
  </div>
</template>

<script setup lang="ts">
// What a finished pass did: how many were categorized, how many no rule matched and
// how many clashed (R12). The backend does not say WHICH movements it categorized,
// so nothing here pretends to list them.
import { computed } from 'vue'

import { applySummaryLines } from '../rules'
import RuleConflictList from './RuleConflictList.vue'
import type { ApplyResult } from '../types'

const props = defineProps<{ result: ApplyResult }>()

const lines = computed(() => applySummaryLines(props.result))
</script>
