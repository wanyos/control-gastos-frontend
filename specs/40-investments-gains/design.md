# Design — F40 `investments-gains`

Contrato: `../gastos-backend/docs/api-contract.md` → «`GET /api/investments/gains`».
Arquitectura: `docs/architecture.md` (vista → store → service; tipos propios; la
carpeta `src/features/investments/` de la F39). Formato de cifras: `docs/conventions.md`
§Formato de cifras y fechas (todo pasa por `src/shared/money.ts`).

## 1. Qué cambia, en una frase

`InvestmentsView` deja de pedir `GET /api/investments/deposits` y de montar la tarjeta
`Deposits`, y pasa a pedir `GET /api/investments/gains` y a pintar tres piezas: la cifra
grande, la tarjeta `Your investments` (vivos) y la tarjeta `Closed` (cerrados). El
código de la tarjeta `Deposits` se borra.

## 2. Archivos

| Archivo | Qué |
|---|---|
| `src/features/investments/types.ts` | **Reescrito.** Quita los tipos de depósitos; añade los de §3. |
| `src/features/investments/service.ts` | **Reescrito.** `GAINS_PATH`, `parseInvestmentGains`, `getInvestmentGains`. Quita `DEPOSITS_PATH`, `parseDepositEarnings`, `getDepositEarnings`. |
| `src/features/investments/gains.ts` | **Nuevo.** Todo lo puro: orden, barra, textos, motivos (§4, §5). |
| `src/features/investments/store.ts` | **Reescrito.** `gains`, `gainsLoading`, `gainsError`, `loadGains`, `refreshGainsIfLoaded`. |
| `src/features/investments/components/GainsSummary.vue` | **Nuevo.** La cifra grande (props). |
| `src/features/investments/components/GainRow.vue` | **Nuevo.** Una fila, viva o cerrada (props). |
| `src/features/investments/components/GainBar.vue` | **Nuevo.** La barra a dos lados (props). |
| `src/features/investments/views/InvestmentsView.vue` | **Reescrito.** Carga, error con `Try again`, vacío, las tres piezas. |
| `src/features/investments/deposits.ts`, `components/DepositEarnings.vue`, `components/DepositRow.vue` | **Borrados.** |
| `src/features/investments/__tests__/deposits.spec.ts`, `DepositEarnings.spec.ts` | **Borrados.** |
| `src/features/investments/__tests__/fixtures.ts` | **Reescrito.** `investmentGains()` y variantes (§7). |
| `src/features/investments/__tests__/service.spec.ts`, `store.spec.ts`, `InvestmentsView.spec.ts` | **Reescritos.** |
| `src/features/investments/__tests__/gains.spec.ts`, `GainsSummary.spec.ts`, `GainRow.spec.ts` | **Nuevos.** |
| `src/shared/money.ts` + `src/shared/__tests__/money.spec.ts` | `formatPercentText` y `formatSignedMoney` (§4). |
| `src/features/import/store.ts` | Una línea: `refreshDepositsIfLoaded` → `refreshGainsIfLoaded`. |
| `src/features/import/__tests__/store.spec.ts`, `fixtures.ts` | La respuesta `deposits` pasa a `gains` (`/api/investments/gains`). |
| `e2e/investments.spec.ts` | **Reescrito** contra `gains` (§7). |
| `docs/architecture.md`, `docs/stack.md`, `docs/guia-de-uso.md` | Lo que esta feature vuelve falso (tasks, lote único). |

No se toca `src/features/net-worth/`, `src/router/`, `src/assets/` ni el backend. Los
tests de `net-worth` que comprueban que allí no hay tarjeta `Deposits` ni petición de
depósitos siguen pasando sin cambios.

## 3. Tipos (`types.ts`)

