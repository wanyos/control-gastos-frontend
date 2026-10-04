# Design — Feature 26: overview-previous-months

> Cómo se construye lo que pide `requirements.md`. Se apoya en `docs/architecture.md`,
> `docs/conventions.md` y `specs/25-month-at-a-glance/design.md`: aquí solo van los
> puntos donde esta feature añade algo o roza lo que dejó la F25.

## 1. Los hechos que ordenan el diseño

1. **Los 24 meses no dependen del mes de arriba.** Terminan en el mes de la fecha del
   último dato (`latest`), que la F25 ya lee una vez por visita. Consecuencias: pulsar
   un mes no mueve las filas (solo cambia cuál está marcada); cambiar de mes no cuesta
   ninguna petición de este bloque; y solo el más reciente de los 24 puede estar
   incompleto, porque todos los demás acaban antes de `latest`.
2. **Lo leído se comparte.** La F25 guarda las cifras de cada mes en
   `figuresByMonth` del store. Este bloque lee de ahí y escribe ahí. Una fila pinta el
   mismo objeto `MonthFigures` que pintaría la parte del mes si ese mes estuviera
   arriba: por eso las cifras coinciden por construcción (R2).
3. **Lo ahorrado lo suma el backend.** El contrato calcula `totals` sobre todas las
   coincidencias del filtro, así que `from` = día 1 del mes más antiguo y `to` = último
   día del último mes completo da las tres cifras del periodo en **una** petición. La
   pantalla no suma (C3). Es el mismo criterio que hizo aceptable la mediana en la F25,
   al revés: allí no había endpoint que la diera; aquí sí.
4. **Coste.** Hoy la parte del mes hace 15 `GET` al entrar a un mes completo (lo afirma
   `store.spec.ts`; en el navegador son 17 porque la barra lateral y la barra superior
   piden lo suyo en cualquier pantalla, `docs/stack.md`). Con este bloque: 15 + 11 meses
   que la parte del mes no había pedido + 1 del periodo = **27**. Septiembre de 2026
   (incompleto): 3 + 23 + 1 = 27. Octubre de 2026 (vacío): 2 + 24 + 1 = 27. El máximo,
   un mes cuyos doce anteriores caen fuera de los 24: 15 + 24 + 1 = 40. Después, ir a
   cualquier mes de 2025-10 en adelante cuesta **1** petición (su gasto sin categoría)
   en vez de las 2 de hoy, porque sus doce anteriores ya están leídos. La F25 midió
   ~5 ms por petición en local; aquí no se ha vuelto a medir (el backend no respondía).
5. **La escala.** Una sola para las 48 barras: la cifra más alta (`income` o `expense`)
   de los meses completos. Con las cifras conocidas es `11527.15` (gasto de 2025-07):
   agosto de 2026 queda en 22,5 % y 34,7 % del ancho, enero de 2026 en 27,0 % y 16,4 %.
   El gasto de 2024-08 (20.680 €) queda fuera de los 24 meses. No se conoce lo que entró
   de 2024-10 a 2025-02; si allí hay una cifra mayor, la escala será esa.

## 2. Archivos

### Nuevos — `src/features/overview/`

| Archivo | Qué |
|---|---|
| `previousMonths.ts` | Todo lo puro de este bloque (§4): los 24 meses, el periodo, la escala, las filas y **todos sus textos**. Sin estado ni HTTP. `reading.ts` no se toca. |
| `components/PreviousMonths.vue` | El bloque: título, frase, notas, cabeceras, filas, carga y error. Solo props y un evento. |
| `components/PreviousMonthRow.vue` | Una fila (`<tr>`). |
| `__tests__/previousMonths.spec.ts` | Lo puro. |
| `__tests__/previousMonthsService.spec.ts` | La lectura del periodo. |
| `__tests__/previousMonthsStore.spec.ts` | Lo que el store añade. |
| `__tests__/PreviousMonths.spec.ts` | Los dos componentes, con props. |
| `__tests__/OverviewPreviousMonths.spec.ts` | El bloque dentro de `OverviewView`. |

