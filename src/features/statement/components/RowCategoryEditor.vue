<template>
  <div
    ref="editor"
    class="flex items-center gap-1.5"
    data-test="row-category-editor"
    @keydown.esc.stop="emit('close')"
  >
    <div class="w-40 shrink-0">
      <BaseSelect
        :model-value="movement.categoryId === null ? '' : String(movement.categoryId)"
        label="Category"
        label-hidden
        :disabled="isDisabled"
        :hint="movement.type === 'neutral' ? NEUTRAL_HINT : undefined"
        data-test="row-category-select"
        @update:model-value="onChange"
      >
        <option value="">No category</option>
        <optgroup v-for="root in allowed" :key="root.id" :label="root.name">
          <option :value="String(root.id)">{{ root.name }}</option>
          <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
            {{ child.name }}
          </option>
        </optgroup>
      </BaseSelect>
    </div>

    <BaseButton
      variant="ghost"
      size="sm"
      :disabled="cannotRule"
      :aria-label="`Create a rule from ${movement.description}`"
      data-test="row-create-rule"
      @click="emit('create-rule')"
    >
      <template #icon><WandSparkles :size="14" aria-hidden="true" /></template>
      Create rule
    </BaseButton>

    <BaseButton
      variant="ghost"
      size="sm"
      :aria-label="`Stop changing the category of ${movement.description}`"
      data-test="row-category-close"
      @click="emit('close')"
    >
      <template #icon><X :size="14" aria-hidden="true" /></template>
      Close
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
// The category of one statement line, in the place its badge was (R3). Copied from
// `review/components/MovementCategorySelect.vue` for the same reason the F19 copied
// `MovementRow` and the F20 copied `CategorySelect`: the statement imports nothing from
// another feature, and moving a component with one screen's vocabulary into the `Base*`
// drawer would tie the two screens together (design §7.2).
//
// It only offers what the contract accepts for this movement — the categories whose
// `kind` matches its `type` — so a choice the backend would answer 400 to cannot be
// made (R4). Choosing saves on its own: there is no Save button. `Create rule` writes
// nothing here (R17): it only asks for the dialog where a rule is born.
import { computed, onMounted, useTemplateRef } from 'vue'
import { WandSparkles, X } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'

import type { Category, Movement } from '../types'

const NEUTRAL_HINT = "Neutral movements can't be categorized"

const props = defineProps<{
  movement: Movement
  /** Null while unknown or after a failure: then there is nothing to choose from. */
  categories: Category[] | null
  /** A write is in flight: the editor waits for it (C2). */
  busy?: boolean
}>()

const emit = defineEmits<{ change: [number | null]; 'create-rule': []; close: [] }>()

const isDisabled = computed(
  () => props.busy === true || props.movement.type === 'neutral' || props.categories === null,
)

/** Only the trees of the kind this movement accepts; a neutral one accepts none. */
const allowed = computed<Category[]>(() =>
  (props.categories ?? []).filter((category) => category.kind === props.movement.type),
)

/**
 * A rule born from a neutral movement would never categorize anything (the pass skips
 * them), and without the tree there is nothing to point it at.
 */
const cannotRule = computed(
  () => props.busy === true || props.movement.type === 'neutral' || !props.categories,
)

// Opening with the keyboard must land on the control, not leave the focus behind (R3).
const editor = useTemplateRef<HTMLElement>('editor')

onMounted(() => {
  editor.value?.querySelector('select')?.focus()
})

function onChange(value: string): void {
  emit('change', value === '' ? null : Number(value))
}
</script>
