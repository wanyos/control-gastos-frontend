import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import FileIssueList from '../components/FileIssueList.vue'
import ImportDetails from '../components/ImportDetails.vue'
import { issueFiles } from '../fileMessages'
import { importOutcome } from '../outcome'
import { parseImportReport } from '../service'
import type { ImportReport } from '../types'
import {
  CLEAN_REPORT,
  DETAILS_REPORT,
  EMPTY_REPORT,
  FULL_REPORT,
  IMPORTED_FILES_REPORT,
  THINGS_TO_CHECK_REPORTS,
} from './fixtures'

const mountDetails = (raw: unknown) =>
  mount(ImportDetails, { props: { report: parseImportReport(raw) } })

const sectionIds = (wrapper: ReturnType<typeof mountDetails>) =>
  wrapper
    .findAll('[data-test^="report-section-"]')
    .map((node) => node.attributes('data-test')?.replace('report-section-', ''))
    .filter((id) => id !== 'title' && id !== 'count')

async function unfoldAll(wrapper: ReturnType<typeof mountDetails>) {
  for (const details of wrapper.findAll('details')) {
    ;(details.element as HTMLDetailsElement).open = true
    details.element.dispatchEvent(new Event('toggle'))
  }
  await nextTick()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ImportDetails (R1, R2)', () => {
  it('paints every section in the fixed order', () => {
    const wrapper = mountDetails(DETAILS_REPORT)

    expect(sectionIds(wrapper)).toEqual([
      'final-passes',
      'mismatches',
      'unread',
      'transfers',
      'conflicts',
      'imported-files',
    ])
    expect(wrapper.get('h3').text()).toBe('Things to check')
  })

  it('starts every foldable section closed with the report totals as counts', () => {
    const wrapper = mountDetails(DETAILS_REPORT)

    const summaries = wrapper
      .findAll('details[data-test^="report-section-"]')
      .map((details) => [
        (details.element as HTMLDetailsElement).open,
        details.get('[data-test="report-section-title"]').text(),
        details.get('[data-test="report-section-count"]').text(),
      ])
    expect(summaries).toEqual([
      [false, 'Balance mismatches', '1'],
      [false, 'Unread lines', '1'],
      [false, 'Transfers to match', '1'],
      [false, 'Category rule conflicts', '1'],
      [false, 'Imported files', '3'],
    ])
  })

  it('keeps the final pass failures outside any fold', () => {
    const wrapper = mountDetails(DETAILS_REPORT)

    const failures = wrapper.get('[data-test="report-section-final-passes"]')
    expect(failures.element.tagName).not.toBe('DETAILS')
    expect(failures.element.closest('details')).toBeNull()
  })

  it('shows only Imported files, without the Things to check heading, on a clean report', () => {
    const wrapper = mountDetails(CLEAN_REPORT)

    expect(sectionIds(wrapper)).toEqual(['imported-files'])
    expect(wrapper.find('h3').exists()).toBe(false)
  })

  it('renders nothing for a report without files', () => {
    const wrapper = mountDetails(EMPTY_REPORT)

    expect(wrapper.find('[data-test="import-details"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})

describe('ImportDetails backs the "things to check" headline (R14)', () => {
  const Result = defineComponent({
    props: { report: { type: Object as () => ImportReport, required: true } },
    setup: (props) => () => [
      h(FileIssueList, { files: issueFiles(props.report) }),
      h(ImportDetails, { report: props.report }),
    ],
  })

  const WARNINGS = ['final-passes', 'mismatches', 'unread', 'transfers', 'conflicts']
    .map((id) => `[data-test="report-section-${id}"]`)
    .concat('[data-test="file-issue"]')
    .join(', ')

  it.each(THINGS_TO_CHECK_REPORTS)('shows something to check for %s', (_name, raw) => {
    const report = parseImportReport(raw)
    expect(importOutcome(report).headline).toBe('Imported, with a few things to check')

    const wrapper = mount(Result, { props: { report } })

    expect(wrapper.findAll(WARNINGS).length).toBeGreaterThan(0)
  })
})

describe('ImportDetails is read only (R12)', () => {
  it('has no buttons or links and makes no request, even with every section unfolded', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const wrapper = mountDetails(DETAILS_REPORT)

    await unfoldAll(wrapper)

    const details = wrapper.get('[data-test="import-details"]')
    expect(details.findAll('details').every((d) => (d.element as HTMLDetailsElement).open)).toBe(
      true,
    )
    expect(details.findAll('button')).toHaveLength(0)
    expect(details.findAll('a')).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('ImportDetails texts (R11, C1)', () => {
  it('does not show the anchored or filled balances totals as counters', async () => {
    const report = parseImportReport(IMPORTED_FILES_REPORT)
    const wrapper = mount(ImportDetails, { props: { report } })

    await unfoldAll(wrapper)

    const text = wrapper.text()
    expect(report.balanceFilledCount).toBe(4)
    expect(text).not.toContain(`${report.balanceFilledCount} saved balances`)
    expect(text).not.toMatch(/anchored/i)
    expect(text).toContain('3 saved balances filled in')
  })

  it('writes its own text in English, leaving the Spanish originals marked', async () => {
    const wrapper = mountDetails({ ...DETAILS_REPORT, files: FULL_REPORT.files })
    await unfoldAll(wrapper)

    const clone = wrapper.element.cloneNode(true) as HTMLElement
    expect(clone.querySelectorAll('[lang="es"]').length).toBeGreaterThan(0)
    clone.querySelectorAll('[lang="es"]').forEach((node) => node.remove())
    const own = clone.textContent ?? ''
    expect(own).not.toBe('')
    // Whole words: "imported" must not count as "importe".
    const words = own.toLowerCase().split(/[^\p{L}]+/u)
    expect(words).toContain('imported')
    for (const word of ['línea', 'importe', 'cuenta', 'traspaso']) {
      expect(words).not.toContain(word)
    }
  })
})
