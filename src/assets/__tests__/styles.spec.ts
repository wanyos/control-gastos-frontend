import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { describe, it, expect } from 'vitest'

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const mainCss = () => read('../main.css')
const copy = (file: string) => read(`../styles/${file}`)
const source = (file: string) => read(`../../../design-system/${file}`)

/** Extracts `--name: value` custom property declarations, ignoring comments. */
const declarations = (css: string): Record<string, string> => {
  const out: Record<string, string> = {}
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1]
    const value = match[2]
    if (name && value) out[name] = value.trim()
  }
  return out
}

/** The only renames allowed between design-system/ and our copy. */
const INK_RENAMES: Record<string, string> = {
  '--text-strong': '--ink-strong',
  '--text-body': '--ink-body',
  '--text-muted': '--ink-muted',
  '--text-faint': '--ink-faint',
  '--text-on-brand': '--ink-on-brand',
  '--text-on-dark': '--ink-on-dark',
  '--text-link': '--ink-link',
}

describe('global stylesheet wiring', () => {
  it('loads the webfonts before Tailwind, or the remote @import is dropped', () => {
    // Regression guard: fonts.css holds only a remote @import, which survives
    // the build solely while nothing precedes it. Reordering these silently
    // drops the webfonts and the app falls back to system-ui.
    const css = mainCss()

    expect(css.indexOf('./styles/fonts.css')).toBeLessThan(css.indexOf("@import 'tailwindcss'"))
  })

  it('imports the tokens after Tailwind so they override its default theme', () => {
    // Order is what makes --text-base render 14px instead of Tailwind's 16px.
    const css = mainCss()
    const tailwind = css.indexOf("@import 'tailwindcss'")

    for (const token of ['colors', 'typography', 'spacing', 'base']) {
      expect(css.indexOf(`./styles/tokens/${token}.css`)).toBeGreaterThan(tailwind)
    }
  })

  it('maps every theme entry to a token var instead of copying its value', () => {
    // Keeps design-system/ the single source of truth for values: a hardcoded
    // hex here would survive a re-copy and silently drift.
    const themeBlock = /@theme inline \{([\s\S]*)\}/.exec(mainCss())?.[1] ?? ''
    const entries = Object.entries(declarations(themeBlock))

    expect(entries.length).toBeGreaterThan(0)
    for (const [name, value] of entries) {
      expect(value, `${name} should map to a token var`).toMatch(/^var\(--[\w-]+\)$/)
    }
  })
})

describe('design system token copy', () => {
  it('copies the color tokens verbatim, renaming only the 7 text color aliases', () => {
    const expected: Record<string, string> = {}
    for (const [name, value] of Object.entries(declarations(source('tokens/colors.css')))) {
      expected[INK_RENAMES[name] ?? name] = value
    }

    expect(declarations(copy('tokens/colors.css'))).toEqual(expected)
  })

  it.each(['tokens/typography.css', 'tokens/spacing.css', 'fonts.css'])(
    'keeps %s byte-identical to the design system',
    (file) => {
      expect(copy(file)).toBe(source(file))
    },
  )

  it('keeps the type scale on the --text-* namespace Tailwind expects', () => {
    const typography = declarations(copy('tokens/typography.css'))

    expect(typography['--text-base']).toBe('0.875rem')
    expect(typography['--text-2xs']).toBe('0.6875rem')
  })

  it('points base.css at the renamed color aliases but keeps the size tokens', () => {
    const base = copy('tokens/base.css')

    expect(base).toContain('color: var(--ink-body)')
    expect(base).toContain('color: var(--ink-strong)')
    expect(base).toContain('font-size: var(--text-base)')
    // No color alias may still resolve through the --text-* namespace.
    for (const stale of Object.keys(INK_RENAMES)) {
      expect(base, `${stale} should have been renamed`).not.toContain(`var(${stale})`)
    }
  })

  it('leaves the design system reference untouched so it stays re-copyable', () => {
    const reference = declarations(source('tokens/colors.css'))

    expect(reference['--text-strong']).toBe('var(--neutral-900)')
    expect(reference['--ink-strong']).toBeUndefined()
  })
})
