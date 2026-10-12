# Design — F30 `rules-applied-result`

## 0. La duda central: ¿se puede saber cuáles sin tocar el backend?

**Sí, con una comprobación que hace que, si algo no cuadra, no se enseñe lista.**

Lo que dice el contrato (`../gastos-backend/docs/api-contract.md`, leído el 2026-10-12):

- `POST /api/category-rules/apply` responde `categorized`, `conflictCount`, `conflicts`
  y `unmatched`. No devuelve qué movimientos categorizó. Solo escribe `categoryId`;
  `status` no cambia, así que un movimiento categorizado **sigue pendiente**.
- `GET /api/movements` filtra por `status=pending_review` y por `uncategorized=true`,
  con `pageSize` máximo 200, y garantiza que, **mientras no cambien los datos**,
  recorrer todas las páginas de un filtro devuelve cada movimiento exactamente una vez.
- No existe `GET /api/movements/:id` ni un filtro «con categoría»: solo `categoryId`
  exacto o `uncategorized=true`.

Procedimiento:

1. **Antes** del `POST`: leer todas las páginas de
   `status=pending_review&uncategorized=true` → conjunto de `id` «antes».
2. `POST /api/category-rules/apply`.
3. **Después** (solo si `categorized > 0`): leer todas las páginas de
   `status=pending_review`. Lista = los movimientos de esta lectura cuyo `id` estaba en
   «antes» y cuyo `categoryId` ya no es `null`. Cada uno trae su `category` embebida.
4. Comprobar que la lista tiene exactamente `categorized` movimientos. Si no, no se
   enseña.

**Coste con los números de hoy** (1.373 pendientes sin categoría antes; el total de
pendientes no lo he consultado —no se hacen peticiones al backend real en esta fase—,
pero no puede ser menor que 1.373):

| Paso | Peticiones |
|---|---|
| Lectura de antes: `ceil(1373 / 200)` | 7 |
| Aplicar | 1 |
| Lectura de después: `ceil(pendientes / 200)` | 7 como mínimo; 8 si los pendientes pasan de 1.400 |
| **Total** | **15 o 16**, frente a 1 de hoy |

Cada página de 200 movimientos pesa del orden de 100 KB (el contrato cita 821 KB para
1.520 movimientos). **Cuánto tarda no lo he medido**: haría falta aplicar contra el
backend real con el cronómetro de la pestaña de red.

**Si una lectura falla a medias:**

- La de antes: no se ha escrito nada todavía. No se envía el `POST` (R2).
- La de después: las reglas ya están aplicadas. Se guardan los números del backend y
  ninguna lista (R4, `read-failed`). No se usa ninguna página suelta.

**Casos que darían una lista equivocada**, y qué pasa en cada uno. Todos exigen que
otra pestaña o una importación cambie movimientos durante los segundos que dura la
aplicación (la ventana no se puede cerrar mientras tanto y la propia pestaña no puede
hacer otra cosa):

| Qué cambia entre las dos lecturas | Efecto en la lista | ¿Se detecta? |
|---|---|---|
| Otra pestaña pone categoría a mano a uno de «antes» (antes o después del `POST`) | Sobra uno | Sí: la lista tiene `categorized + 1` |
| Otra pestaña confirma uno recién categorizado | Falta uno | Sí: `categorized − 1` |
| Otra pestaña quita la categoría a uno recién categorizado | Falta uno | Sí |
| Una importación termina entre medias (también aplica las reglas) | Sobran los que categorizó ella | Sí, salvo que categorice 0 de «antes» (y entonces la lista es correcta) |
| Los datos cambian **durante** una lectura (páginas que se desplazan) | Repetidos o huecos | Sí: los `total` de las páginas difieren o los `id` distintos no suman el `total` |
| **Dos** cambios que se compensan (uno sobra y otro falta) | Lista con un movimiento que no es | **No.** Es el único caso sin detectar |

Conclusión: la lista es fiable para un uso de una sola persona; el caso sin detectar
exige dos cambios manuales simultáneos desde otra pestaña en una ventana de segundos.
Va dicho en la hoja.

**Lo que haría falta del backend para no depender de esto** (alternativa descartada,
por si el humano la prefiere): que `POST /api/category-rules/apply` devolviera además
`categorizedMovements: [{ movementId, description, bookingDate, amount, type,
categoryId, categoryName }]`. Una petición, exacta, sin ventana de carrera. Se descarta
porque el humano pidió no tocar el backend si se podía evitar, y se puede.

## 1. Archivos

