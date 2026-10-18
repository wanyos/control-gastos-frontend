import { describe, it, expect } from 'vitest'

import { AppError, UNKNOWN } from '@/shared/errors'

import { parseSavedRule } from '../service'
import {
  KIND_LABEL,
  BANK_BOILERPLATE,
  MIN_MATCH_TEXT,
  MIN_PROPOSAL_LENGTH,
  applyErrorMessage,
  applySummaryLines,
  deleteErrorMessage,
  isMatchTextTooShort,
  lastApplyFigures,
  lastApplyHeadline,
  manualMatchesLine,
  needsRulesReload,
  normalizeMatchText,
  proposeMatchText,
  ruleCreatedLine,
  ruleErrorMessage,
  ruleSavedHeadline,
  showMovementsLabel,
  signedAmount,
  suggestedCountLine,
  suggestionsErrorMessage,
  wroteNothing,
} from '../rules'
import type { ApplyResult } from '../types'
import {
  ACADEMY_CREATED,
  ACADEMY_RULE,
  BACKEND_MESSAGES,
  CONFLICT_BODY,
  NOT_FOUND_BODY,
  VALIDATION_BODY,
  NOTHING_MOVED,
  httpError,
  networkError,
  saved,
  unreadable,
} from './fixtures'

const result = (overrides: Partial<ApplyResult> = {}): ApplyResult => ({
  categorized: 12,
  categorizedMovements: [],
  conflictCount: 1,
  conflicts: [],
  unmatched: 5,
  error: null,
  ...overrides,
})

