# Design — F35 `doubtful-own-money`

Contrato: `gastos-backend/docs/api-contract.md` → `GET /api/movements` (campo
`movements[].ownership`, parámetro `ownership`), §«Movimientos entre tus cuentas en las
sumas», `PATCH /api/movements/:id` (campo `ownershipDecision`) y `PATCH /api/movements`
(que **no** lo admite). El informe de `POST /api/import` no dice nada de dudosos (leído
entero el 2026-10-21): de ahí §7.

Nombres en el código: los del contrato (`ownership`, `ownershipDecision`, `doubtful`,
`mine`, `not_mine`). No se inventa ningún otro.

## 1. Archivos

| Archivo | Qué cambia |
|---|---|
| `src/shared/movements.ts` | Tipos `OwnershipStatus`, `MovementOwnership`; `Movement.ownership?`; `parseOwnership`; `parseMovement` lo exige en `GET` (§2); `MovementQuery.ownership?: 'doubtful'` y `buildMovementsQuery` lo añade |
| `src/shared/ownership.ts` (nuevo) | Funciones puras del pintado en `Movements` (§3) |
| `src/features/statement/components/StatementRow.vue` | R14, R15 (§3) |
| `src/features/statement/store.ts` | R2 y R16 (§6) |
| `src/features/transfers/service.ts` | `getDoubtfulOwnership`, `countDoubtfulOwnership`, `setOwnershipDecision` (§4) |
| `src/features/transfers/types.ts` | `OwnershipDecision`; `Undo` y `Gesture` ganan los casos de §4 |
| `src/features/transfers/pairs.ts` | Textos de §5 y `ownershipWriteError` |
| `src/features/transfers/store.ts` | La tercera lista, el número, las tres escrituras (§4) |
| `src/features/transfers/components/DoubtfulOwnershipList.vue` (nuevo) | La lista |
| `src/features/transfers/components/DoubtfulOwnershipRow.vue` (nuevo) | Una fila con sus dos botones |
| `src/features/transfers/components/DoubtfulOwnershipCountBadge.vue` (nuevo) | El número del menú |
| `src/features/transfers/views/TransfersView.vue` | La sección nueva, arriba del todo |
| `src/shared/components/AppSidebar.vue` | Solo el número junto a `Transfers` (§8) |
| `src/features/import/service.ts` | `readDoubtfulIds` (§7) |
| `src/features/import/store.ts` | Lecturas de antes y después; `newDoubtfulCount`; refresco del número (§7) |
| `src/features/import/summary.ts` | `newDoubtfulLine(n)` |
| `src/features/import/components/ImportDialog.vue` | La línea, debajo de `ImportSummary` |

Pruebas y documentos: ver la cabecera de `tasks.md`.

## 2. Lectura (`src/shared/movements.ts`)

```ts
export type OwnershipStatus = 'own' | 'doubtful' | 'mine' | 'not_mine'

export interface MovementOwnership {
  status: OwnershipStatus
  ownAccountId: number | null
  ownAccountName: string | null
  matchedText: string | null
}

// Movement gana:
//   /** null = no es dinero propio. Ausente = la respuesta no lo trae (los PATCH, /api/transfers). */
//   ownership?: MovementOwnership | null
```

- `parseMovement(v, raw, path, depositField)`: cuando `depositField === 'required'` (solo
  lo pasa `parseMovementPage`) exige también la clave `ownership`, igual que `deposit`:
  si falta, `v.reject(`${path}.ownership`, 'null or an ownership object')`. `status` con
  `asMember` (estricto: enumeración cerrada del contrato); los otros tres, `null` o su
  tipo. **No se renombra el cuarto parámetro** (lo usan las features 31 a 34); su
  comentario dice que ahora cubre los dos campos que solo trae el `GET`.
- `parseUpdatedMovement`, `parseBulkResult` y `features/transfers/service.ts` siguen sin
  el cuarto argumento: `ownership` queda ausente.
- `buildMovementsQuery`: `add('ownership', query.ownership)` junto a `excluded` y
  `transfer`. Ausente si no se pide.
