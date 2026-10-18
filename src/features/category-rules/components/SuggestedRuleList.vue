<template>
  <section class="flex flex-col gap-3" data-test="suggested-rules">
    <div class="flex flex-col gap-1">
      <h2 class="font-display text-base font-bold text-ink-strong">{{ SUGGESTIONS_TITLE }}</h2>
      <p class="text-sm text-ink-muted">{{ SUGGESTIONS_INTRO }}</p>
    </div>

    <p
      v-if="suggestions === null && loading"
      class="text-sm text-ink-muted"
      data-test="suggested-rules-loading"
    >
      {{ SUGGESTIONS_LOADING }}
    </p>

    <BaseCard v-else-if="suggestions === null && errorMessage" data-test="suggested-rules-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="suggested-rules-error-message">
          {{ errorMessage }}
        </p>
        <BaseButton
          variant="secondary"
          size="sm"
          data-test="suggested-rules-retry"
          @click="emit('retry')"
        >
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else-if="suggestions !== null">
      <p
        v-if="suggestions.length === 0"
        class="py-4 text-center text-sm text-ink-body"
        data-test="suggested-rules-empty"
      >
        {{ NO_SUGGESTIONS }}
      </p>
      <ul v-else class="flex flex-col divide-y divide-line-subtle" data-test="suggested-rule-list">
        <SuggestedRuleRow
          v-for="suggestion in suggestions"
          :key="suggestion.matchText"
          :suggestion="suggestion"
          :categories="categories"
          :busy="busy"
          :failure="failure?.matchText === suggestion.matchText ? failure.message : null"
          @create="(categoryId) => emit('create', suggestion, categoryId)"
        />
      </ul>
    </BaseCard>
  </section>
</template>

<script setup lang="ts">
// The suggested rules inside Rules, in the order the API sends them (feature 33): the
// title, what they are, and one row per suggestion, or the state of the request that
// asks for them (R12). Dumb: who creates the rule is the store.
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import type { Category } from '@/shared/categories'

import SuggestedRuleRow from './SuggestedRuleRow.vue'
import { NO_SUGGESTIONS, SUGGESTIONS_INTRO, SUGGESTIONS_LOADING, SUGGESTIONS_TITLE } from '../rules'
import type { SuggestedRule } from '../types'

withDefaults(
  defineProps<{
    /** Null while never loaded, or after a failed load. */
    suggestions: SuggestedRule[] | null
    loading?: boolean
    /** The English sentence of a failed load, or null. */
    errorMessage?: string | null
    categories?: Category[] | null
    busy?: boolean
    /** The failed create of one suggestion: painted in its row only (R10). */
    failure?: { matchText: string; message: string } | null
  }>(),
  { loading: false, errorMessage: null, categories: null, busy: false, failure: null },
)

const emit = defineEmits<{ create: [SuggestedRule, number]; retry: [] }>()
</script>
