import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import TransfersView from '../views/TransfersView.vue'
import {
  AMBIGUOUS,
  BACKEND_MESSAGES,
  CONFLICT_BODY,
  FINE_100,
  FINE_100_ID,
  FOUR_PAIRS,
  GOOD_1,
  GOOD_2,
  GOOD_3,
  GROUP_OF_3,
  GROUP_OF_4,
  NOT_FOUND_BODY,
  NO_AMBIGUOUS,
  NO_PAIRS,
  SERVER_ERROR_BODY,
  TRANSFERS,
  ambiguous,
  json,
  linked,
  mockApi,
  noContent,
} from './fixtures'

async function mountView(answers: Parameters<typeof mockApi>[0]) {
  const api = mockApi(answers)
  const wrapper = mount(TransfersView, {
    global: { plugins: [createPinia()] },
    attachTo: document.body,
  })
  await flushPromises()
  return { api, wrapper }
}

const at = (selector: string) => document.querySelector<HTMLElement>(selector)

describe('TransfersView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('asks for each list once, doubtful section first, and writes nothing by itself (R2, R8, C7)', async () => {
    const { api, wrapper } = await mountView({
      pairs: json(FOUR_PAIRS),
      ambiguous: json(ambiguous(GROUP_OF_3)),
    })

    expect(api.reads(TRANSFERS)).toBe(1)
    expect(api.reads(AMBIGUOUS)).toBe(1)
    expect(api.writes()).toEqual([])

    const sections = wrapper.findAll('section').map((one) => one.attributes('data-test'))
    expect(sections).toEqual(['doubtful-section', 'pairs-section'])
    expect(wrapper.get('[data-test="pairs-heading"]').text()).toBe('Linked pairs (4)')
    expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-test="doubtful-group"]')).toHaveLength(1)
    // Only the fine is labelled, and it stays third.
    expect(
      wrapper
        .findAll('[data-test="transfer-pair"]')
        .map((row) => row.find('[data-test="pair-bizum"]').exists()),
    ).toEqual([false, false, true, false])
  })

  it('says each empty list with its fixed sentence (R9)', async () => {
    const { wrapper } = await mountView({ pairs: json(NO_PAIRS), ambiguous: json(NO_AMBIGUOUS) })

    expect(wrapper.get('[data-test="doubtful-empty"]').text()).toBe(
      "No doubtful transfers. When an import finds money that looks like a transfer between your accounts but can't tell which movements go together, the group shows up here.",
    )
    expect(wrapper.get('[data-test="pairs-empty"]').text()).toBe('No linked transfers yet.')
    expect(wrapper.get('[data-test="pairs-heading"]').text()).toBe('Linked pairs (0)')
  })

  it('a failed list of pairs leaves the doubtful groups painted, and retries alone (R14)', async () => {
    let attempt = 0
    const { api, wrapper } = await mountView({
      pairs: () => {
        attempt += 1
        return attempt === 1 ? json(SERVER_ERROR_BODY, 500)() : json(FOUR_PAIRS)()
      },
      ambiguous: json(ambiguous(GROUP_OF_3)),
    })

    expect(wrapper.get('[data-test="pairs-error-message"]').text()).toBe(
      "Couldn't load the linked pairs.",
    )
    expect(wrapper.get('[data-test="pairs-heading"]').text()).toBe('Linked pairs')
    expect(wrapper.findAll('[data-test="doubtful-group"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="doubtful-error"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(SERVER_ERROR_BODY.message)

    await wrapper.get('[data-test="pairs-retry"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="pairs-retry"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
    expect(api.reads(TRANSFERS)).toBe(2)
    expect(api.reads(AMBIGUOUS)).toBe(1)
  })

  it('a failed list of doubtful groups leaves the pairs painted (R14)', async () => {
    const { wrapper } = await mountView({
      pairs: json(FOUR_PAIRS),
      ambiguous: json(SERVER_ERROR_BODY, 500),
    })

    expect(wrapper.get('[data-test="doubtful-error-message"]').text()).toBe(
      "Couldn't load the doubtful transfers.",
    )
    expect(wrapper.get('[data-test="doubtful-retry"]').text()).toBe('Try again')
    expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
    expect(wrapper.find('[data-test="pairs-error"]').exists()).toBe(false)
  })

  it('Unlink asks first; Cancel sends nothing (R5)', async () => {
    const { api, wrapper } = await mountView({ pairs: json(FOUR_PAIRS), unlink: noContent })

    await wrapper.findAll('[data-test="pair-unlink"]')[2]?.trigger('click')

    expect(at('[data-test="unlink-confirm"]')?.textContent).toContain('Unlink this pair?')
    expect(api.writes()).toEqual([])

    at('[data-test="unlink-cancel"]')?.click()
    await flushPromises()

    expect(at('[data-test="unlink-confirm"]')).toBeNull()
    expect(api.writes()).toEqual([])
    expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
  })

  it('confirming unlinks, repaints from the backend and offers Undo, which links it back (R6, R7)', async () => {
    let current: { pairs: unknown[] } = FOUR_PAIRS
    const { api, wrapper } = await mountView({
      pairs: () => json(current)(),
      unlink: () => {
        current = { pairs: [GOOD_1, GOOD_2, GOOD_3] }
        return noContent()
      },
      link: () => {
        current = { pairs: [GOOD_1, GOOD_2, FINE_100, GOOD_3] }
        return json(linked('again'), 201)()
      },
    })

    await wrapper.findAll('[data-test="pair-unlink"]')[2]?.trigger('click')
    at('[data-test="unlink-continue"]')?.click()
    await flushPromises()

    expect(api.writes()).toEqual([
      { method: 'DELETE', path: `${TRANSFERS}/${FINE_100_ID}`, rawBody: undefined },
    ])
    expect(wrapper.get('[data-test="pairs-heading"]').text()).toBe('Linked pairs (3)')
    expect(wrapper.get('[data-test="transfers-action-summary"]').text()).toContain(
      'Pair unlinked. Its two movements count in your totals again.',
    )

    await wrapper.get('[data-test="transfers-action-undo"]').trigger('click')
    await flushPromises()

    expect(api.writes().at(-1)?.rawBody).toBe('{"movementIds":[33339,24377]}')
    expect(wrapper.get('[data-test="transfers-action-summary"]').text()).toBe('Pair linked again.')
    expect(wrapper.find('[data-test="transfers-action-undo"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="pairs-heading"]').text()).toBe('Linked pairs (4)')
  })

  it('links two picked movements of a group of 4 and the button was off until then (R10, R11, R12)', async () => {
    let groups = ambiguous(GROUP_OF_4)
    const { api, wrapper } = await mountView({
      pairs: json(FOUR_PAIRS),
      ambiguous: () => json(groups)(),
      link: () => {
        groups = NO_AMBIGUOUS
        return json(linked('made-by-hand'), 201)()
      },
      unlink: noContent,
    })
    const link = () => wrapper.get('[data-test="doubtful-link"]')
    const pick = (side: 'out' | 'in', index: number) =>
      wrapper.findAll(`[data-test="doubtful-pick-${side}"]`)[index]?.trigger('change')

    expect(link().attributes('disabled')).toBeDefined()

    await pick('out', 0)
    expect(link().attributes('disabled')).toBeDefined()

    // 901 and 904 live in the same account: still off, and it says why.
    await pick('in', 1)
    expect(link().attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="doubtful-same"]').text()).toContain('same account')
    await link().trigger('click')
    expect(api.writes()).toEqual([])

    await pick('in', 0)
    expect(link().attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="doubtful-same"]').exists()).toBe(false)

    await link().trigger('click')
    await flushPromises()

    expect(api.writes()).toEqual([
      { method: 'POST', path: TRANSFERS, rawBody: '{"movementIds":[901,903]}' },
    ])
    expect(wrapper.get('[data-test="transfers-action-summary"]').text()).toContain(
      'Linked as a transfer. These two movements no longer count in your totals.',
    )
    expect(wrapper.find('[data-test="doubtful-empty"]').exists()).toBe(true)

    await wrapper.get('[data-test="transfers-action-undo"]').trigger('click')
    await flushPromises()

    expect(api.writes().at(-1)).toEqual({
      method: 'DELETE',
      path: `${TRANSFERS}/made-by-hand`,
      rawBody: undefined,
    })
  })

  it('a failed write is said in English and the backend message is never painted (R13)', async () => {
    const { wrapper } = await mountView({
      pairs: json(FOUR_PAIRS),
      ambiguous: json(ambiguous(GROUP_OF_3)),
      unlink: json(NOT_FOUND_BODY, 404),
      link: json(CONFLICT_BODY, 409),
    })

    await wrapper.findAll('[data-test="pair-unlink"]')[0]?.trigger('click')
    at('[data-test="unlink-continue"]')?.click()
    await flushPromises()

    expect(wrapper.get('[data-test="transfers-action-error"]').text()).toBe(
      'That pair was already unlinked. Reloading.',
    )

    await wrapper.get('[data-test="doubtful-pick-out"]').trigger('change')
    await wrapper.findAll('[data-test="doubtful-pick-in"]')[0]?.trigger('change')
    await wrapper.get('[data-test="doubtful-link"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="transfers-action-error"]').text()).toBe(
      'One of those movements is already in a pair. Nothing changed. Reloading.',
    )
    for (const message of BACKEND_MESSAGES) {
      expect(document.body.textContent).not.toContain(message)
    }
  })
})
