import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '../App.vue'

const routerViewStub = {
  stubs: {
    RouterView: { template: '<div data-test="router-view" />' },
  },
}

describe('App', () => {
  it('renders the router outlet as the app shell', () => {
    const wrapper = mount(App, { global: routerViewStub })

    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(true)
  })

  it('applies Tailwind utility classes on the app shell root', () => {
    // jsdom does not compute Tailwind styles; this asserts class presence.
    // Visual rendering is covered by the manual smoke test (pnpm dev).
    const wrapper = mount(App, { global: routerViewStub })

    expect(wrapper.classes()).toContain('min-h-screen')
    expect(wrapper.classes()).toContain('bg-gray-50')
  })

  it('keeps the router outlet inside the styled shell wrapper', () => {
    const wrapper = mount(App, { global: routerViewStub })

    const outlet = wrapper.find('[data-test="router-view"]')
    expect(outlet.element.parentElement).toBe(wrapper.element)
  })
})
