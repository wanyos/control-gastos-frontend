# Design — Feature 23: statement-noise-toggle

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` y `docs/conventions.md`: aquí solo se documentan los puntos
> donde esta feature roza sus fronteras.

## 1. El hecho del contrato que ordena todo el diseño

`totals` de `GET /api/movements` **ya** deja fuera, siempre, los `neutral`, las dos
piernas de un traspaso, las aportaciones a producto y los marcados con
`excludedFromTotals: true`. Por tanto:

> Pedir el mes con `excluded=none&transfer=none` devuelve **exactamente los mismos
> tres `totals`** que pedirlo sin esos parámetros.

El interruptor **no mueve las cifras**. Lo que hace es que la lista deje de
contradecirlas: hoy se ven 93 filas y tres cifras que no las incluyen a todas, y eso
es lo que el humano llama «no poder leer el mes limpio». Consecuencias de diseño:

1. No hace falta ningún refresco de cifras al encender o apagar: la petición del mes
   ya trae los `totals` correctos (R6).
2. **El importe de lo escondido no se puede pedir.** Con `transfer=only` o
   `excluded=only` los tres `totals` salen a `"0.00"` por construcción. No hay
   combinación de parámetros que lo devuelva. De ahí R8 (§4).

## 2. Estado nuevo: `hideNoise`, y por qué NO entra en `StatementFilters`

`StatementFilters` es «lo que estrecha la barra de filtros»: lo limpia
`Clear filters`, lo lee `hasActiveFilters` para elegir el mensaje de vacío y el botón
de error. Meter ahí el interruptor tendría dos efectos indeseados: `Clear filters`
lo apagaría en silencio (C5) y el vacío diría «no hay coincidencias con estos
filtros» cuando la causa fue esconder. Así que va **aparte**, como el `month`:

```ts
// src/features/statement/filters.ts
/** El interruptor del ruido (F23). No es un filtro de la barra: `Clear filters` no lo toca. */
export type HideNoise = boolean

export function monthQuery(
  month: MonthKey,
  filters: StatementFilters = EMPTY_FILTERS,
  page = 1,
  hideNoise = false,
): MovementQuery

/** El mismo mes y los mismos filtros SIN esconder nada, pidiendo una fila: solo interesa `pagination.total`. */
export function hiddenCountQuery(month: MonthKey, filters: StatementFilters): MovementQuery

export function toRouteQuery(
  month: MonthKey,
  filters: StatementFilters,
  hideNoise?: boolean,
): LocationQueryRaw

export function fromRouteQuery(
  query: LocationQuery,
  now?: Date,
): { month: MonthKey; filters: StatementFilters; hideNoise: boolean }

/** `Hiding 34 movements` / `Hiding 1 movement`; null no imprime nada (R9). */
export function hiddenCountLine(hidden: number): string

/** El vacío que puede tener dos causas (R12). */
export function nothingLeftLine(month: MonthKey, hasFilters: boolean): string
```

`hideNoise` viaja en la URL como `hide=true`, con la misma forma que
`uncategorized=true` de la F20; cualquier otro valor se lee como apagado (R5), igual
que hace `firstQueryValue(query.uncategorized) === 'true'` hoy.

## 3. Los dos parámetros nuevos entran por `shared/`

`src/shared/movements.ts` es la frontera única de `GET /api/movements` (ADR-002). Se
amplía de forma **aditiva**, sin tocar a `features/review`:

```ts
export type MovementScope = 'only' | 'none'

