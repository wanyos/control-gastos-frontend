import { vi } from 'vitest'

// Raw API payloads for the transfers tests (feature 24), shaped like
// gastos-backend/docs/api-contract.md → GET /api/transfers[/ambiguous]. They stay raw
// JSON: the tests push them through the service, which is what proves the boundary.
//
// The two fines and the three good pairs carry the ids and booking dates of real
// movements read (GET only) on 2026-10-02; the IBANs are made up, and the Bizum
// descriptions of the fines carry nobody's name: no test needs more than the word.
// The doubtful groups are fabricated: the real data had none.

const BANKINTER = {
  id: 19532,
  iban: 'ES0000000000000000002314',
  bank: 'bankinter',
  alias: 'bankinter ···2314',
  type: 'checking',
}
const N26 = {
  id: 14788,
  iban: 'DE00000000000000004136',
  bank: 'n26',
  alias: 'n26 ···4136',
  type: 'checking',
}
const OPENBANK = {
  id: 16563,
  iban: 'ES0000000000000000004073',
  bank: 'openbank',
  alias: 'openbank ···4073',
  type: 'checking',
}

type Raw = Record<string, unknown>

const leg = (
  id: number,
  type: 'expense' | 'income',
  account: typeof BANKINTER,
  bookingDate: string,
  amount: string,
  description: string,
  transferId: string,
  extra: Raw = {},
): Raw => ({
  id,
  type,
  bookingDate,
  valueDate: bookingDate,
  amount,
  description,
  balanceAfter: null,
  currency: 'EUR',
  note: null,
  accountId: account.id,
  account,
  categoryId: null,
  category: null,
  paymentMethod: null,
  origin: 'imported',
  status: 'pending_review',
  excludedFromTotals: false,
  transferId,
  daySequence: 1,
  createdAt: '2026-09-11T19:23:40.908Z',
  updatedAt: '2026-09-11T19:23:50.206Z',
  ...extra,
})

const pair = (transferId: string, expense: Raw, income: Raw): Raw => ({
  transferId,
  movements: [expense, income],
})

/** The 100,00 € fine: paid from n26, paid back by somebody else's Bizum to openbank. */
export const FINE_100_ID = 'fine-100'
export const FINE_100 = pair(
  FINE_100_ID,
  leg(33339, 'expense', N26, '2025-06-30', '100.00', 'AYTO MADRID PAGO INTER', FINE_100_ID),
  leg(
    24377,
    'income',
    OPENBANK,
    '2025-06-27',
    '100.00',
    'BIZUM DE <persona> CONCEPTO multa',
    FINE_100_ID,
  ),
)

/** The 50,00 € fine, same story. */
export const FINE_50_ID = 'fine-50'
export const FINE_50 = pair(
  FINE_50_ID,
  leg(33108, 'expense', N26, '2024-09-14', '50.00', 'DGT SANCIONES INTERNET', FINE_50_ID),
  leg(
    24441,
    'income',
    OPENBANK,
    '2024-09-17',
    '50.00',
    'BIZUM DE <persona> CONCEPTO multa',
    FINE_50_ID,
  ),
)

export const GOOD_1_ID = '1112afec-c0c5-46e4-a712-3c009e50b89a'
export const GOOD_1 = pair(
  GOOD_1_ID,
  leg(42369, 'expense', BANKINTER, '2026-09-09', '1000.00', 'TRANS INM/ N26', GOOD_1_ID),
  leg(42519, 'income', N26, '2026-09-09', '1000.00', 'JUAN JOSE ROMERO RAMOS - INGRESO', GOOD_1_ID),
)

export const GOOD_2_ID = '016b67aa-76d5-4388-92cb-f213edb127a2'
export const GOOD_2 = pair(
  GOOD_2_ID,
  leg(42377, 'expense', BANKINTER, '2026-08-25', '1000.00', 'TRANS INM/ Openbank', GOOD_2_ID),
  leg(
    42526,
    'income',
    OPENBANK,
    '2026-08-25',
    '1000.00',
    'TRANSFERENCIA INMEDIATA DE JUAN JOSE ROMERO RAMOS CONCEPTO INGRESO ING',
    GOOD_2_ID,
  ),
)

export const GOOD_3_ID = '05f79ffa-895d-4da3-b9ea-e9094c6a6f94'
export const GOOD_3 = pair(
  GOOD_3_ID,
  leg(42383, 'expense', BANKINTER, '2026-08-06', '1000.00', 'TRANS INM/ N26', GOOD_3_ID),
  leg(21906, 'income', N26, '2026-08-04', '1000.00', 'JUAN JOSE ROMERO RAMOS - INGRESO', GOOD_3_ID),
)

export const GOOD_PAIRS = [GOOD_1, GOOD_2, GOOD_3]

/** Four pairs in the backend's order: the fine sits third, among the good ones. */
export const FOUR_PAIRS = { pairs: [GOOD_1, GOOD_2, FINE_100, GOOD_3] }
export const NO_PAIRS = { pairs: [] }

/** The same pair with some legs marked as not counted. */
export const marked = (raw: Raw, out: boolean, into: boolean): Raw => {
  const [expense, income] = raw.movements as [Raw, Raw]
  return {
    ...raw,
    movements: [
      { ...expense, excludedFromTotals: out },
      { ...income, excludedFromTotals: into },
    ],
  }
}

