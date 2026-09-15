# Design — Feature 9: net-worth-view

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos) y `docs/conventions.md` (inglés, tokens, `font-mono
> tabular-nums`, sin `@apply`). Aquí solo van los puntos donde la feature roza
> esas reglas y las decisiones propias.

## 1. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/shared/money.ts` | Aritmética exacta y formato de importes, fechas y porcentajes (reutilizable por futuras vistas). |
| `src/features/net-worth/store.ts` | `useNetWorthStore` (setup store Pinia): `netWorth`, `isLoading`, `error`, `load()`. |
| `src/features/net-worth/breakdown.ts` | Funciones puras: `groupByNature`, `groupByBank`, `bankLabel`, `sumOfGroups`. |
| `src/features/net-worth/sentence.ts` | Función pura `buildSummarySentence(netWorth, natureGroups)`. |
| `src/features/net-worth/issues.ts` | Función pura `issueMessage(issue)` y etiquetas de tipo `holdingTypeLabel`. |
| `src/shared/components/BaseCard.vue` | Port de `design-system/components/layout/Card.jsx`. |
| `src/shared/components/BaseBadge.vue` | Port de `design-system/components/feedback/Badge.jsx`. |
| `src/shared/components/StatCard.vue` | Port de `design-system/components/finance/StatCard.jsx`. |
| `src/shared/components/ShareBar.vue` | Barra horizontal: port de la pista de `ProgressBar.jsx` (sin `max`/presupuesto). |
| `src/features/net-worth/components/AccountCard.vue` | Port de `design-system/components/finance/AccountCard.jsx`, usado como fila de cuenta o producto. |
| `src/features/net-worth/components/BreakdownList.vue` | Lista de filas «etiqueta + importe + % + `ShareBar`» (layout de `CategoryBar.jsx` sin presupuesto). Sirve a los dos repartos. |
| `src/features/net-worth/components/DataWarnings.vue` | Panel de avisos de `investments.issues`. |
| `src/features/net-worth/components/BankCard.vue` | Ficha de un banco (bloque E): `BaseCard` + filas `AccountCard`. |
| Tests | `src/shared/__tests__/money.spec.ts`, `src/features/net-worth/__tests__/{store,breakdown,sentence,issues,NetWorthView}.spec.ts`, fixtures en `src/features/net-worth/__tests__/fixtures.ts`. |

Los nombres de componente son multi-palabra (`BaseCard`, no `Card`) por la regla
`vue/multi-word-component-names` del lint.

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/features/net-worth/views/NetWorthView.vue` | Sustituye el placeholder (y su `TODO(feat-9)`) por la vista real. |
| `src/shared/components/__tests__/AppShell.spec.ts` | Las aserciones sobre `[data-test="placeholder"]` en `/net-worth` pasan a hacerse en `/overview`; los montajes en `/net-worth` instalan Pinia y mockean `fetch` (frontera HTTP). **No es el e2e.** |
| `tsconfig.app.json` | `lib`: `["ES2022", "ES2023.Intl", "DOM", "DOM.Iterable"]` para tipar `Intl.NumberFormat#format(string)` (ver §3). Revisar si `tsconfig.vitest.json` necesita lo mismo. |
| `docs/conventions.md` | «Estilos / UI»: formato **decidido** — cifras es-ES con `useGrouping: 'always'` (`1.234,56 €`, `38,3 %`), fechas en-GB (`12 Sept 2026`); corregir la nota que daba en-US como propuesta y quitarlo de «Pendientes». |
| `docs/stack.md` | Anotar `ES2023.Intl` y el porqué (formato exacto desde string). |

No se tocan: `service.ts`, `types.ts` (feature 7), `src/services/http.ts`,
`src/router/index.ts`, `src/assets/styles/`, `design-system/`, `e2e/` (salvo lo
que se aprobó en §9), `package.json`.

## 2. Firmas nuevas