export interface MovementQuery {
  // … lo de siempre
  transfer?: MovementScope
  excluded?: MovementScope
}
```

y en `buildMovementsQuery`, dos `add('transfer', …)` / `add('excluded', …)` más. El
tipo `MovementScope` es la última barrera antes del **400 `VALIDATION_ERROR`** del
contrato: ningún otro literal puede escribirse.

## 4. Cómo se dice lo que queda fuera: una resta de dos `pagination.total`

Con el interruptor encendido, tras cargar el mes se lanza **una** petición más:

```
GET /api/movements?from=…&to=…&<filtros>&page=1&pageSize=1
```

es decir, el mismo alcance **sin** `excluded` ni `transfer`. `hidden` =
`total(sin esconder) − total(en pantalla)`. Ventajas frente a las alternativas:

- Una sola petición, y la más barata posible (`pageSize=1`).
- **No cuenta dos veces** un traspaso que además está marcado, cosa que sí harían dos
  peticiones `excluded=only` + `transfer=only` sumadas.
- Es un número del backend, no una cuenta hecha aquí.

Alternativa descartada: sumar en el cliente los `amount` de los movimientos
escondidos para poder decir el importe. Exigiría traerse **todas** las páginas de lo
escondido (un mes de myinvestor son decenas de filas) y, sobre todo, produciría una
cifra fabricada en el frontend en la única pantalla cuyo problema histórico es
precisamente ese. C3 lo prohíbe.

La petición va **después** de la del mes y comparte el guardián `loadRun` del store:
si el usuario cambió de mes mientras volaba, su resultado se descarta. Un fallo deja
`hiddenCount` en `null` y no pinta nada (R9).

## 5. Archivos que se tocan

| Archivo | Qué cambia |
|---|---|
| `src/shared/movements.ts` | `MovementScope`, dos campos en `MovementQuery`, dos líneas en `buildMovementsQuery`. Aditivo. |
| `src/features/statement/filters.ts` | 4º parámetro de `monthQuery`; `hiddenCountQuery`; `hideNoise` en `toRouteQuery` / `fromRouteQuery`; `hiddenCountLine`; `nothingLeftLine`. |
| `src/features/statement/store.ts` | `hideNoise` y `hiddenCount` (refs); `show()` toma el interruptor; `loadMore()` y `refreshQuietly()` lo arrastran; `loadHiddenCount()`; `adoptUpdated()` retira la fila cuando el interruptor esconde lo que acaba de marcarse (R13). |
| `src/features/statement/components/NoiseSwitch.vue` | **Nuevo.** Casilla `Hide what does not count` + la línea `Hiding N movements`. Tonto: props `modelValue`, `hiddenCount`; emite `change`. |
| `src/features/statement/components/MonthTotals.vue` | Solo el texto de `FIGURES_NOTE` y su envoltorio: deja de ser un aviso ámbar con `TriangleAlert` y pasa a ser una nota informativa (`text-ink-muted`, icono `Info`), siempre visible y sin cerrar. |
| `src/features/statement/components/StatementList.vue` | Un tercer `empty-state` (`'nothingLeft'`) con el botón `Show everything` (R12). |
| `src/features/statement/views/StatementView.vue` | `syncFromRoute` lee `hideNoise`; `onToggleNoise` hace `router.replace`; `NoiseSwitch` se pinta entre la barra de filtros y las cifras. |

## 6. Dónde se pinta el interruptor, y por qué ahí

Entre `StatementFilterBar` y `MonthTotals`, en su propia línea:

```
[x] Hide what does not count          Hiding 34 movements
```

El número vive **pegado al interruptor**, no dentro de la tarjeta de cifras: la
tarjeta habla de lo que sí cuenta y la línea del interruptor, de lo que no. Así la
tarjeta no crece ni salta al encender, y apagar el interruptor hace desaparecer el
número entero, sin dejar un hueco. Alternativa descartada: meterlo en la barra de
filtros como quinto control, que lo convertiría en un filtro más y lo pondría a tiro
de `Clear filters` (C5).

## 7. El interruptor y la selección de la F22

`show()` ya vacía la selección, cierra el editor y olvida el último deshacer cuando
cambia el mes o un filtro; el interruptor entra por el mismo sitio, así que R11 sale
gratis y por el mismo camino. Lo que sí es nuevo: con el interruptor puesto, marcar
un movimiento hace que **deje de pertenecer a la vista**. Se resuelve reutilizando la
rama `gone` de `adoptUpdated`, que la F21 escribió para el filtro de categoría:

```ts
const gone =
  (hasCategoryFilter(filters.value) && !matchesCategoryFilter(updated, filters.value)) ||
  (hideNoise.value && (updated.excludedFromTotals || updated.transferId !== null))
