/** @vitest-environment node */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the dark theme (feature 10): values and contrast pairs are read from
// theme-dark.css itself, so the file and this check cannot drift apart.

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const srcDir = fileURLToPath(new URL('../../', import.meta.url))

const mainCss = read('../main.css')
const colorsCss = read('../styles/tokens/colors.css')
const themeCss = read('../theme-dark.css')

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const declarations = (css: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const match of stripComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (match[1] && match[2]) out[match[1]] = match[2].trim()
  }
  return out
}

const palette = declarations(colorsCss)
const theme = declarations(themeCss)
/** What the browser ends up with: the design system's tokens, then the theme on top. */
const tokens: Record<string, string> = { ...palette, ...theme }

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** Splits on commas that are not nested inside parentheses. */
const splitArgs = (args: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of args) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  return [...parts, current.trim()]
}

/** Resolves the value syntaxes the token files use: hex, rgba(), var() and srgb color-mix(). */
const resolve = (value: string): Rgba => {
  const v = value.trim()
  const ref = /^var\((--[\w-]+)\)$/.exec(v)
  if (ref?.[1]) {
    const target = tokens[ref[1]]
    if (target === undefined) throw new Error(`Unknown token ${ref[1]}`)
    return resolve(target)
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  const rgba = /^rgba?\(([^)]*)\)$/.exec(v)
  if (rgba?.[1]) {
    const [r = 0, g = 0, b = 0, a = 1] = rgba[1].split(',').map((part) => Number(part.trim()))
    return { r, g, b, a }
  }
  const mix = /^color-mix\(in srgb,(.*)\)$/.exec(v)
  if (mix?.[1]) {
    const [first = '', second = ''] = splitArgs(mix[1])
    const weighted = /^(.*)\s+([\d.]+)%$/.exec(first)
    if (!weighted?.[1] || !weighted[2]) throw new Error(`Unsupported color-mix: ${v}`)
    const p = Number(weighted[2]) / 100
    const x = resolve(weighted[1])
    const y = resolve(second)
    return {
      r: x.r * p + y.r * (1 - p),
      g: x.g * p + y.g * (1 - p),
      b: x.b * p + y.b * (1 - p),
      a: x.a * p + y.a * (1 - p),
    }
  }
  throw new Error(`Unsupported color value: ${v}`)
}

/** Paints `top` over an opaque `bottom`, the way the browser composites in sRGB. */
const over = (top: Rgba, bottom: Rgba): Rgba => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
})