- **No se toca `changesBody` ni `MovementChanges`**: el `PATCH` en bloque usa los dos, y
  el contrato responde 400 a `ownershipDecision` en bloque. La respuesta va por su propia
  función (§4), con el cuerpo escrito literal.
- **Efecto en otras pruebas:** cada movimiento crudo de `GET /api/movements` de las
  pruebas necesita `ownership: null` (los mismos sitios que llevan `deposit: null`, más
  los que digan las tareas). Las respuestas de `PATCH` simuladas en los fixtures
  (`patchAnswer` en `statement`/`review`) quitan también `ownership`. Nada más.

## 3. Pintado en `Movements` (`src/shared/ownership.ts`, `StatementRow.vue`)

```ts
/** own o mine, y no es de depósito: no cuenta y la casilla lo esconde (R14, R16). */
export function isBetweenOwnAccounts(m: Movement): boolean
/** doubtful y no es de depósito (R15). */
export function isDoubtfulOwnership(m: Movement): boolean
/** El texto junto a la cuenta, o null (R14, R15). */
export function ownershipLine(m: Movement): string | null
/** El updated de un PATCH con el `ownership` de la lectura anterior (R2). */
export function withKnownOwnership(updated: Movement, known: MovementOwnership | null | undefined): Movement
```

`StatementRow.vue`:

- `isLeftOut` = `isDeposit ? depositCountsNothing : (excluded || transferId !== null || isBetweenOwnAccounts)`.
  Con eso el importe sale `text-ink-faint line-through` y el concepto `text-ink-muted`
  sin tocar `amountClass`.
- Un `<span data-test="statement-row-ownership">` nuevo en la línea de la cuenta, después
  de `statement-row-deposit` y antes de `statement-row-transfer`, con `ownershipLine`.
  Clase `font-semibold` + `text-warning` si es dudoso, `text-ink-muted` si es entre tus
  cuentas. En el de entre tus cuentas, `title` y `aria-label` con `OWN_MONEY_HINT`.
- `Transfer` y `Not counted` **siguen como están** (si un movimiento entre tus cuentas
  además está enlazado o marcado, salen las dos palabras). Un movimiento de depósito no
  pinta nada de `ownership` (el contrato: suma lo de su regla).
- Un dudoso conserva el color de su importe (`text-positive` en ingreso, `text-ink-strong`
  en gasto): cuenta.

`Review` (`MovementRow.vue`) **no cambia**: el humano solo habló de `Movements`.

## 4. La pantalla `Transfers`

### Servicio (`transfers/service.ts`)

```ts
export const DOUBTFUL_PAGE_SIZE = 200
/** GET /api/movements?ownership=doubtful&page=1&pageSize=200. */
export async function getDoubtfulOwnership(client?: HttpClient): Promise<{ movements: Movement[]; total: number }>
/** GET /api/movements?ownership=doubtful&page=1&pageSize=1 → pagination.total. */
export async function countDoubtfulOwnership(client?: HttpClient): Promise<number>
/** PATCH /api/movements/:id con el cuerpo literal { ownershipDecision }. */
export async function setOwnershipDecision(id: number, decision: OwnershipDecision, client?: HttpClient): Promise<void>
```

`OwnershipDecision = 'mine' | 'not_mine' | null`. Las dos lecturas usan `getMovements` de
`shared/movements.ts`. `setOwnershipDecision` lee la respuesta con `parseUpdatedMovement`
(para que una respuesta rota sea un `ValidationError`) y no la usa: la lista se vuelve a
pedir siempre, porque la respuesta del `PATCH` no trae `ownership` y solo el backend sabe
en qué queda el movimiento.

Hasta 200 dudosos en la lista. El humano dijo que son pocos (hoy 0); el número del menú
(§8) dice el total real. Con más de 200 no se pinta nada especial (decisions ⚙️).

### Store (`transfers/store.ts`)

