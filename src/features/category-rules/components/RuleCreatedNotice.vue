<template>
  <p
    class="flex flex-wrap items-center gap-2 text-sm text-positive"
    data-test="rule-created-notice"
  >
    Rule
    <span lang="es" class="font-mono">“{{ rule.matchText }}”</span>
    →
    <span lang="es">{{ rule.category.name }}</span>
    created.
    <BaseButton variant="ghost" size="sm" data-test="apply-rules-now" @click="emit('apply')">
      <template #icon><WandSparkles :size="14" aria-hidden="true" /></template>
      Apply rules now
    </BaseButton>
  </p>
</template>

<script setup lang="ts">
// One line over the queue after a rule is created. Creating applies nothing
// (decisions.md 🔴 3): applying is the separate gesture this button offers, and it
// still asks for confirmation before writing anything (R10).
import { WandSparkles } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'

import type { CategoryRule } from '../types'

defineProps<{ rule: CategoryRule }>()

const emit = defineEmits<{ apply: [] }>()
</script>