```ts
// src/shared/money.ts
export function toCents(amount: DecimalString): bigint            // "12480.55" → 1248055n; "-0.50" → -50n
export function fromCents(cents: bigint): DecimalString           // 1248055n → "12480.55"
export function sumAmounts(amounts: readonly DecimalString[]): DecimalString
export function sharePermille(part: DecimalString, total: DecimalString): number | null
//   décimas de punto porcentual, entero redondeado half-up (383 = 38,3 %); null si total <= 0
export function formatMoney(amount: DecimalString): string        // "1234.56" → "1.234,56 €"
export function formatPercent(permille: number): string           // 383 → "38,3 %"
export function formatDate(date: DateOnly): string                // "2026-09-12" → "12 Sept 2026"

// src/features/net-worth/breakdown.ts
export type NatureGroupId = 'checking' | 'savings' | 'market' | 'deposits'
export interface Holding { kind: 'account' | 'product'; id: number; bank: string; amount: DecimalString }
export interface BreakdownGroup<Id extends string = string> {
  id: Id; label: string; amount: DecimalString; sharePermille: number | null; members: Holding[]
}
export function groupByNature(netWorth: NetWorth): BreakdownGroup<NatureGroupId>[]
export function groupByBank(netWorth: NetWorth): BreakdownGroup[]
export function bankLabel(slug: string): string
export function sumOfGroups(groups: readonly BreakdownGroup[]): DecimalString

// src/features/net-worth/store.ts
export const useNetWorthStore = defineStore('netWorth', () => {
  const netWorth = ref<NetWorth | null>(null)
  const isLoading = ref(false)
  const error = ref<AppError | null>(null)
  async function load(client?: HttpClient): Promise<void> // try getNetWorth; catch e → error = toAppError(e)
  return { netWorth, isLoading, error, load }
})

// src/features/net-worth/sentence.ts
export function buildSummarySentence(netWorth: NetWorth, nature: BreakdownGroup<NatureGroupId>[]): string

// src/features/net-worth/issues.ts
export function issueMessage(issue: NetWorthIssue): string
export function holdingTypeLabel(type: AccountType | InvestmentProductType): string
```

Errores: no se añade ningún tipo. El store normaliza con `toAppError`; `load()`
**no relanza** (el error vive en estado, ADR-003 + `docs/conventions.md`). `toCents`
lanza `ValidationError` si recibe algo que no casa con `/^-?\d+\.\d{2}$/` (no
debería pasar: `parseNetWorth` ya lo garantiza).

## 3. Importes, porcentajes y fechas: sin perder céntimos

**Cifras en es-ES (aprobado por el humano el 2026-09-12).**

- **Formato desde el string.** Un único formateador a nivel de módulo (inmutable,
  no es estado):
  `new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' })`
  y `.format("1234.56")`. Desde ECMA-402 (NumberFormat v3) un string numérico se
  formatea como **decimal exacto**, sin pasar por `number`. Comprobado en Node
  24.18: `"1234.56"` → `1.234,56 €`, `"-5.00"` → `-5,00 €`, `"0.00"` → `0,00 €`,
  `"90071992547409.93"` → `90.071.992.547.409,93 €`. Soporte: Chrome 106, Firefox
  116, Safari 15.4. El tipo de la sobrecarga con string está en
  `lib.es2023.intl.d.ts`, de ahí el cambio de `lib` (sin cast).
- ⚠️ **Trampa CLDR:** sin `useGrouping: 'always'`, es-ES **no agrupa números de 4
  cifras** (`1234,56 €`; agrupa a partir de 5). La opción es obligatoria y tiene
  test de regresión (R6).
- ⚠️ **Espacios no separables:** entre la cifra y `€`, y entre la cifra y `%`, el
  separador es U+00A0, no un espacio normal. Los textos esperados de los tests se
  escriben con `\u00a0` (o se generan con el formateador), nunca con un espacio
  tecleado. El signo negativo es `-` (U+002D).
- **Sumas en céntimos `bigint`.** `toCents` parte el string por el punto; nunca
  `Number()`, `parseFloat` ni `parseInt` sobre un importe (el reviewer lo busca con
  grep, como en la feature 7). El resultado vuelve a string con `fromCents` y se
  formatea por el mismo camino.