### Modificados

- `src/features/overview/types.ts` — se **añaden** `PeriodTotals`, `NetSign`, `MonthRow`.
- `src/features/overview/service.ts` — se **añade** `getPeriodTotals`. Las tres lecturas
  de la F25 no cambian.
- `src/features/overview/store.ts` — estado y acciones nuevas (§5). `show`, `retry` y
  `retryComparison` conservan su firma y su comportamiento.
- `src/features/overview/views/OverviewView.vue` — monta `PreviousMonths` como último
  hijo y llama a `loadPreviousMonths` (§6). No cambia ningún texto ni el orden de lo
  que ya hay.
- `src/features/overview/__tests__/fixtures.ts` — solo se **añade**: la clase de lectura
  `period` y su respuesta (§7).
- `src/features/overview/__tests__/OverviewView.spec.ts` y `e2e/overview.spec.ts` — las
  cinco aserciones de §7, y un test e2e nuevo.
- `src/assets/theme-dark.css` — solo si aparece un par de color nuevo (no debería: §6).
- `docs/architecture.md` y `docs/stack.md` — lo que esta feature vuelve falso (§8).

`src/features/import/`, `src/features/statement/`, `src/shared/` y `src/router/` no se
tocan. Sin dependencias nuevas ni iconos nuevos.

## 3. Tipos y lectura nuevos

```ts
export interface PeriodTotals { from: MonthKey; to: MonthKey; totals: Totals; movementCount: number }
export type NetSign = 'positive' | 'zero' | 'negative'
export interface MonthRow {
  month: MonthKey
  label: string                    // formatMonthLabel
  state: MonthState                // 'empty' | 'incomplete' | 'complete'
  isShown: boolean                 // the month the screen shows above
  totals: Totals | null            // null when empty
  incomePermille: number | null    // bar width; null unless complete
  expensePermille: number | null
  netSign: NetSign | null          // null unless complete
}

// service.ts
export function getPeriodTotals(from: MonthKey, to: MonthKey, client?: HttpClient): Promise<PeriodTotals>
```

`getPeriodTotals` → `getMovements({ from: monthRange(from).from, to: monthRange(to).to,
pageSize: 1 })`, ningún otro campo. Devuelve `totals` y `pagination.total`. Como las
otras tres, no acepta método ni cuerpo (C1).

## 4. Lo puro: `previousMonths.ts`

```ts
export const SHOWN_MONTHS = 24

export function shownMonths(latest: DateOnly | null): MonthKey[]          // newest first; [] when null
export function summedPeriod(latest: DateOnly | null): { from: MonthKey; to: MonthKey } | null
export function scaleTop(complete: readonly MonthFigures[]): DecimalString | null
export function buildMonthRows(
  months: readonly MonthKey[],
  figuresByMonth: Readonly<Record<MonthKey, MonthFigures>>,
  latest: DateOnly | null,
  shown: MonthKey,
): MonthRow[] | null                                                       // null if any month is missing
export function periodSentence(period: PeriodTotals, first: MonthKey): string
export function leftOutLine(latest: DateOnly | null): string | null
export function notShownLine(shown: MonthKey, months: readonly MonthKey[]): string | null
export function dataEndsLine(latest: DateOnly): string
```

- `shownMonths`: el mes de `latest` es `latest.slice(0, 7)`; los 24 con `shiftMonth`
  (0 a −23). Texto, sin `Date` ni reloj.
- `summedPeriod`: `from` = el más antiguo de los 24; `to` = el mes de `latest` si
  `latest === monthRange(mes).to`, y si no `shiftMonth(mes, -1)`. `null` sin `latest`.
- `scaleTop`: el mayor `toCents` entre `income` y `expense` de los meses que recibe
  (solo completos); `null` si no hay ninguno. `fromCents` al final.
