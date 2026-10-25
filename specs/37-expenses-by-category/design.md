# Design — F37 `expenses-by-category`

Se apoya en `docs/architecture.md` (feature-based, una carpeta por feature, servicio →
store → vista) y en `docs/conventions.md` (Tailwind con alias semánticos, tema solo
oscuro, cifras con `src/shared/money.ts`, `font-mono tabular-nums`). Aquí solo va lo que
esta feature decide o donde roza esas reglas.

## 1. Archivos

**Nuevos** — `src/features/expenses-by-category/`:

| Archivo | Qué hace |
|---|---|
| `types.ts` | Tipos del frontend leídos del contrato (§2). |
| `service.ts` | `EXPENSES_BY_CATEGORY_PATH`, `expensesQueryString`, `parseExpensesByCategory`, `getExpensesByCategory` (§3). |
| `reading.ts` | Todo lo puro: leer y escribir el periodo en la dirección, cambiar de modo, nombres de periodo, la frase, la línea de lo sin categoría, la diferencia con signo, el porcentaje de la barra, el mensaje de error y **todos** los textos (§6). Sin estado ni HTTP. |
| `store.ts` | `useExpensesByCategoryStore` (§4). |
| `components/PeriodPicker.vue` | Selector de modo `Month`/`Year`; en `month`, `MonthNav` de `features/statement` y el desplegable `Compare with`; en `year`, flechas de año. Solo emite el periodo nuevo. |
| `components/CategoryGroup.vue` | Un bloque (`Fixed` o `Variable`): cabecera con su suma, la del periodo comparado y la diferencia; cabecera de columnas; sus líneas o `NO_LINES`. |
| `components/CategoryLine.vue` | Una línea (R10–R13) y, abierta, `LineMovements`. Lleva su propio `open` (`defineModel`), como `GroupRow` de la F32. |
| `components/LineMovements.vue` | La lista de movimientos de una línea: fecha (`formatDate`), importe (`formatMoney`) y descripción, en el orden en que llegan. |
| `views/ExpensesByCategoryView.vue` | La pantalla (§5). |
| `__tests__/fixtures.ts`, `__tests__/reading.spec.ts`, `__tests__/service.spec.ts`, `__tests__/store.spec.ts`, `__tests__/CategoryLine.spec.ts`, `__tests__/ExpensesByCategoryView.spec.ts` | Pruebas unitarias. |
| `e2e/expenses-by-category.spec.ts` | Prueba de navegador. |

**Modificados:** `src/router/index.ts` (§7), `src/router/__tests__/router.spec.ts`,
`docs/guia-de-uso.md`, `docs/architecture.md`, `docs/stack.md` (§8).

**Borrados** (§7): `src/features/monthly-cost/` entera (5 `.ts`, 6 `.vue`, 6 archivos de
`__tests__/`) y `e2e/monthly-cost.spec.ts`.

**No se tocan:** `src/features/overview/` (ni un archivo), `src/shared/`,
`src/assets/` (los tokens de color que se usan ya tienen su línea `contrast:` en
`theme-dark.css`: `--chart-1/3/4` sobre `--surface-sunken`, `--positive` y `--negative`
sobre `--surface-card`), `package.json` (ninguna dependencia nueva), el backend.

## 2. Tipos (`types.ts`)

```ts
import type { DateOnly, DecimalString } from '@/features/net-worth/types'
import type { MonthKey } from '@/features/statement/months'

export type CompareMonth = 'previous-month' | 'same-month-last-year'
/** What is asked: one month with its comparison, or one natural year. */
export type PeriodQuery =
  | { mode: 'month'; month: MonthKey; compare: CompareMonth }
  | { mode: 'year'; year: string } // 'YYYY'

export interface DateRange { from: DateOnly; to: DateOnly; months: number }
export interface LineCategory { id: number; name: string; parentId: number | null; isFixed: boolean }
export interface LineMovement { id: number; bookingDate: DateOnly; description: string; amount: DecimalString; accountId: number }
export type LineChange = 'new' | 'gone' | null
export interface ExpenseLine {
  category: LineCategory | null
  amount: DecimalString; comparedAmount: DecimalString; difference: DecimalString
  change: LineChange
  monthlyAmount: DecimalString | null
  movements: LineMovement[]
}
export interface ExpenseGroup { amount: DecimalString; comparedAmount: DecimalString; difference: DecimalString; lines: ExpenseLine[] }
export interface ExpensesByCategory {
  period: DateRange & { month: MonthKey | null; year: string | null }
  compared: DateRange
  compare: CompareMonth | 'previous-year'
  amount: DecimalString; comparedAmount: DecimalString; difference: DecimalString
  fixed: ExpenseGroup
  variable: ExpenseGroup
}
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
```

