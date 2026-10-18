# Design — F34 `manual-category-offers-rule`

La pregunta vive en `src/features/category-rules/` (estado, servicio, componente) y la
montan `Review` y `Movements`, igual que ya montan `RuleDialog` y `RuleCreatedNotice`: el
sentido de la dependencia sigue siendo `review` → `category-rules` y `statement` →
`category-rules`, nunca al revés. Se toca `src/shared/movements.ts` para leer
`categorySource`. No se toca el backend. Se sigue `docs/architecture.md` (ADR-001 por
feature, ADR-002 validación en la frontera, ADR-003 errores, la nota de la feature 27
sobre `StickyBelowTopBar`) y `docs/conventions.md` (código y textos de pantalla en
inglés).

## 1. Lo que dice el contrato (leído el 2026-10-18)

- **`GET /api/category-rules/preview?matchText=…&categoryId=…`**, solo lectura. Los dos
  parámetros obligatorios, `matchText` codificado en la URL; cualquier otro parámetro es
  400. Responde 200 con `{ matchText (normalizado), categoryId, categorization }`, donde
  `categorization` tiene la forma de la de `POST /api/category-rules` salvo que la regla
  que aún no existe sale con `"ruleId": null` en `rules` y en `matches`, y no hay `error`.
  `categorizedMovements` trae **todo** lo que movería la petición; lo de la regla nueva es
  lo que lleva `ruleId: null`. Errores: los del `POST` (400 texto corto o parámetros,
  404 categoría, **409 ya hay una regla con ese texto normalizado**) y 500.
- **`POST /api/category-rules`**: igual que en la feature 33 (`parseSavedRule`). El
  número del preview es el que mueve el `POST` si nada cambia entre las dos peticiones.
- **`GET /api/category-rules/suggestions`**: no da el texto de un movimiento suelto.
  Solo lista conceptos con 3 o más movimientos pendientes sin categoría o `closing` que no
  casa ninguna regla, con texto de 5 o más caracteres. Tras el `PATCH`, el movimiento
  cambiado ya es `manual` y no sale en ninguna propuesta. **Por eso el texto propuesto se
  calcula en el navegador** con los pasos 1 a 5 de la sección «Cómo se saca el texto
  propuesto» (§3).
- **`PATCH /api/movements/:id`** con `categoryId` numérico deja `categorySource: "manual"`.
  El `PATCH /api/movements` de varias filas, igual.
- **`categorySource`**: `"manual" | "rule" | "closing" | null`, en todas las respuestas que
  devuelven movimientos serializados (`GET /api/movements`, los dos `PATCH`,
  `/api/transfers`). `null` exactamente cuando `categoryId` es `null`.

## 2. Tipos y servicio (`category-rules/types.ts`, `category-rules/service.ts`)

```ts
// types.ts
/** A movement the preview says the new rule would move (feature 34). */
export interface PreviewMovement {
  movementId: number
  description: string
  bookingDate: string
  amount: string            // positive; sign from `type`
  type: 'expense' | 'income'
}

/** What `GET /api/category-rules/preview` answered, reduced to what the question paints. */
export interface RulePreview {
  /** Normalized, as the POST would store it. */
  matchText: string
  categoryId: number
  /** Only the ones whose `rules` carry `ruleId: null`: the ones THIS rule would move. */
  movements: PreviewMovement[]
}

/** What the box of the question is showing for the text it holds. */
export type QuestionCheck =
  | { step: 'loading'; text: string }
  | { step: 'ready'; text: string; preview: RulePreview }
  | { step: 'tooShort'; text: string }
  | { step: 'taken'; text: string }          // 409
  | { step: 'failed'; text: string }

/** The open question after a change of category by hand (feature 34). */
export interface OtherMovementsQuestionState {
  movementId: number
  kind: 'expense' | 'income'
  categoryId: number
  categoryName: string
  check: QuestionCheck
  /** The English sentence of a failed create (R12), or null. */
  failure: string | null
}

/** What the view hands to the store after a change by hand. */
export interface ManualChange {
  movementId: number
  description: string
  type: 'expense' | 'income' | 'neutral'
  categoryId: number
  categoryName: string
}
```