Estado nuevo: `ownership: Movement[]`, `ownershipStatus: ListStatus`,
`doubtfulCount: number | null`.

- `fetchOwnership(quiet)`: como `fetchGroups`, con su propio contador de turno. Al
  responder, `doubtfulCount = total`. Si falla, la lista pasa a `error` y
  `doubtfulCount` **no se toca** (el número del menú no desaparece por un fallo de la
  pantalla).
- `load()`: las tres lecturas en paralelo y por separado (una que falla no toca a las
  otras: R5).
- `retryOwnership()`.
- `reloadBoth` se renombra `reloadLists` y vuelve a pedir **las tres** listas. Lo usan
  `write` (también tras enlazar o desenlazar: un movimiento que pasa a ser pierna de un
  traspaso deja de ser dudoso, según el contrato) y `reloadIfLoaded` (tras importar) pide
  también la tercera si ya estaba cargada.
- `refreshDoubtfulCount(client?)`: `countDoubtfulOwnership`; si falla, `null`. Mismo
  patrón que `refreshPendingCount` de `review`.
- `answerOwnership(id, decision: 'mine' | 'not_mine')`: pasa por `write` con el gesto
  `'ownership'`; resumen `MINE_NOTICE` o `NOT_MINE_NOTICE`; `undo = { kind: 'ownership', movementId: id }`.
- `undo()` gana el caso `'ownership'`: `setOwnershipDecision(id, null)`, resumen
  `ANSWER_UNDONE_NOTICE`, sin `undo`, gesto `'undo-ownership'`.
- `write` no cambia de forma: una escritura a la vez (`busy`), aviso, y en el `catch`
  `needsReload(failure)` decide si se recarga (un 400 no recarga: R9). El texto del error
  lo da `ownershipWriteError` cuando el gesto es `'ownership'` o `'undo-ownership'`.

Ninguna acción escribe sin venir de un clic: `load`, `reloadLists`, `reloadIfLoaded` y
`refreshDoubtfulCount` solo leen (R10).

### Vista y componentes

Orden de `TransfersView.vue`: línea de aviso (ya existe) → **sección nueva**
(`ownership-section`) → `Doubtful transfers` → `Linked pairs`. La sección nueva copia la
forma de la de grupos: `h2`, una frase debajo (`ownership-intro`), y loading / error con
`Try again` (`ownership-retry`) / vacío / lista.

`DoubtfulOwnershipRow.vue` (`<li data-test="ownership-row" :data-movement-id>`), en tarjeta
como `AmbiguousGroupCard`:

- Renglón pequeño: fecha (`formatDate`) · cuenta (`accountLabel(movement.account)`).
- Concepto (`ownership-description`, `lang="es"`).
- Motivo (`ownership-reason`, `text-xs text-ink-muted`).
- Importe con signo (`ownership-amount`, `formatMoney`, `-` delante en un gasto), con el
  color que tendría en `Movements`.
- Botones `It's mine` (`ownership-mine`, variante primaria) y `Not mine`
  (`ownership-not-mine`, secundaria), `size="sm"`, `:disabled="busy"`,
  `aria-label` con el concepto (`It's mine: <concepto>`).
- Emite `answer: [decision]`. Sin lógica de negocio.

`DoubtfulOwnershipList.vue`: `<ul>` de filas; reenvía `answer` con el id.

## 5. Textos (en inglés en pantalla; la traducción va en `decisions.md`)

En `transfers/pairs.ts`:

| Constante | Texto |
|---|---|
| `OWNERSHIP_HEADING` | `Doubtful: between your accounts?` |
| `OWNERSHIP_INTRO` | `Each one only names the bank of one of your accounts. It counts in your totals until you answer.` |
| `NO_DOUBTFUL_OWNERSHIP_SENTENCE` | `No doubtful movements. When a movement only names the bank of one of your accounts, it shows up here so you can say whether it is yours.` |
| `OWNERSHIP_LOADING` | `Loading the doubtful movements…` |
| `OWNERSHIP_LOAD_ERROR` | `Couldn't load the doubtful movements.` |
| `MINE_NOTICE` | `Marked as yours. It no longer counts in your totals.` |
| `NOT_MINE_NOTICE` | `Marked as not yours. It counts in your totals.` |
| `ANSWER_UNDONE_NOTICE` | `Answer undone.` |

