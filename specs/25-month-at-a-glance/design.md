# Design — Feature 25: month-at-a-glance

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` y `docs/conventions.md`: aquí solo se documentan los puntos
> donde esta feature roza sus fronteras.

## 1. Los hechos que ordenan el diseño

1. **Una sola fuente para todas las cifras: `GET /api/movements`.** La misma petición
   que hace el extracto (`from`, `to`, sin filtros) da los tres `totals` del mes **y**
   `pagination.total`. Por eso las cifras cuadran con el extracto por construcción
   (R5), y por eso se sabe si un mes tiene datos sin mirar si sus sumas son cero (un
   mes con solo traspasos suma 0,00 y no está vacío). `GET /api/overview` da la misma
   suma, pero no trae recuento y arrastra las cinco cuentas en cada respuesta: se
   descarta (§8).
2. **El frontend no sabe hasta qué día se importó, y no lo finge.** Lo único que el
   backend sí dice es **de qué fecha es el movimiento más reciente de la base**
   (`GET /api/movements?pageSize=1`, que ordena por `bookingDate DESC`). Un mes está
   incompleto si esa fecha es anterior a su último día (R8). No se usa el reloj: hoy,
   2 de octubre, septiembre sigue incompleto porque los datos acaban el día 11, y
   dejará de estarlo solo cuando llegue un movimiento posterior.
3. **Consecuencia útil:** si el mes mostrado está completo, sus doce anteriores también
   lo están (todos acaban antes). Así que la comparación nunca mezcla un mes a medias
   en la mediana, sin necesidad de ninguna regla extra.
4. **No hay endpoint de serie.** La comparación son doce peticiones más. Medido: ~5 ms
   cada una en local (108 en 0,7 s). Se guardan en el store durante la visita (C3).
5. **Se compara con la mediana, no con la media** (corrección del humano, 2026-10-02).
   La media la arrastran picos que no son un mes corriente: la del gasto que ve enero
   de 2026 es 5.377 € porque dentro están julio y agosto de 2025 (11.527 € y
   10.942 €). La mediana aguanta picos sueltos, pero **no** una ventana en la que más
   de la mitad de los meses son altos: la que ven octubre de 2025 a enero de 2026
   sigue entre 4.073 € y 6.793 €. Eso es del dato; se avisa en `decisions.md`.

## 2. Archivos

### Nuevos — `src/features/overview/`

| Archivo | Qué |
|---|---|
| `types.ts` | `MonthFigures`, `Uncategorized`, `MonthState`, `Verdict`, `Comparison`, `LoadState` (§3). |
| `service.ts` | Las tres lecturas (§4). Solo `getMovements` de `@/shared/movements`. |
| `reading.ts` | Todo lo puro (§5): los doce meses, el estado del mes, la mediana, la tasa, el veredicto y **todos los textos**. Sin estado ni HTTP. |
| `store.ts` | `useOverviewStore` (setup store), §6. |
| `views/OverviewView.vue` | La página (§7). La URL es la única que escribe el mes. |
| `components/MonthSentence.vue` | La frase, en `font-display`, como primer bloque. |
| `components/MonthFiguresGrid.vue` | Cuatro `StatCard`: `Money in`, `Money out`, `Savings`, `Savings rate`; en el slot de las dos primeras, `UsualLine`. |
| `components/UsualLine.vue` | Un `BaseBadge` (`neutral`) con la etiqueta y la línea `{pct} above/below your usual month ({usual})`. |
| `components/UncategorizedLine.vue` | `BaseCard` con la línea de R12 y una `ShareBar` con el porcentaje sin categoría. |
| `__tests__/*.spec.ts` + `__tests__/fixtures.ts` | Ver `tasks.md`. Las fixtures son los `totals` **reales** de 2025-08 a 2026-10 y de 2024-01 a 2024-03 (solo cifras: ningún concepto ni nombre). |
| `e2e/overview.spec.ts` | Con `**/api/movements*` interceptado y la red de seguridad. |

### Modificados

- `src/router/index.ts` — la ruta `overview` monta `OverviewView` en vez de
  `PlaceholderView`. Mismo `path`, `name`, `label`, icono y posición (R1, C5).
- `src/router/__tests__/router.spec.ts` — un test nuevo: `/overview` monta
  `OverviewView` y no el placeholder. Las listas exhaustivas no cambian.
- `src/shared/money.ts` — se **añade** `formatMoneyWhole(amount)`: mismo
  `Intl.NumberFormat('es-ES', currency EUR, useGrouping: 'always')` con
  `maximumFractionDigits: 0`, formateando desde el string exacto (`"4003.89"` →
  `4.004 €`). Solo para la frase; las tarjetas usan `formatMoney`.
- `src/features/import/store.ts` — en el `finally` de `start`, junto al refresco de
  `net-worth`: `useOverviewStore().refreshIfLoaded(client)` (C3).
- `docs/architecture.md` y `docs/stack.md` — la carpeta nueva, sus dependencias y el
  e2e nuevo.

### Dependencias entre features

- `overview` → `statement`: importa `MonthNav.vue` y, de `months.ts`, `MonthKey`,
  `monthRange`, `shiftMonth`, `formatMonthLabel`, `monthFromRouteQuery`,
  `monthToRouteQuery` y `loadingMonthLine`. Un solo sentido; `statement` no conoce
  `overview`. Ningún archivo de `statement` se toca.
- `import` → `overview`: una llamada, igual que `import` → `net-worth`.
- `overview` no importa de `net-worth`, `review`, `transfers` ni `category-rules`.

## 3. Tipos

```ts
export interface MonthFigures { month: MonthKey; totals: Totals; movementCount: number }
export interface Uncategorized { amount: DecimalString; count: number }
export type MonthState = 'empty' | 'incomplete' | 'complete'
export type Verdict = 'usual' | 'more' | 'less'
export interface UsualComparison {
  usual: DecimalString
  /** (value − usual) / usual, in tenths of a percent; null when usual <= 0. */
  differencePermille: number | null
  verdict: Verdict | null
}
export interface Comparison { months: number; income: UsualComparison; expense: UsualComparison }
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'
```

## 4. El service: tres lecturas

```ts
export function getMonthFigures(month: MonthKey, client?: HttpClient): Promise<MonthFigures>
export function getUncategorizedSpending(month: MonthKey, client?: HttpClient): Promise<Uncategorized>
export function getLatestBookingDate(client?: HttpClient): Promise<DateOnly | null>
```

- `getMonthFigures` → `getMovements({ ...monthRange(month), pageSize: 1 })`. **Ningún
  otro campo**: es la pregunta del extracto sin filtros (R5).
- `getUncategorizedSpending` → `getMovements({ ...monthRange(month), type: 'expense',
  uncategorized: true, transfer: 'none', excluded: 'none', pageSize: 1 })`; devuelve
  `totals.expense` y `pagination.total` (R12). `transfer`/`excluded` no cambian el
  importe (lo excluido ya no suma); hacen que el recuento cuente los mismos movimientos.
- `getLatestBookingDate` → `getMovements({ pageSize: 1 })`; `movements[0]?.bookingDate ?? null`.
- Ninguna función acepta un método ni un cuerpo: no hay por dónde escribir (C1).

## 5. Lo puro: `reading.ts`

```ts
export const PRIOR_MONTHS = 12
export const USUAL_BAND_PERMILLE = 250           // ±25 % of the median

