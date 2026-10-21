import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import StickyBelowTopBar from '@/shared/components/StickyBelowTopBar.vue'
import { formatDate, formatMoney } from '@/shared/money'

import TransfersView from '../views/TransfersView.vue'
import {
  AMBIGUOUS,
  BACKEND_MESSAGES,
  CONFLICT_BODY,
  DOUBTFUL_OWN_IN,
  DOUBTFUL_OWN_OUT,
  FINE_100,
  FINE_100_ID,
  FOUR_PAIRS,
  GOOD_1,
  GOOD_2,
  GOOD_3,
  GROUP_OF_3,
  GROUP_OF_4,
  MOVEMENTS,
  NOT_FOUND_BODY,
  NO_AMBIGUOUS,
  NO_DOUBTFUL_OWN,
  NO_PAIRS,
  SERVER_ERROR_BODY,
  TRANSFERS,
  TWO_DOUBTFUL_OWN,
  ambiguous,
  answeredMovement,
  doubtfulPage,
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

  // --- The notice under the top bar (feature 27) ---
  // jsdom lays nothing out, so «in view» is the browser tests' job.

  describe('the block that keeps the notice under the top bar (feature 27)', () => {
    const BLOCK = '[data-test="sticky-below-top-bar"]'

    it('paints no notice block while there is nothing to say', async () => {
      const { wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        ambiguous: json(ambiguous(GROUP_OF_3)),
      })

      expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
      expect(wrapper.find(BLOCK).exists()).toBe(false)
      expect(wrapper.find('[data-test="transfers-action-summary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="transfers-action-error"]').exists()).toBe(false)
    })

    it('puts the summary and its Undo inside the block after unlinking, with no row to keep clear (R3)', async () => {
      let current: { pairs: unknown[] } = FOUR_PAIRS
      const { wrapper } = await mountView({
        pairs: () => json(current)(),
        unlink: () => {
          current = { pairs: [GOOD_1, GOOD_2, GOOD_3] }
          return noContent()
        },
      })

      await wrapper.findAll('[data-test="pair-unlink"]')[2]?.trigger('click')
      at('[data-test="unlink-continue"]')?.click()
      await flushPromises()

      const block = wrapper.get(BLOCK)
      expect(block.get('[data-test="transfers-action-summary"]').text()).toContain('Pair unlinked.')
      expect(block.find('[data-test="transfers-action-undo"]').exists()).toBe(true)
      expect(wrapper.findAll(BLOCK)).toHaveLength(1)
      expect(wrapper.getComponent(StickyBelowTopBar).props('keepClearOf')).toBeUndefined()
      // Still between the title and the first section.
      expect(block.element.previousElementSibling?.tagName).toBe('H1')
      expect(block.element.nextElementSibling?.matches('[data-test="ownership-section"]')).toBe(
        true,
      )
    })

    it('puts the sentence of a failed write inside the block (R5)', async () => {
      const { wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        unlink: json(NOT_FOUND_BODY, 404),
      })

      await wrapper.findAll('[data-test="pair-unlink"]')[0]?.trigger('click')
      at('[data-test="unlink-continue"]')?.click()
      await flushPromises()

      expect(wrapper.get(BLOCK).find('[data-test="transfers-action-error"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="transfers-action-error"]')).toHaveLength(1)
    })
  })

  // ─── Feature 35: the doubtful movements of own money ─────────────────────

  describe('the doubtful movements of own money (feature 35)', () => {
    it('lists the doubtful movements of own money above the doubtful transfers', async () => {
      const { api, wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        ambiguous: json(ambiguous(GROUP_OF_3)),
        doubtful: json(TWO_DOUBTFUL_OWN),
      })

      const section = wrapper.get('[data-test="ownership-section"]')
      expect(section.get('h2').text()).toBe('Doubtful: between your accounts?')
      expect(section.get('[data-test="ownership-intro"]').text()).toBe(
        'Each one only names the bank of one of your accounts. It counts in your totals until you answer.',
      )
      const rows = section.findAll('[data-test="ownership-row"]')
      expect(rows.map((row) => row.attributes('data-movement-id'))).toEqual(['9101', '9102'])
      expect(rows[0]?.get('[data-test="ownership-description"]').text()).toBe(
        'TRANSF /BANCO FICTICIO NORTE',
      )
      expect(rows[0]?.get('[data-test="ownership-amount"]').text()).toBe(formatMoney('-350.00'))
      expect(rows[0]?.get('[data-test="ownership-date"]').text()).toBe(formatDate('2026-10-13'))
      expect(rows[0]?.get('[data-test="ownership-reason"]').text()).toContain(
        '"Banco Ficticio Norte"',
      )

      // Above `Doubtful transfers`, which stays above `Linked pairs`.
      const order = [
        '[data-test="ownership-section"]',
        '[data-test="doubtful-section"]',
        '[data-test="pairs-section"]',
      ].map((selector) => wrapper.get(selector).element)
      expect(order[0]!.compareDocumentPosition(order[1]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(order[1]!.compareDocumentPosition(order[2]!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      // One read of the list, with the filter and 200 per page; nothing written.
      expect(api.calls.filter((call) => call.path === MOVEMENTS).map((call) => call.query)).toEqual(
        ['ownership=doubtful&page=1&pageSize=200'],
      )
      expect(api.writes()).toEqual([])
    })

    it('says there are no doubtful movements when the list is empty', async () => {
      const { wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        doubtful: json(NO_DOUBTFUL_OWN),
      })

      expect(wrapper.get('[data-test="ownership-empty"]').text()).toBe(
        'No doubtful movements. When a movement only names the bank of one of your accounts, it shows up here so you can say whether it is yours.',
      )
      expect(wrapper.find('[data-test="ownership-row"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="ownership-error"]').exists()).toBe(false)
    })

    it('a failed read of the doubtful movements offers Try again and leaves the other sections alone', async () => {
      let attempt = 0
      const { api, wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        ambiguous: json(ambiguous(GROUP_OF_3)),
        doubtful: () => {
          attempt += 1
          return attempt === 1 ? json(SERVER_ERROR_BODY, 500)() : json(TWO_DOUBTFUL_OWN)()
        },
      })

      expect(wrapper.get('[data-test="ownership-error-message"]').text()).toBe(
        "Couldn't load the doubtful movements.",
      )
      expect(wrapper.get('[data-test="ownership-retry"]').text()).toBe('Try again')
      expect(wrapper.text()).not.toContain(SERVER_ERROR_BODY.message)
      // The two sections of the feature 24, painted as always.
      expect(wrapper.findAll('[data-test="doubtful-group"]')).toHaveLength(1)
      expect(wrapper.findAll('[data-test="transfer-pair"]')).toHaveLength(4)
      expect(wrapper.find('[data-test="doubtful-error"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="pairs-error"]').exists()).toBe(false)

      await wrapper.get('[data-test="ownership-retry"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test="ownership-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="ownership-row"]')).toHaveLength(2)
      // Only the list was asked again.
      expect(api.calls.filter((call) => call.path === MOVEMENTS)).toHaveLength(2)
      expect(api.reads(TRANSFERS)).toBe(1)
      expect(api.reads(AMBIGUOUS)).toBe(1)
    })

    it('a click on an answer sends it, says it with Undo, and the movement leaves the list', async () => {
      let answered = false
      const { api, wrapper } = await mountView({
        pairs: json(FOUR_PAIRS),
        doubtful: () => json(answered ? doubtfulPage(DOUBTFUL_OWN_IN) : TWO_DOUBTFUL_OWN)(),
        answer: () => {
          answered = true
          return json(answeredMovement(DOUBTFUL_OWN_OUT))()
        },
      })

      await wrapper.findAll('[data-test="ownership-mine"]')[0]?.trigger('click')
      await flushPromises()

      expect(api.writes().map((call) => call.rawBody)).toEqual(['{"ownershipDecision":"mine"}'])
      expect(wrapper.get('[data-test="transfers-action-summary"]').text()).toContain(
        'Marked as yours. It no longer counts in your totals.',
      )
      expect(wrapper.find('[data-test="transfers-action-undo"]').exists()).toBe(true)
      expect(
        wrapper
          .findAll('[data-test="ownership-row"]')
          .map((row) => row.attributes('data-movement-id')),
      ).toEqual(['9102'])
    })
  })
})
