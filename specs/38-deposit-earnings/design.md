# Design — F38 `deposit-earnings`

Se apoya en `docs/architecture.md` (ADR-001 por feature, ADR-002 service aislado, ADR-003
errores) y en `docs/conventions.md` (textos en inglés, cifras desde el string decimal,
solo alias de color del tema oscuro). Todo vive en `src/features/net-worth/`: es una parte
más de esa pantalla. No se importa nada de otra feature y nada de `shared/` cambia.

## 1. Archivos

**Nuevos**

| Archivo | Qué es |
|---|---|
| `src/features/net-worth/deposits.ts` | Funciones puras: textos de cada estado, columna de lo ganado, fecha con su verbo, motivo del dudoso, destino del enlace |
| `src/features/net-worth/components/DepositEarnings.vue` | La tarjeta `Deposits`: carga, error, vacío, total con su frase y la lista |
| `src/features/net-worth/components/DepositRow.vue` | Una fila de depósito |
| `src/features/net-worth/__tests__/deposits.spec.ts` | Tests de `deposits.ts` |
| `src/features/net-worth/__tests__/DepositEarnings.spec.ts` | Tests de la tarjeta montada con props y el router en memoria |

**Modificados**

| Archivo | Cambio |
|---|---|
| `src/features/net-worth/types.ts` | Tipos de §2 |
| `src/features/net-worth/service.ts` | `DEPOSITS_PATH`, `parseDepositEarnings`, `getDepositEarnings` (§3) |
| `src/features/net-worth/store.ts` | Estado y carga de depósitos dentro de `load()` (§5) |
| `src/features/net-worth/views/NetWorthView.vue` | Monta `DepositEarnings` debajo de `Details` (§6) |
| `src/features/net-worth/__tests__/fixtures.ts` | Respuestas de depósitos (§7) |
| `src/features/net-worth/__tests__/service.spec.ts`, `store.spec.ts`, `NetWorthView.spec.ts` | Tests nuevos y los que contaban «una sola petición» pasan a contar dos y a responder por URL |
| `src/features/import/__tests__/store.spec.ts` | Test de R14; y responder la ruta nueva si su imitación de `fetch` falla con rutas desconocidas |
| `src/shared/components/__tests__/AppShell.spec.ts` | Solo si su imitación de `fetch` falla con la ruta nueva: responderla. Nada más |
| Los specs de `e2e/` que responden `**/api/net-worth` | Responder también `**/api/investments/deposits` (§8) |
| `docs/guia-de-uso.md`, `docs/architecture.md` | §9 |

`src/features/import/store.ts` **no cambia**: ya llama a `netWorthStore.load(client)` tras
importar si el patrimonio estaba cargado, y `load()` pasa a pedir también los depósitos.

## 2. Tipos (`types.ts`)

```ts
export type DepositStatus =
  | 'active' | 'matured' | 'cancelled'
  | 'maturity_not_found' | 'ambiguous' | 'below_principal'

export interface DepositMaturity {
  movementId: number
  date: DateOnly
  amount: DecimalString
}

export interface DepositEarning {
  id: number
  bank: string
  name: string
  openedAt: DateOnly | null
  closedAt: DateOnly | null
  principal: DecimalString | null
  expectedGain: DecimalString | null
  maturityDate: DateOnly | null
  status: DepositStatus
  /** Only on `matured`; `null` on every other status. Never a zero standing in for a gap. */
  earned: DecimalString | null
  /** On `matured` and `below_principal`. */
  maturity: DepositMaturity | null
  /** Ascending; non-empty only on `ambiguous`. */
  candidateMovementIds: number[]
}

export interface DepositEarnings {
  asOf: DateOnly
  deposits: DepositEarning[]
  /** Sum of `earned` of the `matured` entries, as the backend sends it. Never summed here into anything. */
  total: DecimalString
}
```

## 3. Service (`service.ts`)

```ts
export const DEPOSITS_PATH = '/api/investments/deposits'
export function parseDepositEarnings(raw: unknown): DepositEarnings
export async function getDepositEarnings(client: HttpClient = http): Promise<DepositEarnings>
```

- Un segundo `createValidators(\`GET ${DEPOSITS_PATH}\`)` en el mismo archivo, para que el
  mensaje de `ValidationError` nombre la ruta correcta. Mismas guardas que hoy
  (`asNullableDecimal`, `asNullableDateOnly`, `asMember`…).
