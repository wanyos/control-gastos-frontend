<template>
  <!-- Below the `md` breakpoint the sidebar keeps only the icons (2026-10-16): on a
       phone the full width ate most of the screen. The labels stay for assistive
       technology through the anchors' `aria-label`. -->
  <aside
    class="sticky top-0 flex h-screen w-14 shrink-0 flex-col bg-surface-inverse px-2 py-5 text-ink-on-dark md:w-[var(--sidebar-w)] md:px-4"
  >
    <div class="hidden items-center gap-3 px-2 pt-1 pb-6 md:flex">
      <span
        class="font-display text-lg font-extrabold tracking-tight text-ink-on-dark"
        data-test="wordmark"
      >
        control<span class="text-accent">·</span>accounts
      </span>
    </div>

    <nav class="flex flex-col gap-1" aria-label="Main">
      <RouterLink
        v-for="entry in navEntries"
        :key="entry.name"
        v-slot="{ href, isExactActive, navigate }"
        :to="{ name: entry.name }"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          :aria-label="entry.label"
          :title="entry.label"
          class="block rounded-md transition-colors"
          :class="isExactActive ? 'bg-accent/15' : 'hover:bg-ink-on-dark/5'"
          @click="navigate"
        >
          <!-- The colors live on this span, not on the anchor: the design
               system's base.css paints every `a` with --ink-link from outside
               Tailwind's layers, so a text utility on the anchor would lose. -->
          <span
            class="flex items-center justify-center gap-3 px-2 py-2 text-sm md:justify-start md:px-3"
            :class="isExactActive ? 'font-semibold text-accent' : 'font-medium text-ink-on-dark/70'"
          >
            <component :is="entry.icon" :size="17" aria-hidden="true" />
            <span class="hidden md:inline">{{ entry.label }}</span>
            <ReviewCountBadge
              v-if="entry.name === REVIEW_ROUTE_NAME"
              class="hidden md:inline-flex"
            />
            <DoubtfulOwnershipCountBadge
              v-if="entry.name === TRANSFERS_ROUTE_NAME"
              class="hidden md:inline-flex"
            />
          </span>
        </a>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

// shared → feature, as AppShell already does with the import button (feature 13).
import ReviewCountBadge from '@/features/review/components/ReviewCountBadge.vue'
import DoubtfulOwnershipCountBadge from '@/features/transfers/components/DoubtfulOwnershipCountBadge.vue'
import { REVIEW_ROUTE_NAME, navEntries } from '@/router'

// Here and not in `src/router/index.ts`, which the feature 36 changes (feature 35, design §8).
const TRANSFERS_ROUTE_NAME = 'transfers'
</script>

<style scoped>
/* Same reason as the colors above, and here no utility can win: base.css
   underlines `a:hover` from outside Tailwind's layers. Scoped selectors
   outrank it without touching src/assets/styles/. */
nav a:hover {
  text-decoration: none;
}
</style>