```ts
import type { DateOnly, DecimalString } from '@/shared/movements'

export type InvestmentType = 'fund' | 'etf' | 'managed_portfolio' | 'deposit'
export type GainsReason =
  | 'no_photo' | 'gain_not_reported' | 'gain_percent_not_reported'
  | 'maturity_not_found' | 'ambiguous' | 'below_principal' | 'missing_conditions'

/** A percent as the backend sends it ("4.07", "0.9", "-1.20"): never padded nor rounded here. */
export type PercentText = string

export interface DepositConditions {
  principal: DecimalString | null
  interestRate: PercentText | null
  expectedGain: DecimalString | null
  maturityDate: DateOnly | null
}

export interface GainsProduct {
  id: number
  bank: string
  name: string
  type: InvestmentType
  openedAt: DateOnly | null
  closedAt: DateOnly | null
  invested: DecimalString | null
  currentValue: DecimalString | null
  gain: DecimalString | null
  gainPercent: PercentText | null
  valuedAt: DateOnly | null
  reason: GainsReason | null
  /** Only on fund, etf and managed_portfolio (`null` allowed); absent on a deposit. */
  uninvestedCash?: DecimalString | null
  /** Only on a deposit. */
  conditions?: DepositConditions
}

export interface ClosedGainsProduct extends GainsProduct {
  closedOn: DateOnly
}

export interface ExcludedFromTotal {
  productId: number
  name: string
  reason: GainsReason
}

export interface InvestmentGains {
  asOf: DateOnly
  total: {
    gain: DecimalString
    invested: DecimalString
    gainPercent: PercentText | null
    excluded: ExcludedFromTotal[]
  }
  live: GainsProduct[]
  closed: ClosedGainsProduct[]
}
```

`uninvestedCash` se lee y se valida, pero **no se pinta** (no lo pidió el humano; ya
está en `Net Worth`).

## 4. Textos y formato (`gains.ts` y `shared/money.ts`)

**Formato, en `src/shared/money.ts`** (la regla del proyecto: ningún formateador suelto):

- `formatPercentText(value: string): string` — `"4.07"` → `4,07 %`, `"0.9"` → `0,9 %`,
  `"-1.20"` → `-1,20 %`, `"0.00"` → `0,00 %`. **Los decimales que llegan, ni uno más ni
  uno menos** (el contrato: una foto «sin rellenar ceros»; los calculados, siempre dos).
  Separador decimal `,`, miles con `.`, U+00A0 antes de `%`. Lanza `ValidationError` si
  no es `^-?\d+(\.\d+)?$`. Se construye con `Intl.NumberFormat('es-ES', { minimumFractionDigits: n, maximumFractionDigits: n, useGrouping: 'always' })`
  sobre el string, con `n` = decimales del string.
- `formatSignedMoney(amount)` — `formatMoney` con `+` delante si es mayor que cero.
  `"-5.00"` → `-5,00 €`, `"0.00"` → `0,00 €`.
- En `gains.ts`, `signedPercent(text)` — `+` delante de `formatPercentText` si el
  string es mayor que cero (comparado por su signo y sus dígitos, sin `Number()`).

**Textos de pantalla** (todos en `gains.ts`, salvo los de estado de la vista):

| Dónde | Texto |
|---|---|
| Etiqueta de la cifra grande | `Gain or loss on live investments` |
| Bajo la cifra | `on <formatMoney(total.invested)> put in` |
| Productos fuera del total | `Not included: <name> (<motivo>), <name> (<motivo>)` |
| `live` vacío y `closed` con algo | `No live investments right now.` (en lugar de la cifra) |
| Título de la tarjeta de vivos | `Your investments` |
| Título de la tarjeta de cerrados | `Closed` |
| Frase de la tarjeta de cerrados | `Not part of the total: when they closed, the money went back to your account.` |
| Tipo | `fund` → `Fund`, `etf` → `ETF`, `managed_portfolio` → `Managed portfolio`, `deposit` → `Fixed-term deposit` (los de `Net Worth`) |
| Datos de una fila viva | `Started <fecha>` · `Put in <importe>` · `Worth <importe> today` / `Worth <importe> on <fecha>` |
| Datos de una fila cerrada | `Started <fecha>` · `Closed <closedOn>` |
| Depósito vivo con cifras | `Counted day by day: <expectedGain> when it matures on <maturityDate>` |
| Depósito cancelado (cerrados) | `Cancelled before it matured` |
| Fuera del total (vivo, `gain` `null`) | `<motivo> · Not in the total` |
| Hueco | `—` |
| Cargando | `Loading your investments…` |
| Error | título `Couldn't load your investments`, el `message` del error y botón `Try again` |
| Vacío | `You have no investments yet.` |