Re-exporta `DateOnly`, `DecimalString` y `MonthKey` como hace `monthly-cost/types.ts`. Los
tipos los define el frontend leyendo el contrato: nada se importa del backend.

## 3. Servicio (`service.ts`)

```ts
export const EXPENSES_BY_CATEGORY_PATH = '/api/expenses-by-category'
export function expensesQueryString(query: PeriodQuery): string
//   month → 'month=2026-09&compare=previous-month'   (compare viaja SIEMPRE con month)
//   year  → 'year=2026'                               (compare NUNCA con year: el contrato da 400)
export function parseExpensesByCategory(raw: unknown): ExpensesByCategory
export async function getExpensesByCategory(query: PeriodQuery, client: HttpClient = http): Promise<ExpensesByCategory>
//   client(`${EXPENSES_BY_CATEGORY_PATH}?${expensesQueryString(query)}`) — sin `init`: GET y sin cuerpo (R3)
```

- Valida con `createValidators('GET /api/expenses-by-category')` de `@/shared/validation`:
  `asObject`, `asArray`, `asText` (nombre de categoría), `asString` (descripción),
  `asInteger`, `asFlag` (`isFixed`), `asDecimal`, `asNullableDecimal` (`monthlyAmount`),
  `asDateOnly`, `asMember` (`compare` entre los tres valores; `change` entre `new`,
  `gone`). `parentId`, `period.month` y `period.year` admiten `null`.
- **Comprobación de sumas (R15):** en céntimos con `toCents`/`sumAmounts`.
  `amount(raíz) === fixed.amount + variable.amount`, y para cada bloque
  `amount === suma de los amount de sus lines`. Si no, `ValidationError` con el contexto
  (`…: fixed.lines do not add up to fixed.amount`). No se comprueban `comparedAmount` ni
  `difference`: se enseñan tal cual (R8, R9), y comprobar más es más superficie para
  romper con un redondeo legítimo.
- Errores: el cliente `http` ya traduce red y no-2xx a `ApiError`; el parser lanza
  `ValidationError`. Nada nuevo en `@/shared/errors`.

## 4. Store (`store.ts`)

`useExpensesByCategoryStore('expenses-by-category')`, calcado de `useMonthlyCostStore`:
`data`, `loadState`, `error`, `query` (la última `PeriodQuery` pedida) y
`load(query, client?)`, que **nunca lanza** (el fallo queda en `error`), pone `data` a
`null` mientras lee (no se ve una cifra vieja bajo el periodo nuevo) y descarta la
respuesta de una carga que ya no es la última (contador `run`). `retry()` llama a
`load(query)` con la misma consulta (R16). No guarda nada entre visitas ni recarga tras
una importación: se vuelve a pedir al entrar (como `Monthly cost` y `My accounts`).

## 5. La pantalla (`ExpensesByCategoryView.vue`)

Orden de arriba abajo:

1. Cabecera: título `TITLE` y `SUBTITLE`.
2. `PeriodPicker` con el periodo actual.
3. Mientras lee: `LOADING_LINE` y ninguna cifra. Si falla: `BaseCard` con
   `expensesErrorMessage(error)` y `BaseButton` `Try again` → `store.retry()`.
4. Con datos (`loadState === 'ready'`):
   - **La frase** (`periodSentence`), con el mismo estilo que `MonthSentence` de Overview
     (`font-display text-xl font-bold text-ink-strong`), **antes de cualquier cifra**
     (R7). Se escribe un `<p>` propio: Overview no se toca y no se importa su componente.
   - **El total:** `StatCard` `TOTAL_LABEL` con `formatMoney(amount)` y debajo
     `comparedCaption` (`August 2026: 688,34 € · +25,86 €`) (R8).
   - **Lo sin categoría:** `BaseCard` con `uncategorizedLine` o `ALL_CATEGORIZED` (R14).
     Sin barra propia: la línea `No category` ya lleva la suya dentro de `Variable`.
   - `CategoryGroup` `Fixed` y después `CategoryGroup` `Variable` (R9).
   - Si `amount` y `comparedAmount` de la raíz son `0.00`: la frase es `EMPTY_SENTENCE` y
     los dos bloques dicen `NO_LINES`.

**El periodo y la dirección (R6).** Como `OverviewView`: la dirección es la única que
escribe el periodo. `onMounted` y un `watch(route.query)` leen
`periodFromRouteQuery(route.query)` y llaman a `store.load`; `PeriodPicker` emite la
`PeriodQuery` nueva y la vista hace `router.push({ query: periodToRouteQuery(q) })`. Se
guarda el nombre de la ruta montada para no reaccionar a la query de otra pantalla al
salir (mismo truco que `ownRoute` en Overview).

**Cambio de modo (R4).** `switchMode`: de `month` a `year`, el año del mes visto; de
`year` a `month`, el mes en curso si el año es el actual y, si no, diciembre de ese año,
contra el mes anterior.

