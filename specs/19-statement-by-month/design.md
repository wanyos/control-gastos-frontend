# Design — Feature 19: statement-by-month

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, una feature por carpeta, tipos propios, ADR-002 en la frontera,
> dependencias entre features en un solo sentido) y en `docs/conventions.md` (todo en
> inglés, tema oscuro con alias semánticos y líneas `contrast:`, `money.ts` para
> importes y fechas, sin `@apply`). Aquí van solo los puntos donde la feature roza
> esas reglas.
>
> **Es la primera rodaja de la E7.** Meses, sumas y lista. Los filtros, la búsqueda y
> el interruptor del ruido son features posteriores; este diseño deja sitio para ellas
> pero no las prepara «por si acaso».

## 1. Una feature nueva, `statement`, que no depende de ninguna otra

La pantalla no es la cola de revisión: lee todo el histórico, no filtra por estado y
**no escribe nada**. Vive en `src/features/statement/`, con su propio store, su lógica
pura y sus componentes.

De `features/review` **no se importa nada** (C3). Lo que las dos necesitan ya está en
`shared/`: `shared/movements.ts` (tipos, `MovementQuery`, `buildMovementsQuery`,
`parseMovementPage`, `getMovements`), `shared/money.ts` (`formatMoney`, `formatDate`,
`toCents`), `shared/banks.ts` (`bankLabel`) y `shared/components/` (`BaseCard`,
`BaseButton`, `BaseBadge`, `BaseInput`). El traslado que hizo la F18 se cobra aquí: esta
feature no mueve ni una línea más a `shared/`.

**La fila se copia, no se comparte.** `review/components/MovementRow.vue` lleva
checkbox, selector de categoría, botón `Confirm` y botón `Create rule`: cuatro controles
que escriben o que abren un diálogo que escribe. Se crea un `StatementRow.vue` de solo
lectura que **copia su maquetación** (punto de color por categoría, concepto truncado,
metadatos en `text-xs`, importe `font-mono tabular-nums` a la derecha) y ninguno de sus
controles.

*Alternativa descartada:* añadir una prop `readonly` a `MovementRow` y reutilizarlo.
Obligaría a `statement` a importar de `review` (cierra el sentido de dependencia que
`architecture.md` fija) y a meter cuatro `v-if` en un componente de una feature cerrada
que ya tiene 5 tests. La duplicación aquí es **maquetación**, no lógica: la lógica que
de verdad importa (el signo desde `type`, el formato del dinero, el nombre del banco)
sale de `shared/`, que es donde ya estaba.

*Segunda alternativa descartada:* montar la pantalla dentro de `features/review` con un
modo «extracto». El `intent` dice literalmente «no quiero que esta pantalla duplique la
cola de revisión: revisar sigue siendo su sitio»; dos modos en una vista es exactamente
eso.

## 2. Archivos

**Nuevos** — `src/features/statement/`

| Archivo | Qué contiene |
|---|---|
| `months.ts` | Todo lo puro del mes: clave `YYYY-MM`, mes en curso, rango `from`/`to`, salto de mes, etiqueta, lectura/escritura de la URL, agrupación por día y los textos. |
| `types.ts` | Re-exporta los tipos de `@/shared/movements` que usa la pantalla y declara `DayGroup` y `MonthKey`. |
| `store.ts` | `useStatementStore`: mes, resultado, carga, error y `Load more`. |
| `components/MonthNav.vue` | Flechas ‹ ›, la etiqueta del mes y el selector de mes. |
| `components/MonthTotals.vue` | Las tres cifras + el recuento + la nota fija de R6. |
| `components/StatementList.vue` | Las cabeceras de día, las filas, el vacío de R11 y el `Load more`. |
| `components/StatementRow.vue` | Una línea de solo lectura (R9, R10). |
| `views/StatementView.vue` | La página de la ruta `/movements`. |
| `__tests__/` | `months.spec.ts`, `store.spec.ts`, `MonthNav.spec.ts`, `MonthTotals.spec.ts`, `StatementList.spec.ts`, `StatementRow.spec.ts`, `StatementView.spec.ts`, `fixtures.ts`. |

**Modificados**

- `src/router/index.ts` — `/movements` monta `StatementView` en vez de
  `PlaceholderView`; se reescribe el comentario que decía que se queda placeholder «a
  propósito».
- `src/router/__tests__/router.spec.ts:58` — el test «keeps /movements as a placeholder»
  pasa a comprobar que monta el extracto y que sigue sin ser `ReviewView` (C4: es la
  única excepción prevista a «ningún test de las features anteriores cambia»).