`ownershipReason(m)`: con `matchedText` y `ownAccountName`:
`Names "<matchedText>", the bank of your account "<ownAccountName>"`; sin
`ownAccountName`: `Names "<matchedText>", the bank of one of your accounts`; sin
`matchedText`: `Names the bank of one of your accounts`.

`ownershipWriteError(error)`:

| Fallo | Texto | ¿Recarga? |
|---|---|---|
| red (`API_NETWORK`) | `Couldn't reach the server. Reloading, to be sure of what was written.` | sí |
| 400 | `Nothing changed. The server rejected that answer.` | no |
| 404 | `That movement no longer exists. Nothing changed. Reloading.` | sí |
| otro | `Something went wrong. Reloading to show what really happened.` | sí |

En `shared/ownership.ts`:

| Caso | `ownershipLine` |
|---|---|
| `own` / `mine` | `Between your accounts` (`OWN_MONEY_HINT`: `Money between your accounts: not counted in this month's figures`) |
| `doubtful` con `matchedText` | `Doubtful · names <matchedText> · counts until you answer in Transfers` |
| `doubtful` sin `matchedText` | `Doubtful · counts until you answer in Transfers` |
| `not_mine`, `null`, ausente, o de depósito | `null` |

En `import/summary.ts`, `newDoubtfulLine(n)`: `1 new doubtful movement: say in Transfers whether it is yours.` /
`<n> new doubtful movements: say in Transfers whether they are yours.`

## 6. `Movements`: casilla y `PATCH` (`statement/store.ts`)

- Una función local `hiddenBySwitch(m) = hiddenWhenHiding(m) || isBetweenOwnAccounts(m)`
  sustituye a `hiddenWhenHiding` en `visibleMovements` y en `gone` de `adoptUpdated`. Con
  eso `hiddenInBrowser`, `visibleTotal` y `hiddenCount` (`Hiding`) cuentan también los
  de entre tus cuentas, sin cambiar su fórmula (F31 design §5). Un dudoso no cumple
  ninguna de las dos: se queda.
- `adoptUpdated`: `withKnownOwnership(withKnownDeposit(answer, old?.deposit), old?.ownership)`.
- Las peticiones no cambian: el backend no tiene filtro de «entre tus cuentas».
- **Límite conocido** (el mismo de la F31): con más de 200 movimientos en un mes, los de
  páginas aún no cargadas no se restan hasta `Load more`.

## 7. La línea del informe de la importación

`import/service.ts`:

```ts
/** Ids de los dudosos de ahora: GET /api/movements?ownership=doubtful&page=1&pageSize=200. */
export async function readDoubtfulIds(client?: HttpClient): Promise<number[]>
```

`import/store.ts`, en `start()`:

1. Tras poner `importing` (síncrono, como hoy), `before = await readDoubtfulIds(client)`
   con `catch` → `null`. Va **antes** de `POST /api/import`.
2. `POST /api/import` como hoy.
3. Solo si el paso queda en `finished` y `before !== null`: `after = await readDoubtfulIds(client)`
   (`catch` → no hay línea); `newDoubtfulCount = after.filter(id => !before.includes(id)).length`.
4. En el `finally`, junto a `reviewStore.refreshPendingCount(client)`:
   `useTransfersStore().refreshDoubtfulCount(client)` (R12).

`newDoubtfulCount: number | null` vuelve a `null` en `open()` y en `close()`.
`ImportDialog.vue` pinta `<p data-test="import-new-doubtful">` con `newDoubtfulLine` justo
debajo de `ImportSummary` cuando es mayor que 0, en `text-sm text-warning`.

Por qué ids y no el número: una importación puede a la vez traer dudosos nuevos y quitar
otros (la detección de traspasos empareja uno y deja de ser dudoso); restar los dos
totales contaría de menos.

