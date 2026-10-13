# Design — F30 `rules-applied-result`

> Rehecho el 2026-10-13: la lista de lo categorizado sale de la respuesta de aplicar.
> La versión del 2026-10-12 (dos lecturas de todas las páginas y una comparación) queda
> descartada entera; ver §9.

## 0. De dónde sale la lista

Del contrato (`../gastos-backend/docs/api-contract.md`, sección
`POST /api/category-rules/apply`, leído el 2026-10-13; el backend lo tiene en su
commit `2d2763b`):

- La respuesta trae `categorizedMovements`: **siempre presente** (`[]` si no se
  escribió ninguno), **completa** (exactamente tantos elementos como `categorized`, sin
  acotar ni paginar), ordenada por `movementId` ascendente.
- Cada elemento: `movementId`, `description`, `bookingDate` (`YYYY-MM-DD`), `amount`
  (texto, decimal positivo con dos decimales; el signo lo lleva `type`), `type`
  (`income` o `expense`, nunca `neutral`), `categoryId`, `categoryName` y `rules`
  (todas las que casaron, cada una con `ruleId` y `matchText`; al menos una; por
  `ruleId` ascendente).
- Si la aplicación falla a medias (`error` presente), la lista trae lo que sí se
  escribió y sigue cuadrando con `categorized`.
- El mismo objeto viaja en `categorization` del informe de `POST /api/import`.

**Aplicar las reglas cuesta una petición**, la de hoy. No hay lectura previa ni
posterior desde el store de reglas, ni condición de carrera con otra pestaña: la lista
la escribe quien hizo la escritura.

**Qué se valida y qué no** (R1, R2):

- Sí: que `categorizedMovements` es una lista, cada campo de cada elemento con su tipo,
  y que `categorizedMovements.length === categorized`.
- No: el orden (se pinta en el que llega), que `amount` sea positivo, ni que `rules`
  tenga al menos un elemento. Son promesas del contrato que la pantalla no necesita
  para no mentir; rechazar por ellas tiraría un resultado bueno.

## 1. Archivos

| Archivo | Cambio |
|---|---|
| `src/features/category-rules/types.ts` | `AppliedRule`, `CategorizedMovement`, `ApplyResult.categorizedMovements`, `LastApply` |
| `src/features/category-rules/service.ts` | `parseApplyResult` valida la lista y su tamaño |
| `src/features/category-rules/rules.ts` | Textos del bloque |
| `src/features/category-rules/store.ts` | `lastApply`, `dismissLastApply`; `confirmApply` guarda el resultado |
| `src/features/category-rules/components/LastApplyReport.vue` | **Nuevo.** El bloque |
| `src/features/category-rules/components/CategorizedMovementList.vue` | **Nuevo.** Las filas |
| `src/features/category-rules/components/ApplyResult.vue` | Solo el comentario, que dice que el backend no devuelve cuáles |
| `src/features/category-rules/views/RulesView.vue` | Monta el bloque bajo la cabecera |
| `src/shared/money.ts` | `formatClock(at: Date)` |
| `src/features/review/store.ts` | `uncategorizedCount`, `refreshUncategorizedCount`; el comentario de `refreshAfterRules` |
| `src/features/review/components/UncategorizedCount.vue` | **Nuevo.** La frase |
| `src/features/review/views/ReviewView.vue` | Monta la frase y el bloque |
| `e2e/category-rules.spec.ts` | El recorrido del humano; la respuesta simulada de aplicar trae la lista |
| `docs/architecture.md`, `docs/guia-de-uso.md` | Lo que esta feature vuelve falso |
| `feature_list.json` | Se retiran dos checks de las features 27 y 29 (tasks T16) |

No se toca: `ApplyRulesDialog.vue`, `RuleConflictList.vue`, `StickyBelowTopBar.vue`,
`RuleCreatedNotice.vue`, `ActionNotice.vue`, `shared/movements.ts`, `theme-dark.css`,
ni nada de `src/features/import/` salvo un test nuevo (§8).

## 2. Firmas nuevas