/** WCAG 2.x relative luminance. */
const luminance = ({ r, g, b }: Rgba): number => {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrast = (x: Rgba, y: Rgba): number => {
  const [light, dark] = [luminance(x), luminance(y)].sort((a, b) => b - a) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

/** `--token` or `--token/70` (Tailwind's opacity modifier) as a color. */
const layer = (term: string): Rgba => {
  const [name = '', alpha] = term.split('/')
  const color = resolve(`var(${name})`)
  return alpha === undefined ? color : { ...color, a: color.a * (Number(alpha) / 100) }
}

interface Pair {
  line: string
  fg: string
  bg: string
  base?: string
  min: number
}

// Each minimum comes from its line (bank tile initials at 3: see theme-dark.css).
const PAIR =
  /contrast:\s*(--[\w-]+(?:\/\d+)?) on (--[\w-]+(?:\/\d+)?)(?: over (--[\w-]+))? >= ([\d.]+)/g
const pairs: Pair[] = [...themeCss.matchAll(PAIR)].map((m) => ({
  line: m[0],
  fg: m[1] ?? '',
  bg: m[2] ?? '',
  base: m[3],
  min: Number(m[4]),
}))

const ratioOf = ({ fg, bg, base }: Pair): number => {
  const background = base ? over(layer(bg), layer(base)) : layer(bg)
  expect(background.a, `${bg} is translucent: say what shows through with "over"`).toBe(1)
  return contrast(over(layer(fg), background), background)
}

/** Semantic tokens the Tailwind bridge exposes as color utilities (bg-*, text-*, border-*…). */
const bridgedColorTokens = (): string[] => {
  const themeBlock = /@theme inline \{([\s\S]*)\}/.exec(mainCss)?.[1] ?? ''
  return Object.entries(declarations(themeBlock))
    .filter(([name]) => name.startsWith('--color-'))
    .map(([, value]) => /^var\((--[\w-]+)\)$/.exec(value)?.[1] ?? value)
}

const tokenName = (term: string) => term.split('/')[0] ?? ''

describe('dark theme wiring', () => {
  it('is imported after the design system tokens, so its aliases win', () => {
    const themeAt = mainCss.indexOf("@import './theme-dark.css'")

    expect(themeAt).toBeGreaterThan(-1)
    for (const token of ['colors', 'typography', 'spacing', 'base']) {
      expect(themeAt).toBeGreaterThan(mainCss.indexOf(`./styles/tokens/${token}.css`))
    }
  })

  it('only redefines existing semantic aliases, through the design system palette', () => {
    const entries = Object.entries(theme)

    expect(entries.length).toBeGreaterThan(0)
    for (const [name, value] of entries) {
      expect(palette[name], `${name} is not a design system token`).toBeDefined()
      expect(name, `${name} is a raw palette step, not an alias`).not.toMatch(
        /^--(green|neutral|red|amber|blue|chart)-\d+$/,
      )
      expect(value, `${name} must reuse palette steps, not literal colors`).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i,
      )
    }
  })
})

describe('dark theme backgrounds', () => {
  // Nothing brighter than neutral-700 may paint a background: past that it reads as light.
  const ceiling = luminance(resolve('var(--neutral-700)'))
  const backgrounds = Object.keys(tokens).filter(
    (name) => name.startsWith('--surface-') || /^--(?!border-).*-subtle(-\d)?$/.test(name),
  )

  it.each(backgrounds)('%s is a dark tone', (name) => {
    const color = over(layer(name), layer('--surface-app'))

    expect(luminance(color)).toBeLessThanOrEqual(ceiling)
  })
})

describe('dark theme contrast (WCAG)', () => {
  it('declares the pairs to measure, none of them malformed', () => {
    // A typo would otherwise drop a pair from the check without a sound.
    const declared = themeCss.split('\n').filter((line) => /^\s*contrast:/.test(line))

    expect(pairs.length).toBeGreaterThan(20)
    expect(pairs).toHaveLength(declared.length)
  })

  it.each(pairs.map((pair) => [pair.line, pair] as const))('%s', (_line, pair) => {
    expect(ratioOf(pair)).toBeGreaterThanOrEqual(pair.min)
  })

  it('measures every color token the Tailwind bridge exposes', () => {
    // A new alias in main.css (and so a new utility) must come with its pair.
    const measured = new Set(pairs.flatMap((pair) => [pair.fg, pair.bg].map(tokenName)))

    for (const token of bridgedColorTokens()) {
      expect([...measured], `${token} has no contrast pair in theme-dark.css`).toContain(token)
    }
  })
})

describe('components stay on semantic tokens', () => {
  const vueFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return vueFiles(full)
      return entry.name.endsWith('.vue') ? [full] : []
    })

  const HUES =
    'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|' +
    'blue|indigo|violet|purple|fuchsia|pink|rose'
  // Literal colors, and Tailwind's stock palette utilities (white, black, slate 500…).
  const RAW_COLORS = [
    /#[0-9a-f]{3,8}\b/i,
    /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i,
    new RegExp(String.raw`\b(?:bg|text|border|fill|stroke|ring)-(?:white|black|(?:${HUES})-\d+)\b`),
  ]

  it.each(vueFiles(srcDir).map((file) => [file.slice(srcDir.length), file] as const))(
    '%s has no raw colors',
    (_name, file) => {
      const source = readFileSync(file, 'utf8')

      for (const pattern of RAW_COLORS) expect(source).not.toMatch(pattern)
    },
  )
})