```ts
// service.ts
export const PREVIEW_PATH = '/api/category-rules/preview'
/** Read only. Throws ApiError (409 included) or ValidationError. */
export async function getRulePreview(rule: NewRule, client?: HttpClient): Promise<RulePreview>
export function parseRulePreview(raw: unknown): RulePreview
```

- La URL se arma con `URLSearchParams` con **solo** `matchText` (el texto tal cual, sin
  normalizar: lo normaliza el backend) y `categoryId`.
- `parseRulePreview` usa su propio `createValidators('GET /api/category-rules/preview')`.
  Lee `matchText`, `categoryId` y, de `categorization`, `categorized` y
  `categorizedMovements`; exige, como `parseCategorization`, que la lista tenga
  `categorized` elementos. Cada `rules[i].ruleId` es entero **o `null`**; se quedan los
  movimientos con algún `ruleId: null`. `conflicts` y `unmatched` no se leen (no se pintan).
- No se cambia `AppliedRule.ruleId` (sigue siendo `number`): el preview tiene su propio
  parser, y así ni `parseCategorization` ni los tests de las features 30 y 33 cambian.

## 3. El texto propuesto (`category-rules/rules.ts`)

```ts
/** The floor of the suggestions list: a shorter text is not proposed (contract). */
export const MIN_SUGGESTION_TEXT = 5
/** Steps 1 to 5 of `GET /api/category-rules/suggestions`; null when shorter than 5. */
export function suggestionTextOf(description: string): string | null
```

1. `normalizeMatchText` (ya existe: NFD, sin marcas, minúsculas, sin espacios en los
   extremos).
2. Si aparece `concepto` precedido de un espacio o una coma y no al principio
   (`/[ ,]concepto/u`, primera aparición), se corta en el espacio o la coma.
3. Si empieza por `/^[\p{L}. ]{1,24}\//u`, se quita eso y los espacios que siguen.
4. Se parte en tramos separados por espacios conservando sus posiciones; se toma desde el
   primer tramo sin ningún dígito (`\p{Nd}`) hasta antes del siguiente tramo con dígito,
   y se corta la cadena original entre esas posiciones (los espacios de dentro, tal como
   están).
5. Se quitan del principio y del final los caracteres que no son `\p{L}` ni `\p{N}`.

Menos de 5 caracteres → `null`. **`proposeMatchText` (features 17 y 18) no cambia**: sigue
siendo lo que propone la ventana de `Create rule`.

Riesgo conocido: el contrato describe los pasos en palabras; «letras», «palabra» o
«dígito» pueden no coincidir con lo que hace el código del backend en conceptos raros. Los
cinco ejemplos de la tabla del contrato son el test de R2. Si un texto no coincide, lo
peor que pasa es que se ofrece otro texto (editable) y el preview dice qué movería ese.

También en `rules.ts`, los textos de §6 y `otherMovementsLine(count, categoryName)`.

## 4. Estado (`category-rules/store.ts`)

```ts
const question = ref<OtherMovementsQuestionState | null>(null)
let questionToken = 0

async function offerRule(change: ManualChange, client?: HttpClient): Promise<void>
async function checkQuestionText(text: string, client?: HttpClient): Promise<void>
async function acceptQuestion(client?: HttpClient): Promise<boolean>
function dismissQuestion(): void
```

- **`offerRule`** (R1, R2, R8): cierra la pregunta que hubiera (`questionToken += 1`). Si
  `change.type` es `neutral` o `suggestionTextOf(change.description)` es `null`, no pide
  nada. Si no, pide `getRulePreview({ matchText: texto, categoryId })`. Solo abre la
  pregunta si la respuesta sigue siendo la última pedida **y** trae al menos un
  movimiento. Un 409, una lista vacía o cualquier fallo: no abre nada y no pinta nada.
- **`checkQuestionText`** (R5, R6, R7): con la pregunta abierta. Texto corto
  (`isMatchTextTooShort`) → `tooShort`, sin petición. Si no → `loading`, preview con la
  categoría de la pregunta; 200 → `ready` (también con lista vacía); 409 → `taken`;
  otro fallo → `failed`. Una respuesta que ya no es la última se descarta (token).
