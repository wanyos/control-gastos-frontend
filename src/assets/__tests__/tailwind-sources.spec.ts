/**
 * @vitest-environment node
 *
 * Guards the Tailwind source whitelist declared in main.css: only application
 * code may decide what CSS ships. This asserts the effect on the real
 * production bundle rather than the shape of the config, because a grep for
 * `source('../')` would keep passing while the scan silently widened again.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { build } from 'vite'
import type { Rollup } from 'vite'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const srcDir = join(root, 'src') + sep

/**
 * Splits a class name so it never appears whole in this file. This spec lives
 * under src/, which Tailwind scans: written literally, a probe would be
 * emitted from this very file and the assertion could never fail.
 */
const probe = (...parts: string[]) => parts.join('')

/** Utilities that only documentation and harness reports mention. */
const CONTAMINANTS = [
  probe('bg-', 'chart-3'),
  probe('fill-', 'chart-3'),
  probe('text-', 'red-500'),
  probe('bg-', 'negative-subtle'),
  probe('cont', 'ainer'),
]

const SKIPPED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
])

const SCANNABLE_EXTENSIONS = new Set([
  '.md',
  '.json',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.html',
  '.css',
])

/** Every file Tailwind would read as plain text if the scan were unbounded. */
const scannableFilesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : scannableFilesUnder(full)
    return SCANNABLE_EXTENSIONS.has(extname(entry.name)) ? [full] : []
  })

const repoFiles = scannableFilesUnder(root)
const fileText = new Map(repoFiles.map((file) => [file, readFileSync(file, 'utf8')]))

/** Matches the name as a whole word, so `--container-max` is not a mention. */
const quotes = (text: string, name: string) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(text)

/** Matches the compiled selector, so `.text-ink-body` is not `.text-ink`. */
const emits = (css: string, name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(css)

const filesQuoting = (name: string, inside: boolean) =>
  repoFiles.filter(
    (file) => file.startsWith(srcDir) === inside && quotes(fileText.get(file) ?? '', name),
  )

let css = ''

beforeAll(async () => {
  const result = await build({ root, logLevel: 'silent', build: { write: false } })
  const outputs = [result].flat() as unknown as Rollup.RollupOutput[]

  css = outputs
    .flatMap((output) => output.output)
    .filter(
      (chunk): chunk is Rollup.OutputAsset =>
        chunk.type === 'asset' && chunk.fileName.endsWith('.css'),
    )
    .map((asset) => String(asset.source))
    .join('\n')
}, 180_000)

describe('tailwind source whitelist', () => {
  it('produces a stylesheet to assert on', () => {
    expect(css.length).toBeGreaterThan(0)
  })

  it.each(CONTAMINANTS)('%s is still a meaningful probe', (name) => {
    // A probe only proves something while it is quoted outside src/ and unused
    // inside it. Fail loudly instead of passing vacuously if that stops holding.
    expect(
      filesQuoting(name, false).length,
      `nothing outside src/ quotes ${name} any more; replace this probe`,
    ).toBeGreaterThan(0)
    expect(
      filesQuoting(name, true),
      `${name} is used inside src/, so its absence would prove nothing`,
    ).toEqual([])
  })

  it.each(CONTAMINANTS)('does not ship %s, quoted only outside the application source', (name) => {
    expect(emits(css, name), `${name} leaked into the bundle: the scan widened`).toBe(false)
  })

  it('still ships every utility App.vue uses', () => {
    const template = readFileSync(join(root, 'src', 'App.vue'), 'utf8')
    const used = (/class="([^"]*)"/.exec(template)?.[1] ?? '').split(/\s+/).filter(Boolean)

    expect(used.length).toBeGreaterThan(0)
    for (const name of used) {
      expect(emits(css, name), `App.vue uses ${name} but the bundle does not ship it`).toBe(true)
    }
  })
})