```

La línea de aviso de la F22 (`3 movements excluded from totals` + `Undo`) sigue
encima de la lista, así que la desaparición es reversible de un clic (R13).

## 8. La nota: el corazón de la feature

`FIGURES_NOTE` de la F19 dice hoy que las sumas están infladas sin remedio y cita
julio de 2026 con **57.949 / 59.096 €**. Las dos cosas son falsas desde que se
marcaron los 29 apuntes de depósito. Pero el diagnóstico del humano en la segunda
vuelta va más allá: **el problema no era el número concreto, era el número clavado a
mano**. Cualquier literal que escribamos hoy («17 traspasos», «2 parejas», «150 €»)
caduca en cuanto él actúe, que es la enfermedad que esta feature viene a curar. De ahí
los tres criterios:

1. **El texto fijo no lleva ninguna cifra.** Ni de un mes, ni de movimientos, ni de
   traspasos (R14).
2. **Lo que es juicio del humano se dice en palabras.** Que un traspaso suyo no tenga
   pareja importada, o que una pareja detectada no sea un traspaso, **el programa no lo
   sabe**: el «17» salió de una búsqueda por conceptos (`progress/exploration/
   ruido-traspasos-datos.md` §3) que el propio informe reconoce con falsos positivos
   posibles, y el «2» de mirar dos multas a mano (§2). Cifrarlos sería darle rango de
   dato a una corazonada.
3. **Solo entra en vivo lo que el backend cuenta él** (R15), y solo si compensa.

### Qué cifra viva entra, y por qué las otras tres no

| Candidata | De dónde | Coste | Veredicto |
|---|---|---|---|
| Escondidos del mes | resta de dos `pagination.total` (§4) | 1 petición por mes / filtro, solo con el interruptor puesto | **Sí**, pero **junto al interruptor**, no en la nota: es del mes y cambia con él |
| Marcados del mes | `excluded=only` + mes + filtros | 1 petición más **por mes y por filtro** | **No**: solo partiría en dos el `Hiding N` que ya se ve |
| Parejas enlazadas | `GET /api/transfers` → `pairs.length` | 1 por sesión, pero la respuesta trae **las dos piernas completas de las 40 parejas**, sin paginar | **No**: habla de toda la historia bajo las cifras de **un mes**, y es la respuesta más pesada |
| Grupos dudosos | `GET /api/transfers/ambiguous` → `ambiguousCount` | **1 por sesión**, sin parámetros, respuesta pequeña | **Sí**: global de verdad, accionable y barata |

Coste total que la nota añade: **una lectura por sesión**. No depende del mes, ni de
los filtros, ni del interruptor, así que no se repite al navegar.

### Cuidado con lo que `ambiguousCount` NO es

Por el contrato, un movimiento **sin ningún candidato** —un traspaso cuya otra pierna
nunca se importó, justo el caso de los envíos bankinter → Myinvestor de 2024-2025—
**no se lista como dudoso**. `ambiguousCount` son los grupos que el emparejador vio y
no supo resolver, que es un conjunto distinto y más pequeño. Por eso la frase viva
**no sustituye** a la frase cualitativa: conviven, y la fija va primero.

### El texto, palabra por palabra

```ts
// src/features/statement/components/MonthTotals.vue
const FIGURES_NOTE =
  'These figures already leave out what does not count: the two legs of a paired ' +
  'transfer, and everything you marked as not counted. Both stay in the list — turn ' +
  'on "Hide what does not count" to read the month without them. Two things no count ' +
  'can tell you: a transfer of yours whose other leg was never imported still counts ' +
  'as money in and out until you mark it, and a pair the app detected may not be a ' +
  'transfer at all.'

/** La única cifra viva de la nota (R15). Ausente con 0 grupos o si la lectura falló. */
export const ambiguousNote = (groups: number): string =>
  groups === 1
    ? '1 group looks like a transfer but could not be paired automatically.'
    : `${groups} groups look like transfers but could not be paired automatically.`
```

Se pintan como dos frases seguidas en el mismo párrafo gris. El envoltorio deja de ser
el aviso ámbar con `TriangleAlert` y pasa a nota informativa (`text-ink-muted`, icono
informativo), permanente y sin cerrar.

### De dónde sale la cifra viva, en código

`GET /api/transfers/ambiguous` es un endpoint nuevo para este frontend. Se lee en
`src/features/statement/service.ts`, no en `shared/`: hoy lo necesita **una sola**
feature, y `docs/architecture.md` baja algo a `shared/` cuando lo pide la **segunda**
—es el camino que ya recorrieron `getMovements` (F18), el PATCH suelto (F21) y el PATCH
en bloque (F22)—. La feature de revisar parejas de la E7 será quien lo mueva.

```ts
// src/features/statement/service.ts
/** Solo `ambiguousCount`: el resto de la respuesta no se usa aquí (ADR-002 igual). */
export async function getAmbiguousCount(client?: HttpClient): Promise<number>
```

En el store, `ambiguousGroups = ref<number | null>(null)` y un `loadAmbiguous()` con el
mismo patrón de «una vez por sesión» que ya usan `loadAccounts` y `loadCategories`
(bandera `…Requested`, fallo silencioso que solo apaga su propio trozo).

## 9. Alternativas descartadas (resumen)

- **Dos interruptores** (`Hide marked` / `Hide transfers`): 4 estados, 4 claves de
  URL posibles y 4 combinaciones que probar, para una distinción que el humano no
  hace y que ya se ve fila a fila con las etiquetas `Not counted` y `Transfer`.
- **Esconder en el cliente** (filtrar el array ya cargado por `excludedFromTotals` o
  `transferId`): rompería `pagination.total`, el `Load more` y el recuento, y haría
  que la lista y las cifras vinieran de dos verdades distintas.
- **Guardar el interruptor en `localStorage`**: se pondría solo sin que el humano lo
  sepa al abrir la app en otro momento (`que_no_quiero` 3). La URL ya cubre «se
  recuerda al cambiar de mes y al recargar».
- **Encenderlo por defecto**: lo cerró el humano en `respuestas_del_humano` 1.
- **Mantener «17» y «2» en la nota y avisar al humano cuando cambien**: se lee muy bien
  hoy y vuelve a estar mal en cuanto marque el primer traspaso. Es el fallo de la F19
  repetido con números distintos.