- **`acceptQuestion`** (R10, R11, R12): solo con `check.step === 'ready'` y `!isSaving`.
  Usa el mismo camino que `create` (`postRule`): `lastCreated`, el recuadro del resultado
  (`lastApply`, causa `create`), `applyRun += 1` (así `Review` y `Movements` se refrescan,
  feature 33) y `refreshSuggestions`. Éxito → `question = null`. Rechazo o red →
  `question.failure = ruleErrorMessage(failure)`, la pregunta sigue abierta y no se hace
  ninguna otra petición (R12). Otro fallo (500, respuesta ilegible) → como en `create`:
  frase, `applyRun += 1` y recarga de la lista de reglas (puede haberse escrito).
- **`dismissQuestion`**: `questionToken += 1`, `question = null`. No envía nada.

## 5. Componentes y pantallas

**`category-rules/components/OtherMovementsQuestion.vue`** (nuevo). Props: `question`,
`busy`. Emite `text: [string]` (tras `SEARCH_DEBOUNCE_MS` desde la última tecla, mismo
patrón de temporizador que `RuleDialog`), `create: []`, `dismiss: []`. Pinta:

- `QUESTION_HEADLINE(categoryName)` y el campo `Text to look for` (`BaseInput`,
  `data-test="other-movements-text"`), que empieza con el texto propuesto.
- Según `check`: `otherMovementsLine` + `QUESTION_HINT` + botón `Show the N movements` /
  `Hide the movements` (plegados; lista con `max-h-60 overflow-y-auto` para que el bloque
  que se queda bajo la barra no pase de la ventana, `data-test="other-movements-list"`) ·
  `QUESTION_NONE` · `QUESTION_CHECKING` · `TOO_SHORT` · `QUESTION_TAKEN` ·
  `QUESTION_CHECK_FAILED`.
- `Create rule` (`data-test="other-movements-create"`), encendido solo si
  `check.step === 'ready'`, el texto del campo es `check.text` (nada a medio teclear) y
  `!busy`. `No, only this one` (`data-test="other-movements-dismiss"`).
- `question.failure` en rojo (`data-test="other-movements-error"`).

**`ReviewView.vue`**: `hasNotice` incluye `rules.question !== null`. Dentro de
`StickyBelowTopBar`, debajo de `RuleCreatedNotice` / `ActionNotice`, la pregunta.
`onCategorizeOne` pasa a esperar a `store.categorizeOne`, que **devuelve el movimiento
que respondió el `PATCH` o `null`**; con movimiento y `categoryId !== null` llama a
`rules.offerRule`. `dismissQuestion` en: `onCategorizeOne` (antes del `PATCH`),
`onConfirmOne`, `run` (barra de varias filas; R9), `onConfirmAll`, `onCreateRule`,
`onUndo` y `onBeforeUnmount`.

**`StatementView.vue`**: lo mismo con `store.categorize` (devuelve el movimiento o
`null`). **Novedad:** pinta también `RuleCreatedNotice` en su `StickyBelowTopBar` (v-if
`rules.lastCreated`, si no `StatementActionNotice`), como `Review`; `hasNotice` incluye
`rules.lastCreated` y `rules.question`. `rules.dismissCreated()` y `dismissQuestion()` en
cada escritura de la pantalla (categoría, marcar que no cuenta, `Undo`) y
`dismissQuestion()` en `onCreateRule` y `onBeforeUnmount`. Así se resuelve la incoherencia
de la feature 33 («crear una regla desde `Movements` no dice allí cuántos movió»), también
para la ventana de `Create rule`.

**`review/store.ts` `categorizeOne`** y **`statement/store.ts` `categorize`**: devuelven
`Promise<Movement | null>` (el movimiento del `PATCH`, o `null` si no se escribió: fallo,
o otra escritura en camino). Nada más cambia en ellos.