| Archivo | Cambio |
|---|---|
| `src/features/category-rules/types.ts` | Tipos `LastApplyList`, `LastApply` |
| `src/features/category-rules/service.ts` | `getAllMovements` (leer todas las páginas) |
| `src/features/category-rules/rules.ts` | `categorizedByPass`, textos del bloque, `APPLY_NOT_STARTED` |
| `src/features/category-rules/store.ts` | `lastApply`, `dismissLastApply`, `confirmApply` con las dos lecturas |
| `src/features/category-rules/components/LastApplyReport.vue` | **Nuevo.** El bloque |
| `src/features/category-rules/components/CategorizedMovementList.vue` | **Nuevo.** Las filas |
| `src/features/category-rules/views/RulesView.vue` | Monta el bloque bajo la cabecera |
| `src/shared/money.ts` | `formatClock(at: Date)` |
| `src/features/review/store.ts` | `uncategorizedCount`, `refreshUncategorizedCount` |
| `src/features/review/components/UncategorizedCount.vue` | **Nuevo.** La frase |
| `src/features/review/views/ReviewView.vue` | Monta la frase y el bloque |
| `e2e/category-rules.spec.ts` | El recorrido del humano; ajuste de las rutas simuladas |
| `docs/architecture.md`, `docs/guia-de-uso.md` | Lo que esta feature vuelve falso |

No se toca: `ApplyRulesDialog.vue`, `ApplyResult.vue`, `RuleConflictList.vue`,
`StickyBelowTopBar.vue`, `RuleCreatedNotice.vue`, `ActionNotice.vue`,
`shared/movements.ts`, `theme-dark.css`.

## 2. Firmas nuevas

```ts
// category-rules/types.ts
export type LastApplyList =
  | { status: 'ready'; movements: Movement[] }
  | { status: 'unavailable'; reason: 'read-failed' | 'count-mismatch' }

export interface LastApply {
  at: Date // when the POST answered
  result: ApplyResult
  list: LastApplyList
}

// category-rules/service.ts
export const FULL_READ_PAGE_SIZE = 200
/** Every page of a query; throws when a page fails or the pages do not add up. */
export async function getAllMovements(
  query: Omit<MovementQuery, 'page' | 'pageSize'>,
  client?: HttpClient,
): Promise<Movement[]>

// category-rules/rules.ts
export const APPLY_NOT_STARTED: string // the sentence of R2
export function categorizedByPass(before: Movement[], after: Movement[]): Movement[]
export function lastApplyHeadline(categorized: number, clock: string): string // R5, R6
export function lastApplyFigures(result: ApplyResult): string // R5
export function listUnavailableMessage(reason: 'read-failed' | 'count-mismatch'): string // R4

// category-rules/store.ts
const lastApply = ref<LastApply | null>(null)
function dismissLastApply(): void

// shared/money.ts
/** `10:42`, 24 h, local time of the browser. */
export function formatClock(at: Date): string

// review/store.ts
const uncategorizedCount = ref<number | null>(null)
async function refreshUncategorizedCount(client?: HttpClient): Promise<void>
```

`getAllMovements` pide la página 1 y, conocido `totalPages`, las demás a la vez
(`Promise.all`). Con `total: 0` devuelve `[]` con una sola petición. La lectura que no
es válida se rechaza con `createValidators('GET /api/movements (all pages)').reject`,
es decir, un `ValidationError`: no hace falta un tipo de error nuevo.

## 3. `confirmApply`, paso a paso

```
if applying → return
applyFlow = applying; lastCreated = null; lastApply = null            (R10)
before = await getAllMovements({ status, uncategorized: true })       (R1)
  └ falla → applyFlow = failed(APPLY_NOT_STARTED); return             (R2: sin POST, sin applyRun++)
try
  result = await applyRules()
  si result.error → applyFlow = failed(applyErrorMessage)             (R12, como hoy)
  si no:
    list = categorized === 0 ? ready([])                              (R6: sin lectura)
         : await getAllMovements({ status })
             → categorizedByPass(before, after)
             → length === categorized ? ready(list) : unavailable('count-mismatch')
             (falla la lectura → unavailable('read-failed'))           (R3, R4)
    lastApply = { at: new Date(), result, list }
    applyFlow = done(result)                                          (C3)
catch → applyFlow = failed(applyErrorMessage)                         (R12)
finally → applyRun += 1                                               (solo si hubo POST)
```

`applyRun` se incrementa **después** de la lectura de después: así `Review` refresca su
página cuando la lista ya está guardada, y sus peticiones no se cruzan con la lectura.
El paso `applying` de la ventana (`Applying your rules…`, sin salida) cubre las tres
fases; su título y su texto no cambian. Cuando falla la lectura de antes, la ventana usa
el paso `failed` que ya existe (título `The rules pass didn't finish`) con la frase de
R2.

## 4. El bloque (`LastApplyReport.vue`)