- `src/shared/components/BaseInput.vue` — la prop `type` admite `'month'`
  (`'text' | 'date' | 'month'`). Una palabra; el `input` nativo ya está maquetado con
  los tokens y `ReviewFilterBar` ya usa `type="date"`.
- `e2e/statement.spec.ts` — nuevo, con la red de seguridad `page.route('**/api/**',
  route => route.abort())` que ya usan los otros cinco specs.
- `docs/architecture.md` — `features/statement/` en el árbol, con la nota de que no
  importa de ninguna otra feature.

**No se tocan:** `src/shared/movements.ts` (se usa tal cual), `features/review`,
`features/category-rules`, `features/import`, `features/net-worth`, `PlaceholderView`
(sigue sirviendo a `/overview` y `/investments`) ni el backend.

## 3. Firmas nuevas

```ts
// src/features/statement/months.ts
/** `2026-09`. El mes es la unidad de esta pantalla, no una fecha suelta. */
export type MonthKey = string

export const STATEMENT_PAGE_SIZE = 200 // el máximo del contrato (R1, R13)

/** El mes natural de hoy, leído en hora local: es el mes en el que vive el usuario. */
export function currentMonth(now?: Date): MonthKey

/** `2026-09` → `{ from: '2026-09-01', to: '2026-09-30' }`, los dos extremos incluidos. */
export function monthRange(month: MonthKey): { from: string; to: string }

/** `shiftMonth('2026-01', -1)` → `'2025-12'`. Cruza el año sin aritmética de días. */
export function shiftMonth(month: MonthKey, delta: number): MonthKey

/** `2026-09` → `September 2026` (en-GB, UTC). */
export function formatMonthLabel(month: MonthKey): string

/** True cuando no tiene sentido ir hacia delante: el mes mostrado es el de hoy o posterior. */
export function isAtOrAfterCurrentMonth(month: MonthKey, now?: Date): boolean

/** Lee `?month=`; cualquier cosa que no sea `YYYY-MM` válido cae al mes en curso (R4). */
export function monthFromRouteQuery(query: LocationQuery, now?: Date): MonthKey
export function monthToRouteQuery(month: MonthKey): LocationQueryRaw

/** La query exacta que se pide: sin `status`, sin `accountId`, sin `q` (R1). */
export function monthQuery(month: MonthKey, page?: number): MovementQuery

/** Parte la lista ya ordenada por la API en días consecutivos, sin reordenar nada (R8). */
export function groupByDay(movements: Movement[]): DayGroup[]

/** «93 movements» / «1 movement». */
export function movementCountLine(total: number): string

/** La frase del mes vacío (R11) y la del fallo de carga (R12). */
export function emptyMonthLine(month: MonthKey): string
export function statementErrorMessage(error: AppError): string
```

```ts
// src/features/statement/types.ts
export interface DayGroup {
  /** `2026-09-11`, tal como vino en `bookingDate`. */
  date: DateOnly
  /** La etiqueta ya formateada con `formatDate` de shared/money. */
  label: string
  movements: Movement[]
}
```

```ts
// src/features/statement/store.ts  (setup store)
const month = ref<MonthKey>(currentMonth())
/** Null mientras no se ha cargado nunca o cuando la última carga falló. */
const result = ref<MovementPage | null>(null)
/** Las páginas 2..n que el usuario haya traído con `Load more`, en orden (R13). */
const extra = ref<Movement[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<AppError | null>(null)

const days = computed<DayGroup[]>(...)          // result.movements + extra, agrupados
const hasMore = computed<boolean>(...)          // páginas que faltan del mes

async function show(next: MonthKey, client?: HttpClient): Promise<void>
async function shift(delta: number, client?: HttpClient): Promise<void>
async function loadMore(client?: HttpClient): Promise<void>
```

## 4. El camino, paso a paso

1. `StatementView` lee la ruta con `monthFromRouteQuery(route.query)` al montar y llama
   a `store.show(month)`. Un `watch` sobre `route.query.month` vuelve a llamar a `show`
   cuando el mes de la URL cambia por el botón de atrás (R3, R4).
2. `MonthNav` **no carga nada**: emite `change(monthKey)`. La vista hace
   `router.push({ query: monthToRouteQuery(next) })`, y es el `watch` del punto 1 el que
   dispara la carga. Así la URL es la única fuente de verdad del mes y no hay dos
   caminos que puedan discrepar.
3. `store.show` incrementa un contador interno `loadRun`, pone `isLoading`, vacía
   `extra` y llama a `getMovements(monthQuery(month))`. Al volver, **si el run ya no es
   el suyo descarta la respuesta** (R15) — el patrón `loadRun` del store de Review, aquí
   obligatorio porque las flechas se pulsan más rápido que la red. El store **nunca
   lanza**: el fallo vive en `error` y lo pinta la vista (patrón de net-worth).