**`categorySource`** (R15): `src/shared/movements.ts` añade
`export type CategorySource = 'manual' | 'rule' | 'closing'`, el campo opcional
`categorySource?: CategorySource | null` en `Movement`, y `parseMovement` lo lee en todas
las respuestas: ausente → `null`; presente → `null` o uno de los tres (otro valor →
`ValidationError`, como las demás enumeraciones cerradas). También
`CLOSING_SOURCE_LABEL` y `closingSourceLine(movement): string | null` en el mismo archivo
(precedente: `depositLine` en `shared/deposits.ts`). `StatementRow.vue`
(`data-test="statement-row-closing"`) y `MovementRow.vue` (`data-test="movement-closing"`)
lo pintan en la línea pequeña gris bajo la descripción, sin negrita ni color.

## 6. Textos nuevos (inglés; traducción solo para la hoja)

| Constante | Texto | Traducción |
|---|---|---|
| `QUESTION_HEADLINE` | `Use ${name} for the other movements that contain this text too?` | ¿Usar también X en los otros movimientos que contienen este texto? |
| `otherMovementsLine` | `${n} other movements would move to ${name}.` / `1 other movement would move to ${name}.` | Otros N movimientos pasarían a X. |
| `QUESTION_HINT` | `Movements you categorized by hand, or that another rule already categorized, do not move.` | Los que categorizaste a mano o ya categorizó otra regla no se mueven. |
| `QUESTION_NONE` | `No other movement would move with this text right now.` | Ahora mismo ningún otro movimiento se movería con este texto. |
| `QUESTION_CHECKING` | `Checking which movements would move…` | Comprobando qué movimientos se moverían… |
| `QUESTION_TAKEN` | `Another rule already uses this text.` | Otra regla ya usa este texto. |
| `QUESTION_CHECK_FAILED` | `Couldn't check which movements would move.` | No se pudo comprobar qué movimientos se moverían. |
| `TOO_SHORT` | `Use at least 3 letters or digits.` (hoy es una constante local de `RuleDialog.vue`; pasa a `rules.ts` y `RuleDialog` la importa) | — |
| botones | `Create rule` · `No, only this one` | Crear regla · No, solo este |
| `CLOSING_SOURCE_LABEL` | `Set when the import was closed` | Puesta al cerrar la importación |

## 7. Respuestas simuladas y pruebas que cambian

- `e2e/action-notice-in-view.spec.ts`: sus pruebas cambian la categoría de filas en
  `Review` y en `Movements` y **fallan si se aborta cualquier petición no prevista**. Con
  esta feature cada cambio pide el preview: hace falta una ruta para
  `**/api/category-rules/preview*` (por defecto, 200 sin movimientos: no hay pregunta) y,
  donde el `POST` de regla ya está simulado, nada más.
- `e2e/statement-fix-category.spec.ts`: cambia categorías en `Movements` y vigila la
  consola. Misma ruta del preview (200 sin movimientos), para que nada cambie en lo que
  comprueba.
- Unidad: `ReviewView.spec.ts` y `StatementView.spec.ts` (cambian la categoría de una fila),
  y las de los dos stores (el valor que devuelven).
- `e2e/review-actions.spec.ts` solo usa la barra de varias filas (R9: no pide el preview)
  y `e2e/category-rules.spec.ts` no cambia categorías a mano: no se tocan.

## 8. Alternativas descartadas

- **La pregunta en una ventana (`BaseDialog`).** Su capa oscura tapa la línea de la
  última acción y su `Undo` (feature 27), y obliga a cerrarla para seguir.
- **La pregunta debajo de la fila.** Con un filtro de categoría o `Uncategorized`, la
  fila sale de la lista al cambiarla y la pregunta se iría con ella.
- **Pedir el texto propuesto a `suggestions`.** No lo trae para un movimiento suelto
  (§1).
- **Leer la lista de reglas para saber si ya existe una con ese texto.** El preview ya da
  409 en ese caso, con el mismo criterio de normalización que el backend: una petición
  menos y ninguna copia de esa regla en el navegador.
- **`categorySource` obligatorio en `parseMovement`.** Obligaría a cambiar las respuestas
  simuladas de movimientos de unas 24 pruebas para algo que solo pinta una etiqueta
  discreta; si faltara, la etiqueta no sale y nada más.