- Props: `report: LastApply`. Emite `dismiss`. No lee el store: lo montan `RulesView`
  (`v-if="store.lastApply"`, justo debajo de `<header>`) y `ReviewView`
  (`v-if="rules.lastApply"`, entre `<header>` y `ReviewFilterBar`), y las dos llaman a
  `dismissLastApply()`.
- Dentro de un `BaseCard`. Titular, línea de cifras, y a la derecha `Dismiss`
  (`BaseButton` `variant="ghost" size="sm"`).
- Dos interruptores locales (`ref(false)`): la lista de categorizados y la de choques,
  cada una con su botón `secondary` `sm`, que alterna `Show the <N> movements` /
  `Hide the movements` y `Show the <N> conflicts` / `Hide the conflicts`. Plegadas al
  montarse.
- `CategorizedMovementList.vue`: `<ul>` con `max-h-96 overflow-y-auto`; cada `<li>`
  con `formatDate(bookingDate)`, el concepto (`lang="es"`, `break-words`),
  `formatMoney(amount)` en `font-mono tabular-nums` y el nombre de `category.name`
  (`lang="es"`). Solo lectura: ningún control. Usa las mismas parejas de token y fondo
  que `RuleConflictList` (`bg-surface-sunken`, `text-ink-body`, `text-ink-muted`,
  `text-ink-strong`): no aparece ninguna pareja nueva, así que no hay línea `contrast:`
  que añadir.
- La hora: `formatClock(report.at)`.

## 5. El número de `Review`

- `refreshUncategorizedCount`: `getMovements({ status: QUEUE_STATUS, uncategorized:
  true, page: 1, pageSize: 1 })` → `pagination.total`; si falla, `null`. Mismo patrón
  que `refreshPendingCount`.
- **No sale de una petición que la pantalla ya haga:** la página de `Review` viaja con
  los filtros del usuario y su `total` es el de esos filtros; solo coincidiría cuando el
  único filtro puesto es «sin categoría». Es una petición más, de un solo movimiento.
- Se llama desde `ReviewView.onMounted` (R13) y al final de `refreshAfterAction` (R14),
  que es el único sitio por el que pasan las acciones, el `Undo`, la recarga tras un
  fallo y `refreshAfterRules`.
- `UncategorizedCount.vue`: prop `count: number | null`; con `null` no pinta nada (R15).
  Va en el `<header>` de `ReviewView`, debajo de `ReviewTotals`, y no depende de
  `store.result`.

## 6. Lo que no se rompe de la feature 27

`hasNotice`, `touchedRow`, el `StickyBelowTopBar` y sus dos hijos con `v-if` / `v-else`
no se editan. El bloque del resultado es un hermano anterior a `ReviewFilterBar`, en el
flujo normal, sin `position: sticky`. `refreshAfterRules` sigue llamando a
`clearSelection()` primero (C2).

## 7. Errores

No hay tipos de error nuevos. Se reutilizan `ApiError` y `ValidationError`
(`shared/errors.ts`) y `applyErrorMessage`. Ninguna acción del store lanza: los fallos
acaban en `applyFlow` o en `lastApply.list`.

## 8. Dependencias entre features

Las de hoy, en el mismo sentido: `review` → `category-rules` (ahora `ReviewView` monta
también `LastApplyReport`). `category-rules` sigue sin importar nada de `review`:
`Movement` y `getMovements` salen de `shared/movements.ts`.

## 9. Alternativas descartadas

- **Que el backend devuelva la lista** (§0): exacta, pero es tocar el backend.
- **Deducir la categoría en el cliente** casando las reglas con el concepto de los
  movimientos de «antes» (ahorraría la lectura de después): habría que copiar la
  normalización del backend, y una diferencia mínima daría una lista falsa sin aviso.
- **Leer después solo los que siguen sin categoría** (6 páginas en vez de 7 u 8): da
  qué `id` salieron, pero no la categoría que recibió cada uno.
- **Usar `updatedAt`** para reconocer lo recién tocado: el contrato no dice que la
  aplicación de las reglas lo mueva.
- **Guardar el resultado en el navegador** para verlo tras recargar: enseñaría como
  recién categorizado algo que ya no se sabe si lo es.
- **Marcar en la cola de `Review` las filas recién categorizadas:** más alcance, y la
  marca dejaría de ser cierta en cuanto se cambie la fila.
- **Lista enseñada dentro de la ventana `Rules applied`:** se pierde al cerrarla, que
  es justo lo que anotó el humano.

## 10. Límites conocidos

- Si la aplicación responde con `error` (falló a medias), puede haber categorizado
  algunos movimientos y no se enseña cuáles (R12).
- Si una importación termina con `Review` abierta, el número de R13 no se refresca
  hasta la siguiente acción; le pasa lo mismo, hoy, a la lista de `Review`.
