import { describe, it, expect, vi, afterEach } from 'vitest'

import { loadConfig } from '@/shared/config'
import { ConfigError } from '@/shared/errors'

describe('loadConfig (R1, R2, R3)', () => {
  it('builds a typed immutable AppConfig from a valid environment (R1)', () => {
    const config = loadConfig({ VITE_API_URL: 'http://localhost:3000' })

    expect(config.apiUrl).toBe('http://localhost:3000')
    expect(Object.isFrozen(config)).toBe(true)
  })

  it('throws a ConfigError naming the variable when it is missing (R2)', () => {
    expect(() => loadConfig({})).toThrowError(ConfigError)
    expect(() => loadConfig({})).toThrowError(/VITE_API_URL/)
  })

  it('throws a ConfigError naming the variable when it is empty (R2)', () => {
    const empty = { VITE_API_URL: '' }

    expect(() => loadConfig(empty)).toThrowError(ConfigError)
    expect(() => loadConfig(empty)).toThrowError(/VITE_API_URL/)
  })

  it('resolves a root-relative base against the page origin (feature 7)', () => {
    const config = loadConfig({ VITE_API_URL: '/' }, 'http://localhost:5173')

    expect(config.apiUrl).toBe('http://localhost:5173/')
    expect(new URL('/api/net-worth', config.apiUrl).toString()).toBe(
      'http://localhost:5173/api/net-worth',
    )
  })

  it('fails fast when the base is relative and there is no origin (feature 7)', () => {
    expect(() => loadConfig({ VITE_API_URL: '/' }, null)).toThrowError(ConfigError)
    expect(() => loadConfig({ VITE_API_URL: '/' }, null)).toThrowError(/VITE_API_URL is relative/)
  })

  it('throws a ConfigError with variable name and reason for an unparseable URL (R3)', () => {
    const invalid = { VITE_API_URL: 'no-es-una-url' }

    expect(() => loadConfig(invalid)).toThrowError(ConfigError)
    expect(() => loadConfig(invalid)).toThrowError(/VITE_API_URL is not a parseable URL/)
  })
})

describe('appConfig singleton evaluated at startup (R4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('module import fails with ConfigError when the environment is invalid', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()

    await expect(import('@/shared/config')).rejects.toThrowError(/VITE_API_URL/)
  })

  it('module import exposes the validated appConfig when the environment is valid', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.example.test')
    vi.resetModules()

    const { appConfig } = await import('@/shared/config')

    expect(appConfig.apiUrl).toBe('http://api.example.test')
  })
})