const doubtful = (
  id: number,
  type: 'expense' | 'income',
  account: typeof BANKINTER,
  bookingDate: string,
  description: string,
): Raw => ({
  id,
  accountId: account.id,
  accountAlias: account.alias,
  type,
  bookingDate,
  description,
})

/** Fabricated: the simplest group, one out and one in, different accounts. */
export const GROUP_OF_2 = {
  amount: '250.00',
  movements: [
    doubtful(701, 'expense', BANKINTER, '2026-08-01', 'TRANSFERENCIA'),
    doubtful(702, 'income', N26, '2026-08-09', 'ABONO'),
  ],
}

/** Fabricated: one out and two candidates in (the contract's own example shape). */
export const GROUP_OF_3 = {
  amount: '500.00',
  movements: [
    doubtful(812, 'expense', BANKINTER, '2026-08-01', 'TRANSFERENCIA'),
    doubtful(840, 'income', OPENBANK, '2026-08-01', 'TRANSFERENCIA RECIBIDA'),
    doubtful(841, 'income', N26, '2026-08-02', 'ABONO'),
  ],
}

/**
 * Fabricated: two outs and two ins, interleaved, and one in (904) lives in the same
 * account as one out (901) — the pair the contract would answer 400 to.
 */
export const GROUP_OF_4 = {
  amount: '300.00',
  movements: [
    doubtful(901, 'expense', BANKINTER, '2026-07-01', 'TRASPASO A'),
    doubtful(903, 'income', N26, '2026-07-01', 'INGRESO A'),
    doubtful(902, 'expense', OPENBANK, '2026-07-02', 'TRASPASO B'),
    doubtful(904, 'income', BANKINTER, '2026-07-02', 'INGRESO B'),
  ],
}

/** Fabricated and not something the contract produces: only one column has movements. */
export const GROUP_ONE_SIDED = {
  amount: '75.00',
  movements: [
    doubtful(951, 'expense', BANKINTER, '2026-06-01', 'TRASPASO'),
    doubtful(952, 'expense', OPENBANK, '2026-06-01', 'TRASPASO'),
  ],
}

export const ambiguous = (...groups: Raw[]): Raw => ({
  ambiguousCount: groups.length,
  ambiguous: groups,
})
export const NO_AMBIGUOUS = ambiguous()

/** The 201 of `POST /api/transfers`. */
export const linked = (transferId: string): Raw => ({ transferId, movements: [] })

/** The backend's own error bodies, in Spanish as the real ones. */
export const NOT_FOUND_BODY = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Ningún movimiento lleva ese transferId',
}
export const CONFLICT_BODY = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Alguna de las dos piernas ya tiene transferId',
}
export const VALIDATION_BODY = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'Las dos piernas son de la misma cuenta',
}
export const SERVER_ERROR_BODY = {
  statusCode: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Error interno',
}

/** Every Spanish backend message above: none may ever reach the screen. */
export const BACKEND_MESSAGES = [
  NOT_FOUND_BODY.message,
  CONFLICT_BODY.message,
  VALIDATION_BODY.message,
  SERVER_ERROR_BODY.message,
]

type Answer = () => Promise<Response>

export const json =
  (body: unknown, status = 200): Answer =>
  () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

export const noContent: Answer = () => Promise.resolve(new Response(null, { status: 204 }))

export const networkDown: Answer = () => Promise.reject(new TypeError('Failed to fetch'))

/** A response that only arrives when the test says so. */
export function deferred() {
  let resolve: (response: Response) => void = () => {}
  const promise = new Promise<Response>((r) => {
    resolve = r
  })
  return { answer: () => promise, resolve }
}

export interface ApiCall {
  method: string
  path: string
  /** The body exactly as it travelled, so a test can read it letter by letter. */
  rawBody?: string
}

export const TRANSFERS = '/api/transfers'
export const AMBIGUOUS = '/api/transfers/ambiguous'

/**
 * Mocks the HTTP boundary and records every call. Anything that is not one of the four
 * calls of the feature is rejected, so nothing can leave towards a real backend.
 */
export function mockApi(answers: {
  pairs?: Answer
  ambiguous?: Answer
  link?: Answer
  unlink?: Answer
}) {
  const calls: ApiCall[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const rawBody = typeof init?.body === 'string' ? init.body : undefined
    calls.push({ method, path: url.pathname, rawBody })
    if (method === 'GET' && url.pathname === TRANSFERS) return (answers.pairs ?? json(NO_PAIRS))()
    if (method === 'GET' && url.pathname === AMBIGUOUS) {
      return (answers.ambiguous ?? json(NO_AMBIGUOUS))()
    }
    if (method === 'POST' && url.pathname === TRANSFERS && answers.link) return answers.link()
    if (method === 'DELETE' && url.pathname.startsWith(`${TRANSFERS}/`) && answers.unlink) {
      return answers.unlink()
    }
    return Promise.reject(new TypeError(`unexpected ${method} ${url.pathname}`))
  })
  return {
    calls,
    /** `METHOD path` of every call, in order. */
    log: () => calls.map((call) => `${call.method} ${call.path}`),
    reads: (path: string) => calls.filter((c) => c.method === 'GET' && c.path === path).length,
    writes: () => calls.filter((call) => call.method !== 'GET'),
  }
}