- `buildMonthRows`: el estado de cada mes sale de `monthState` de `reading.ts`
  (importado, no copiado: es el criterio de la F25). Anchos con
  `sharePermille(cifra, scaleTop)`, y `0` cuando devuelve `null` (escala a cero).
  `netSign` con `toCents(net)`. Devuelve `null` si falta algún mes: no hay filas a
  medias (R13).
- `periodSentence`: la tabla de R11 en ese orden. Importes con `formatMoneyWhole`;
  `{−net}` = `fromCents(-toCents(net))`; nombres con `formatMonthLabel`.
- `leftOutLine`: `{Month} is left out: it is incomplete.` cuando el mes de `latest` no
  es el `to` de `summedPeriod`; si no, `null`.
- `notShownLine`: `{Month} is not one of these months.` o `null`.
- Constantes de texto: `PREVIOUS_MONTHS_TITLE = 'Month by month'`,
  `SHOWN_ABOVE = 'Shown above'`, `INCOMPLETE = 'Incomplete'`,
  `NO_MOVEMENTS = 'No movements'`, `PREVIOUS_MONTHS_LOADING = 'Loading month by month…'`,
  `PREVIOUS_MONTHS_FAILED = "Couldn't load these months."`,
  `PERIOD_FAILED = "Couldn't add up these months."`,
  `NOTHING_TO_ADD_UP = 'No complete months to add up yet.'`. Las cabeceras de columna
  son `MONEY_IN_LABEL`, `MONEY_OUT_LABEL` y `SAVINGS_LABEL`, importadas de `reading.ts`.
  El texto de carga es distinto de `COMPARISON_LOADING` a propósito: los dos pueden
  estar en pantalla a la vez.
- Los espacios U+00A0 salen de los formateadores; los tests no los teclean.

## 5. El store

```ts
state (nuevo):   previousLoad: LoadState
                 period: PeriodTotals | null;  periodLoad: LoadState
getters (nuevo): previousMonths: MonthKey[]            // shownMonths(latest)
                 monthRows: MonthRow[] | null          // only when previousLoad === 'ready'
actions (nuevo): loadPreviousMonths(client?)
```

- **Una petición por mes y por visita, también en paralelo (R15).** `readFigures` hoy
  solo reutiliza lo ya **terminado**; si la comparación y este bloque piden el mismo mes
  a la vez, saldría dos veces. Se añade dentro del setup del store un
  `Map<MonthKey, Promise<MonthFigures>>` de lecturas en curso (variable de la closure,
  como `run` y `visit`; no de módulo): `readFigures` devuelve la promesa en curso si la
  hay y la quita al resolverse o fallar. Lo mismo para `readLatest` (una promesa en
  curso). `reset()` vacía los dos. Es el único cambio dentro de código de la F25, y no
  altera nada observable: `store.spec.ts` pasa sin tocarse (C2).
- `loadPreviousMonths`: si `previousLoad` es `loading`, no hace nada. Si no:
  `await readLatest()`; con `latest === null` → `ready` y sin filas (R1). Si no, en
  paralelo: los meses de `shownMonths` que falten (`Promise.allSettled`, como
  `loadComparison`: los que llegan se quedan para el reintento) y, con su propio estado,
  `getPeriodTotals` del `summedPeriod`. Fallo de `latest` o de algún mes →
  `previousLoad: 'error'` (R13). Fallo del periodo → `periodLoad: 'error'` y las filas
  siguen (R14). Volver a llamarla tras un error pide solo lo que falta, periodo incluido.
- No usa el contador `run`: no depende del mes de arriba. Sí respeta `visit`: una
  respuesta que empezó antes de un `reset()` no se guarda.
- `reset()` deja además `previousLoad` y `periodLoad` en `idle` y `period` en `null`.
- `refreshIfLoaded()`: recuerda si `previousLoad !== 'idle'` antes del `reset()`, y en
  ese caso llama también a `loadPreviousMonths` después de lanzar `show`. Así el bloque
  se refresca tras una importación sin tocar `src/features/import/` (C4), y el test de
  la F25 que cuenta 30 peticiones sigue en 30 (allí el bloque nunca se cargó).
