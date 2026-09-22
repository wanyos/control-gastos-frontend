<template>
  <li class="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-sunken" data-test="rule-row">
    <span
      lang="es"
      class="min-w-0 flex-1 truncate font-mono text-sm text-ink-strong"
      data-test="rule-text-shown"
    >
      “{{ rule.matchText }}”
    </span>

    <span aria-hidden="true" class="text-ink-faint">→</span>

    <span
      lang="es"
      class="w-44 shrink-0 truncate text-sm text-ink-body"
      data-test="rule-category-name"
    >
      {{ rule.category.name }}
    </span>

    <BaseBadge size="sm" :tone="rule.category.kind === 'income' ? 'positive' : 'neutral'">
      {{ rule.category.kind === 'income' ? 'Income' : 'Expense' }}
    </BaseBadge>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="busy"
      :aria-label="`Edit the rule ${rule.matchText}`"
      data-test="rule-edit"
      @click="emit('edit')"
    >
      <template #icon><Pencil :size="14" aria-hidden="true" /></template>
      Edit
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="busy"
      :aria-label="`Delete the rule ${rule.matchText}`"
      data-test="rule-delete"
      @click="emit('delete')"
    >
      <template #icon><Trash2 :size="14" aria-hidden="true" /></template>
      Delete
    </BaseButton>
  </li>
</template>

<script setup lang="ts">
// One rule: the text it looks for, where it sends what it finds, and the two things
// that can be done to it. Dumb: it decides nothing, it asks.
import { Pencil, Trash2 } from '@lucide/vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'

import type { CategoryRule } from '../types'

defineProps<{ rule: CategoryRule; busy?: boolean }>()

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>
