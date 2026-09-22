<template>
  <div class="flex flex-col gap-5">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-2">
        <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Rules</h1>
        <p class="text-sm text-ink-muted">
          Rules categorize pending movements without a category when you import, or when you apply
          them here.
        </p>
      </div>

      <BaseButton :disabled="!canApply" data-test="apply-rules" @click="store.openApply()">
        <template #icon><WandSparkles :size="15" aria-hidden="true" /></template>
        Apply rules
      </BaseButton>
    </header>

    <p v-if="store.deleteMessage" class="text-sm text-negative" data-test="rules-delete-message">
      {{ store.deleteMessage }}
    </p>

    <p v-if="store.isLoading" class="text-sm text-ink-muted" data-test="rules-loading">
      Loading your rules…
    </p>

    <BaseCard v-else-if="store.loadError" data-test="rules-error">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="rules-error-message">{{ failure }}</p>
        <BaseButton variant="secondary" size="sm" data-test="rules-retry" @click="store.load()">
          Try again
        </BaseButton>
      </div>
    </BaseCard>

    <RuleList
      v-else-if="store.rules"
      :rules="store.rules"
      :busy="store.isSaving"
      @edit="onEdit"
      @delete="(rule) => (deleting = rule)"
    />

    <RuleDialog
      v-if="editing"
      :open="true"
      mode="edit"
      :initial-text="editing.matchText"
      :initial-category-id="editing.categoryId"
      :kind="editing.category.kind"
      :categories="store.categories"
      :busy="store.isSaving"
      :message="store.saveMessage"
      @save="onSave"
      @cancel="closeEdit"
    />

    <DeleteRuleDialog
      v-if="deleting"
      :open="true"
      :match-text="deleting.matchText"
      :busy="store.isSaving"
      @confirm="onDelete"
      @cancel="deleting = null"
    />

    <ApplyRulesDialog
      :flow="store.applyFlow"
      @confirm="store.confirmApply()"
      @close="store.closeApply()"
    />
  </div>
</template>

<script setup lang="ts">
// The rules screen: see them, change them, delete them, and apply them on demand.
// It never writes anything about a movement — changing or deleting a rule leaves
// what it already categorized alone (R8, R9) — and applying always asks first (R10).
import { computed, onMounted, ref } from 'vue'
import { WandSparkles } from '@lucide/vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'

import ApplyRulesDialog from '../components/ApplyRulesDialog.vue'
import DeleteRuleDialog from '../components/DeleteRuleDialog.vue'
import RuleDialog from '../components/RuleDialog.vue'
import RuleList from '../components/RuleList.vue'
import { loadErrorMessage } from '../rules'
import { useCategoryRulesStore } from '../store'
import type { CategoryRule, NewRule } from '../types'

const store = useCategoryRulesStore()

const editing = ref<CategoryRule | null>(null)
const deleting = ref<CategoryRule | null>(null)

onMounted(() => {
  void store.load()
  void store.loadCategories()
})

/** The English sentence of a failed load; the backend's own message is never painted. */
const failure = computed(() => (store.loadError ? loadErrorMessage(store.loadError) : ''))

/** Applying with no rules would be a mass write that can do nothing (R10). */
const canApply = computed(() => (store.rules?.length ?? 0) > 0 && !store.isLoading)

function onEdit(rule: CategoryRule): void {
  store.saveMessage = null
  editing.value = rule
}

function closeEdit(): void {
  store.saveMessage = null
  editing.value = null
}

async function onSave(next: NewRule): Promise<void> {
  const rule = editing.value
  if (!rule) return
  if (await store.update(rule.id, next)) editing.value = null
}

async function onDelete(): Promise<void> {
  const rule = deleting.value
  if (!rule) return
  deleting.value = null
  await store.remove(rule.id)
}
</script>