export function priorMonths(month: MonthKey): MonthKey[]            // 12, oldest first
export function monthState(figures: MonthFigures, latest: DateOnly | null): MonthState
export function medianAmount(amounts: readonly DecimalString[]): DecimalString | null
export function compareWithUsual(value: DecimalString, usual: DecimalString): UsualComparison
export function buildComparison(month: MonthFigures, prior: readonly MonthFigures[]): Comparison
export function savingsRatePermille(totals: Totals): number | null  // sharePermille(net, income)
export function monthSentence(figures: MonthFigures, latest: DateOnly | null): string
export function comparisonCaption(months: number): string
export function usualLineText(comparison: UsualComparison): string
export function verdictLabel(verdict: Verdict): string
export function uncategorizedLine(uncategorized: Uncategorized, expense: DecimalString): string
export function overviewErrorMessage(error: AppError): string
```

- `monthState`: `movementCount === 0` → `empty`; si no, `latest !== null && latest <
  monthRange(month).to` → `incomplete` (comparación de **texto**, sin `Date`); si no,
  `complete`. Con `latest === null` y movimientos (imposible por contrato) → `complete`.
- `medianAmount`: `toCents` de cada una y orden ascendente de los `bigint` (sobre una
  copia). **`N` impar:** el valor central (`sorted[(N − 1) / 2]`), que es tal cual una
  cifra del backend. **`N` par** —el caso normal, `N` = 12—: la **media de los dos
  centrales** (`sorted[N/2 − 1]` y `sorted[N/2]`), sumados y divididos entre 2
  redondeando mitad hacia fuera del cero **una vez**. `N` = 1 → ese valor; `N` = 2 → la
  media de los dos; `[]` → `null`. `fromCents` al final. Es la **única** cifra que no
  viene del backend ni sale de dos cifras suyas (C2). Ejemplo real: los doce gastos
  anteriores a agosto de 2026 tienen como centrales `2819.35` y `3115.81` →
  `2967.58`.
- `buildComparison`: filtra `prior` por `movementCount > 0`; `months` es cuántos quedan.
- `compareWithUsual`: `sharePermille(fromCents(value − usual), usual)`; veredicto
  `usual` si `|permille| <= 250`, `more` si `> 250`, `less` si `< −250`; `null` si la
  mediana es ≤ 0.
- `usualLineText`: `34,9 % above your usual month (2.967,58 €)` / `… below …` / `The
  same as your usual month ({usual})` con diferencia 0 / `Your usual month is {usual}`
  si no hay porcentaje. La palabra `average` no aparece en ningún texto de pantalla. El porcentaje se pinta sin signo (`formatPercent` del valor absoluto).
- `monthSentence`: la tabla de R4, en ese orden. `{in}`, `{out}`, `{net}`, `{−net}` con
  `formatMoneyWhole`; `{rate}` con `formatPercent`; `{date}` con `formatDate`;
  `{Month}` con `formatMonthLabel`. `{−net}` = `fromCents(-toCents(net))`.
- `overviewErrorMessage`: red → `Couldn't reach the server.`; `ValidationError` → `The
  server answered, but the month couldn't be read.`; resto → `Something went wrong
  loading this month.` Nunca el `message` del backend.
- Todos los textos de R7, R8, R11, R12 y R14 son constantes o funciones de este
  archivo: los tests los leen de aquí, y los espacios U+00A0 se generan con los
  formateadores, no se teclean.

## 6. El store

```ts
state:   month: MonthKey
         figuresByMonth: Record<MonthKey, MonthFigures>   // lo leído en esta visita
         latest: DateOnly | null
         core: LoadState;       coreError: AppError | null
         comparisonLoad: LoadState
         uncategorized: Uncategorized | null;  uncategorizedLoad: LoadState
