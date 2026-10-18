import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import { formatDate, formatMoney } from '@/shared/money'
import { SEARCH_DEBOUNCE_MS } from '@/shared/movements'

import OtherMovementsQuestion from '../components/OtherMovementsQuestion.vue'
import {
  QUESTION_CHECKING,
  QUESTION_CHECK_FAILED,
  QUESTION_HINT,
  QUESTION_NONE,
  QUESTION_TAKEN,
  TOO_SHORT,
} from '../rules'
import { parseRulePreview } from '../service'
import type { OtherMovementsQuestionState, QuestionCheck } from '../types'
import { PREVIEW_NONE, PREVIEW_TWO } from './fixtures'

const TWO = parseRulePreview(PREVIEW_TWO)
const NONE = parseRulePreview(PREVIEW_NONE)

const TEXT = 'academia ficticia norte'

const questionWith = (
  check: QuestionCheck = { step: 'ready', text: TEXT, preview: TWO },
  failure: string | null = null,
): OtherMovementsQuestionState => ({
  movementId: 405,
  kind: 'expense',
  categoryId: 12,
  categoryName: 'Educación',
  check,
  failure,
})

const mountQuestion = (question = questionWith(), busy = false) =>
  mount(OtherMovementsQuestion, { props: { question, busy } })

const CREATE = '[data-test="other-movements-create"]'
const isOff = (wrapper: ReturnType<typeof mountQuestion>): boolean =>
  wrapper.get(CREATE).attributes('disabled') !== undefined

describe('OtherMovementsQuestion (feature 34)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // The component is dumb: it never asks anything itself.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('no request'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows how many other movements would move and lists them before anything is created', async () => {
    const wrapper = mountQuestion()

    expect(wrapper.get('[data-test="other-movements-headline"]').text()).toBe(
      'Use Educación for the other movements that contain this text too?',
    )
    expect(
      wrapper.get<HTMLInputElement>('[data-test="other-movements-text"] input').element.value,
    ).toBe(TEXT)
    expect(wrapper.get('[data-test="other-movements-count"]').text()).toBe(
      '2 other movements would move to Educación.',
    )
    expect(wrapper.get('[data-test="other-movements-hint"]').text()).toBe(QUESTION_HINT)
    // Folded until asked.
    expect(wrapper.find('[data-test="other-movements-list"]').exists()).toBe(false)

    const show = wrapper.get('[data-test="other-movements-show"]')
    expect(show.text()).toBe('Show the 2 movements')
    await show.trigger('click')

    const items = wrapper.findAll('[data-test="other-movements-item"]')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain(formatDate('2026-08-01'))
    expect(items[0]?.text()).toContain('RECIBO /Academia Ficticia Norte')
    expect(items[0]?.text()).toContain(formatMoney('-48.50'))
    expect(items[1]?.text()).toContain(formatMoney('-52.75'))
    expect(wrapper.get('[data-test="other-movements-list"]').classes()).toContain('overflow-y-auto')
    expect(wrapper.get('[data-test="other-movements-show"]').text()).toBe('Hide the movements')

    // Nothing was created, nothing was asked.
    expect(wrapper.emitted('create')).toBeUndefined()
    expect(wrapper.emitted('text')).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(isOff(wrapper)).toBe(false)
  })

  it('asks again after the text is edited and keeps Create rule off while it checks', async () => {
    vi.useFakeTimers()
    const wrapper = mountQuestion()

    const input = wrapper.get('[data-test="other-movements-text"] input')
    await input.setValue('academia fict')
    await input.setValue('academia')
    // Half typed: the number in view belongs to another text.
    expect(isOff(wrapper)).toBe(true)

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    expect(wrapper.emitted('text')).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('text')).toEqual([['academia']])

    await wrapper.setProps({ question: questionWith({ step: 'loading', text: 'academia' }) })
    expect(isOff(wrapper)).toBe(true)
    expect(wrapper.get('[data-test="other-movements-checking"]').text()).toBe(QUESTION_CHECKING)
    expect(wrapper.find('[data-test="other-movements-count"]').exists()).toBe(false)

    const one = { ...TWO, matchText: 'academia', movements: TWO.movements.slice(0, 1) }
    await wrapper.setProps({
      question: questionWith({ step: 'ready', text: 'academia', preview: one }),
    })
    expect(wrapper.get('[data-test="other-movements-count"]').text()).toBe(
      '1 other movement would move to Educación.',
    )
    expect(isOff(wrapper)).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('says no other movement would move and keeps Create rule on', () => {
    const wrapper = mountQuestion(questionWith({ step: 'ready', text: TEXT, preview: NONE }))

    expect(wrapper.get('[data-test="other-movements-none"]').text()).toBe(QUESTION_NONE)
    expect(wrapper.find('[data-test="other-movements-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="other-movements-show"]').exists()).toBe(false)
    expect(isOff(wrapper)).toBe(false)
  })

  it('says why Create rule is off for a short text a taken text or a failed check', () => {
    const cases: [QuestionCheck, string, string][] = [
      [{ step: 'tooShort', text: TEXT }, 'other-movements-short', TOO_SHORT],
      [{ step: 'taken', text: TEXT }, 'other-movements-taken', QUESTION_TAKEN],
      [{ step: 'failed', text: TEXT }, 'other-movements-check-failed', QUESTION_CHECK_FAILED],
    ]
    for (const [check, hook, sentence] of cases) {
      const wrapper = mountQuestion(questionWith(check))
      expect(wrapper.get(`[data-test="${hook}"]`).text()).toBe(sentence)
      expect(isOff(wrapper)).toBe(true)
      wrapper.unmount()
    }

    // While a create travels it is off too.
    expect(isOff(mountQuestion(questionWith(), true))).toBe(true)
  })

  it('emits create on Create rule and dismiss on No only this one', async () => {
    const wrapper = mountQuestion()

    await wrapper.get(CREATE).trigger('click')
    const dismiss = wrapper.get('[data-test="other-movements-dismiss"]')
    expect(dismiss.text()).toBe('No, only this one')
    await dismiss.trigger('click')

    expect(wrapper.emitted('create')).toEqual([[]])
    expect(wrapper.emitted('dismiss')).toEqual([[]])

    // Off, a click says nothing.
    const off = mountQuestion(questionWith({ step: 'taken', text: TEXT }))
    await off.get(CREATE).trigger('click')
    expect(off.emitted('create')).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('paints the failure of a create inside the question', () => {
    const sentence = 'Nothing was saved: another rule already uses that text.'
    const wrapper = mountQuestion(questionWith(undefined, sentence))

    const error = wrapper
      .get('[data-test="other-movements-question"]')
      .get('[data-test="other-movements-error"]')
    expect(error.text()).toBe(sentence)
    expect(error.classes()).toContain('text-negative')
    expect(mountQuestion().find('[data-test="other-movements-error"]').exists()).toBe(false)
  })
})
