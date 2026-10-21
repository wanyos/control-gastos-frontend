<template>
  <div class="flex flex-col gap-6" data-test="transfers-view">
    <h1 class="font-display text-lg font-bold tracking-[-0.01em] text-ink-strong">Transfers</h1>

    <!-- Only while there is something to say: the block has an opaque background, so
         it must not exist empty. No row to keep clear: linking and unlinking take what
         was touched out of its list (feature 27). -->
    <StickyBelowTopBar v-if="store.notice.summary || store.notice.error">
      <TransfersActionNotice
        :summary="store.notice.summary"
        :error="store.notice.error"
        :undoable="store.notice.undo !== null"
        :busy="store.busy"
        @undo="store.undo()"
      />
    </StickyBelowTopBar>

    <!-- Feature 35: the doubtful movements of own money, above everything else. A
         region and not a <section>: same meaning for a screen reader, and the order of
         the two sections of the feature 24 stays as it was. -->
    <div
      class="flex flex-col gap-3"
      role="region"
      aria-labelledby="ownership-heading"
      data-test="ownership-section"
    >
      <h2 id="ownership-heading" class="font-display text-base font-bold text-ink-strong">
        {{ OWNERSHIP_HEADING }}
      </h2>
      <p class="text-sm text-ink-muted" data-test="ownership-intro">{{ OWNERSHIP_INTRO }}</p>

      <p
        v-if="store.ownershipStatus === 'loading'"
        class="text-sm text-ink-muted"
        data-test="ownership-loading"
      >
        {{ OWNERSHIP_LOADING }}
      </p>

      <BaseCard v-else-if="store.ownershipStatus === 'error'" data-test="ownership-error">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-ink-body" data-test="ownership-error-message">
            {{ OWNERSHIP_LOAD_ERROR }}
          </p>
          <BaseButton
            variant="secondary"
            size="sm"
            data-test="ownership-retry"
            @click="store.retryOwnership()"
          >
            Try again
          </BaseButton>
        </div>
      </BaseCard>

      <p
        v-else-if="store.ownership.length === 0"
        class="text-sm text-ink-muted"
        data-test="ownership-empty"
      >
        {{ NO_DOUBTFUL_OWNERSHIP_SENTENCE }}
      </p>

      <DoubtfulOwnershipList
        v-else
        :movements="store.ownership"
        :busy="store.busy"
        @answer="(id, decision) => store.answerOwnership(id, decision)"
      />
    </div>

    <!-- Doubtful first: it is the only part that asks for action (decisions.md 🔴 4). -->
    <section class="flex flex-col gap-3" data-test="doubtful-section">
      <h2 class="font-display text-base font-bold text-ink-strong">Doubtful transfers</h2>

      <p
        v-if="store.groupsStatus === 'loading'"
        class="text-sm text-ink-muted"
        data-test="doubtful-loading"
      >
        Loading the doubtful transfers…
      </p>

      <BaseCard v-else-if="store.groupsStatus === 'error'" data-test="doubtful-error">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-ink-body" data-test="doubtful-error-message">
            {{ DOUBTFUL_LOAD_ERROR }}
          </p>
          <BaseButton
            variant="secondary"
            size="sm"
            data-test="doubtful-retry"
            @click="store.retryGroups()"
          >
            Try again
          </BaseButton>
        </div>
      </BaseCard>

      <p
        v-else-if="store.groups.length === 0"
        class="text-sm text-ink-muted"
        data-test="doubtful-empty"
      >
        {{ NO_DOUBTFUL_SENTENCE }}
      </p>

      <AmbiguousGroupList
        v-else
        :groups="store.groups"
        :choices="store.choices"
        :busy="store.busy"
        @choose="(key, side, id) => store.choose(key, side, id)"
        @link="(key) => store.link(key)"
      />
    </section>

    <section class="flex flex-col gap-3" data-test="pairs-section">
      <h2 class="font-display text-base font-bold text-ink-strong" data-test="pairs-heading">
        {{ pairsHeading }}
      </h2>

      <p
        v-if="store.pairsStatus === 'loading'"
        class="text-sm text-ink-muted"
        data-test="pairs-loading"
      >
        Loading the linked pairs…
      </p>

      <BaseCard v-else-if="store.pairsStatus === 'error'" data-test="pairs-error">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-ink-body" data-test="pairs-error-message">
            {{ PAIRS_LOAD_ERROR }}
          </p>
          <BaseButton
            variant="secondary"
            size="sm"
            data-test="pairs-retry"
            @click="store.retryPairs()"
          >
            Try again
          </BaseButton>
        </div>
      </BaseCard>

      <p
        v-else-if="store.pairs.length === 0"
        class="text-sm text-ink-muted"
        data-test="pairs-empty"
      >
        {{ NO_PAIRS_SENTENCE }}
      </p>

      <TransferPairList
        v-else
        :pairs="store.pairs"
        :busy="store.busy"
        @unlink="(pair) => store.requestUnlink(pair)"
      />
    </section>

    <UnlinkConfirmDialog
      v-if="store.pendingUnlink"
      :open="true"
      :pair="store.pendingUnlink"
      @confirm="store.confirmUnlink()"
      @cancel="store.cancelUnlink()"
    />
  </div>
</template>

<script setup lang="ts">
// The transfers screen (feature 24): the doubtful groups to pair by hand, and every
// linked pair with the way to unlink it. It is the one screen that writes `transferId`.
// Each section loads, fails and retries on its own (R14).
// Feature 35 puts on top the doubtful movements of own money, answered one by one; the
// answer is the only other thing this screen writes.
import { computed, onMounted } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCard from '@/shared/components/BaseCard.vue'
import StickyBelowTopBar from '@/shared/components/StickyBelowTopBar.vue'

import AmbiguousGroupList from '../components/AmbiguousGroupList.vue'
import DoubtfulOwnershipList from '../components/DoubtfulOwnershipList.vue'
import TransferPairList from '../components/TransferPairList.vue'
import TransfersActionNotice from '../components/TransfersActionNotice.vue'
import UnlinkConfirmDialog from '../components/UnlinkConfirmDialog.vue'
import {
  DOUBTFUL_LOAD_ERROR,
  NO_DOUBTFUL_OWNERSHIP_SENTENCE,
  NO_DOUBTFUL_SENTENCE,
  NO_PAIRS_SENTENCE,
  OWNERSHIP_HEADING,
  OWNERSHIP_INTRO,
  OWNERSHIP_LOADING,
  OWNERSHIP_LOAD_ERROR,
  PAIRS_LOAD_ERROR,
} from '../pairs'
import { useTransfersStore } from '../store'

const store = useTransfersStore()

onMounted(() => {
  void store.load()
})

/** The count is the backend's list, and only once it is known. */
const pairsHeading = computed(() =>
  store.pairsStatus === 'ready' ? `Linked pairs (${store.pairs.length})` : 'Linked pairs',
)
</script>
