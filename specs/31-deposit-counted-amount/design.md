# Design — F31 `deposit-counted-amount`

Contrato leído: `gastos-backend/docs/api-contract.md` → `GET /api/movements` (respuesta,
tabla de `movements[].deposit`, §«Movimientos de depósito en las sumas») y `Movement`.
Hechos del contrato de los que depende este diseño:

- `deposit` **solo** viaja en `GET /api/movements`. Las respuestas de `PATCH
  /api/movements`, `PATCH /api/movements/:id` y `/api/transfers` no lo llevan.
- `GET /api/movements` no tiene ningún parámetro para filtrar por depósito: solo
  `transfer` y `excluded` (más los de siempre). Con `excluded=none&transfer=none` las
  aperturas y cancelaciones llegan, porque la migración de la F57 les quitó la marca.
- En un movimiento de depósito, `excludedFromTotals` y `transferId` no cambian lo que suma.
  `excluded=none` sigue filtrando por la marca también en ellos.
- `totals` ya sale con la regla aplicada (apertura y cancelación `0`, vencimiento su
  interés, dudoso `0`). El frontend no calcula nada.

## 1. Archivos

| Archivo | Cambio |
|---|---|
| `src/shared/movements.ts` | Tipo `MovementDeposit`; `Movement.deposit?: MovementDeposit \| null`; `parseDeposit`; `parseMovement` con modo de `deposit` (§2) |
| `src/shared/deposits.ts` (nuevo) | Funciones puras de presentación compartidas por `Movements` y `Review` (§3) y textos (§4) |
| `src/shared/__tests__/deposits.spec.ts` (nuevo), `src/shared/__tests__/movements.spec.ts` | Tests de §2 y §3 |
| `src/assets/theme-dark.css` | Línea `contrast: --warning on --surface-sunken >= 4.5` (R15). Lo mide `theme-dark.spec.ts`, sin tocar el test |
| `src/features/statement/components/StatementRow.vue` | R3–R8 |
| `src/features/statement/components/MonthTotals.vue` | R10 |
| `src/features/statement/components/StatementList.vue` | Recibe el total visible para `isEmpty` y `Showing x of y` (R13) |
| `src/features/statement/store.ts` | Quitar en el navegador lo de R11, recuentos R12/R13, conservar `deposit` en `adoptUpdated` (R2) |
| `src/features/statement/views/StatementView.vue` | Pasa el total visible a `MonthTotals`, `StatementList` y `emptyState` (R13) |
| `src/features/review/components/MovementRow.vue` | R9 |
| `src/features/review/store.ts` | Conservar `deposit` en `applyUpdated`, también al volver una línea con `Undo` (R2) |
| Fixtures y specs que fabrican respuestas crudas de `GET /api/movements` | Añadir `deposit: null` (§2) |
| `docs/guia-de-uso.md`, `docs/architecture.md` | Lote B |

`MonthTotals` sigue recibiendo `totals` y `pagination` tal cual; solo cambia el número que
se le da para `movementCountLine` (§5). `Overview` no cambia: lee `totals` y no pinta líneas.

## 2. Lectura (`src/shared/movements.ts`)

```ts
export type DepositKind = 'opening' | 'cancellation' | 'maturity'
export type DepositReason = 'principal_not_found' | 'several_principals' | 'opening_not_found'

export interface MovementDeposit {
  kind: DepositKind
  principal: DecimalString | null
  countedAmount: DecimalString
  ambiguous: boolean
  reason: DepositReason | null
  candidateMovementIds: number[]
}

// Movement gana:
//   /** null = no es de depósito. Ausente = la respuesta no lo trae (los PATCH, /api/transfers). */
//   deposit?: MovementDeposit | null

export function parseMovement(
  v: Validators, raw: unknown, path: string,
  depositField: 'required' | 'absent' = 'absent',
): Movement
```

- `parseMovementPage` llama con `'required'`: la clave tiene que estar (`null` u objeto).
  Falta o forma mala → `ValidationError` con la ruta (`movements[0].deposit.kind is not …`).
  Mismo criterio que `excludedFromTotals` (F22 design §5, ADR-002): un campo que falta no
  se lee como «no es de depósito», porque eso volvería a pintar un vencimiento como
  ingreso entero sin avisar.
- `kind` y `reason` son enumeraciones cerradas del contrato → `asMember`, estrictas.
- `parseUpdatedMovement`, `parseBulkResult` y `features/transfers/service.ts` siguen
  llamando sin el cuarto argumento: `deposit` queda ausente (`undefined`).
- **Efecto en los tests de otras features:** los fixtures crudos de `GET /api/movements`
  (`statement`, `review`, `overview`, `category-rules`, `import`) necesitan
  `deposit: null`. Es solo eso: ningún test de otra feature cambia lo que comprueba.

## 3. Presentación compartida (`src/shared/deposits.ts`)

Puras, sin Vue, importables desde `statement` y desde `review` (C3 de architecture: lo que
dos features necesitan baja a `shared/`).

```ts
/** Apertura o cancelación resuelta: lo que la casilla quita de la lista (R11). */
export function hiddenWhenHiding(m: Movement): boolean
/** Cuenta 0 a la vista: apertura/cancelación resuelta o dudoso (R3, R7). */
export function depositCountsNothing(m: Movement): boolean
/** El texto del segundo renglón, o null si no es de depósito (R4, R7). */
export function depositLine(m: Movement): string | null
/** `Counts 37,07 €` en un vencimiento resuelto; null en lo demás (R5). */
export function countedLine(m: Movement): string | null
/** El updated de un PATCH con el `deposit` de la lectura anterior (R2). */
export function withKnownDeposit(updated: Movement, known: MovementDeposit | null | undefined): Movement
```

