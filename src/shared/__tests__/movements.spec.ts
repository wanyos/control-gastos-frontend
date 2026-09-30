import { describe, it, expect } from 'vitest'

import { buildMovementsQuery } from '@/shared/movements'
import type { MovementQuery } from '@/shared/movements'

// The two parameters the backend added in its feature 49 and the statement started
// asking for in the feature 23. Everything else about `buildMovementsQuery` is covered
// where it was born, in `features/review/__tests__/service.spec.ts` (which re-exports
// it letter by letter); here only the pair that hides the noise.
describe('buildMovementsQuery: the two scopes of the noise switch (R1, R2)', () => {
  it('carries neither key when the switch is off: without them the backend filters nothing', () => {
    const query = buildMovementsQuery({ from: '2026-07-01', to: '2026-07-31', page: 1 })

    expect(query).toBe('from=2026-07-01&to=2026-07-31&page=1')
    expect(query).not.toContain('excluded')
    expect(query).not.toContain('transfer')
  })

  it('carries excluded=none AND transfer=none in the SAME request when it is on (R2)', () => {
    const query = buildMovementsQuery({
      from: '2026-07-01',
      to: '2026-07-31',
      excluded: 'none',
      transfer: 'none',
      page: 1,
      pageSize: 200,
    })

    expect(query).toBe(
      'from=2026-07-01&to=2026-07-31&excluded=none&transfer=none&page=1&pageSize=200',
    )
  })

  it('keeps them next to every other filter, not instead of them (R10)', () => {
    const query = buildMovementsQuery({
      accountId: 3,
      from: '2026-07-01',
      to: '2026-07-31',
      uncategorized: true,
      q: 'luz',
      excluded: 'none',
      transfer: 'none',
      page: 1,
      pageSize: 200,
    })

    expect(query).toBe(
      'accountId=3&from=2026-07-01&to=2026-07-31&uncategorized=true&q=luz&excluded=none&transfer=none&page=1&pageSize=200',
    )
  })

  it('sends only the one it was given', () => {
    expect(buildMovementsQuery({ excluded: 'only' })).toBe('excluded=only')
    expect(buildMovementsQuery({ transfer: 'only' })).toBe('transfer=only')
  })

  it('has no third value to send: only `only` and `none` type-check', () => {
    // @ts-expect-error the contract answers 400 to anything else, so it cannot be written
    const rejected: MovementQuery = { excluded: 'all' }

    expect(buildMovementsQuery(rejected)).toBe('excluded=all')
  })
})