```ts
// category-rules/types.ts
/** A rule that matched a categorized movement (no category: it is the movement's). */
export interface AppliedRule {
  ruleId: number
  matchText: string
}

export interface CategorizedMovement {
  movementId: number
  description: string
  bookingDate: string
  /** Positive decimal string; the sign comes from `type`. */
  amount: string
  type: 'income' | 'expense'
  categoryId: number
  categoryName: string
  rules: AppliedRule[]
}

export interface ApplyResult {
  categorized: number
  categorizedMovements: CategorizedMovement[] // new
  conflictCount: number
  conflicts: RuleConflict[]
  unmatched: number
  error: { code: string } | null
}

export interface LastApply {
  at: Date // when the POST answered
  result: ApplyResult
}

// category-rules/rules.ts
export function lastApplyHeadline(categorized: number, clock: string): string // R5, R6
export function lastApplyFigures(result: ApplyResult): string // R5

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

`parseApplyResult` valida en este orden: `categorized`, `categorizedMovements` (con
`asArray`, y cada elemento con `asInteger` / `asString` / `asDateOnly` / `asDecimal` /
`asMember(['income', 'expense'])`), y entonces el tamaño:

```ts
if (movements.length !== categorized) {
  v.reject('categorizedMovements', `a list of ${categorized} movements`)
}
```

Mensaje resultante: `POST /api/category-rules/apply: categorizedMovements is not a list
of 12 movements`. Validar `categorized` primero conserva el test que ya existe (`names
the failing field of a result it cannot read`), que espera `categorized is not an
integer`.

## 3. `confirmApply`, paso a paso

```
if applying → return
applyFlow = applying; lastCreated = null; lastApply = null            (R10)
try
  result = await applyRules()            ← la única petición (C1); valida R1 y R2
  si result.error → applyFlow = failed(applyErrorMessage)             (R12, como hoy)
  si no:
    lastApply = { at: new Date(), result }
    applyFlow = done(result)                                          (C3)
