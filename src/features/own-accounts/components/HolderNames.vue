<template>
  <BaseCard :title="NAMES_TITLE" :subtitle="NAMES_HINT" data-test="holder-names">
    <template #action>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="state !== 'loaded'"
        data-test="holder-names-edit"
        @click="emit('edit')"
      >
        {{ EDIT }}
      </BaseButton>
    </template>

    <BaseSpinner v-if="state === 'loading' || state === 'idle'" :label="NAMES_TITLE" />

    <div v-else-if="state === 'failed'" class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-ink-body" data-test="holder-names-error">{{ errorMessage }}</p>
      <BaseButton
        variant="secondary"
        size="sm"
        data-test="holder-names-retry"
        @click="emit('retry')"
      >
        {{ RETRY }}
      </BaseButton>
    </div>

    <p
      v-else-if="names === null || names.length === 0"
      class="text-sm text-ink-muted"
      data-test="holder-names-empty"
    >
      {{ NO_NAMES }}
    </p>

    <ul v-else class="flex flex-col gap-1" data-test="holder-names-list">
      <li
        v-for="(name, index) in names"
        :key="index"
        lang="es"
        class="text-sm text-ink-strong"
        data-test="holder-name"
      >
        {{ name }}
      </li>
    </ul>
  </BaseCard>
</template>

<script setup lang="ts">
// The block of the forms of the holder's name, above the table (R12). Its own failure
// stays in here: the table does not depend on it.
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import BaseSpinner from '@/shared/components/BaseSpinner.vue'

import { EDIT, NAMES_HINT, NAMES_TITLE, NO_NAMES, RETRY } from '../texts'
import type { LoadState } from '../types'

defineProps<{
  names: string[] | null
  state: LoadState
  errorMessage: string | null
}>()

const emit = defineEmits<{ edit: []; retry: [] }>()
</script>