- **Porcentajes en décimas enteras (permille).** `p = round_half_up(part * 1000 /
  total)` en `bigint`, pasado a `number` al final. Se redondea **una sola vez**
  (redondear primero a puntos básicos y luego a un decimal da dobles redondeos:
  38,249 % → 3825 pb → `38,3 %` en vez de `38,2 %`). Formato:
  `Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1,
  maximumFractionDigits: 1, useGrouping: 'always' })` sobre el string exacto
  `p / 1000` (construido desde el entero, p. ej. `383` → `"0.383"`) → `38,3 %`.
  Ancho de barra: `clamp(p, 0, 1000) / 10` %. Grupo negativo → barra de ancho 0 e
  importe en `text-negative`. `total <= 0` → sin porcentajes ni barras (se
  muestran los importes). Los porcentajes redondeados pueden no sumar 100,0 %: los
  **importes** sí suman exacto, que es el invariante.
- **Fechas en en-GB (decidido por el leader, UI en inglés).** `DateOnly` se
  construye con `Date.UTC(y, m - 1, d)` y se formatea con
  `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric',
  timeZone: 'UTC' })` → `12 Sept 2026`, `29 Aug 2026`. Así una zona horaria
  negativa no la corre un día. **ICU actual abrevia septiembre como `Sept`** (el
  resto con tres letras): los tests generan el texto esperado con `formatDate`
  salvo un único test de `money.spec.ts` que fija el valor observado en el entorno.

**Descartado:** parsear a `number` y redondear al mostrar (una suma de floats
puede descuadrar un céntimo y el invariante R8 es exacto); librería decimal
(dependencia nueva para sumar strings de dos decimales); `toLocaleString` suelto
por componente (varios formateadores que pueden divergir, p. ej. en la agrupación).

## 4. Partición por naturaleza

Aprobada por el humano el 2026-09-12 (cuatro grupos, de `../docs/ideas.md` 2026-08-25):

| `id` | Label | Miembros | Dinero parado |
|---|---|---|---|
| `checking` | `Checking accounts` | cuentas `type: 'checking'` | **sí** (badge `Idle money`) |
| `savings` | `Savings` | cuentas `type: 'savings'` + productos `savings_account` | no |
| `market` | `Market investments` | productos `fund`, `etf`, `managed_portfolio` con `value` no nulo | no |
| `deposits` | `Fixed-term deposits` | productos `deposit` (siempre tienen `value`) | no |

- Orden fijo: el de la tabla. Un grupo **sin miembros no se pinta** (no aparece
  `0,00 €` inventado). Un grupo con miembros cuya suma es 0 sí se pinta.
- Importe de una cuenta = `balance`; de un producto = `value`.
- Invariante (R8): `accounts.accounts` ∪ `products[value ≠ null]` se reparte sin
  solaparse; por el contrato `Σ = accounts.total + investments.total = total`.
- **Descartada en la puerta:** la del handoff, tres grupos (`Liquid` = todas las
  cuentas + `savings_account`; `Market investments`; `Fixed-term deposits`), y
  contar como dinero parado también las cuentas `savings`.

## 5. Reparto por banco

- Clave: `bank` (slug) de cuentas y productos con `value` no nulo.
- `bankLabel`: `bankinter → Bankinter`, `n26 → N26`, `openbank → Openbank`,
  `myinvestor → MyInvestor`, `trade-republic → Trade Republic`; slug desconocido →
  se muestra tal cual (el backend descubre bancos dinámicamente, feature 7).
- Orden por importe descendente; empate → por label.
- Un banco cuyos únicos productos tienen `value: null` **no** tiene fila en el
  reparto, pero **sí** ficha en el bloque E (con el hueco).

## 6. Frase del bloque A

Plantilla aprobada el 2026-09-12 (`buildSummarySentence`). Ejemplo:
`As of 12 Sept 2026, you have 90.162,46 € across 5 banks. 38,3 % of it is idle in
checking accounts.` (fecha con `formatDate`, cifras con `formatMoney` /
`formatPercent`; los espacios antes de `€` y `%` son U+00A0).

