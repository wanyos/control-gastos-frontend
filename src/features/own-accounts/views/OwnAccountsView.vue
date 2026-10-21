<template>
  <div class="flex flex-col gap-5" data-test="own-accounts-view">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">
          {{ TITLE }}
        </h1>
        <p class="max-w-3xl text-sm text-ink-muted" data-test="own-accounts-intro">{{ INTRO }}</p>
      </div>
      <BaseButton
        :disabled="store.isSaving"
        data-test="own-accounts-add"
        @click="store.openCreate()"
      >
        {{ ADD_ACCOUNT }}
      </BaseButton>
    </header>

    <HolderNames
      :names="store.names"
      :state="store.namesState"
      :error-message="namesFailure"
      @edit="store.openNames()"
      @retry="store.loadNames()"
    />

    <BaseCard v-if="tableFailure" data-test="own-accounts-failed">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-ink-body" data-test="own-accounts-error">{{ tableFailure }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          data-test="own-accounts-retry"
          @click="store.load()"
        >
          {{ RETRY }}
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else-if="store.accounts !== null">
      <p
        v-if="store.accounts.length === 0"
        class="text-sm text-ink-muted"
        data-test="own-accounts-empty"
      >
        {{ NO_ACCOUNTS }}
      </p>
      <OwnAccountTable
        v-else
        :accounts="store.accounts"
        :busy="store.isSaving"
        @edit="(account) => store.openEdit(account)"
      />
    </BaseCard>

    <BaseSpinner v-else :label="TITLE" />

    <OwnAccountDialog
      :open="store.dialog !== null"
      :mode="store.dialog?.mode ?? 'create'"
      :initial="initialDraft"
      :busy="store.isSaving"
      :message="store.saveMessage"
      @save="(draft) => store.saveAccount(draft)"
      @cancel="store.closeDialog()"
    />

    <HolderNamesDialog
      :open="store.namesDialogOpen"
      :initial="store.names ?? []"
      :busy="store.isSaving"
      :message="store.namesSaveMessage"
      @save="(list) => store.saveNames(list)"
      @cancel="store.closeNames()"
    />
  </div>
</template>

<script setup lang="ts">
// My accounts (feature 36): the table of own accounts and, above it, the forms of the
// holder's name. Both are read each time the screen is entered; nothing else on other
// screens is told when something is saved here: each of them reads again when entered.
import { computed, onMounted } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import BaseSpinner from '@/shared/components/BaseSpinner.vue'

import HolderNames from '../components/HolderNames.vue'
import HolderNamesDialog from '../components/HolderNamesDialog.vue'
import OwnAccountDialog from '../components/OwnAccountDialog.vue'
import OwnAccountTable from '../components/OwnAccountTable.vue'
import { useOwnAccountsStore } from '../store'
import {
  ADD_ACCOUNT,
  INTRO,
  NO_ACCOUNTS,
  RETRY,
  TITLE,
  draftOf,
  emptyDraft,
  loadErrorMessage,
  namesLoadErrorMessage,
} from '../texts'
import type { OwnAccountDraft } from '../types'

const store = useOwnAccountsStore()

onMounted(() => {
  void store.load()
  void store.loadNames()
})

const tableFailure = computed(() =>
  store.loadState === 'failed' && store.loadError ? loadErrorMessage(store.loadError) : null,
)

const namesFailure = computed(() =>
  store.namesState === 'failed' && store.namesError
    ? namesLoadErrorMessage(store.namesError)
    : null,
)

/** Recomputed only when another window is opened, so a failed save keeps what was typed. */
const initialDraft = computed<OwnAccountDraft>(() => {
  const dialog = store.dialog
  return dialog?.mode === 'edit' ? draftOf(dialog.account) : emptyDraft()
})
</script>