- `monthRows` = `buildMonthRows(previousMonths, figuresByMonth, latest, month)`.

## 6. La pantalla

`OverviewView.vue`: `PreviousMonths` es el último hijo del contenedor, después del
`<template>` del mes y fuera de él, de modo que también se ve con un mes de arriba vacío
o con el núcleo en error.

- `onMounted`: `store.reset()`, `syncFromRoute()` y **después**
  `void store.loadPreviousMonths()` (en ese orden: la primera petición de la pantalla
  sigue siendo la del mes de arriba). El `Try again` del núcleo llama además a
  `loadPreviousMonths` si `previousLoad === 'error'`.
- El nombre del mes en cada fila es un `RouterLink` a
  `{ query: monthToRouteQuery(month) }`: mismo camino que las flechas (el `watch` de
  `route.query` ya existente llama a `show`), `push` por defecto (R7). Sin utilidad de
  color en el enlace: `base.css` ya lo pinta, y esa clase la vigila
  `tailwind-sources.spec.ts` (misma desviación anotada en la F25).
- La fila emite `select`; la vista responde con `scrollIntoView({ block: 'start' })`
  sobre el elemento de `MonthNav` (R8). jsdom no implementa `scrollIntoView`: se llama
  con `?.`, y el test lo define antes de pulsar.
- `PreviousMonths.vue` (props: `rows`, `load`, `sentence`, `periodLoad`, `leftOut`,
  `notShown`; evento `retry` y `select`): una `BaseCard` con `<h2>` `Month by month`;
  la frase (`font-display`, como `MonthSentence`, sin reutilizar su `data-test`); las
  dos notas en `text-xs text-ink-muted`; y una `<table>` real con cabeceras
  `Month` · (barras, sin texto) · `Money in` · `Money out` · `Savings`. Cada cabecera de
  importe lleva un punto del color de su barra: es la leyenda.
- `PreviousMonthRow.vue`: `ShareBar` **sin modificar**, una por cifra, con dos colores
  `chart-*` distintos entre sí y de `bg-chart-4` (el de la línea sin categoría); los
  ocho ya tienen su línea `contrast:` sobre `surface-sunken`. Cifras con `formatMoney`,
  `font-mono tabular-nums`. `Savings`: `text-negative` / `text-positive` / `text-ink-strong`
  sobre `surface-card` (pares ya declarados) y `data-net` (R4). Fila marcada:
  `aria-current="true"`, borde izquierdo `border-line-brand` y `BaseBadge` `brand` con
  `Shown above`; **no cambia el fondo de la fila**, para no abrir pares nuevos sobre
  `surface-sunken`. Incompleto: `BaseBadge` `warning`.
- `data-test`: `previous-months`, `previous-months-sentence`, `previous-months-left-out`,
  `previous-months-not-shown`, `previous-months-row` (con `data-month`),
  `previous-months-link`, `previous-months-in`, `previous-months-out`,
  `previous-months-net`, `previous-months-bar-in`, `previous-months-bar-out`,
  `previous-months-shown`, `previous-months-incomplete`, `previous-months-empty`,
  `previous-months-loading`, `previous-months-error`, `previous-months-retry`,
  `previous-months-period-error` (C7).

## 7. Tests de la F25 que cambian, y solo en esto

Lista cerrada (C2). Cualquier otro cambio en un test de la F25 es un rechazo.

