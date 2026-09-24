import { describe, it, expect } from 'vitest'

import { AppError, UNKNOWN } from '@/shared/errors'

import {
  BROAD_MATCH_LIMIT,
  MAX_PREVIEW_TEXT,
  MAX_PROPOSAL_WORDS,
  PREVIEW_SAMPLE_SIZE,
  canPreview,
  matchCountLine,
  matchWarning,
  normalizeMatchText,
  previewErrorMessage,
  previewQuery,
  proposeMatchText,
} from '../rules'
import { BACKEND_MESSAGES, httpError, networkError, unreadable, VALIDATION_BODY } from './fixtures'

// The pure half of the match preview (feature 18): what can be asked, what travels,
// what the dialog says, and the proposal table of design.md §7. No state, no HTTP.

describe('the match preview, pure part (R1, R2, R3, R5, R6, R10, R13, R14, R15)', () => {
  describe('canPreview (R2)', () => {
    it('needs the three characters the contract needs to store the rule', () => {
      expect(canPreview('ab')).toBe(false)
      expect(canPreview(' á ')).toBe(false)
      expect(canPreview('')).toBe(false)
      expect(canPreview('abc')).toBe(true)
      expect(canPreview('Café')).toBe(true)
    })

    it('stops at the ceiling of `q`, measured over the text as typed', () => {
      expect(MAX_PREVIEW_TEXT).toBe(100)
      expect(canPreview('a'.repeat(100))).toBe(true)
      expect(canPreview('a'.repeat(101))).toBe(false)
      // Trailing spaces count for the ceiling, as the backend counts them.
      expect(canPreview(`${'a'.repeat(99)}  `)).toBe(false)
    })
  })

  describe('previewQuery (R1)', () => {
    it('asks only for what a pass would really look at', () => {
      expect(previewQuery('  mercadona  ', 'expense')).toEqual({
        status: 'pending_review',
        uncategorized: true,
        type: 'expense',
        q: 'mercadona',
        page: 1,
        pageSize: PREVIEW_SAMPLE_SIZE,
      })
    })

    it('follows the kind of the chosen category, never crossing expense and income', () => {
      expect(previewQuery('nomina', 'income').type).toBe('income')
    })

    it('never carries categoryId: with uncategorized that is a 400', () => {
      expect(previewQuery('mercadona', 'expense')).not.toHaveProperty('categoryId')
    })

    it('asks for five examples in the same request that brings the total', () => {
      expect(PREVIEW_SAMPLE_SIZE).toBe(5)
      expect(previewQuery('mercadona', 'expense').pageSize).toBe(5)
    })
  })

  describe('matchCountLine (R3)', () => {
    it('speaks in the present about what is being looked at, with singular and plural', () => {
      expect(matchCountLine(34)).toBe('34 pending movements without a category contain this text.')
      expect(matchCountLine(1)).toBe('1 pending movement without a category contains this text.')
      expect(matchCountLine(0)).toBe('0 pending movements without a category contain this text.')
    })
  })

  describe('matchWarning (R5, R6)', () => {
    it('warns above the broad limit and says nothing just below it', () => {
      expect(BROAD_MATCH_LIMIT).toBe(50)
      expect(matchWarning(51)).toBe('That is a lot — check the examples below before you save.')
      expect(matchWarning(50)).toBeNull()
      expect(matchWarning(1)).toBeNull()
    })

    it('says so when nothing matches', () => {
      expect(matchWarning(0)).toBe(
        'Nothing pending without a category contains this text right now.',
      )
    })
  })

  describe('previewErrorMessage (R10)', () => {
    const cases: [string, AppError, string][] = [
      ['network', networkError(), "Couldn't reach the server, so the count is unknown."],
      ['unreadable', unreadable(), "The server answered, but the count couldn't be read."],
      ['400', httpError(400, VALIDATION_BODY), 'The backend rejected that search.'],
      ['anything else', new AppError('boom', UNKNOWN), "Couldn't check how many match."],
    ]

    it.each(cases)('explains a %s failure in English', (_name, error, sentence) => {
      expect(previewErrorMessage(error)).toBe(sentence)
    })

    it('never paints the message of the backend, which comes in Spanish', () => {
      for (const [, error] of cases) {
        for (const spanish of BACKEND_MESSAGES) {
          expect(previewErrorMessage(error)).not.toContain(spanish)
        }
      }
    })
  })

  // The table of design.md §7, verbatim: the four that change with the new rule and
  // the four that must keep proposing exactly what they propose today (R15).
  describe('proposeMatchText, the whole table of design §7 (R13, R14, R15)', () => {
    const table: [string, string][] = [
      ['AB Servicios Selecta E', 'servicios selecta'],
      ['TPV VIRTUAL', 'tpv virtual'],
      ['TPV VIRTUAL 1234 AMAZON MARKETPLACE', 'amazon'],
      ['JUAN JOSE ROMERO RAMOS - INGRESO', 'juan jose romero'],
      ['RECIB /IBERDROLA CLIENTES, S.A', 'iberdrola'],
      ['COMPRA TARJ. MERCADONA', 'mercadona'],
      ['MEGA DEPORTES', 'mega deportes'],
      ['TULOTERO', 'tulotero'],
    ]

    it.each(table)('proposes %s → %s', (description, proposal) => {
      expect(proposeMatchText(description)).toBe(proposal)
    })

    it('keeps every proposal contained in the normalized description', () => {
      for (const [description] of table) {
        expect(normalizeMatchText(description)).toContain(proposeMatchText(description))
      }
    })

    it('grows past a generic word even when it is already long enough (R14)', () => {
      expect(proposeMatchText('SERVICIOS SELECTA')).toBe('servicios selecta')
      expect(proposeMatchText('GRUPO AMAZON')).toBe('grupo amazon')
    })

    it('stops at four words, however generic the description is (R14)', () => {
      expect(MAX_PROPOSAL_WORDS).toBe(4)
      expect(proposeMatchText('GRUPO NUEVO SERVICIOS GENERAL CENTRO')).toBe(
        'grupo nuevo servicios general',
      )
    })

    it('skips the channel words and keeps the shop behind them (R13)', () => {
      expect(proposeMatchText('TPV VIRTUAL 1234 AMAZON')).toBe('amazon')
      expect(proposeMatchText('COMPRA INTERNET WEB REPSOL')).toBe('repsol')
    })

    it('still stops at a word with digits, generic or not', () => {
      expect(proposeMatchText('JOSE 1234 ROMERO')).toBe('jose')
    })

    it('falls back to the whole description when every word is skipped', () => {
      expect(proposeMatchText('TPV VIRTUAL')).toBe('tpv virtual')
      expect(proposeMatchText('INGRESO EFECTIVO')).toBe('ingreso efectivo')
    })
  })
})