Reglas de pintado, iguales en las dos filas (R3–R9):

| Caso | Importe | Concepto | 2.º renglón | Bajo el importe | `Transfer` / `Not counted` |
|---|---|---|---|---|---|
| Apertura / cancelación resuelta | `text-ink-faint line-through` | `text-ink-muted` | texto de clase, `text-ink-muted` | — | no |
| Vencimiento resuelto | `text-ink-muted`, sin tachar | como hoy | texto de clase, `text-ink-muted` | `Counts …`, `text-positive text-xs` | no |
| Dudoso | `text-ink-faint line-through` | `text-ink-muted` | texto de dudoso, `text-warning` | — | no |
| No es de depósito (`deposit` null o ausente) | como hoy | como hoy | como hoy | — | como hoy |

En `StatementRow`, `isLeftOut` pasa a ser `deposit ? depositCountsNothing : (excluded ||
transferId)`. En `MovementRow` (Review) solo cambian las líneas de depósito; las demás no
ganan tachado (Review nunca lo tuvo y el humano no quiere que cambie). La columna del
importe pasa a ser un bloque de dos renglones alineado a la derecha, misma anchura `w-28`.

## 4. Textos (en inglés en pantalla; la traducción va en `decisions.md`)

Segundo renglón (`statement-row-deposit` / `movement-deposit`):

| Caso | Texto |
|---|---|
| `opening` resuelta | `Deposit opening` |
| `cancellation` resuelta | `Deposit cancellation` |
| `maturity` resuelto | `Deposit maturity · only the interest counts` |
| dudoso | `Doubtful deposit <opening\|cancellation\|maturity> · <motivo> · not counted for now` (sin `· <motivo>` si `reason` es null) |

Motivos: `principal_not_found` → `no deposit amount found for it`;
`several_principals` → `it could belong to more than one deposit`;
`opening_not_found` → `no opening of this amount found`.

Bajo el importe (`statement-row-counted` / `movement-counted`): `Counts ${formatMoney(countedAmount)}`.

Nota bajo las cifras (`MonthTotals.vue`):

- A la vista (`FIGURES_LINE`): `These figures leave out the movements labelled "Transfer" or "Not counted", and count a deposit only by its interest.`
- Nueva sexta frase plegada, tras las cinco de la F29 y antes de la de grupos dudosos:
  `Opening or cancelling a deposit is not counted. When one matures, only its interest counts. A doubtful one counts nothing until the app knows how much was put in.`

## 5. La casilla `Hide what does not count` (store de `statement`)

Sin cambio en la petición: sigue `excluded=none&transfer=none` y la lectura de un
movimiento sin esconder (`hiddenCountQuery`). Encima:

- `visibleMovements` = filas cargadas (`result.movements` + `extra`) menos, con la casilla
  puesta, las que cumplen `hiddenWhenHiding`. `days`, `shown`, `shownMovements` (y por
  tanto `Select all`) salen de ahí.
- `hiddenInBrowser` = cuántas filas cargadas quitó eso (0 con la casilla quitada).
- `visibleTotal` = `result.pagination.total − hiddenInBrowser`. Lo usan
  `movementCountLine` en `MonthTotals`, `isEmpty` y `showingLine` en `StatementList`, y
  `hasMore` sigue usando la paginación del backend.
- `hiddenCount` pasa a computed: `(totalWithoutHiding − result.total) + hiddenInBrowser`
  con la casilla puesta y la segunda lectura respondida; `null` en los mismos casos que hoy.
- `emptyState` no cambia de lógica; recibe `visibleTotal` para decidir «vacío».
- `adoptUpdated`: la condición `gone` gana `|| (hideNoise && hiddenWhenHiding(merged))`, y
  la fila sustituida lleva `withKnownDeposit(updated, old.deposit)`.

**Límite conocido.** Con más de 200 movimientos en un mes, las aperturas y cancelaciones de
páginas aún no cargadas no se restan hasta pulsar `Load more`. El mes más cargado tenía 93.

## 6. `Review`

`review/store.ts` guarda un `Map<number, MovementDeposit | null>` con el `deposit` de cada
fila que lee (`adoptPage`). `applyUpdated` aplica `withKnownDeposit` con ese mapa, también
a la fila que vuelve a la lista con `Undo` (que ya no está en `loaded.movements`).

## 7. Alternativas descartadas

- **Pedir al backend un filtro por depósito** para que esconda y cuente él. Descartada
  porque el `intent` dice «no quiero tocar el backend»; queda como alternativa en la hoja.
- **Parsear `deposit` de forma tolerante** (ausente = `null`) para no tocar fixtures de
  otras features. Descartada: un backend que deje de mandarlo volvería a pintar un
  vencimiento como ingreso entero sin ningún error.
- **Calcular el interés en el navegador** (`amount − principal`). Descartada: el backend ya
  lo manda en `countedAmount` y es quien decide qué cuenta.

## 8. Lo que no cambia (F27–F30)

`data-movement-id` en ambas filas, el bloque bajo la barra superior con el aviso y su
`Undo`, el nombre de cuenta compartido (`accountLabel`), los desplegables, el recuadro del
resultado de aplicar reglas y la frase de pendientes sin categoría no se tocan. Los tests
de la F29 de `MonthTotals.spec.ts` cambian solo el texto esperado y el número de frases
plegadas (5 → 6), sin cambiar su nombre: sus `checks` siguen filtrando por ese nombre.