**Una línea (`CategoryLine`, R10–R13).** Una fila con, de izquierda a derecha: nombre
(`text-ink-strong`, `truncate`) y etiqueta `BaseBadge` (`New` tono `info`, `Gone` tono
`neutral`, `size="sm"`); la barra `ShareBar` (de `@/shared/components`) con
`permille = barPermille(line.amount, root.amount)` y el porcentaje en `formatPercent` al
lado; `amount`; `comparedAmount` (`text-ink-muted`); `difference` con
`formatDifference`; en `year`, `monthlyAmount` en la columna `A month`; y el botón
`Show movements` / `Hide movements` (`BaseButton` `secondary` `sm`, `aria-expanded`) si
`movements.length > 0`. Todas las cifras `font-mono tabular-nums`. Se pueden abrir varias
líneas a la vez; cerrar y abrir no pide nada al backend (los movimientos ya llegaron).

**Colores (solo alias del tema oscuro).** Relleno de barra: `bg-chart-1` en `Fixed`,
`bg-chart-3` en `Variable` y `bg-chart-4` en la línea sin categoría (el mismo color que
usa Overview para lo sin categoría). Diferencia: `text-negative` si el gasto sube (más
gasto es peor), `text-positive` si baja, `text-ink-muted` si es `0`. Tarjetas:
`BaseCard`. Ningún hex ni color de serie de Tailwind.

**Ancho.** La fila es una rejilla (`grid`) con columnas fijas para las cifras y la barra
flexible; en pantallas estrechas las cifras bajan debajo del nombre (`flex-wrap`). Es una
aplicación de escritorio: no se diseña para móvil.

## 6. Textos (`reading.ts`)

Todos en inglés. Cifras con `formatMoney`/`formatPercent`, fechas con `formatDate`,
nombres de mes en en-GB con `timeZone: 'UTC'` (como `formatMonthLabel`).

| Constante / función | Texto |
|---|---|
| `TITLE` | `Expenses by category` |
| `SUBTITLE` | `What your spending went on, fixed and variable, against the period before.` |
| `MODE_MONTH` / `MODE_YEAR` | `Month` / `Year` |
| `COMPARE_LABEL` | `Compare with` |
| `COMPARE_OPTIONS` | `previous-month` → `Previous month`; `same-month-last-year` → `Same month last year` |
| `LOADING_LINE` | `Reading your spending…` |
| `TOTAL_LABEL` | `Total spent` |
| `FIXED_TITLE` / `VARIABLE_TITLE` | `Fixed` / `Variable` |
| `NO_CATEGORY` | `No category` |
| `NEW_BADGE` / `GONE_BADGE` | `New` / `Gone` |
| `SHOW_MOVEMENTS` / `HIDE_MOVEMENTS` | `Show movements` / `Hide movements` |
| `MONTHLY_COLUMN` | `A month` |
| `DIFFERENCE_COLUMN` | `Difference` |
| `NO_LINES` | `Nothing spent here in either period.` |
| `ALL_CATEGORIZED` | `All of the spending in this period has a category.` |
| `RETRY` | `Try again` |
| `periodLabel(range)` | Un mes → `September 2026`; enero–diciembre de un año → `2025`; varios meses de un año → `January – October 2026`. Las cabeceras de columna son `periodLabel(period)` y `periodLabel(compared)`. |
| `formatDifference(d)` | `+25,86 €`, `-23,81 €`, `0,00 €` |
| `barPermille(part, total)` | `sharePermille(part, total) ?? 0`, recortado a 0..1000 por `ShareBar` |
| `comparedCaption(data)` | `<periodLabel(compared)>: <comparedAmount> · <formatDifference(difference)>` |
| `periodSentence(data, now?)` | Periodo cerrado: `In September 2026 you spent 714,20 €, 25,86 € more than in August 2026.` (`less` si baja; `the same as in August 2026` si es `0`). Periodo en curso (el mes de hoy en `month`, el año de hoy en `year`): empieza por `So far in` y el comparado de un mes va como `the whole of September 2026`. Si `comparedAmount` es `0` y `amount` no: `In September 2026 you spent 714,20 €. Nothing counted as spending in August 2026.` |
| `EMPTY_SENTENCE` (función `emptySentence(data)`) | `No spending counted in September 2026 or in August 2026.` |
| `uncategorizedLine(n, permille)` | `1 movement with no category — 2,0 % of the spending` / `3 movements with no category — …`. `n` = `movements.length` de la línea sin categoría; el porcentaje, `sharePermille(línea.amount, raíz.amount)`. |
| `expensesErrorMessage(error)` | Red (`API_NETWORK`) → `Couldn't reach the server.`; `ValidationError` → `The server answered, but the spending couldn't be read.`; resto → `Something went wrong loading your spending.` |

