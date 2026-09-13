/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the tab title and the project favicon (feature 11). index.html lives
// outside src/, so it is read from disk rather than rendered.

const rootDir = fileURLToPath(new URL('../../', import.meta.url))
const publicDir = fileURLToPath(new URL('../../public/', import.meta.url))
const read = (path: string) => readFileSync(path, 'utf8')

const html = read(`${rootDir}index.html`)

/** Every `<link rel="icon" | "apple-touch-icon">` with its attributes. */
const iconLinks = (): Array<Record<string, string>> =>
  [...html.matchAll(/<link\s([^>]*)>/g)]
    .map((match) =>
      Object.fromEntries(
        [...(match[1] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]]),
      ),
    )
    .filter((attrs) => attrs.rel === 'icon' || attrs.rel === 'apple-touch-icon')

describe('index.html', () => {
  it('titles the tab exactly "Control Accounts" and keeps lang="en"', () => {
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe('Control Accounts')
    expect(html).toMatch(/<html lang="en">/)
  })

  it('links an SVG favicon, a PNG fallback and an apple-touch-icon', () => {
    const links = iconLinks()
    expect(links).toContainEqual(
      expect.objectContaining({ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }),
    )
    expect(links).toContainEqual(
      expect.objectContaining({ rel: 'icon', href: '/favicon-32x32.png', type: 'image/png' }),
    )
    expect(links).toContainEqual(
      expect.objectContaining({ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }),
    )
  })

  it('only links icons that exist in public/, and no longer the Vue scaffold favicon.ico', () => {
    const missing = iconLinks()
      .map((link) => link.href ?? '')
      .filter((href) => !existsSync(`${publicDir}${href.replace(/^\//, '')}`))
    expect(missing).toEqual([])
    expect(html).not.toContain('favicon.ico')
    expect(existsSync(`${publicDir}favicon.ico`)).toBe(false)
  })
})

describe('public/favicon.svg', () => {
  const svg = read(`${publicDir}favicon.svg`)
  const logo = read(`${rootDir}design-system/assets/logo-mark.svg`)
  const withoutLabel = (source: string) => source.replace(/\saria-label="[^"]*"/, '').trim()

  it('is the design system logo mark (green variant), unchanged apart from its label', () => {
    expect(withoutLabel(svg)).toBe(withoutLabel(logo))
  })

  it('carries the English product name as its accessible label', () => {
    expect(svg).toContain('aria-label="Control Accounts"')
  })
})
