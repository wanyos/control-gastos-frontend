import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'

import { formatDate } from '@/shared/money'

import OwnAccountsView from '../views/OwnAccountsView.vue'
import {
  HOLDER_NAMES,
  NEW_ROW,
  SERVER_ERROR_BODY,
  TWELVE_ROWS,
  json,
  mockFetch,
  networkDown,
  rawEmptyOwnAccounts,
  rawOwnAccounts,
  rawRow,
  rowOf,
  rowsWith,
  rowsWithNew,
} from './fixtures'

// The HTTP boundary is simulated: anything not routed here is rejected, so no request
// can reach a real backend.

const TABLE = 'GET /api/own-accounts'
const NAMES = 'GET /api/own-accounts/holder-names'

const TYPE_NAMES: Record<string, string> = {
  checking: 'Checking account',
  savings: 'Savings account',
  investment: 'Investment',
  deposit: 'Deposit',
  crypto: 'Crypto',
  other: 'Other',
}

async function mountView(routes: Record<string, (() => Promise<Response>)[]> = {}) {
  const api = mockFetch({
    [TABLE]: [json(rawOwnAccounts())],
    [NAMES]: [json(HOLDER_NAMES)],
    ...routes,
  })
  const wrapper = mount(OwnAccountsView, {
    global: { plugins: [createPinia()] },
    attachTo: document.body,
  })
  await flushPromises()
  return { api, wrapper }
}

type View = Awaited<ReturnType<typeof mountView>>['wrapper']

const rowsOf = (wrapper: View) => wrapper.findAll('[data-test="own-account-row"]')
const rowById = (wrapper: View, id: number) =>
  wrapper.get(`[data-test="own-account-row"][data-own-account-id="${id}"]`)
const cell = (row: ReturnType<View['get']>, name: string): string =>
  row.get(`[data-test="cell-${name}"]`).text()
const textsOf = (row: ReturnType<View['get']>): string[] =>
  row.findAll('[data-test="own-account-text"]').map((item) => item.text())

const inDocument = <T extends Element = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T & Element>(selector)
  if (!element) throw new Error(`nothing at ${selector}`)
  return element
}

async function type(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value
  input.dispatchEvent(new Event('input'))
  await nextTick()
}