| Dónde | Aserción | Qué pasa |
|---|---|---|
| `OverviewView.spec.ts`, «paints nothing below the block of the month (C6)» | el último hijo es `overview-statement-link`; no aparece `year` | Se sustituye: el último hijo es `previous-months` y el anterior sigue siendo `overview-statement-link`. |
| `OverviewView.spec.ts`, «an incomplete month…» | `api.months()` es `['2026-09']` | Se quita esa línea. Lo que afirmaba (no se piden meses para la comparación) sigue en `store.spec.ts`, intacto. |
| `OverviewView.spec.ts`, «an empty month is only its sentence (R9)» | `api.calls` tiene longitud 2 | Se quita esa línea (sigue en `store.spec.ts`). La lista de lo que no se pinta **no cambia**. |
| `OverviewView.spec.ts`, «entering the screen again reads again…» | 15 y 15 | Pasa a 27 y 27. |
| `e2e/overview.spec.ts`, segundo test | `overviewReads(watch)` tiene longitud 2 | Pasa a 27. |

`fixtures.ts`, solo añadidos: `readOf` devuelve `kind: 'period'` cuando `from` y `to`
son de meses distintos (antes no existía esa petición, así que ningún test anterior
cambia de clase); `mockBackend` responde a `2024-10-01`…`2026-08-31` con
`60135.60` / `80934.73` / `-20799.13` y 863 movimientos, y **rechaza** cualquier otro
rango, para que un periodo mal calculado no pase en silencio. En `e2e/overview.spec.ts`,
`answerMovements` gana la misma rama y `MONTHS` los cinco meses de 2025-03 a 2025-07 de
la fixture, para que las filas y la frase hablen de lo mismo.

R9 de la F25 («un mes vacío no muestra ninguna cifra») se lee como hasta ahora: habla de
la parte del mes. Con octubre de 2026 arriba, debajo se ven los 24 meses.

## 8. Documentos que la feature vuelve falsos

- `docs/architecture.md`: el árbol de `features/overview/` (archivos nuevos) y la nota
  «El mes de un vistazo solo lee, y calcula una única cifra»: se añade que la pantalla
  hace una cuarta lectura (el periodo), que lo ahorrado lo suma el backend y que la
  mediana **sigue siendo** la única cifra calculada en el cliente.
- `docs/stack.md`: el párrafo del e2e undécimo (`e2e/overview.spec.ts` gana un test) y
  la línea de iconos de la feature (ninguno nuevo).

## 9. Alternativas descartadas

- **Los 24 meses anteriores al mes de arriba.** El mes de arriba sería siempre la
  primera fila —«señalado entre los demás» no significaría nada— y todas las filas se
  desplazarían en cada pulsación. Cuesta además una petición por cada mes que se
  retrocede. Queda como alternativa viva en la hoja.
- **Que los 24 meses se muevan para incluir al mes de arriba cuando queda fuera.** Dos
  reglas en vez de una, y el dibujo cambiaría al abrir la pantalla en el mes en curso.
- **Sumar aquí los 24 `net`.** Una petición menos, pero sería la segunda cifra calculada
  en el cliente cuando el backend ya la da; obligaría a decirlo en pantalla. Alternativa
  viva en la hoja (es la que preveía el `acceptance`).
- **Columnas verticales, una al lado de otra.** Con 24 meses y dos barras por mes, las
  cifras no caben junto a las barras: harían falta un gráfico y, aparte, una tabla.
- **Recortar la escala** (por ejemplo al doble de la mediana). Lee mejor los meses
  corrientes, pero el dibujo deja de ser proporcional, añade aritmética de cliente y un
  umbral elegido a mano. La escala se corrige sola cuando el humano marque los traspasos.
- **Pintar barras cortas en el mes incompleto.** Es justo lo que el intent no quiere:
  parecería un mes en el que casi no gastó.
- **Un store aparte para este bloque.** No podría compartir `figuresByMonth` ni las
  lecturas en curso sin exportarlas; se duplicarían peticiones.
- **Cambiar `show()` para que lea también los 24 meses.** Rompería los recuentos de
  `store.spec.ts` y ataría el bloque al mes de arriba, del que no depende.
- **Una librería de gráficos.** Dependencia nueva para 48 rectángulos.
