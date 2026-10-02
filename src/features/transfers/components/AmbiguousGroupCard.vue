<template>
  <li
    class="flex flex-col gap-4 rounded-lg border border-line-subtle bg-surface-card p-4 shadow-sm"
    data-test="doubtful-group"
  >
    <span
      class="font-mono text-base font-semibold text-ink-strong tabular-nums"
      data-test="doubtful-amount"
    >
      {{ formatMoney(group.amount) }}
    </span>

    <div class="grid gap-4 sm:grid-cols-2">
      <fieldset
        v-for="column in columns"
        :key="column.side"
        class="flex min-w-0 flex-col gap-2"
        :data-test="`doubtful-column-${column.side}`"
      >
        <legend class="pb-2 text-xs font-semibold text-ink-muted">{{ column.title }}</legend>
        <label
          v-for="movement in column.movements"
          :key="movement.id"
          class="flex items-start gap-2 text-sm text-ink-body"
          :class="busy ? 'cursor-not-allowed' : 'cursor-pointer'"
          data-test="doubtful-movement"
        >
          <input
            type="radio"
            class="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :name="`${column.side}-${group.key}`"
            :value="movement.id"
            :checked="column.chosen === movement.id"
            :disabled="busy"
            :data-test="`doubtful-pick-${column.side}`"
            @change="emit('choose', column.side, movement.id)"
          />
          <span class="min-w-0">
            <span class="block text-xs text-ink-muted">
              <span data-test="doubtful-date">{{ formatDate(movement.bookingDate) }}</span>
              <span aria-hidden="true"> · </span>
              <span data-test="doubtful-account">{{ movement.accountAlias }}</span>
            </span>
            <span lang="es" class="block break-words" data-test="doubtful-description">
              {{ movement.description }}
            </span>
          </span>
        </label>
      </fieldset>
    </div>

    <p v-if="problem === 'same-account'" class="text-sm text-warning" data-test="doubtful-same">
      {{ SAME_ACCOUNT_SENTENCE }}
    </p>

    <!-- A group with one empty column has nothing to link: no button (design §7). -->
    <div v-if="linkable" class="flex justify-end">
      <BaseButton
        size="sm"
        :disabled="busy || problem !== null"
        data-test="doubtful-link"
        @click="emit('link')"
      >
        Link these two
      </BaseButton>
    </div>
  </li>
</template>

<script setup lang="ts">
// One doubtful group: its amount and its movements in two columns, one pick per
// column and nothing picked beforehand (C7). A column per type makes it impossible to
// pick two of the same type; the account is the one check left to do here (R11).
import { computed } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import { formatDate, formatMoney } from '@/shared/money'

import { SAME_ACCOUNT_SENTENCE, linkProblem } from '../pairs'
import type { AmbiguousGroup, LinkChoice } from '../types'

const props = defineProps<{
  group: AmbiguousGroup
  choice?: LinkChoice
  busy?: boolean
}>()

const emit = defineEmits<{ choose: [side: 'out' | 'in', id: number]; link: [] }>()

const columns = computed(() => [
  {
    side: 'out' as const,
    title: 'Money out',
    movements: props.group.out,
    chosen: props.choice?.outId ?? null,
  },
  {
    side: 'in' as const,
    title: 'Money in',
    movements: props.group.in,
    chosen: props.choice?.inId ?? null,
  },
])

const linkable = computed(() => props.group.out.length > 0 && props.group.in.length > 0)

const problem = computed(() => linkProblem(props.group, props.choice))
</script>
