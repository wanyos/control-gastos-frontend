<template>
  <BaseDialog :open="open" :title="title" dismissible data-test="rule-dialog" @close="onCancel">
    <div class="flex flex-col gap-4 pb-2">
      <p v-if="description" class="text-sm text-ink-muted" data-test="rule-source">
        From
        <span lang="es" class="font-medium break-words text-ink-body">{{ description }}</span>
      </p>

      <BaseInput
        v-model="text"
        label="Text to look for"
        :invalid="isTooShort"
        :hint="isTooShort ? TOO_SHORT : MATCH_HINT"
        data-test="rule-text"
      />

      <BaseSelect v-model="choice" label="Category" data-test="rule-category">
        <option value="">Choose a category…</option>
        <optgroup v-for="root in allowed" :key="root.id" :label="root.name">
          <option :value="String(root.id)">{{ root.name }}</option>
          <option v-for="child in root.children" :key="child.id" :value="String(child.id)">
            {{ child.name }}
          </option>
        </optgroup>
      </BaseSelect>

      <p v-if="message" class="text-sm text-negative" data-test="rule-error">{{ message }}</p>
    </div>

    <template #footer>
      <BaseButton variant="secondary" data-test="rule-cancel" @click="onCancel">Cancel</BaseButton>
      <BaseButton :disabled="!canSave" :loading="busy" data-test="rule-save" @click="onSave">
        {{ mode === 'create' ? 'Create rule' : 'Save' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
// The rule dialog, for creating one from a movement and for changing one from the
// rules screen: same fields, same checks. Dumb on purpose — it proposes, validates
// what the contract would reject anyway (R4) and hands the two fields up; who sends
// them is the store.
import { computed, ref, watch } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseDialog from '@/shared/components/BaseDialog.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import BaseSelect from '@/shared/components/BaseSelect.vue'
import type { Category, CategoryKind } from '@/shared/categories'

import { isMatchTextTooShort } from '../rules'
import type { NewRule } from '../types'

const MATCH_HINT = 'Matches any description that contains this text, ignoring case and accents.'
const TOO_SHORT = 'Use at least 3 letters or digits.'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    /** The movement the rule is born from; absent when changing an existing rule. */
    description?: string
    initialText: string
    initialCategoryId?: number | null
    /** Only categories of this kind are offered: the contract accepts no other (R3). */
    kind: CategoryKind
    categories?: Category[] | null
    busy?: boolean
    /** The English sentence of a failed save; the dialog stays open with it (R6). */
    message?: string | null
  }>(),
  {
    description: undefined,
    initialCategoryId: null,
    categories: null,
    busy: false,
    message: null,
  },
)

const emit = defineEmits<{ save: [NewRule]; cancel: [] }>()

const text = ref(props.initialText)
const choice = ref(props.initialCategoryId === null ? '' : String(props.initialCategoryId))

/** Opening the dialog is what refills it: a failed save keeps what was typed (R6). */
watch(
  () => [props.open, props.initialText, props.initialCategoryId] as const,
  ([open]) => {
    if (!open) return
    text.value = props.initialText
    choice.value = props.initialCategoryId === null ? '' : String(props.initialCategoryId)
  },
  { immediate: true },
)

const title = computed(() => (props.mode === 'create' ? 'Create a rule' : 'Edit rule'))

const allowed = computed<Category[]>(() =>
  (props.categories ?? []).filter((category) => category.kind === props.kind),
)

const isTooShort = computed(() => isMatchTextTooShort(text.value))

const canSave = computed(() => !isTooShort.value && choice.value !== '' && !props.busy)

function onSave(): void {
  if (!canSave.value) return
  emit('save', { matchText: text.value, categoryId: Number(choice.value) })
}

function onCancel(): void {
  emit('cancel')
}
</script>