**Motivos** (`reasonText(reason)`), en minúscula para ir dentro de paréntesis y al
principio de línea con mayúscula (`capitalize`):

| `reason` | Texto |
|---|---|
| `no_photo` | `no valuation on file` |
| `gain_not_reported` | `the valuation has no gain` |
| `gain_percent_not_reported` | `the valuation has no gain percent` |
| `maturity_not_found` | `its payment is not in your statement` |
| `ambiguous` | `several possible payments in your statement` |
| `below_principal` | `it paid back less than you put in` |
| `missing_conditions` | `its conditions are incomplete` |

Una fecha o un importe `null` en un texto se pinta `—` (`Started —`, `Worth —`). Las
fechas, con `formatDate`.

## 5. Lógica pura (`gains.ts`)

- `sortLive(live): GainsProduct[]` — copia ordenada: `gain` no nulo de mayor a menor
  comparando `toCents` (bigint), después los de `gain` `null`; orden estable (a igualdad,
  el de llegada).
- `barOf(product, live): { side: 'gain' | 'loss' | 'none'; permille: number }` — escala
  `max = mayor |toCents(gain)|` de los vivos con cifra. `permille` con `sharePermille`
  sobre los valores absolutos (string sin el `-`). `side: 'none'` y `0` si `gain` es
  `null`, si es cero o si `max` es cero. No es una cifra que se enseñe: solo un ancho.
- `toneOf(amount: DecimalString | null): 'positive' | 'negative' | 'neutral'` — por el
  signo de `toCents`; `null` → `neutral`.
- `liveFacts`, `closedFacts`, `depositLine`, `cancelledLine`, `excludedLine`,
  `typeLabel`, `reasonText`: los textos de §4.
- `cancelledLine(product)` devuelve texto solo si `type === 'deposit'`, hay
  `conditions.maturityDate` y `closedOn < maturityDate` (comparación de strings
  `YYYY-MM-DD`). Ningún día se cuenta en el frontend.

## 6. Service, store y vista

**Service** (`createValidators('GET /api/investments/gains')`). Rechaza con
`ValidationError`, nombrando el campo:

- un `type` fuera de los cuatro (R11);
- un `reason` fuera de la lista, o no `null`;
- un importe que no sea decimal de dos cifras o `null`; un porcentaje que no cumpla
  `^-?\d+(\.\d+)?$` o `null`;
- una entrada de `closed` sin `closedOn`;
- un depósito sin `conditions`;
- `total.gain` distinto de la suma (en céntimos) de los `gain` no nulos de `live` (R11).
  Como en la F38: se comprueba, nunca se corrige ni se recalcula.

No suma nada que se enseñe. `total.gainPercent` y cada `gainPercent` se pintan tal cual
llegan.

**Store** (`useInvestmentsStore`): `gains: InvestmentGains | null`,
`gainsLoading`, `gainsError: AppError | null`; `loadGains(client?)` nunca relanza;
`refreshGainsIfLoaded(client?)` solo pide si `gains !== null`. Mismo patrón que tenían
los depósitos.

**Vista**: pide `loadGains()` en `onMounted`. Orden de estados: cargando → error
(`BaseCard` con `Try again`, `BaseButton`, que llama a `loadGains()`) → vacío → contenido.
Contenido: `GainsSummary` (o `No live investments right now.`), tarjeta
`Your investments` con un `GainRow` por `sortLive(live)` (si `live` no está vacío),
tarjeta `Closed` con un `GainRow` por `closed` (si no está vacía).

**Componentes** (solo props, sin store):

- `GainsSummary` — `total`. Cifra en `font-mono tabular-nums`, tamaño de `StatCard`;
  color por `toneOf(total.gain)`: `text-positive` / `text-negative` / `text-ink-strong`.