describe('rules (R2, R4, R6, R9, R12, R13)', () => {
  describe('normalizeMatchText: the backend rule, copied', () => {
    it('drops accents, lowercases and trims, leaving inner spaces alone', () => {
      expect(normalizeMatchText('Café')).toBe('cafe')
      expect(normalizeMatchText('  ÁRBOL  ')).toBe('arbol')
      expect(normalizeMatchText('a  b')).toBe('a  b')
      expect(normalizeMatchText('Ñandú')).toBe('nandu')
    })
  })

  describe('proposeMatchText (R2)', () => {
    it('skips the bank paperwork and takes the first word that means something', () => {
      expect(proposeMatchText('RECIB /IBERDROLA CLIENTES, S.A')).toBe('iberdrola')
    })

    it('skips the words with digits in them too', () => {
      expect(proposeMatchText('COMPRA TARJ. 5540XXXXXXXX1234 MERCADONA VALENCIA')).toBe('mercadona')
    })

    it('normalizes before proposing', () => {
      expect(proposeMatchText('Almacén Ñandú')).toBe('almacen')
    })

    // `mega` alone would also match «ACADEMIA OMEGA SL»: the backend compares with
    // «contains». Seen against the real backend (T22).
    it('grows a short first word with what follows, until it is discriminating', () => {
      expect(proposeMatchText('MEGA DEPORTES')).toBe('mega deportes')
      expect(proposeMatchText('Café Ñandú')).toBe('cafe nandu')
    })

    it('takes the extra words verbatim, so the proposal is still inside the description', () => {
      const description = 'PAGO BAR - PEPE MADRID'
      const proposal = proposeMatchText(description)

      expect(proposal).toBe('bar - pepe')
      expect(normalizeMatchText(description)).toContain(proposal)
    })

    it('stops growing at a word with digits: those belong to one movement only', () => {
      expect(proposeMatchText('BAR 5540XXXXXXXX1234 PEPE')).toBe('bar')
    })

    it('leaves a first word that is already long enough alone', () => {
      expect(proposeMatchText('MERCADONA VALENCIA')).toBe('mercadona')
      expect(proposeMatchText('ALMACEN X')).toBe('almacen')
      expect(MIN_PROPOSAL_LENGTH).toBe(6)
    })

    it('falls back to the whole normalized description when no word qualifies', () => {
      expect(proposeMatchText('RECIBO 12/08')).toBe('recibo 12/08')
      expect(proposeMatchText('TRANS INM')).toBe('trans inm')
      expect(proposeMatchText('ANUL. /TPV VIRTUAL')).toBe('anul. /tpv virtual')
    })

    // Cabo 8: the words that say how you paid, and the punctuation around them, never
    // start the proposal.
    it('skips a cancellation code and its punctuation', () => {
      expect(proposeMatchText('ANUL. /VivaGym')).toBe('vivagym')
      expect(proposeMatchText('ANUL. /VIVA GYM')).toBe('viva gym')
    })

    it('skips the channel words of a transfer and of a card terminal', () => {
      expect(proposeMatchText('TRANS INM /PEPE GARCIA')).toBe('pepe garcia')
      expect(proposeMatchText('TRANSFERENCIA A FAVOR DE GIMNASIO CENTRAL')).toBe('gimnasio')
      expect(proposeMatchText('TPV VIRTUAL 1234 AMAZON')).toBe('amazon')
      expect(proposeMatchText('CONCEPTO BIZUM LIBRERIA NORTE')).toBe('libreria')
    })

    it('never proposes a word of the boilerplate list on its own', () => {
      for (const word of BANK_BOILERPLATE) {
        expect(proposeMatchText(`${word} ${word}`)).toBe(`${word} ${word}`)
      }
    })
  })

  describe('isMatchTextTooShort (R4)', () => {
    it('counts what the backend would store, not what was typed', () => {
      expect(isMatchTextTooShort(' ab ')).toBe(true)
      expect(isMatchTextTooShort(' á ')).toBe(true)
      expect(isMatchTextTooShort('abc')).toBe(false)
      expect(isMatchTextTooShort('Café')).toBe(false)
      expect(isMatchTextTooShort('')).toBe(true)
    })

    // The backend counts characters of the normalized text, inner spaces included
    // (`normalizeForMatch` + `minimumMatchTextLength`), so `a b` is three and it
    // takes it. Rejecting it here would make the screen stricter than the contract.
    it('accepts exactly what the backend accepts, spaces included', () => {
      expect(isMatchTextTooShort('á b')).toBe(false)
      expect(normalizeMatchText('á b')).toHaveLength(3)
    })

    it('agrees with the contract floor', () => {
      expect(MIN_MATCH_TEXT).toBe(3)
    })
  })

  describe('ruleErrorMessage (R6)', () => {
    const cases: [string, ReturnType<typeof httpError> | Error, string][] = [
      [
        '409',
        httpError(409, CONFLICT_BODY),
        'Nothing was saved: another rule already uses that text.',
      ],
      [
        '400',
        httpError(400, VALIDATION_BODY),
        'Nothing was saved: the text needs at least 3 letters or digits.',
      ],
      [
        '404',
        httpError(404, NOT_FOUND_BODY),
        'Nothing was saved: that category or rule no longer exists.',
      ],
      ['network', networkError(), "Couldn't reach the server. Nothing was saved."],
      [
        'unreadable',
        unreadable(),
        "The server answered, but the reply couldn't be read. Reloading the rules to show what really happened.",
      ],
      [
        'anything else',
        new AppError('boom', UNKNOWN),
        'Something went wrong. Reloading the rules to show what really happened.',
      ],
    ]

    it.each(cases)('says the right thing about a %s', (_name, error, expected) => {
      expect(ruleErrorMessage(error as AppError)).toBe(expected)
    })

    it('never paints the backend message', () => {
      for (const [, error] of cases) {
        const text = ruleErrorMessage(error as AppError)
        for (const spanish of BACKEND_MESSAGES) expect(text).not.toContain(spanish)
      }
    })
  })

  describe('deleteErrorMessage and needsRulesReload (R6, R9)', () => {
    it('treats a 404 as "it was already gone"', () => {
      expect(deleteErrorMessage(httpError(404, NOT_FOUND_BODY))).toBe('That rule no longer exists.')
    })

    it('says nothing changed when nothing could have', () => {
      expect(deleteErrorMessage(networkError())).toBe("Couldn't delete the rule. Nothing changed.")
      expect(deleteErrorMessage(httpError(400, VALIDATION_BODY))).toBe(
        "Couldn't delete the rule. Nothing changed.",
      )
    })

    it('reloads only when the failure could have written something', () => {
      expect(needsRulesReload(httpError(409, CONFLICT_BODY))).toBe(false)
      expect(needsRulesReload(httpError(400, VALIDATION_BODY))).toBe(false)
      expect(needsRulesReload(networkError())).toBe(false)
      expect(needsRulesReload(httpError(404, NOT_FOUND_BODY))).toBe(true)
      expect(needsRulesReload(unreadable())).toBe(true)
      expect(needsRulesReload(new AppError('boom', UNKNOWN))).toBe(true)
    })
  })

  describe('applyErrorMessage (R13)', () => {
    it('says the pass did not finish when the 200 carries an error', () => {
      expect(applyErrorMessage({ code: 'RULES_PASS_FAILED' })).toBe(
        "The rules pass didn't finish. Some movements may already be categorized. The review queue has been reloaded.",
      )
    })

    it('admits the request may have got through when the network failed', () => {
      expect(applyErrorMessage(networkError())).toBe(
        "Couldn't reach the server. If the request got through, some movements may be categorized. The review queue has been reloaded.",
      )
    })

    it('says the same about a 500 and about an answer it could not read', () => {
      const expected =
        'Something went wrong applying the rules. Some movements may already be categorized. The review queue has been reloaded.'
      expect(
        applyErrorMessage(httpError(500, { code: 'INTERNAL', message: 'Error interno' })),
      ).toBe(expected)
      expect(applyErrorMessage(unreadable())).toBe(expected)
    })

    it('never paints the backend message', () => {
      const failures = [
        { code: 'RULES_PASS_FAILED' },
        networkError(),
        unreadable(),
        httpError(500, { code: 'INTERNAL', message: 'La pasada falló a mitad' }),
      ]
      for (const failure of failures) {
        expect(applyErrorMessage(failure)).not.toContain('falló')
      }
    })
  })

  describe('applySummaryLines (R12)', () => {
    it('reads the three figures of a finished pass', () => {
      expect(applySummaryLines(result())).toEqual([
        '12 movements categorized',
        '5 still without a matching rule',
        '1 conflict',
      ])
    })

    it('gets the singular and the plural right', () => {
      expect(applySummaryLines(result({ categorized: 1, conflictCount: 3 }))).toEqual([
        '1 movement categorized',
        '5 still without a matching rule',
        '3 conflicts',
      ])
      expect(applySummaryLines(result({ categorized: 0, conflictCount: 0 }))[2]).toBe('0 conflicts')
    })
  })

  describe('the result left in view (feature 30, R5, R6)', () => {
    it('says at what time the rules were applied and how many movements were categorized', () => {
      expect(lastApplyHeadline(214, '10:42')).toBe(
        'Rules applied at 10:42: 214 movements categorized.',
      )
      expect(lastApplyHeadline(1, '09:05')).toBe('Rules applied at 09:05: 1 movement categorized.')
    })

    it('says with those words that no movements were categorized', () => {
      expect(lastApplyHeadline(0, '10:42')).toBe(
        'Rules applied at 10:42: no movements were categorized.',
      )
    })

    it('reads the other two figures in one line, with the singular of conflict', () => {
      expect(lastApplyFigures(result({ unmatched: 847, conflictCount: 3 }))).toBe(
        '847 still without a matching rule · 3 conflicts',
      )
      expect(lastApplyFigures(result())).toBe('5 still without a matching rule · 1 conflict')
      expect(lastApplyFigures(result({ unmatched: 0, conflictCount: 0 }))).toBe(
        '0 still without a matching rule · 0 conflicts',
      )
    })

    it('puts the minus sign on an expense and none on an income', () => {
      const movement = {
        movementId: 198,
        description: 'COMPRA SINTETICO COLMADO NORTE',
        bookingDate: '2026-08-11',
        amount: '41.37',
        categoryId: 4,
        categoryName: 'Supermercado',
        rules: [],
      }

      expect(signedAmount({ ...movement, type: 'expense' })).toBe('-41.37')
      expect(signedAmount({ ...movement, type: 'income' })).toBe('41.37')
      // Not what the contract sends, but it must not end up as `--41.37`.
      expect(signedAmount({ ...movement, type: 'expense', amount: '-41.37' })).toBe('-41.37')
    })
  })

  describe('suggested rules and what a saved rule moved (feature 33)', () => {
    const academy = parseSavedRule(ACADEMY_CREATED)

    it('writes the headline of a created or changed rule with how many it moved', () => {
      expect(ruleSavedHeadline(academy.rule, 'create', 73, '10:42')).toBe(
        'Rule “academia ficticia norte” → Educación created at 10:42: 73 movements categorized.',
      )
      expect(ruleSavedHeadline(academy.rule, 'update', 1, '09:05')).toBe(
        'Rule “academia ficticia norte” → Educación saved at 09:05: 1 movement categorized.',
      )
      expect(ruleSavedHeadline(academy.rule, 'create', 0, '10:42')).toBe(
        'Rule “academia ficticia norte” → Educación created at 10:42: no movements were categorized.',
      )
      expect(ruleCreatedLine(academy)).toBe(
        'Rule “academia ficticia norte” → Educación created: 3 movements categorized.',
      )
      expect(ruleCreatedLine(parseSavedRule(saved(ACADEMY_RULE, NOTHING_MOVED)))).toBe(
        'Rule “academia ficticia norte” → Educación created: no movements were categorized.',
      )
    })

    it('writes how many movements categorized by hand also contain the text', () => {
      expect(manualMatchesLine(3)).toBe(
        '3 movements you categorized by hand also contain this text. They will not move.',
      )
      expect(manualMatchesLine(1)).toBe(
        '1 movement you categorized by hand also contains this text. It will not move.',
      )
    })

    it('names the kind of a suggestion and how many movements it would take', () => {
      expect(KIND_LABEL.expense).toBe('Expenses')
      expect(KIND_LABEL.income).toBe('Income')
      expect(suggestedCountLine(73)).toBe('73 movements')
      expect(suggestedCountLine(1)).toBe('1 movement')
      expect(showMovementsLabel(73)).toBe('Show the 73 movements')
    })

    it('says in English why the suggested rules could not be loaded', () => {
      expect(suggestionsErrorMessage(networkError())).toBe("Couldn't reach the server.")
      expect(suggestionsErrorMessage(unreadable())).toBe(
        "The server answered, but the suggested rules couldn't be read.",
      )
      expect(suggestionsErrorMessage(httpError(500, CONFLICT_BODY))).toBe(
        'Something went wrong loading the suggested rules.',
      )
    })

    it('knows when the contract guarantees nothing was written', () => {
      expect(wroteNothing(httpError(400, VALIDATION_BODY))).toBe(true)
      expect(wroteNothing(httpError(404, NOT_FOUND_BODY))).toBe(true)
      expect(wroteNothing(httpError(409, CONFLICT_BODY))).toBe(true)
      expect(wroteNothing(networkError())).toBe(true)
      expect(wroteNothing(httpError(500, CONFLICT_BODY))).toBe(false)
      expect(wroteNothing(unreadable())).toBe(false)
    })
  })
})
