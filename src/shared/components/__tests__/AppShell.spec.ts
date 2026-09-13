import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'

import { navEntries, routes } from '@/router'

import AppShell from '../AppShell.vue'

const mountShell = async (path: string) => {
  const router: Router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(AppShell, { global: { plugins: [router, createPinia()] } })
  await wrapper.vm.$nextTick()

  return { router, wrapper }
}

const linkTexts = (wrapper: Awaited<ReturnType<typeof mountShell>>['wrapper']) =>
  wrapper.findAll('nav a').map((link) => link.text())

describe('AppShell', () => {
  // /net-worth renders the real view, which requests the API on mount: the HTTP
  // boundary is held pending so the shell is tested without a backend.
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts a sidebar listing every navigation entry and a topbar', async () => {
    const { wrapper } = await mountShell('/net-worth')

    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.find('header').exists()).toBe(true)
    expect(linkTexts(wrapper)).toEqual(navEntries.map((entry) => entry.label))
  })

  it('renders an icon next to every sidebar entry', async () => {
    const { wrapper } = await mountShell('/net-worth')

    const icons = wrapper.findAll('nav a svg')
    expect(icons).toHaveLength(navEntries.length)
  })

  it('shows the current route label in the topbar', async () => {
    const { wrapper } = await mountShell('/investments')

    expect(wrapper.get('[data-test="topbar-title"]').text()).toBe('Investments')
  })

  it('renders the routed view inside the shell', async () => {
    const { wrapper } = await mountShell('/overview')

    const view = wrapper.get('[data-test="placeholder"]')
    expect(view.text()).toContain('Overview')
    expect(wrapper.get('main').element.contains(view.element)).toBe(true)
  })

  it('marks exactly the active entry, and it is the one for the current route', async () => {
    const { wrapper } = await mountShell('/movements')

    const active = wrapper.findAll('nav a[aria-current="page"]')
    expect(active).toHaveLength(1)
    expect(active[0]?.text()).toBe('Movements')
  })

  it('moves the active mark and the title when the route changes', async () => {
    const { router, wrapper } = await mountShell('/net-worth')

    expect(wrapper.get('nav a[aria-current="page"]').text()).toBe('Net Worth')

    await router.push('/import')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('nav a[aria-current="page"]').text()).toBe('Import')
    expect(wrapper.get('[data-test="topbar-title"]').text()).toBe('Import')
    expect(wrapper.get('[data-test="placeholder"]').text()).toContain('Import')
  })

  it('renders no title and no active entry on a route outside the navigation', async () => {
    const { wrapper } = await mountShell('/nope')

    expect(wrapper.get('[data-test="topbar-title"]').text()).toBe('')
    expect(wrapper.findAll('nav a[aria-current="page"]')).toHaveLength(0)
  })

  it('shows an English wordmark, not the design system Spanish one', async () => {
    const { wrapper } = await mountShell('/net-worth')

    const wordmark = wrapper.get('[data-test="wordmark"]').text()
    expect(wordmark).toContain('accounts')
    expect(wordmark).not.toContain('cuentas')
  })
})
