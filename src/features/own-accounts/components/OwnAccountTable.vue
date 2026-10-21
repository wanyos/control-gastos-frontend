<template>
  <div class="overflow-x-auto" data-test="own-account-table">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="text-xs font-semibold text-ink-muted">
          <th
            v-for="column in COLUMNS"
            :key="column"
            scope="col"
            class="pr-4 pb-2 text-left font-semibold whitespace-nowrap"
          >
            {{ column }}
          </th>
          <!-- The Edit buttons: no title. -->
          <th scope="col" class="pb-2" />
        </tr>
      </thead>
      <tbody class="divide-y divide-line-subtle">
        <tr
          v-for="account in accounts"
          :key="account.id"
          class="align-top"
          data-test="own-account-row"
          :data-own-account-id="account.id"
        >
          <td class="py-2.5 pr-4 font-medium text-ink-strong" lang="es" data-test="cell-name">
            {{ account.name }}
          </td>
          <td class="py-2.5 pr-4 whitespace-nowrap text-ink-body" data-test="cell-bank">
            {{ account.bank }}
          </td>
          <td
            class="py-2.5 pr-4 font-mono whitespace-nowrap text-ink-body tabular-nums"
            data-test="cell-number"
          >
            {{ account.accountNumber ?? EMPTY_CELL }}
          </td>
          <td class="py-2.5 pr-4 whitespace-nowrap text-ink-body" data-test="cell-type">
            {{ TYPE_LABELS[account.type] }}
          </td>
          <td class="py-2.5 pr-4 whitespace-nowrap text-ink-body" data-test="cell-opened">
            {{ dateOf(account.openedAt) }}
          </td>
          <td class="py-2.5 pr-4 whitespace-nowrap text-ink-body" data-test="cell-closed">
            {{ dateOf(account.closedAt) }}
          </td>
          <td class="py-2.5 pr-4" data-test="cell-texts">
            <ul v-if="account.texts.length > 0" class="flex flex-col gap-0.5">
              <li
                v-for="(text, index) in account.texts"
                :key="index"
                lang="es"
                class="text-ink-body"
                data-test="own-account-text"
              >
                {{ text }}
              </li>
            </ul>
            <span v-else class="text-ink-muted" data-test="own-account-no-texts">{{
              NO_TEXTS
            }}</span>
          </td>
          <td class="py-2 text-right">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="busy"
              data-test="own-account-edit"
              @click="emit('edit', account)"
            >
              {{ EDIT }}
            </BaseButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// The table of own accounts: one row per account, in the order they came (R2, R3).
// A closed account looks like an open one, with its date. There is no way to delete a
// row from here (R15).
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatDate } from '@/shared/money'

import { COLUMNS, EDIT, EMPTY_CELL, NO_TEXTS, TYPE_LABELS } from '../texts'
import type { DateOnly, OwnAccount } from '../types'

defineProps<{
  accounts: OwnAccount[]
  busy: boolean
}>()

const emit = defineEmits<{ edit: [OwnAccount] }>()

const dateOf = (date: DateOnly | null): string => (date === null ? EMPTY_CELL : formatDate(date))
</script>