catch → applyFlow = failed(applyErrorMessage)                         (R2, R12)
finally → applyRun += 1                                               (como hoy)
```

Respecto a hoy solo se añaden dos líneas: borrar `lastApply` al empezar y guardarlo
cuando no hay `error`. Una respuesta que no cumple el contrato hace que
`parseApplyResult` lance `ValidationError`; cae en el `catch` que ya existe y
`applyErrorMessage` devuelve, para cualquier `Error` que no sea de red, `Something went
wrong applying the rules. Some movements may already be categorized. The review queue
has been reloaded.` No hay texto nuevo ni rama nueva para ese caso.

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
  montarse. `<N>` de la primera es `categorized`; con 0 no hay botón (R6).
- `CategorizedMovementList.vue`: prop `movements: CategorizedMovement[]`. `<ul>` con
  `max-h-96 overflow-y-auto`; cada `<li>` (`:key="movementId"`) con
  `formatDate(bookingDate)`, el concepto (`lang="es"`, `break-words`), el importe
  (`formatMoney(type === 'expense' ? '-' + amount : amount)`, igual que
  `review/components/MovementRow.vue`) en `font-mono tabular-nums`, y `categoryName`
  (`lang="es"`). Solo lectura: ningún control. Usa las mismas parejas de token y fondo
  que `RuleConflictList` (`bg-surface-sunken`, `text-ink-body`, `text-ink-muted`,
  `text-ink-strong`): no aparece ninguna pareja nueva, así que no hay línea `contrast:`
  que añadir.
- **Solo si se aprueba R16:** debajo del concepto, una línea por regla de `rules`, con
  `“{{ matchText }}”` en `font-mono text-ink-strong` y `lang="es"`, como la escribe
  `RuleConflictList`. Sin flecha ni categoría: la categoría es la de la fila.
- La hora: `formatClock(report.at)`.

## 5. El número de `Review`

- `refreshUncategorizedCount`: `getMovements({ status: QUEUE_STATUS, uncategorized:
  true, page: 1, pageSize: 1 })` → `pagination.total`; si falla, `null`. Mismo patrón
  que `refreshPendingCount`.
- **No sale de una petición que la pantalla ya haga:** la página de `Review` viaja con
  los filtros del usuario y su `total` es el de esos filtros; solo coincidiría cuando el
  único filtro puesto es «sin categoría». Tampoco sale de `unmatched`: ese número solo
  existe después de aplicar, y el contrato cuenta aparte (`conflictCount`) los
  movimientos de los choques, que también siguen sin categoría.
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
acaban en `applyFlow`.

## 8. La importación (`src/features/import/`): no hay que tocarla

Leído el 2026-10-13, **no ejecutado**: `parseCategorization`
(`src/features/import/service.ts`) lee de `categorization` solo `categorized`,
`conflictCount`, `conflicts`, `unmatched` y `error`, y `asObject`
(`src/shared/validation.ts`) no rechaza propiedades de más. Un informe con
`categorizedMovements` se lee igual y el campo se ignora. Las fixtures de importación
(`src/features/import/__tests__/fixtures.ts`, `e2e/import-dialog.spec.ts`) no llevan el
campo y siguen valiendo por lo mismo.

Como eso es una lectura del código y no una ejecución, C4 lo convierte en un test
(tasks T15): un informe cuya `categorization` trae la lista se lee sin error y el
resultado no la contiene. `import/types.ts` y `import/service.ts` no se editan: validar
allí una lista que nadie enseña sería alcance que el humano dejó fuera.

## 9. Fixtures que dejan de valer con R2

Tres respuestas simuladas de aplicar dicen `categorized: 12` sin lista, y con R2
pasarían a ser respuestas ilegibles:

- `APPLY_OK` en `src/features/category-rules/__tests__/fixtures.ts`.
- `APPLY_RESULT` en `src/features/review/__tests__/fixtures.ts`.
- `APPLY_RESULT` en `e2e/category-rules.spec.ts`.

Las tres ganan `categorizedMovements` con 12 elementos (un constructor
`categorizedMovement(id, description, overrides)` en cada archivo), de modo que los
tests que esperan `12 movements categorized` siguen pasando sin cambiar su aserción.
Los datos son sintéticos (`COMPRA SINTETICO COLMADO NORTE`), como los del contrato.

## 10. Dependencias entre features

Las de hoy, en el mismo sentido: `review` → `category-rules` (ahora `ReviewView` monta
también `LastApplyReport`). `category-rules` sigue sin importar nada de `review` ni de
`import`: `CategorizedMovement` se declara en `category-rules/types.ts`.

## 11. Alternativas descartadas

- **Que el frontend deduzca la lista** leyendo los pendientes antes y después de aplicar
  y comparando (la versión del 2026-10-12): 15 o 16 peticiones, y un caso sin detectar
  si otra pestaña cambiaba movimientos a la vez. El humano prefirió que lo devuelva el
  backend.
- **Enseñar los números sin lista cuando la respuesta no cumple el contrato** (en vez de
  R2): obliga a mantener un estado «resultado sin lista» y su frase para un caso que el
  contrato dice que no ocurre. Va en la hoja como alternativa de la decisión 3.
- **Enseñar la lista también cuando la aplicación falla a medias:** el contrato lo
  permitiría; el humano no lo pidió.
- **Pedir después cada movimiento a `GET /api/movements`** para pintar la fila con
  `MovementRow`: una petición más para datos que ya llegan en la respuesta.
- **Compartir el tipo y el parseo con `import`:** las features no comparten tipos
  (`docs/architecture.md`), y allí la lista no se usa.
- **Guardar el resultado en el navegador** para verlo tras recargar: enseñaría como
  recién categorizado algo que ya no se sabe si lo es.
- **Marcar en la cola de `Review` las filas recién categorizadas:** más alcance, y la
  marca dejaría de ser cierta en cuanto se cambie la fila.
- **Lista enseñada dentro de la ventana `Rules applied`:** se pierde al cerrarla, que
  es justo lo que anotó el humano.

## 12. Límites conocidos

- Si la aplicación responde con `error` (falló a medias), puede haber categorizado
  algunos movimientos y no se enseña cuáles (R12).
- Si una importación termina con `Review` abierta, el número de R13 no se refresca
  hasta la siguiente acción; le pasa lo mismo, hoy, a la lista de `Review`.
- Con varios cientos de movimientos categorizados la lista se pinta entera dentro de un
  recuadro con barra de desplazamiento propia; no se pagina.
