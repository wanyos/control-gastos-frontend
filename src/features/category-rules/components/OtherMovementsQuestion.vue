<template>
  <section
    class="mt-2 flex flex-col gap-3 rounded-md border border-line-subtle bg-surface-card px-3 py-3"
    :aria-label="questionHeadline(question.categoryName)"
    data-test="other-movements-question"
  >
    <p class="text-sm font-semibold text-ink-strong" data-test="other-movements-headline">
      {{ questionHeadline(question.categoryName) }}
    </p>

    <div class="max-w-md">
      <BaseInput v-model="text" label="Text to look for" data-test="other-movements-text" />
    </div>

    <div class="flex flex-col gap-1 text-sm" data-test="other-movements-status">
      <template v-if="check.step === 'ready' && check.preview.movements.length > 0">
        <p class="text-ink-body" data-test="other-movements-count">
          {{ otherMovementsLine(check.preview.movements.length, question.categoryName) }}
        </p>
        <p class="text-ink-muted" data-test="other-movements-hint">{{ QUESTION_HINT }}</p>
      </template>
      <p v-else-if="check.step === 'ready'" class="text-ink-body" data-test="other-movements-none">
        {{ QUESTION_NONE }}
      </p>
      <p
        v-else-if="check.step === 'loading'"
        class="text-ink-muted"
        data-test="other-movements-checking"
      >
        {{ QUESTION_CHECKING }}
      </p>
      <p
        v-else-if="check.step === 'tooShort'"
        class="text-negative"
        data-test="other-movements-short"
      >
        {{ TOO_SHORT }}
      </p>
      <p v-else-if="check.step === 'taken'" class="text-negative" data-test="other-movements-taken">
        {{ QUESTION_TAKEN }}
      </p>
      <p v-else class="text-negative" data-test="other-movements-check-failed">
        {{ QUESTION_CHECK_FAILED }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <BaseButton
        v-if="movements.length > 0"
        variant="secondary"
        size="sm"
        :aria-expanded="showsMovements"
        data-test="other-movements-show"
        @click="showsMovements = !showsMovements"
      >
        {{ showsMovements ? HIDE_MOVEMENTS : showMovementsLabel(movements.length) }}
      </BaseButton>

      <BaseButton
        size="sm"
        :disabled="!canCreate"
        :loading="busy"
        data-test="other-movements-create"
        @click="onCreate"
      >
        Create rule
      </BaseButton>

      <BaseButton
        variant="secondary"
        size="sm"
        data-test="other-movements-dismiss"
        @click="emit('dismiss')"
      >
        No, only this one
      </BaseButton>
    </div>

    <p v-if="question.failure" class="text-sm text-negative" data-test="other-movements-error">
      {{ question.failure }}
    </p>

    <ul
      v-if="showsMovements && movements.length > 0"
      class="flex max-h-60 flex-col gap-1 overflow-y-auto"
      data-test="other-movements-list"
    >
      <li
        v-for="movement in movements"
        :key="movement.movementId"
        class="flex items-baseline gap-3 rounded-md bg-surface-sunken px-3 py-1.5 text-sm"
        data-test="other-movements-item"
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
  </section>
</template>

<script setup lang="ts">
// The question after a change of category by hand (feature 34): whether the category
// also goes to the other movements that contain a text, with how many and which ones
// the preview says would move. The text is editable; it is checked again a short wait
// after the last keystroke. Dumb: it asks, the store sends.
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { formatDate, formatMoney } from '@/shared/money'
import { SEARCH_DEBOUNCE_MS } from '@/shared/movements'

import {
  HIDE_MOVEMENTS,
  QUESTION_CHECKING,
  QUESTION_CHECK_FAILED,
  QUESTION_HINT,
  QUESTION_NONE,
  QUESTION_TAKEN,
  TOO_SHORT,
  otherMovementsLine,
  questionHeadline,
  showMovementsLabel,
} from '../rules'
import type { OtherMovementsQuestionState, PreviewMovement } from '../types'

const props = withDefaults(
  defineProps<{
    question: OtherMovementsQuestionState
    /** A create is travelling: Create rule does nothing. */
    busy?: boolean
  }>(),
  { busy: false },
)

const emit = defineEmits<{ text: [string]; create: []; dismiss: [] }>()

const check = computed(() => props.question.check)

const text = ref(props.question.check.text)
const showsMovements = ref(false)

// The same wait and the same shape of timer as the rule dialog: every keystroke
// cancels the previous one, so a burst asks once (R5).
let timer: ReturnType<typeof setTimeout> | undefined

/** A new question (another movement) starts again from its own text, folded. */
watch(
  () => props.question.movementId,
  () => {
    clearTimeout(timer)
    text.value = props.question.check.text
    showsMovements.value = false
  },
)

watch(text, (value) => {
  clearTimeout(timer)
  if (value === check.value.text) return
  timer = setTimeout(() => emit('text', value), SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(() => clearTimeout(timer))

/** The movements of the last answer, only while it is the answer for the text in view. */
const movements = computed<PreviewMovement[]>(() =>
  check.value.step === 'ready' ? check.value.preview.movements : [],
)

/** Only with an answer for exactly the text in the box: nothing half typed (R6). */
const canCreate = computed(
  () => check.value.step === 'ready' && text.value === check.value.text && !props.busy,
)

/** The API sends a positive amount; the sign comes from the type. */
const amountOf = (movement: PreviewMovement): string =>
  formatMoney(movement.type === 'expense' ? `-${movement.amount}` : movement.amount)

function onCreate(): void {
  if (!canCreate.value) return
  emit('create')
}
</script>
