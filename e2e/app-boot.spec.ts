import { test, expect } from '@playwright/test'

// App-boot smoke test (feature 6: e2e-smoke).
// Verifies real startup, not scaffold text: the app mounts, the shell applies
// the design system's background and typography, and nothing errors while
// loading. Runs against the dev server (5173, `pnpm test:e2e`) and against the
// production build served by preview (4173, CI mode).

// Avoid module-scope helpers that run in Node: functions called inside
// evaluate() must be declared there, in the browser context.

// Computed styles return colors as `rgb(r, g, b)`; normalize hex to compare.
function hexToRgb(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return hex.trim()
  const value = Number.parseInt(match[1]!, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgb(${r}, ${g}, ${b})`
}

// The net worth view requests the API on mount (feature 9). The smoke answers
// it with a small coherent sample so it proves the boot, not a running backend.
const NET_WORTH_SAMPLE = {
  asOf: '2026-09-12',
  total: '1500.00',
  accounts: {
    total: '1500.00',
    accounts: [
      { id: 1, iban: 'ES00', bank: 'n26', alias: 'Main', type: 'checking', balance: '1500.00' },
    ],
  },
  investments: { total: '0.00', products: [], issues: [] },
}

test('app boots: shell mounts with the design system applied and no console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))

  await page.route('**/api/net-worth', (route) => route.fulfill({ json: NET_WORTH_SAMPLE }))
  // The topbar asks for the pending Drive files on mount (feature 13).
  await page.route('**/api/ingestion/pending', (route) =>
    route.fulfill({ json: { totalPending: 0, banks: [] } }),
  )
  // The sidebar asks for the review count on mount (feature 15). Checked first:
  // without this route the proxy answers 502 and the smoke goes red.
  await page.route('**/api/movements*', (route) =>
    route.fulfill({
      json: {
        movements: [],
        pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
        totals: { income: '0.00', expense: '0.00', net: '0.00' },
      },
    }),
  )
  await page.goto('/')

  // The app really mounted: App.vue's shell is the only child of #app.
  const shell = page.locator('#app > div')
  await expect(shell).toHaveCount(1)

  const styles = await shell.evaluate((el) => {
    const readCssVar = (name: string): string => {
      const root = getComputedStyle(document.documentElement)
      const raw = root.getPropertyValue(name).trim()
      const ref = /^var\((--[\w-]+)\)$/.exec(raw)
      return ref ? root.getPropertyValue(ref[1]!).trim() : raw
    }
    const computed = getComputedStyle(el)
    return {
      background: computed.backgroundColor,
      surfaceApp: readCssVar('--surface-app'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      fontSans: readCssVar('--font-sans'),
    }
  })

  // How to know the design system is what you see (not a browser default).
  // Compare the shell's computed background-color against the design's
  // --surface-app token: if the design system's tokens ever stop loading or
  // stop applying, these diverge. No literal utility class is asserted, so the
  // check doesn't depend on (nor leak into) Tailwind's compiled CSS.
  expect(hexToRgb(styles.surfaceApp)).toBe(styles.background)

  // Typography: the design's --font-sans token is what the page uses.
  expect(styles.fontSans).toContain('Hanken Grotesk')
  expect(styles.bodyFont).toContain('Hanken Grotesk')

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
