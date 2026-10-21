import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import DoubtfulOwnershipCountBadge from '../components/DoubtfulOwnershipCountBadge.vue'
import { MOVEMENTS, json, mockApi, networkDown } from './fixtures'

/** A count answer of `GET /api/movements?ownership=doubtful&pageSize=1`. */
const counted = (total: number) => ({
  movements: [],
  pagination: { page: 1, pageSize: 1, total, totalPages: total },
  totals: { income: '0.00', expense: '0.00', net: '0.00' },
})

async function mountBadge(answers: Parameters<typeof mockApi>[0]) {
  const api = mockApi(answers)
  const wrapper = mount(DoubtfulOwnershipCountBadge, { global: { plugins: [createPinia()] } })
  await flushPromises()
  return { api, wrapper }
}

const BADGE = '[data-test="transfers-doubtful-count"]'

describe('DoubtfulOwnershipCountBadge (feature 35, R11, R12)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the number of doubtful movements only when there are some', async () => {
    const three = await mountBadge({ doubtful: json(counted(3)) })
    expect(three.wrapper.get(BADGE).text()).toBe('3')
    // The same look as the number of Review.
    expect(three.wrapper.get(BADGE).classes()).toEqual(
      expect.arrayContaining(['rounded-pill', 'bg-accent/15', 'font-mono', 'tabular-nums']),
    )
    // Asked once on mount, with the smallest query, and nothing written.
    expect(three.api.calls).toEqual([
      {
        method: 'GET',
        path: MOVEMENTS,
        query: 'ownership=doubtful&page=1&pageSize=1',
        rawBody: undefined,
      },
    ])
    three.wrapper.unmount()
    vi.restoreAllMocks()

    const zero = await mountBadge({ doubtful: json(counted(0)) })
    expect(zero.wrapper.find(BADGE).exists()).toBe(false)
    zero.wrapper.unmount()
    vi.restoreAllMocks()

    // A failed count leaves it unknown (null): nothing at all.
    const failed = await mountBadge({ doubtful: networkDown })
    expect(failed.wrapper.find(BADGE).exists()).toBe(false)
    expect(failed.wrapper.text()).toBe('')
  })
})