getters: figures, state (MonthState | null), comparison (Comparison | null), sentence
actions: show(month, client?), retry(client?), retryComparison(client?),
         reset(), refreshIfLoaded(client?)
```

- `show(month)`: (1) **núcleo**, en paralelo: las cifras del mes (si no están en
  `figuresByMonth`) y `latest` (si no se pidió en esta visita). Fallo → `core: 'error'`
  (R13). (2) Con el núcleo listo y según el estado: `empty` → nada más (R9);
  `incomplete` → solo lo de sin categoría; `complete` → los meses de `priorMonths` que
  falten en `figuresByMonth`, en paralelo, y lo de sin categoría. Cada grupo con su
  propio `LoadState` (R14): si falla **uno** de los doce, `comparisonLoad: 'error'` y
  no hay `comparison`; los que sí llegaron se quedan guardados para el reintento.
- Un contador de carrera (`run`) descarta respuestas de un mes que ya no es el
  mostrado (C4); lo ya guardado en `figuresByMonth` sí se conserva: es de ese mes.
- `reset()` vacía todo; lo llama la vista al montarse (C3). `refreshIfLoaded()` no hace
  nada si `core === 'idle'`; si no, `reset()` + `show(month)`.
- Coste: primera vista de un mes completo = 1 + 1 + 12 + 1 = **15 `GET`**; retroceder
  un mes = **2** (el mes ya estaba entre los doce; falta uno nuevo y lo de sin
  categoría); un salto largo = hasta 14.
- El `Record` vive en el store (principio 5 de `architecture.md`: nada de caché en
  variables de módulo). La tira del año de la feature siguiente lee de él.

## 7. La vista

Orden vertical: `MonthNav` → `MonthSentence` → `MonthFiguresGrid` (con `UsualLine` en
`Money in` y `Money out`) → leyenda de R11 (texto `text-xs text-ink-muted`) →
`UncategorizedLine` → enlace de R15 (`RouterLink` a `{ name: 'movements', query:
monthToRouteQuery(month) }`). Nada debajo (C6).

- `onMounted`: `store.reset()` y `show(monthFromRouteQuery(route.query))`; un `watch`
  de `route.query` vuelve a llamar a `show`. `MonthNav` emite `change` →
  `router.push({ query: monthToRouteQuery(next) })` (R3). Igual que `StatementView`.
- Cargando el núcleo: `loadingMonthLine(month)`. Cargando la comparación: las cifras
  ya se ven y la leyenda dice `Loading the previous months…`.
- `Savings` y `Savings rate` usan `StatCard` tal cual (valor en `ink-strong`); el signo
  lo lleva la cifra y lo explica la frase. `StatCard`, `BaseCard`, `BaseBadge` y
  `ShareBar` **no se modifican**.
- `ShareBar` con `fillClass` de un color `chart-*` ya medido sobre `surface-sunken`.
  Pares de contraste: se reutilizan los declarados (`ink-strong`/`ink-muted`/`ink-body`
  sobre `surface-card`, `ink-body` sobre `surface-sunken`); si aparece uno nuevo se
  añade su línea `contrast:` (C8).
- El color del enlace va en un hijo, no en el `<a>` (nota de `conventions.md` sobre
  `base.css`).

## 8. Alternativas descartadas

- **`GET /api/overview?month=` para las cifras.** Es el endpoint «del mes», pero no
  trae recuento de movimientos (no distingue un mes vacío de uno que suma cero), repite
  las cinco cuentas y `totalBalance` en cada una de las trece respuestas, y obligaría a
  un parser nuevo. `GET /api/movements` ya tiene cliente y parser en `shared/`, y es
  literalmente la petición del extracto. `totalBalance` tampoco es el patrimonio (no
  incluye inversiones), así que no se enseña.
- **Decidir «incompleto» con el reloj** (mes en curso = incompleto). Hoy diría que
  septiembre está completo, con una tasa de −497 %.
- **Decidir «incompleto» por el último movimiento del propio mes.** Marcaría como
  incompleto cualquier mes pasado sin movimientos el día 30 o 31.
- **La media de los doce meses.** Era la propuesta inicial; el humano la cambió por la
  mediana en la puerta porque un pico suelto (una compra grande, un traspaso sin
  marcar) convertía un mes corriente en «65 % menos de lo habitual».
- **Desviación típica para el umbral.** Más aritmética de cliente de la que C2 admite.
- **Mover el umbral del 25 %.** Medido con la mediana: con 15 %, 25 % y 33 % las 22
  etiquetas de los once meses completos son **las mismas**. El umbral no es lo que
  decide; se queda en 25 %.
- **Mediana parcial cuando falla un mes.** Sería una cifra inventada (R14).
- **Mover `MonthNav` y `months.ts` a `shared/`.** Obligaría a tocar imports y tests del
  extracto sin cambio de comportamiento; se hará cuando una tercera pantalla los pida.
- **Un endpoint de serie en el backend.** No hace falta por coste (15 peticiones de
  5 ms). Tendría sentido para que la mediana fuese también del backend, o cuando la app
  no se sirva en local (E9); queda como sugerencia, fuera de esta feature («no quiero
  tocar el backend»).
- **Caché de sesión sin caducidad.** Marcar un movimiento o deshacer una pareja en otra
  pantalla cambia las sumas; al volver, esta pantalla diría otra cosa que el extracto.
