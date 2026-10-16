<template>
  <BaseDialog
    :open="open"
    title="Close everything still pending?"
    dismissible
    data-test="confirm-all"
    @close="emit('cancel')"
  >
    <div class="flex flex-col gap-4 pb-2">
      <p class="text-sm text-ink-body" data-test="confirm-all-body">
        Every pending movement becomes confirmed, and every movement without a category receives the
        one you choose here for its kind. Transfer legs and investment movements keep no category.
        Amounts and totals do not change.
      </p>

      <BaseSelect
        :model-value="expense"
        label="Category for expenses without one"
        data-test="confirm-all-expense"
        @update:model-value="(value) => (expense = value)"
      >
        <option value="">Choose a category…</option>
        <option
          v-for="category in expenseCategories"
          :key="category.id"
          :value="String(category.id)"
        >
          {{ category.name }}
        </option>
      </BaseSelect>

      <BaseSelect
        :model-value="income"
        label="Category for income without one"
        data-test="confirm-all-income"
        @update:model-value="(value) => (income = value)"
      >
        <option value="">Choose a category…</option>
        <option
          v-for="category in incomeCategories"
          :key="category.id"
          :value="String(category.id)"
        >
          {{ category.name }}
        </option>
      </BaseSelect>

      <p class="text-sm font-medium text-ink-strong" data-test="confirm-all-warning">
        This cannot be undone. The category of any movement can still be changed later from
        Movements.
      </p>
    </div>

    <template #footer>
      <BaseButton
        variant="secondary"
        data-autofocus
        data-test="confirm-all-cancel"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        :disabled="!ready || busy"
        :loading="busy"
        data-test="confirm-all-continue"
        @click="onConfirm"
      >
        Yes, close everything
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The question before `POST /api/movements/confirm-all` (2026-10-16). It asks for the
// two categories the contract requires, proposes the generic ones when they exist
// ("Otros gastos", "Otros ingresos"), and Cancel takes the focus: the safe answer is
// the one under the finger. Roots and children are offered flat: this is a one-off.
import { computed, ref, watch } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'
import type { ConfirmAllInput } from '@/shared/movements'

import { GENERIC_EXPENSE_NAME, GENERIC_INCOME_NAME } from '../actions'
import type { Category, CategoryKind } from '../types'

const props = defineProps<{
  open: boolean
  /** Null while unknown or after a failure: then nothing can be chosen. */
  categories: Category[] | null
  busy: boolean
}>()

const emit = defineEmits<{ confirm: [ConfirmAllInput]; cancel: [] }>()

/** Every category of one kind, roots and children, in tree order. */
function ofKind(kind: CategoryKind): Category[] {
  const out: Category[] = []
  for (const root of props.categories ?? []) {
    if (root.kind === kind) out.push(root)
    for (const child of root.children) if (child.kind === kind) out.push(child)
  }
  return out
}

const expenseCategories = computed(() => ofKind('expense'))
const incomeCategories = computed(() => ofKind('income'))

const proposed = (list: Category[], name: string): string => {
  const found = list.find((category) => category.name === name)
  return found === undefined ? '' : String(found.id)
}

const expense = ref('')
const income = ref('')

// Proposed each time the dialog opens, so a changed tree is read again.
watch(
  () => [props.open, props.categories] as const,
  ([open]) => {
    if (!open) return
    expense.value = proposed(expenseCategories.value, GENERIC_EXPENSE_NAME)
    income.value = proposed(incomeCategories.value, GENERIC_INCOME_NAME)
  },
  { immediate: true },
)

const ready = computed(() => expense.value !== '' && income.value !== '')

function onConfirm(): void {
  if (!ready.value) return
  emit('confirm', {
    expenseCategoryId: Number(expense.value),
    incomeCategoryId: Number(income.value),
  })
}
</script>
