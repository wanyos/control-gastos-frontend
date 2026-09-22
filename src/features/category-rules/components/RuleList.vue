<template>
  <BaseCard>
    <div
      v-if="rules.length === 0"
      class="flex flex-col items-center gap-3 py-8 text-center"
      data-test="rules-empty"
    >
      <p class="text-sm text-ink-body">No rules yet. Create one from a movement in Review.</p>
    </div>

    <ul v-else class="flex flex-col divide-y divide-line-subtle" data-test="rule-list">
      <RuleRow
        v-for="rule in rules"
        :key="rule.id"
        :rule="rule"
        :busy="busy"
        @edit="emit('edit', rule)"
        @delete="emit('delete', rule)"
      />
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
// The rules, in the order the API sends them. There is no "new rule" button on
// purpose: a rule is always born from a movement in Review (decisions.md).
import BaseCard from '@/shared/components/BaseCard.vue'

import RuleRow from './RuleRow.vue'
import type { CategoryRule } from '../types'

defineProps<{ rules: CategoryRule[]; busy?: boolean }>()

const emit = defineEmits<{ edit: [CategoryRule]; delete: [CategoryRule] }>()
</script>