describe('OwnAccountsView', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('paints one row per account with every field', async () => {
    const { api, wrapper } = await mountView()

    expect(wrapper.get('h1').text()).toBe('My accounts')
    expect(wrapper.get('[data-test="own-accounts-intro"]').text()).toBe(
      "Your accounts and products, in any bank, and the texts each one appears with in the descriptions of your movements. A movement that contains one of these texts, or a form of your name, is money moving between your own accounts and doesn't count in the totals. A text that is just the name of a bank only makes it doubtful.",
    )
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Name',
      'Bank',
      'Number',
      'Type',
      'Opened',
      'Closed',
      'Appears as',
      '',
    ])

    const rows = rowsOf(wrapper)
    expect(rows).toHaveLength(12)
    // In the order of the answer, every field of every row.
    TWELVE_ROWS.forEach((expected, index) => {
      const row = rows[index]!
      expect(row.attributes('data-own-account-id')).toBe(String(expected.id))
      expect(cell(row, 'name')).toBe(expected.name)
      expect(cell(row, 'bank')).toBe(expected.bank)
      expect(cell(row, 'number')).toBe(expected.accountNumber ?? '—')
      expect(cell(row, 'type')).toBe(TYPE_NAMES[expected.type])
      expect(cell(row, 'opened')).toBe(expected.openedAt ? formatDate(expected.openedAt) : '—')
      expect(cell(row, 'closed')).toBe(expected.closedAt ? formatDate(expected.closedAt) : '—')
      expect(textsOf(row)).toEqual(expected.texts)
      expect(row.get('[data-test="own-account-edit"]').text()).toBe('Edit')
    })
    // The number whole, as it came, in figures.
    const closed = rowById(wrapper, 5)
    expect(cell(closed, 'number')).toBe('ES00 0000 0000 0000 0000 0002')
    expect(closed.get('[data-test="cell-number"]').classes()).toContain('font-mono')
    expect(cell(closed, 'closed')).toBe(formatDate('2024-06-30'))
    expect(textsOf(rowById(wrapper, 2))).toEqual(['Cartera Indexada Inventada', 'MyInvestor'])

    // Two reads and nothing else.
    expect(api.calls.map((call) => `${call.method} ${call.path}`).sort()).toEqual([TABLE, NAMES])
  })

  it('paints a dash for an empty number or date and No texts for a row with none', async () => {
    const { wrapper } = await mountView()

    const noNumber = rowById(wrapper, 7)
    expect(cell(noNumber, 'number')).toBe('—')
    expect(cell(noNumber, 'opened')).toBe('—')
    expect(cell(noNumber, 'closed')).toBe('—')
    expect(textsOf(noNumber)).toEqual(['Hucha inventada', 'Bankinter'])

    for (const id of [12, 9, 8]) {
      const row = rowById(wrapper, id)
      expect(row.get('[data-test="own-account-no-texts"]').text()).toBe('No texts')
      expect(textsOf(row)).toEqual([])
    }
    expect(wrapper.findAll('[data-test="own-account-no-texts"]')).toHaveLength(3)
    // No cell is left blank.
    for (const row of rowsOf(wrapper)) {
      for (const name of ['name', 'bank', 'number', 'type', 'opened', 'closed', 'texts']) {
        expect(cell(row, name)).not.toBe('')
      }
    }
  })

  it('says there are no accounts when the table is empty', async () => {
    const { wrapper } = await mountView({ [TABLE]: [json(rawEmptyOwnAccounts())] })

    expect(wrapper.get('[data-test="own-accounts-empty"]').text()).toBe('No accounts yet.')
    expect(rowsOf(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-test="own-account-table"]').exists()).toBe(false)
  })

  it('a failed load says so and offers Try again', async () => {
    const { api, wrapper } = await mountView({
      [TABLE]: [networkDown, json(rawOwnAccounts())],
    })

    expect(wrapper.get('[data-test="own-accounts-error"]').text()).toBe(
      "Couldn't reach the server.",
    )
    expect(wrapper.find('[data-test="own-account-table"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No accounts yet.')
    // The forms of the name are not affected.
    expect(wrapper.findAll('[data-test="holder-name"]')).toHaveLength(2)

    const retry = wrapper.get('[data-test="own-accounts-retry"]')
    expect(retry.text()).toBe('Try again')
    await retry.trigger('click')
    await flushPromises()

    expect(api.of('GET', '/api/own-accounts')).toHaveLength(2)
    expect(rowsOf(wrapper)).toHaveLength(12)
    expect(wrapper.find('[data-test="own-accounts-error"]').exists()).toBe(false)

    // A server error says it differently, and never the backend's own message.
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    const failed = await mountView({ [TABLE]: [json(SERVER_ERROR_BODY, 500)] })
    expect(failed.wrapper.get('[data-test="own-accounts-error"]').text()).toBe(
      'Something went wrong loading your accounts.',
    )
    expect(failed.wrapper.text()).not.toContain(SERVER_ERROR_BODY.message)
  })

  it('shows the forms of your name above the table', async () => {
    const { wrapper } = await mountView()

    const block = wrapper.get('[data-test="holder-names"]')
    expect(block.get('h2').text()).toBe('Forms of your name')
    expect(block.text()).toContain(
      'How your name appears in the descriptions: in full, surnames first, cut short by the bank… Only the whole form counts.',
    )
    expect(block.findAll('[data-test="holder-name"]').map((item) => item.text())).toEqual([
      'Inventado Titular',
      'Titular Inventado',
    ])
    const table = wrapper.get('[data-test="own-account-table"]').element
    expect(block.element.compareDocumentPosition(table)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    // Changing them from the block: the list painted is what the backend saved.
    vi.restoreAllMocks()
    const api = mockFetch({
      'PUT /api/own-accounts/holder-names': [json({ names: ['Titular Inventado'] })],
    })
    await block.get('[data-test="holder-names-edit"]').trigger('click')
    await nextTick()
    inDocument<HTMLButtonElement>(
      '[data-test="names-dialog"] [data-test="text-list-remove"]',
    ).click()
    await nextTick()
    inDocument<HTMLButtonElement>('[data-test="names-save"]').click()
    await flushPromises()

    expect(api.calls).toEqual([
      {
        path: '/api/own-accounts/holder-names',
        method: 'PUT',
        body: { names: ['Titular Inventado'] },
        contentType: 'application/json',
      },
    ])
    expect(wrapper.findAll('[data-test="holder-name"]').map((item) => item.text())).toEqual([
      'Titular Inventado',
    ])
    expect(document.querySelector('[data-test="names-dialog"]')).toBeNull()
  })

  it('a failed load of the forms of your name leaves the table alone', async () => {
    const { wrapper } = await mountView({ [NAMES]: [json(SERVER_ERROR_BODY, 500)] })

    expect(wrapper.get('[data-test="holder-names-error"]').text()).toBe(
      'Something went wrong loading the forms of your name.',
    )
    expect(wrapper.get('[data-test="holder-names-retry"]').text()).toBe('Try again')
    expect(rowsOf(wrapper)).toHaveLength(12)
    expect(wrapper.find('[data-test="own-accounts-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="own-accounts-add"]').attributes('disabled')).toBeUndefined()
  })

  it('offers no way to delete a row', async () => {
    const { api, wrapper } = await mountView()

    const pageButtons = wrapper.findAll('button').map((button) => button.text())
    expect(pageButtons.filter((text) => /delete|remove|borrar/i.test(text))).toEqual([])
    for (const row of rowsOf(wrapper)) {
      expect(row.findAll('button').map((button) => button.text())).toEqual(['Edit'])
    }

    // The account window removes texts, never the row.
    await rowById(wrapper, 3).get('[data-test="own-account-edit"]').trigger('click')
    await nextTick()
    const dialogButtons = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-test="account-dialog"] button'),
    ]
    expect(
      dialogButtons.filter((button) => /delete|borrar/i.test(button.textContent ?? '')),
    ).toEqual([])
    const removes = dialogButtons.filter((button) => button.textContent?.trim() === 'Remove')
    expect(removes).toHaveLength(1)
    expect(removes[0]?.closest('[data-test="text-list-item"]')).not.toBeNull()
    expect(inDocument('[data-test="account-hint"]').textContent).toContain(
      "Rows can't be deleted: leave it with no texts instead.",
    )
    expect(api.calls.some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('adding an account from the header button shows the new row', async () => {
    const { api, wrapper } = await mountView({
      [TABLE]: [json(rawOwnAccounts()), json(rawOwnAccounts(rowsWithNew()))],
      'POST /api/own-accounts': [json(rawRow(NEW_ROW), 201)],
    })
    const add = wrapper.get('[data-test="own-accounts-add"]')
    expect(add.text()).toBe('Add account')

    await add.trigger('click')
    await nextTick()
    expect(inDocument('[role="dialog"] h2').textContent?.trim()).toBe('Add an account')
    await type(inDocument('[data-test="account-name"] input'), 'Monedero inventado dos')
    await type(inDocument('[data-test="account-bank"] input'), 'Criptan')
    const select = inDocument<HTMLSelectElement>('[data-test="account-type"] select')
    select.value = 'crypto'
    select.dispatchEvent(new Event('change'))
    await type(inDocument('[data-test="account-opened"] input'), '2026-10-21')
    inDocument<HTMLButtonElement>(
      '[data-test="account-dialog"] [data-test="text-list-add"]',
    ).click()
    await nextTick()
    await type(
      inDocument('[data-test="account-dialog"] [data-test="text-list-field"] input'),
      'Monedero Inventado Dos',
    )
    inDocument<HTMLButtonElement>('[data-test="account-save"]').click()
    await flushPromises()

    expect(api.writes()).toEqual([
      {
        path: '/api/own-accounts',
        method: 'POST',
        body: {
          name: 'Monedero inventado dos',
          bank: 'Criptan',
          type: 'crypto',
          openedAt: '2026-10-21',
          texts: ['Monedero Inventado Dos'],
        },
        contentType: 'application/json',
      },
    ])
    expect(api.of('GET', '/api/own-accounts')).toHaveLength(2)
    expect(document.querySelector('[data-test="account-dialog"]')).toBeNull()
    const rows = rowsOf(wrapper)
    expect(rows).toHaveLength(13)
    const added = rows[3]!
    expect(added.attributes('data-own-account-id')).toBe('13')
    expect(cell(added, 'name')).toBe('Monedero inventado dos')
    expect(cell(added, 'bank')).toBe('Criptan')
    expect(cell(added, 'type')).toBe('Crypto')
    expect(cell(added, 'opened')).toBe(formatDate('2026-10-21'))
    expect(textsOf(added)).toEqual(['Monedero Inventado Dos'])
  })

  it('editing a row from its Edit button shows the change', async () => {
    const texts = ['Naranja Inventada', 'Ahorro Naranja Inventado']
    const { api, wrapper } = await mountView({
      [TABLE]: [json(rawOwnAccounts()), json(rawOwnAccounts(rowsWith(9, { texts })))],
      'PATCH /api/own-accounts/:id': [json(rawRow({ ...rowOf(9), texts }))],
    })
    expect(rowById(wrapper, 9).find('[data-test="own-account-no-texts"]').exists()).toBe(true)

    await rowById(wrapper, 9).get('[data-test="own-account-edit"]').trigger('click')
    await nextTick()
    expect(inDocument('[role="dialog"] h2').textContent?.trim()).toBe('Edit account')
    expect(inDocument<HTMLInputElement>('[data-test="account-name"] input').value).toBe(
      'Naranja inventada',
    )
    const addText = inDocument<HTMLButtonElement>(
      '[data-test="account-dialog"] [data-test="text-list-add"]',
    )
    addText.click()
    await nextTick()
    addText.click()
    await nextTick()
    const fields = [
      ...document.querySelectorAll<HTMLInputElement>(
        '[data-test="account-dialog"] [data-test="text-list-field"] input',
      ),
    ]
    await type(fields[0]!, texts[0]!)
    await type(fields[1]!, texts[1]!)
    inDocument<HTMLButtonElement>('[data-test="account-save"]').click()
    await flushPromises()

    expect(api.writes()).toEqual([
      {
        path: '/api/own-accounts/9',
        method: 'PATCH',
        body: { texts },
        contentType: 'application/json',
      },
    ])
    expect(api.of('GET', '/api/own-accounts')).toHaveLength(2)
    expect(document.querySelector('[data-test="account-dialog"]')).toBeNull()
    expect(textsOf(rowById(wrapper, 9))).toEqual(texts)
    expect(rowById(wrapper, 9).find('[data-test="own-account-no-texts"]').exists()).toBe(false)
  })
})
