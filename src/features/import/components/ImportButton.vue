<template>
  <div class="flex items-center gap-3">
    <BaseBadge v-if="pendingTotal > 0" tone="info" data-test="pending-badge">
      {{ pendingCountLabel(pendingTotal) }}
    </BaseBadge>
    <BaseButton :loading="store.isImporting" data-test="import-button" @click="store.open()">
      <template #icon>
        <FileUp :size="16" aria-hidden="true" />
      </template>
      {{ store.isImporting ? 'Importing…' : 'Import' }}
    </BaseButton>
    <ImportDialog />
  </div>
</template>

<script setup lang="ts">
// Topbar entry point of the import: the pending files badge and the Import button.
// Pending files are asked for once on mount; there is no polling.
import { computed, onMounted } from 'vue'
import { FileUp } from '@lucide/vue'

import BaseBadge from '@/shared/components/BaseBadge.vue'
import BaseButton from '@/shared/components/BaseButton.vue'

import { useImportStore } from '../store'
import { pendingCountLabel } from '../summary'
import ImportDialog from './ImportDialog.vue'

const store = useImportStore()

const pendingTotal = computed(() => store.pending?.totalPending ?? 0)

onMounted(() => {
  void store.refreshPending()
})
</script>
