import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '@/router'
import AppSidebar from '@/shared/components/AppSidebar.vue'

import ReviewCountBadge from '../components/ReviewCountBadge.vue'
import { COUNT_PAGE, EMPTY_PAGE, MOVEMENTS, json, mockApi } from './fixtures'

async function mountBadge(answer: Parameters<typeof mockApi>[0]['movements']) {
  const api = mockApi({ movements: answer })
  const wrapper = mount(ReviewCountBadge, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return { api, wrapper }
}

describe('ReviewCountBadge (R1, R2)', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows how many movements are waiting', async () => {
    const { api, wrapper } = await mountBadge(json(COUNT_PAGE))

    expect(api.movementQueries()).toEqual(['status=pending_review&page=1&pageSize=1'])
    expect(wrapper.get('[data-test="review-count"]').text()).toBe('7')
  })

  it('shows nothing when the queue is empty', async () => {
    const { wrapper } = await mountBadge(
      json({ ...EMPTY_PAGE, pagination: { ...EMPTY_PAGE.pagination, pageSize: 1 } }),
    )

    expect(wrapper.find('[data-test="review-count"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('shows nothing, and no error, when the count query fails', async () => {
    const { wrapper } = await mountBadge(json({ message: 'boom' }, 500))

    expect(wrapper.find('[data-test="review-count"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('leaves the sidebar without a single word about the failure (R1)', async () => {
    mockApi({ movements: json({ message: 'boom' }, 500) })
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/net-worth')
    await router.isReady()

    const wrapper = mount(AppSidebar, { global: { plugins: [router, createPinia()] } })
    await flushPromises()

    const review = wrapper.findAll('nav a').find((link) => link.text().startsWith('Review'))
    expect(review?.text()).toBe('Review')
    for (const word of ['error', 'Error', 'failed', "Couldn't"]) {
      expect(wrapper.get('aside').text()).not.toContain(word)
    }
  })

  it('asks once on mount and never polls', async () => {
    vi.useFakeTimers()
    const api = mockApi({ movements: json(COUNT_PAGE) })
    const wrapper = mount(ReviewCountBadge, { global: { plugins: [createPinia()] } })
    await vi.runAllTimersAsync()

    vi.advanceTimersByTime(10 * 60 * 1000)
    await vi.runAllTimersAsync()

    expect(api.count(MOVEMENTS)).toBe(1)
    expect(wrapper.get('[data-test="review-count"]').text()).toBe('7')
  })
})
