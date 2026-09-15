<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-surface-overlay p-5"
      data-test="dialog-scrim"
      @click.self="dismiss"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="w-[440px] max-w-full rounded-xl border border-line-subtle bg-surface-card p-6 shadow-xl outline-none"
        data-test="dialog-panel"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 :id="titleId" class="font-display text-xl font-bold text-ink-strong">
            {{ title }}
          </h2>
          <button
            v-if="dismissible"
            type="button"
            aria-label="Close"
            class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            data-test="dialog-close"
            @click="dismiss"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2.5">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Hand-made modal, from AddModal in design-system/ui_kits/web/App.jsx. Not the
// native <dialog>: jsdom has no showModal(), and the lock while importing has to be
// built anyway (specs/13-import-dialog/design.md §8). The panel border is what
// separates it from the scrim (the card fill alone is 1.04:1).
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(defineProps<{ open: boolean; title: string; dismissible?: boolean }>(), {
  dismissible: true,
})

const emit = defineEmits<{ close: [] }>()

const FOCUSABLE = 'button:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])'

const titleId = `dialog-title-${useId()}`
const panel = ref<HTMLElement | null>(null)
let returnFocusTo: HTMLElement | null = null

function dismiss(): void {
  if (props.dismissible) emit('close')
}

/** Focuses the enabled `[data-autofocus]` element of the panel, or the panel itself. */
function focusInitial(): void {
  const target = panel.value?.querySelector<HTMLElement>('[data-autofocus]:not([disabled])')
  ;(target ?? panel.value)?.focus()
}

function trapTab(event: KeyboardEvent, panelElement: HTMLElement): void {
  const focusables = [...panelElement.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = focusables[0]
  const last = focusables.at(-1)
  if (!first || !last) {
    event.preventDefault()
    panelElement.focus()
    return
  }
  const active = document.activeElement
  const outside = !(active instanceof HTMLElement) || !focusables.includes(active)
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault()
    first.focus()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    dismiss()
  } else if (event.key === 'Tab' && panel.value) {
    trapTab(event, panel.value)
  }
}

function activate(): void {
  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKeydown)
  void nextTick(focusInitial)
}

function deactivate(): void {
  document.removeEventListener('keydown', onKeydown)
  const target = returnFocusTo
  returnFocusTo = null
  if (target?.isConnected) target.focus()
}

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen) activate()
    else if (wasOpen) deactivate()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.open) deactivate()
})

defineExpose({ focusInitial })
</script>
