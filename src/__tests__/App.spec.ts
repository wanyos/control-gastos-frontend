import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '../App.vue'

const appShellStub = {
  stubs: {
    AppShell: { template: '<div data-test="app-shell" />' },
  },
}

describe('App', () => {
  it('renders the application shell', () => {
    const wrapper = mount(App, { global: appShellStub })

    expect(wrapper.find('[data-test="app-shell"]').exists()).toBe(true)
  })

  it('dresses the app wrapper with design system tokens, not Tailwind defaults', () => {
    // jsdom does not compute Tailwind styles; this asserts class presence.
    // That the utilities exist and resolve is covered by assets/__tests__/
    // styles.spec.ts and by the manual smoke test (pnpm dev).
    const wrapper = mount(App, { global: appShellStub })

    expect(wrapper.classes()).toContain('min-h-screen')
    expect(wrapper.classes()).toContain('bg-surface-app')
    expect(wrapper.classes()).toContain('text-ink-body')
    // Guards the regression this feature exists to prevent: the shell must not
    // fall back to Tailwind's stock palette.
    expect(wrapper.classes()).not.toContain('bg-gray-50')
  })

  it('keeps the shell inside the styled wrapper, which the e2e smoke test asserts on', () => {
    const wrapper = mount(App, { global: appShellStub })

    const shell = wrapper.find('[data-test="app-shell"]')
    expect(shell.element.parentElement).toBe(wrapper.element)
  })
})
