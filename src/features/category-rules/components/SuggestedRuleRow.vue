<template>
  <li class="flex flex-col gap-3 px-3 py-3" data-test="suggested-rule">
    <div class="flex flex-wrap items-center gap-3">
      <span
        lang="es"
        class="min-w-0 flex-1 truncate font-mono text-sm text-ink-strong"
        data-test="suggested-rule-text"
      >
        “{{ suggestion.matchText }}”
      </span>

      <BaseBadge
        size="sm"
        :tone="suggestion.kind === 'income' ? 'positive' : 'neutral'"
        data-test="suggested-rule-kind"
      >
        {{ KIND_LABEL[suggestion.kind] }}
      </BaseBadge>

      <span
        class="shrink-0 font-mono text-sm tabular-nums text-ink-body"
        data-test="suggested-rule-count"
      >
        {{ suggestedCountLine(suggestion.movementCount) }}
      </span>
    </div>

    <p
      v-if="suggestion.manualMatches > 0"
      class="text-sm text-ink-muted"
      data-test="suggested-rule-manual"
    >
      {{ manualMatchesLine(suggestion.manualMatches) }}
    </p>

    <div class="flex flex-wrap items-end gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        :aria-expanded="showsMovements"
        data-test="suggested-rule-show-movements"
        @click="showsMovements = !showsMovements"
      >
        {{ showsMovements ? HIDE_MOVEMENTS : showMovementsLabel(suggestion.movementCount) }}
      </BaseButton>

      <div class="w-56">
        <BaseSelect
          v-model="choice"
          :label="`Category for ${suggestion.matchText}`"
          label-hidden
          data-test="suggested-rule-category"
        >
          <option value="">Choose a category…</option>
          <template v-for="root in allowed" :key="root.id">
            <optgroup v-if="root.children.length > 0" :label="root.name">
              <option :value="String(root.id)">{{ root.name }}</option>
              <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
                {{ child.name }}
              </option>
            </optgroup>
            <option v-else :value="String(root.id)">{{ root.name }}</option>
          </template>
        </BaseSelect>
      </div>

      <BaseButton
        size="sm"
        :disabled="!canCreate"
        data-test="suggested-rule-create"
        @click="onCreate"
      >
        Create rule
      </BaseButton>
    </div>

    <p v-if="failure" class="text-sm text-negative" data-test="suggested-rule-error">
      {{ failure }}
    </p>

    <ul v-if="showsMovements" class="flex flex-col gap-1" data-test="suggested-rule-movements">
      <li
        v-for="movement in suggestion.movements"
        :key="movement.movementId"
        class="flex items-baseline gap-3 rounded-md bg-surface-sunken px-3 py-1.5 text-sm"
        data-test="suggested-rule-movement"
      >
        <span class="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
          {{ formatDate(movement.bookingDate) }}
        </span>
        <span lang="es" class="min-w-0 flex-1 break-words text-ink-body">
          {{ movement.description }}
        </span>
        <span class="shrink-0 font-mono tabular-nums text-ink-strong">
          {{ amountOf(movement) }}
        </span>
      </li>
    </ul>
  </li>
</template>

<script setup lang="ts">
// One suggested rule: its text, whether it is about expenses or income, how many
// movements it would take and those movements, folded (feature 33). The category is
// chosen here and starts empty: nothing is proposed and nothing is created until it is
// chosen (R3). The text cannot be changed: it is the one whose number is the one that
// moves (R4). There is no way to dismiss a suggestion (R8). Dumb: it asks, the store
// sends.
import { computed, ref } from 'vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'
import type { Category } from '@/shared/categories'
import { formatDate, formatMoney } from '@/shared/money'

import {
  HIDE_MOVEMENTS,
  KIND_LABEL,
  manualMatchesLine,
  showMovementsLabel,
  suggestedCountLine,
} from '../rules'
import type { SuggestedMovement, SuggestedRule } from '../types'

const props = withDefaults(
  defineProps<{
    suggestion: SuggestedRule
    categories?: Category[] | null
    /** A create is travelling: no Create rule of the screen does anything (R4). */
    busy?: boolean
    /** The English sentence of the failed create of this suggestion (R10). */
    failure?: string | null
  }>(),
  { categories: null, busy: false, failure: null },
)

const emit = defineEmits<{ create: [number] }>()

const showsMovements = ref(false)
const choice = ref('')

/** Only categories of the kind of the suggestion: the contract accepts no other (R3). */
const allowed = computed<Category[]>(() =>
  (props.categories ?? []).filter((category) => category.kind === props.suggestion.kind),
)

const canCreate = computed(() => choice.value !== '' && !props.busy)

/** The API sends a positive amount; the sign comes from the kind of the suggestion. */
const amountOf = (movement: SuggestedMovement): string =>
  formatMoney(props.suggestion.kind === 'expense' ? `-${movement.amount}` : movement.amount)

function onCreate(): void {
  if (!canCreate.value) return
  emit('create', Number(choice.value))
}
</script>