«Hoy» sale de `currentMonth(now)` de `features/statement/months.ts` (hora local). El
backend decide el periodo en hora de Madrid; la frase solo usa «hoy» para elegir entre
`In` y `So far in`, nunca para calcular fechas.

## 7. El router y lo que se borra

`src/router/index.ts`:

- Quitar `import MonthlyCostView …`, el icono `ReceiptEuro` y la ruta `/monthly-cost`.
- Añadir, **en el mismo sitio** (justo después de `overview`), la ruta
  `{ path: '/expenses-by-category', name: 'expenses-by-category', component: ExpensesByCategoryView, meta: { label: 'Expenses by category', icon: ChartBar } }`.
- `/monthly-cost` no se redirige a propósito: cae en la ruta comodín, que ya lleva a
  `Net Worth` (R2). Actualizar el comentario de cabecera del array.

`src/router/__tests__/router.spec.ts`: cambiar en las listas de rutas, nombres y etiquetas
`monthly-cost`/`Monthly cost` por `expenses-by-category`/`Expenses by category`; sustituir
el test `lists Monthly cost in the menu right below Overview` por los dos de la T9.

**Se borra** `src/features/monthly-cost/` y `e2e/monthly-cost.spec.ts`. Antes de borrar,
`grep -rn "monthly-cost\|MonthlyCost\|recurring-expenses" src e2e` tiene que dar solo lo
que se borra y el router (lo comprobé el 2026-10-25: ninguna otra feature importa de
`monthly-cost`).

## 8. Documentos que la feature vuelve falsos

- `docs/guia-de-uso.md`: la fila de `Monthly cost` de la tabla de errores (línea ~68), la
  lista del menú (~79-80), la fila del mapa de la aplicación (~101), la sección
  `## 2b. Monthly cost` entera (desde ~312) que se sustituye por `## 2b. Expenses by
  category` con sus pasos de «Qué probar», y las menciones de las líneas ~1444, ~1590 y
  ~1872. La sección nueva lleva el mismo aviso que la de la F32: probada con datos
  inventados, sin abrir todavía contra los datos reales.
- `docs/architecture.md`: en el árbol de carpetas, sustituir el bloque `monthly-cost/`
  (~219-238) por `expenses-by-category/`; sustituir el párrafo «Lo que cuesta un mes solo
  lee…» (~390-410) por uno de esta feature (solo lee, una petición por periodo, la única
  aritmética del cliente es comprobar sumas y el porcentaje de cada barra, importa
  `MonthNav` y `months.ts` de `features/statement` y `ShareBar`/`BaseBadge` de shared,
  nadie importa de ella); en el párrafo de la F36 (~420) cambiar `Monthly cost` por
  `Expenses by category`. No hay ADR que revisar: la F32 no dejó ninguno.
- `docs/stack.md` (~335): la línea de la F32 queda como historia y se añade
  «**Feature #37:** `ChartBar`, la entrada `Expenses by category` del menú; sale
  `ReceiptEuro`, que ningún archivo de `src/` importa ya».

`docs/roadmap.md` y `../docs/ideas.md` los actualiza el leader al cerrar (AGENTS.md §5).

## 9. Alternativas descartadas

- **Una librería de gráficos** (Chart.js, ECharts) para las barras. Descartada: una
  barra horizontal es un `div` con ancho, `ShareBar` ya existe y ya está medida en el
  tema oscuro, y la librería traería dependencia nueva, peso y un tema claro que oscurecer.
- **Pedir también `GET /api/overview` para comprobar que el total coincide.** Descartada:
  el contrato ya garantiza la igualdad (misma función `isCountedExpense`); una segunda
  petición solo añadiría un modo de fallo más. Se enseña el `amount` sin tocarlo y se
  rechaza una respuesta que no cuadra por dentro (R15).
- **Barra relativa a la categoría más grande** en vez de al total del periodo. Descartada
  en la hoja (🔴 5): las barras serían más largas, pero dejarían de decir qué parte del
  gasto es cada categoría, y no serían comparables entre `Fixed` y `Variable`.
- **Pintar la cuenta de cada movimiento.** Descartada: el contrato solo da `accountId`, y
  nombrarla pide `GET /api/accounts` aparte. Igual que hizo la F32.
- **Nombre de la subcategoría con su padre** (`Transporte › Combustible`). Descartada: el
  contrato solo da `parentId`, el nombre del padre pide `GET /api/categories`. Se enseña
  el nombre tal cual llega.
- **Conservar el código de `Monthly cost` sin ruta.** Descartada (🔴 6): código que nadie
  usa pero que hay que seguir compilando y probando, y que retrasa que el backend pueda
  retirar `GET /api/recurring-expenses` (AGENTS.md §3: lo sustituido se quita en la
  misma sesión).