Efecto: cada importación hace dos lecturas más de `GET /api/movements` (antes y después)
y otra para el número del menú. Las pruebas del store de importación que cuentan
`GET /api/movements` cambian su número esperado, con un comentario; ningún test se
renombra.

## 8. El menú (`src/shared/components/AppSidebar.vue`)

Lo único que se toca del menú, para no chocar con la feature 36 (que añade una entrada en
`src/router/index.ts`): **en `AppSidebar.vue`, dentro del `<span>` de cada entrada,
justo debajo del `<ReviewCountBadge v-if="entry.name === REVIEW_ROUTE_NAME" …/>`, se
añade**

```vue
<DoubtfulOwnershipCountBadge v-if="entry.name === TRANSFERS_ROUTE_NAME" class="hidden md:inline-flex" />
```

con `const TRANSFERS_ROUTE_NAME = 'transfers'` en el `<script setup>` de `AppSidebar.vue`
(no en `src/router/index.ts`, que esta feature **no toca**) y su `import`. No cambia el
orden, ni las etiquetas, ni los iconos, ni ninguna otra entrada.

`DoubtfulOwnershipCountBadge.vue`: copia de `ReviewCountBadge.vue` (mismas clases), lee
`doubtfulCount` del store de `transfers`, llama a `refreshDoubtfulCount()` al montarse, y
no pinta nada con `null` o `0`.

## 9. Pruebas de navegador (`e2e/`)

El número del menú hace `GET /api/movements?ownership=doubtful&page=1&pageSize=1` en
**todas** las pantallas, y `Transfers` hace además la de `pageSize=200`. En cada
`page.route('**/api/movements*')` de `e2e/`:

- la petición con `ownership=doubtful` se contesta con una página vacía
  (`movements: []`, `total: 0`), salvo en la prueba nueva;
- y **no entra** en las lecturas que la prueba vigila (filtros por `pageSize`, `status`,
  `watch.requests`, `watch.aborted`, etc.).

Y cada movimiento crudo de esas respuestas gana `ownership: null`. Ninguna aserción de
otra feature cambia lo que comprueba.

`e2e/doubtful-own-money.spec.ts` (nuevo): sin backend, con la red de seguridad
`**/api/**` que aborta y apunta, como `e2e/manual-category-offers-rule.spec.ts`. Dos
dudosos inventados (conceptos como `TRANSF /BANCO FICTICIO NORTE`, cuenta propia
`Cartera inventada`, sin IBAN real); el `GET` de dudosos contesta según lo que se haya
respondido.

## 10. Alternativas descartadas

- **Leer `ownership` como optativo.** Ahorra tocar ~25 archivos de prueba, pero un backend
  que dejara de mandarlo pintaría todo como si contara, sin error.
- **Añadir `ownershipDecision` a `MovementChanges`.** Lo compartiría con el `PATCH` en
  bloque, al que el contrato responde 400; una función propia con el cuerpo literal hace
  imposible mandarlo en bloque.
- **Contar los dudosos nuevos restando dos totales.** Una lectura menos, pero cuenta de
  menos cuando la misma importación resuelve alguno (§7).
- **Un store nuevo para los dudosos.** Separaría la línea de aviso y el `Undo` de los de
  enlazar/desenlazar, en la misma pantalla: dos líneas de aviso que se pisan.
- **Poner `TRANSFERS_ROUTE_NAME` en `src/router/index.ts`.** Es lo más limpio, pero ese
  archivo lo toca a la vez la feature 36.

## 11. Lo que no cambia (F27–F34)

La sección `Doubtful transfers` y `Linked pairs` (textos, `data-test`, enlazar,
desenlazar, `Undo`); la línea de aviso de `Transfers` (mismo componente); `Review`
entero; la nota bajo las cifras de `Movements`; `Transfer` y `Not counted`; el pintado de
depósitos de la F31; la pregunta de la F34 y `Set when the import was closed`; el orden y
las entradas del menú.