- `getDepositEarnings` solo hace `client(DEPOSITS_PATH)`: sin método, sin cuerpo, sin
  querystring (el contrato no tiene parámetros).
- **Coherencia que se exige** (lanza `ValidationError`, que la parte pinta como error,
  R12):
  1. `matured` lleva `earned` (decimal) y `maturity`; cualquier otro `status` lleva
     `earned: null`.
  2. `below_principal` lleva `maturity`; `active`, `cancelled`, `maturity_not_found` y
     `ambiguous` llevan `maturity: null`.
  3. `total` es, en céntimos (`toCents`), la suma de los `earned` de los `matured`. Mismo
     criterio que la F37 (`parseExpensesByCategory` rechaza un total que no es la suma de
     sus partes). Es la única aritmética: se comprueba, nunca se corrige ni se pinta una
     suma hecha aquí.
- `candidateMovementIds`: array de enteros; no se exige su longitud.

## 4. Textos (`deposits.ts`) — en inglés, fijados aquí

Fechas con `formatDate` y cifras con `formatMoney` de `@/shared/money`.

| Dónde | `status` | Texto |
|---|---|---|
| Etiqueta (`BaseBadge`) | `active` | `Active` (tono `neutral`, sin color) |
| | `matured` | `Matured` (tono `neutral`, sin color: solo la cifra ganada va en verde) |
| | `cancelled` | `Cancelled` (tono `neutral`) |
| | los tres dudosos | `Doubtful` (tono `warning`) |
| Fecha de vencimiento | `active` | `Matures <maturityDate>` |
| | `matured` y dudosos | `Matured <maturityDate>` |
| | `cancelled` | `Was due <maturityDate>` |
| Datos de la fila | todos | `Put in <principal>` · `Opened <openedAt>` · fecha anterior · `Expected <expectedGain>`; `null` → `—` en el valor (`Opened —`) |
| Columna de lo ganado | `matured` | `<earned>` en `text-positive` |
| | `active` | `Not earned yet` en `text-ink-muted` |
| | `cancelled` | `Not in the total` en `text-ink-muted` |
| | dudosos | `Not in the total` en `text-warning` |
| Línea extra | `cancelled` | `Cancelled on <closedAt>, before it matured` (gris). Si `closedAt` es `null`: `Cancelled before it matured` |
| | `maturity_not_found` | `Doubtful · its payment is not in your statement` (ámbar) |
| | `ambiguous` | `Doubtful · <n> possible payments in your statement, none chosen` (ámbar; `n` = `candidateMovementIds.length`) |
| | `below_principal` | `Doubtful · it paid back <maturity.amount>, less than you put in` (ámbar) |
| Enlace | `matured`, `below_principal` | `See in Movements` |
| Cabecera de la parte | — | título `Deposits`; etiqueta `Earned by your deposits` y `<total>` |
| Frase bajo el total | — | `Only deposits that matured with their payment in your statement add up here. This figure is not part of your net worth: that interest already counts as income in Overview and Movements.` |
| Sin depósitos | — | `You have no deposits yet.` |
| Cargando | — | `Loading your deposits…` |
| Error | — | título `Couldn't load your deposits` y `error.message` debajo |

Solo la etiqueta `Doubtful` lleva color (ámbar); `Active`, `Matured` y `Cancelled` van en
tono `neutral`. Lo único verde de la tarjeta es la cifra ganada de un `matured`.
Fila de `cancelled`: nombre y datos en `text-ink-muted` (en vez de `text-ink-strong`).
Ningún color crudo; todos los pares usados ya están medidos en `theme-dark.css`
(`--positive`, `--warning`, `--ink-muted`, `--ink-body`, `--ink-strong` sobre
`--surface-card`; `--warning` sobre `--warning-subtle` para la etiqueta). Ningún icono
nuevo.

Firmas sugeridas (puras, testeables sin montar):

```ts
export function isDoubtful(status: DepositStatus): boolean
export function statusBadge(status: DepositStatus): { label: string; tone: BadgeTone }
export function maturityLabel(deposit: DepositEarning): string
export function earnedCell(deposit: DepositEarning): { text: string; tone: 'positive' | 'muted' | 'warning' }
export function extraLine(deposit: DepositEarning): string | null
export function movementsLink(deposit: DepositEarning): { name: 'movements'; query: { month: string } } | null
```