- Normal: `As of {asOf}, you have {total} across {n} banks. {idle%} of it is idle in checking accounts.`
- `n === 1` → `across 1 bank`.
- Sin cuentas `checking` (o su grupo ≤ 0) → se omite la segunda frase.
- `total <= 0` → solo `As of {asOf}, your net worth is {total}.`
- Base vacía (sin cuentas ni productos) → `As of {asOf}, there are no accounts or products yet.`

`{n}` cuenta bancos con ficha en el bloque E (incluidos los de solo huecos).
Nunca menciona crecimiento, meses anteriores ni rentabilidad.

## 7. Bloque E y avisos

**Ficha por banco (`BankCard`)**: título = `bankLabel`, subtítulo = importe del banco
(mismo número que su fila del reparto). Filas `AccountCard` en este orden:
cuentas, luego productos por `type` y `name`.

| Fila | Tipo (`holdingTypeLabel`) | Detalle | Importe |
|---|---|---|---|
| cuenta `checking` | `Checking account` | `···· {últimos 4 del iban}` · `As of {asOf}` | `balance` |
| cuenta `savings` | `Savings account` | idem | `balance` |
| `fund` / `etf` / `managed_portfolio` | `Fund` / `ETF` / `Managed portfolio` | `Valued {valuedAt}` o nada si `null` | `value` o hueco |
| `savings_account` | `Interest account` | `Valued {valuedAt}` o nada | `value` o hueco |
| `deposit` | `Fixed-term deposit` | `Matures {maturityDate}` / `Matured {maturityDate}` si `matured` | `value` |

- Hueco (R13): `No valuation` en `text-ink-faint`, sin `€`, `data-test="value-gap"`.
- «Desde cuándo hay dato» **no se pinta** (aprobado el 2026-09-12):
  `GET /api/net-worth` no trae la fecha del primer dato. Queda como cabo suelto
  del backend; cuando exista el campo, será otra feature.
- Las fechas `{valuedAt}` / `{maturityDate}` / `{asOf}` van con `formatDate`
  (en-GB): `Valued 29 Aug 2026`, `Matured 15 Aug 2026`.
- `stale: true` no añade nada en la fila: el backend ya emite el issue
  `stale_valuation` y se muestra en el panel (una sola fuente del aviso).

**Depósitos vencidos (`matured_not_closed`) — integrados** (delegado en el
intent): la fila sigue en la ficha de su banco y sumando en `Fixed-term deposits`
(el backend lo suma), con el detalle `Matured {fecha}` y su aviso en el panel.
Descartado mostrarlos aparte: sacarlos de su grupo rompería el invariante R8 o
obligaría a un quinto grupo que el total no distingue.

**Textos de los avisos (`issueMessage`)**, panel `Data warnings` bajo el bloque A:

| `reason` | Texto |
|---|---|
| `no_valuation` | `{name} has no valuation yet, so it is not counted in your net worth.` |
| `stale_valuation` | `{name} was last valued on {valuedAt}; its value may be out of date.` |
| `matured_not_closed` | `{name} matured on {valuedAt} but is not closed yet; its money may be counted twice.` |

Cada aviso usa `BaseBadge tone="warning"` como marca. Lista vacía → no hay panel.

**Descuadre (R9)**: `BaseBadge tone="negative"` + `Breakdown doesn't add up: groups
total {sum}, net worth is {total}.` en el bloque B.

**Error (R3)**: `BaseCard` con título `Couldn't load your net worth` y
`error.message` debajo; `data-test="net-worth-error"`. No se usa `formatError`
(el `[CODE]` es para consola, no para el usuario).

## 8. Layout y portado del design system

```
[Block A]  StatCard (label "Net worth", value = formatMoney(total), sin delta)
           frase (text-ink-muted)            ← data-test="net-worth-block-a"
[Warnings] DataWarnings (si hay issues)
[Block B]  grid 2 col (1 col < md):  BaseCard "By type"  | BaseCard "By bank"
           BreakdownList (+ idle badge, + mismatch)     ← data-test="net-worth-block-b"
[Block E]  título "Details" + grid 2 col de BankCard     ← data-test="net-worth-block-e"
```