4. `MonthTotals` recibe `pagination` y `totals` y pinta las tres cifras, el recuento y
   la nota fija. Ninguna cifra se calcula aquí: `toCents` solo se usa para saber si
   `net` es negativo y pintarlo en `text-negative`, igual que `ReviewTotals`.
5. `StatementList` recibe `days` y pinta una cabecera por día y sus filas. Con
   `pagination.total === 0` pinta la frase de R11 y **nada más**.
6. `Load more` llama a `store.loadMore()`, que pide `monthQuery(month, page + 1)` y
   **concatena** a `extra`. `pagination.total` y `totals` se quedan **los de la primera
   página**: son del mes entero, no de la página (R13).

## 5. El mes: cómo se calcula sin que un huso horario mueva un día

- **El mes en curso se lee en hora local** (`getFullYear` / `getMonth` de un `Date`):
  es el mes en el que el usuario cree que está. `currentMonth(now?)` recibe el `Date`
  por parámetro para que el test lo fije sin tocar el reloj global.
- **El rango se construye como texto**, no con aritmética de fechas: `from` es
  `${month}-01` y `to` es `${month}-${diasDelMes}`, con los días del mes sacados de
  `new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()`. Así nunca aparece un
  `Date` con hora local que se desplace un día (el mismo cuidado que ya tiene
  `formatDate` en `shared/money.ts`, que formatea en UTC).
- **Las etiquetas se formatean en UTC** con un `Intl.DateTimeFormat('en-GB', { month:
  'long', year: 'numeric', timeZone: 'UTC' })` inmutable declarado en `months.ts`.
  *Por qué no va en `shared/money.ts`:* allí viven los formatos que ya comparten dos
  features; una etiqueta de mes la usa hoy solo esta. Si una segunda la necesita, se
  mueve entonces, que es la regla que siguieron las categorías (F17) y los movimientos
  (F18).
- **La flecha de mes siguiente se deshabilita** cuando `isAtOrAfterCurrentMonth(month)`:
  no hay nada que mirar en el futuro. La flecha de mes anterior **nunca** se deshabilita:
  el frontend no sabe dónde empieza el histórico y averiguarlo costaría una petición
  extra; un mes anterior a enero de 2024 simplemente sale vacío con la frase de R11.

## 6. Textos (todos en inglés, todos en `months.ts` salvo los rótulos fijos)

| Sitio | Texto |
|---|---|
| Título de la pantalla | `Movements` |
| Subtítulo | `Your whole history, month by month, exactly as the bank reported it.` |
| Etiquetas de las cifras | `Money in` · `Money out` · `Difference` |
| Recuento | `93 movements` / `1 movement` |
| **Nota fija de R6** | `These are raw bank movements. Deposit openings and maturities, and transfers to accounts not imported here, count as money in and out: July 2026 reads 57.949 € in and 59.096 € out, almost all of it one deposit rolling over. Paired transfers are already out of these figures, but you still see them in the list below. A clean view needs the noise switch, which comes in a later step.` |
| Mes vacío (R11) | `No movements in September 2026.` |
| Cargando (R14) | `Loading September 2026…` |
| `Load more` (R13) | `Load more` + `Showing 200 of 412` |
| Marca de traspaso (R10) | `Transfer` (badge `neutral`, con `title`/`aria-label` `Paired transfer: not counted in this month's figures`) |
| Sin categoría (R9) | `Uncategorized` (el mismo literal que la fila de Review) |
| Errores (R12) | `Couldn't reach the server.` (red) · `The server answered, but the statement couldn't be read.` (`ValidationError`) · `The backend rejected that month.` (400) · `Something went wrong loading this month.` (resto). Nunca el `message` del backend, que viene en español. |

La nota de R6 es larga a propósito: es la única pieza de la pantalla que impide leer las
sumas como gasto real, y se decidió que **no se pueda cerrar** (ver procedencia de R6).
Se pinta en `text-warning` sobre `bg-warning-subtle` con el icono `TriangleAlert`,
`text-xs`, dentro de la misma `BaseCard` que las cifras, no en una tira aparte que el
ojo aprenda a saltarse. Los importes del ejemplo van **escritos en el literal**, no
calculados: son la medición de `progress/exploration/ruido-traspasos-datos.md §6`.

## 7. Estilo, accesibilidad y `data-test`