- `GainRow` — `product`, `variant: 'live' | 'closed'`, `bar` (solo en vivos), `asOf`.
  En `closed`, todo el texto en `text-ink-muted`, ganancia con signo y sin color.
- `GainBar` — `side`, `permille`. Pista `bg-surface-sunken` a todo el ancho con una
  línea central (`bg-line-default`, 1px: `--border-default` sobre `--surface-sunken` ya
  está medido a 3:1 en `theme-dark.css`); relleno `bg-positive` desde el centro hacia la
  derecha o `bg-negative` hacia la izquierda, ancho `permille / 10 / 2` % del total.
  `aria-hidden="true"` (la cifra va escrita al lado). Clases completas y literales
  (Tailwind lee el código como texto).

`data-test` mínimos que usan los tests: `investments-view`, `gains-loading`,
`gains-error`, `gains-retry`, `gains-empty`, `gains-summary`, `gains-total`,
`gains-total-percent`, `gains-invested`, `gains-excluded`, `gains-no-live`,
`live-investments`, `closed-investments`, `gain-row`, `gain-name`, `gain-type`,
`gain-fact`, `gain-amount`, `gain-percent`, `gain-reason`, `gain-deposit-line`,
`gain-cancelled`, `gain-bar-fill`.

## 7. Datos de prueba

`fixtures.ts` → `investmentGains()`: el ejemplo del contrato con un producto más que
pierda, para que el orden y la barra se vean a los dos lados:

- `live` (orden del backend, `openedAt` ascendente): `Fondo Global` (`+500.50`,
  `4.07`, foto `2026-09-30`), `Cartera Indexada` (`managed_portfolio`, `-120.40`,
  `-2.1`, foto `2026-10-31`), `Deposito 12m` (`+185.85`, `1.86`, `valuedAt` = `asOf`),
  `ETF Mundo` (`no_photo`).
- `total`: `gain` `565.95` (= 500.50 − 120.40 + 185.85), `invested` y `gainPercent`
  coherentes (cualquier valor con dos decimales: el frontend no lo recalcula),
  `excluded` = ETF Mundo.
- `closed`: `Deposito 3m` (vencido, `+31.20`) y `Deposito 6m` (cancelado, `0.00`,
  `closedOn` anterior a su `maturityDate`).
- Orden esperado en pantalla: Fondo Global, Deposito 12m, Cartera Indexada, ETF Mundo.

`e2e/investments.spec.ts`: misma muestra; red de seguridad primero; responde
`/api/net-worth`, `/api/ingestion/pending`, `/api/movements*` y
`/api/investments/gains`. Entra por el menú, comprueba la cifra grande, el orden de
nombres, la tarjeta `Closed`, que **no** existe `deposit-earnings`, que
`GET /api/investments/gains` se pide una vez, que no se pide
`/api/investments/deposits`, y que todo son `GET`.

## 8. Alternativas descartadas

- **Mantener la tarjeta `Deposits` debajo de las listas.** Dos peticiones, y un
  depósito vivo saldría dos veces con cifras distintas (`Not earned yet` en la tarjeta,
  lo acumulado por días en la lista). Se pierde, al quitarla: el enlace
  `See in Movements`, el número de cobros posibles de un `ambiguous` y el importe
  devuelto de un `below_principal`. `gains` no los trae; el motivo sí.
- **Ordenar y escalar la barra por %.** Un depósito pequeño con 1,9 % saldría por
  encima de un fondo de 12.000 € con 1,5 %, y la barra no diría cuánto suma cada uno a
  la cifra grande, que es en euros.
- **Barra de progreso de días en el depósito vivo («day 246 of 364»).** El contrato no
  da los días; habría que contarlos en el frontend, con su zona horaria, y podría no
  cuadrar con la cifra del backend.
- **Recalcular el % del total o de una fila.** Prohibido por el contrato (ADR-012 del
  backend: la valoración se lee, no se calcula).
- **Un formateador de % en `gains.ts`.** La convención manda que todo formato de cifra
  pase por `shared/money.ts`.