Reglas de portado (de `docs/conventions.md` y `docs/stack.md`):

- `var(--text-strong|muted|faint|body)` → `text-ink-*`; `--border-subtle` →
  `border-line-subtle`; `--surface-card` → `bg-surface-card`.
- Escalas crudas sin alias → alias semántico más cercano: `--neutral-200`
  (pista de barra) → `bg-surface-sunken`; `--green-50` (fondo del icono de
  StatCard) → `bg-brand-subtle`; tonos `soft` de Badge → `bg-{tone}-subtle
  text-{tone}`; `#fff` → `text-ink-on-brand`.
- `StatCard`: se porta sin `delta` (no hay histórico) y sin sufijo `currency`
  (el `€` lo pone `formatMoney`). Prop `value: string` ya formateado.
- `AccountCard`: `balance: number` → props `amount: DecimalString | null`,
  `typeLabel`, `detail`; sin `interactive`/`onClick` (no navega). Tile de color con
  la inicial del banco en `bg-chart-N` por banco.
- `Card`: props `title`, `subtitle`, slot por defecto, slot `action`; sin
  `interactive`. `Badge`: `tone`, `dot`, `size`; `variant` solo `soft`.
- `CategoryBar`/`ProgressBar` **sí sirven** para las barras: se toma su pista
  (`h-1.5 rounded-pill bg-surface-sunken` + relleno) en `ShareBar`; se descarta
  la lógica de presupuesto (`over`, rojo al pasarse).
- Colores de barra: naturaleza `chart-1..4` en el orden de §4; bancos
  `chart-1..8` por posición. Van en **mapas con el nombre de clase completo y
  literal** en `.ts`/`.vue` (`'bg-chart-1'`), nunca construidos por
  concatenación: Tailwind escanea `src/` como texto (lista blanca, feature 5).
- Tests: no escriben nombres de clase literales (acaban en el CSS de
  producción, `docs/stack.md`); se componen en tiempo de ejecución o se usa
  `data-test`.

## 9. Riesgo e2e (aprobado el 2026-09-12)

`e2e/app-boot.spec.ts` navega a `/` (→ `/net-worth`) y exige **cero errores de
consola**. Con esta feature la vista pide `/api/net-worth` al montar. Sin backend
en `:3000`, el proxy de Vite responde 5xx (en dev y en `preview`, que hereda
`server.proxy`) y Chromium escribe `Failed to load resource: … 500` como error de
consola → **el smoke puede ponerse rojo sin haberlo tocado**.

- **T0 lo comprueba antes de nada** (vista mínima que llame al store, `./init.sh`
  sin backend). Si no hay error de consola, no se toca el e2e y se anota.
- **Aprobado (si se confirma el rojo):** en el propio smoke, interceptar
  `**/api/net-worth` con `page.route` y responder una fixture coherente con el
  contrato. Cambio de ~10 líneas; el test sigue probando arranque real, no pinta
  aserciones de la vista y deja de depender de un backend.
- **Descartado en la puerta:** no tocar el e2e y exigir el backend arrancado en
  `:3000` cada vez que se ejecute `./init.sh`.
- Descartado: filtrar los errores de consola del smoke (debilita la red que
  montó la feature 6) o no llamar a la API al montar.

## 10. Alternativas descartadas (resumen)

- **Recalcular el total en el cliente** — prohibido por el intent; el bloque A
  lee `total`.
- **Donut / librería de gráficos** — el intent pide barras CSS y ninguna dependencia.
- **Store con getters que formatean** — el formato es presentación; el store
  guarda el `NetWorth` crudo y las funciones puras derivan (testables sin Pinia).
- **Validar el invariante corrigiendo** (p. ej. repartir la diferencia) — se
  avisa (R9), nunca se maquilla un número.
- **Botón de reintentar en el error** — fuera de alcance; recargar basta.