`movementsLink` usa una constante local `MOVEMENTS_ROUTE_NAME = 'movements'` (como hace
`OverviewView.vue` con `STATEMENT_ROUTE_NAME`): no se importa nada de `statement`.
`month` = los 7 primeros caracteres de `maturity.date`.

## 5. Store (`store.ts`)

Mismo store `useNetWorthStore`, con estado propio para los depósitos:

```ts
const deposits = ref<DepositEarnings | null>(null)
const depositsLoading = ref(false)
const depositsError = ref<AppError | null>(null)
```

`load(client?)` lanza las dos peticiones **a la vez** y cada una rellena solo su estado
(`Promise.all` de dos funciones internas que nunca relanzan). Un fallo de depósitos no
toca `netWorth` ni `error`, y al revés. Así la recarga tras importar (R14) sale sola.

## 6. Vista

En `NetWorthView.vue`, dentro del `<template v-else-if="netWorth">`, después de la
`section` `net-worth-block-e`:

```vue
<DepositEarnings
  :earnings="store.deposits"
  :loading="store.depositsLoading"
  :error="store.depositsError"
/>
```

`DepositEarnings.vue` es tonto (props, sin store): `loading` → texto de carga; `error` →
`BaseCard` de error; `earnings.deposits` vacío → texto de vacío; si no, `BaseCard`
`Deposits` con la cabecera del total (`StatCard` o el mismo patrón de cifra que la
pantalla) y una `DepositRow` por depósito, `:key="deposit.id"`. `data-test` sugeridos:
`deposit-earnings`, `deposits-total`, `deposits-sentence`, `deposits-empty`,
`deposits-loading`, `deposits-error`, `deposit-row`, `deposit-earned`, `deposit-status`,
`deposit-extra`, `deposit-link`.

`DepositRow.vue` pinta el enlace con `RouterLink` si `movementsLink` no es `null`.

R11: la vista no pasa `store.deposits` a ninguna función de `breakdown.ts` ni de
`sentence.ts`, y `BankCard` no recibe nada nuevo.

## 7. Fixtures

En `__tests__/fixtures.ts`, `depositEarnings()` con los seis `status` (cifras inventadas,
nombres como los del contrato: `Deposito 3m`…; ningún dato real): un `active`, dos
`matured` (para que el total sea suma de dos), un `cancelled`, un `maturity_not_found`, un
`ambiguous` con dos candidatos y un `below_principal` con `maturity.amount` menor que
`principal`; `total` = la suma de los dos `matured`. Y `emptyDepositEarnings()`
(`deposits: []`, `total: "0.00"`).

## 8. Pruebas de navegador

La red de seguridad de cada spec de `e2e/` aborta cualquier `/api` no prevista, y varios
comprueban que no tuvo que abortar ninguna. Toda spec que responde `**/api/net-worth`
pasa a responder también `**/api/investments/deposits` con
`{ "asOf": "2026-06-15", "deposits": [], "total": "0.00" }`. No se añade spec nueva: la
parte se prueba con unitarias (jsdom basta; no se mide posición).

## 9. Documentos que la feature vuelve falsos

- `docs/guia-de-uso.md`, sección `Net Worth`: quitar «No enseña lo que ganó cada
  depósito. Es lo siguiente que está previsto.» y describir la parte `Deposits` (qué
  enseña cada estado, que el total no se suma al patrimonio, el enlace), en castellano.
- `docs/architecture.md`: un párrafo con la petición nueva de `net-worth`, que es de solo
  lectura y que su total no entra en ninguna cifra.
- `docs/roadmap.md` **no** se toca (lo hace el leader al cerrar).

## 10. Alternativas descartadas

- **Un store aparte para depósitos.** Obligaría a cambiar `import/store.ts` para la
  recarga tras importar y a añadir otra dependencia `import` → `net-worth`. Dentro de
  `load()` sale gratis.
- **Pintar los depósitos dentro de cada `BankCard`.** `BankCard` enseña patrimonio de hoy;
  meter ahí depósitos cerrados hace meses mezcla dos cosas y complica R11.
- **Tres bloques (vivos / vencidos / cancelados).** Más ruido para pocos depósitos; el
  orden del backend ya pone los vivos arriba. Queda como alternativa en la hoja.
- **Enlazar a la línea exacta en `Movements`.** `Movements` no sabe señalar una línea por
  id; hacerlo cambia otra pantalla (`que_no_quiero`).
