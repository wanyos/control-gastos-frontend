import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import FileIssueList from '../components/FileIssueList.vue'
import { issueFiles } from '../fileMessages'
import { parseImportReport } from '../service'
import { CLEAN_REPORT, FULL_REPORT, SKIPPED_FILE, STATEMENT_MISSING_ACCOUNT } from './fixtures'

const mountIssues = (raw: unknown) =>
  mount(FileIssueList, { props: { files: issueFiles(parseImportReport(raw)) } })

describe('FileIssueList (R10)', () => {
  it('lists every failed and skipped file under Needs attention', () => {
    const wrapper = mountIssues(FULL_REPORT)

    expect(wrapper.get('h3').text()).toBe('Needs attention')
    const issues = wrapper.findAll('[data-test="file-issue"]')
    expect(issues).toHaveLength(4)
    const first = issues[0]
    expect(first?.text()).toContain('MyInvestor · 2026')
    expect(first?.get('[data-test="file-issue-name"]').text()).toBe('extracto.csv')
    expect(first?.get('[data-test="file-issue-message"]').text()).toBe(
      "The file has no IBAN and its bank doesn't have exactly one account yet. Add the IBAN to the file once.",
    )
    expect(issues[3]?.get('[data-test="file-issue-message"]').text()).toBe(
      "This bank or file type isn't supported yet.",
    )
  })

  it('folds the original backend message into a closed Details marked as Spanish', () => {
    const wrapper = mountIssues(FULL_REPORT)

    const [first, noError, , skipped] = wrapper.findAll('[data-test="file-issue"]')
    if (!first) throw new Error('no file issue rendered')
    const details = first.get('details')
    expect((details.element as HTMLDetailsElement).open).toBe(false)
    expect(details.get('summary').text()).toBe('Details')
    const original = details.get('[data-test="file-issue-details"]')
    expect(original.attributes('lang')).toBe('es')
    expect(original.text()).toBe(STATEMENT_MISSING_ACCOUNT.error.message)
    expect(skipped?.get('[data-test="file-issue-details"]').text()).toBe(SKIPPED_FILE.reason)
    expect(noError?.find('details').exists()).toBe(false)
  })

  it('renders nothing without files', () => {
    const wrapper = mountIssues(CLEAN_REPORT)

    expect(wrapper.find('[data-test="file-issues"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