- Cabecera de la pantalla: `h1` `Movements` + subtítulo, como `ReviewView`.
- `MonthNav`: dos `BaseButton` `variant="secondary" size="sm"` con `ChevronLeft` /
  `ChevronRight` (ya importados en `ReviewPager`, mismo set `@lucide/vue`), la etiqueta
  del mes en `font-display`, y el `BaseInput type="month"` con `label="Jump to month"`.
  Los dos botones llevan `aria-label` explícito (`Previous month` / `Next month`).
- `MonthTotals`: `BaseCard`, las tres cifras en `font-mono tabular-nums`, `Difference`
  en `text-negative` / `text-positive` según el signo de `net`.
- Cabecera de día: `sticky top-0 bg-surface-app/95` dentro de la lista, para que al
  bajar por un mes largo se sepa qué día se está mirando. Las sumas **no** son sticky:
  ocupan demasiado y el mes cabe en pocas pantallas.
- `data-test`: `statement-view`, `statement-month-label`, `statement-prev`,
  `statement-next`, `statement-month-input`, `statement-totals`, `statement-totals-in`,
  `statement-totals-out`, `statement-totals-net`, `statement-totals-count`,
  `statement-totals-note`, `statement-day`, `statement-day-label`, `statement-row`,
  `statement-row-description`, `statement-row-account`, `statement-row-category`,
  `statement-row-amount`, `statement-row-transfer`, `statement-empty`,
  `statement-loading`, `statement-error`, `statement-retry`, `statement-load-more`.
- El único par de color posiblemente nuevo es `--warning on --surface-card`. La F18 ya
  lo introdujo para el aviso de la previsualización; **T0 comprueba que sigue teniendo
  su línea `contrast:`** en `theme-dark.css` y no se toca el tema si ya está.

## 8. Tests

- `months.spec.ts` — `currentMonth` con un `Date` fijo; `monthRange` de un mes de 28,
  30 y 31 días y de **febrero de un año bisiesto** (2024-02 → `2024-02-29`);
  `shiftMonth` cruzando año en los dos sentidos; `formatMonthLabel`;
  `isAtOrAfterCurrentMonth`; `monthFromRouteQuery` con `2026-09`, `2026-13`, `26-09`,
  `''`, ausente y array (R4); `monthQuery` (que lleva `from`, `to`, `page` y
  `pageSize=200` y **no** lleva `status`); `groupByDay` con tres días, un día con un
  solo movimiento y lista vacía, comprobando que **no reordena**; los textos.
- `store.spec.ts` — la petición sale con el rango esperado; `show` de otro mes reemplaza
  el resultado; **una respuesta tardía de un mes que ya no es el pedido se descarta**
  (R15); el fallo deja `error` y no lanza (R12); `loadMore` concatena y **no** cambia
  `totals` ni `pagination.total` (R13); `show` vacía lo que `loadMore` había traído.
- `MonthTotals.spec.ts` — las tres cifras salen **tal cual** del `totals` inyectado y no
  coinciden con la suma de los movimientos que se le pasan (R5); la nota de R6 está
  presente y **no tiene botón de cerrar**; ningún texto de la pantalla contiene `spent`,
  `earned` ni `savings` (R7).
- `StatementRow.spec.ts` — los cuatro datos de R9; `-` en el importe de un `expense`;
  `Uncategorized` sin categoría; **`balanceAfter` no aparece** aunque el movimiento lo
  traiga (R9); la marca `Transfer` solo con `transferId` (R10).
- `StatementList.spec.ts` — cabeceras por día en orden descendente (R8); mes vacío →
  frase y **cero** filas y **cero** cabeceras (R11); `Load more` visible solo con
  `totalPages > 1` (R13).
- `MonthNav.spec.ts` — las flechas emiten el mes vecino correcto cruzando año; la de
  siguiente está deshabilitada en el mes en curso; el selector emite el mes elegido.
- `StatementView.spec.ts` — al montar sale **una** petición con el mes en curso (R1);
  `?month=2026-03` monta marzo; `?month=nope` monta el mes en curso (R4); cambiar de mes
  **escribe la URL** (R3); el spinner mientras carga (R14); el error con su botón de
  reintentar (R12); y **ninguna petición con método distinto de `GET`** en todo el
  escenario (C1).
- `e2e/statement.spec.ts` — con la red de seguridad que aborta todo `/api` no previsto:
  entrar por el menú `Movements`, ver el mes en curso con sus tres cifras y su nota,
  pulsar la flecha atrás y comprobar que la URL lleva `month=` y que las cifras cambian,
  recargar y seguir en el mismo mes, y aserción de que **ninguna** petición interceptada
  usa un método distinto de `GET`.
- `e2e/app-boot.spec.ts` no cambia: su ruta `**/api/movements*` ya responde a cualquier
  llamada de la lista, y el smoke no navega a `/movements`.
