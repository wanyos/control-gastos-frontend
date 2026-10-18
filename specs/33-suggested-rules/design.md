# Design — F33 `suggested-rules`

Todo dentro de `src/features/category-rules/`, más los ajustes que necesitan `Review` y
`Movements` para no quedarse con datos viejos. No se toca el backend ni `src/shared/`.
Se sigue `docs/architecture.md` (ADR-001 por feature, ADR-002 validación en la frontera,
ADR-003 errores) y `docs/conventions.md` (nombres y textos de pantalla en inglés).

## 1. Lo que dice el contrato y cómo se lee

- `GET /api/category-rules/suggestions`: array; cada elemento `matchText` (string),
  `kind` (`expense` | `income`), `movementCount` (entero), `movements` (array de
  `{ movementId, description, bookingDate, amount }`), `manualMatches` (entero). Sin
  errores propios (solo 500). La lista no se corta: con los datos reales, 67 propuestas.
- `POST /api/category-rules` (201) y `PATCH /api/category-rules/:id` (200): la regla de
  siempre en la raíz **más** `categorization`, siempre presente, con la misma forma que
  la respuesta de `POST /api/category-rules/apply`. Si la pasada falla a mitad, sigue
  siendo 201/200 y trae `categorization.error`, con lo ya movido.
- `GET /api/movements` trae ahora `categorySource`. **Esta feature no lo lee**: los
  parsers de `src/shared/movements.ts` toman campo a campo y no rechazan campos de más
  (comprobado en el código), así que no hay que tocar ningún parser ni ninguna respuesta
  simulada de movimientos. Lo usará la feature 34.
- **`categorization` pasa a ser obligatorio** al leer el `POST` y el `PATCH` (el contrato
  dice «siempre presente», y la feature 30 ya rechaza una respuesta de aplicar sin su
  lista). Consecuencia: **todas las respuestas simuladas de `POST`/`PATCH` de reglas** de
  los tests tienen que llevarlo. Están en:
  `src/features/category-rules/__tests__/fixtures.ts`,
  `src/features/review/__tests__/fixtures.ts` (`CREATED_RULE`),
  `src/features/statement/__tests__/fixtures.ts` (`CREATED_RULE`),
  `e2e/category-rules.spec.ts` (el `POST` y el `PATCH` de `prepare`) y
  `e2e/action-notice-in-view.spec.ts` (el `POST` simulado). Además, las pruebas de
  navegador que abren `/rules` necesitan una respuesta simulada de
  `GET /api/category-rules/suggestions`: en `e2e/category-rules.spec.ts`, la ruta
  `**/api/category-rules/*` hoy contesta 404 a todo lo que no sea `/apply`, y ese 404 sale
  como error de consola, que esas pruebas exigen vacío.

## 2. Tipos y servicio (`types.ts`, `service.ts`)

```ts
// types.ts
export interface SuggestedMovement { movementId: number; description: string; bookingDate: string; amount: string }
export interface SuggestedRule {
  matchText: string
  kind: 'expense' | 'income'
  movementCount: number
  movements: SuggestedMovement[]
  manualMatches: number
}
/** A rule the POST or the PATCH saved, with what the pass that ran with it moved. */
export interface SavedRule { rule: CategoryRule; result: ApplyResult }
/** Which action produced the result in the box. */
export type ResultCause = 'apply' | 'create' | 'update'
export interface LastApply {
  at: Date
  result: ApplyResult
  cause: ResultCause          // nuevo; 'apply' en lo que ya hacía la feature 30
  rule: CategoryRule | null   // nuevo; null cuando cause === 'apply'
}
```

```ts
// service.ts
export const SUGGESTIONS_PATH = '/api/category-rules/suggestions'
export function parseSuggestions(raw: unknown): SuggestedRule[]      // rechaza movementCount !== movements.length
export async function getSuggestions(client?: HttpClient): Promise<SuggestedRule[]>
function parseCategorization(v: Validators, raw: unknown, path: string): ApplyResult  // sacado de parseApplyResult
export function parseSavedRule(raw: unknown, v?: Validators): SavedRule  // exige `categorization`
export async function createRule(rule: NewRule, client?): Promise<SavedRule>   // antes Promise<CategoryRule>
export async function updateRule(id, changes, client?): Promise<SavedRule>     // antes Promise<CategoryRule>
```

`parseApplyResult` pasa a llamar a `parseCategorization` con sus validadores de siempre:
su comportamiento y sus mensajes no cambian (checks de la feature 30). En
`parseSavedRule`, la ruta del error es `categorization.<campo>`. `parseCategorization`
queda exportable dentro de la feature para que la feature 34 lo use con
`GET /api/category-rules/preview` (allí `ruleId` puede ser `null`; **no** se adapta
ahora).

## 3. Store (`store.ts`)

Estado nuevo: `suggestions: SuggestedRule[] | null`, `suggestionsLoading`,
`suggestionsError: AppError | null`, `suggestionFailure: { matchText: string; message: string } | null`.

- `lastCreated` pasa de `CategoryRule | null` a `SavedRule | null`.
- `create(rule)`: tras el 201 pone `lastCreated = saved`,
  `lastApply = { at: new Date(), result: saved.result, cause: 'create', rule: saved.rule }`
  y sube `applyRun` (R5, R6, R14). Si falla con algo que no es 400/404/409 ni la red
  (`needsRulesReload` ya lo distingue), también sube `applyRun` (R14). Sigue devolviendo
  `true` cuando la ventana se puede cerrar: un 201 con `categorization.error` también
  (la regla existe).
- `update(id, next)`: igual, con `cause: 'update'`; no toca `lastCreated` (R5, R14).
- `loadSuggestions()`: pide la lista; en fallo, `suggestions = null` y `suggestionsError`.
  Un token como el de `previewMatches` descarta una respuesta que ya no es la última.
- `createFromSuggestion(suggestion, categoryId)`: borra `suggestionFailure`; llama a
  `create({ matchText: suggestion.matchText, categoryId })`. Si sale bien, quita la
  propuesta de `suggestions` por `matchText` y llama a `loadSuggestions()` (R7). Si no,
  copia `saveMessage` a `suggestionFailure` y deja `saveMessage` a `null` (esa variable
  es de la ventana); si el fallo no es 400/404/409/red, además `loadSuggestions()`.
- Tras `update`, `remove` y `confirmApply` que no acaban en 400/404/409, si
  `suggestions !== null || suggestionsError !== null`, `loadSuggestions()` (R15).
- `isSaving` sigue siendo uno para todo: mientras hay un `POST` en vuelo ningún
  `Create rule` hace nada (R4).

## 4. Componentes

- **`SuggestedRuleList.vue`** (nuevo): recibe `suggestions`, `categories`, `busy`,
  `failure`; pinta la cabecera `Suggested rules`, `SUGGESTIONS_INTRO` y una
  `SuggestedRuleRow` por propuesta (`:key="suggestion.matchText"`). Emite `create`.
- **`SuggestedRuleRow.vue`** (nuevo, `data-test="suggested-rule"`): el texto
  (`data-test="suggested-rule-text"`, `lang="es"`, monoespaciado entre comillas, como
  `RuleRow`), la etiqueta de tipo (`suggested-rule-kind`), el número
  (`suggested-rule-count`), el botón de plegar (`suggested-rule-show-movements`), la
  lista de movimientos (`suggested-rule-movement`: fecha con `formatDate`, concepto
  `lang="es"`, importe con signo con `formatMoney`, negativo si `kind === 'expense'`),
  la frase de `manualMatches` (`suggested-rule-manual`), el desplegable
  (`suggested-rule-category`, mismo agrupado raíz/hijas que `RuleDialog`), el botón
  `Create rule` (`suggested-rule-create`) y el error (`suggested-rule-error`). La categoría
  elegida vive en la fila; como la clave es `matchText`, una fila que sigue en la lista
  tras recargarla conserva lo que se eligió.
- **`RulesView.vue`**: en `onMounted` también `store.loadSuggestions()`. Orden: cabecera
  (con `RULES_INTRO` y el botón `Apply rules`), `LastApplyReport`, `StickyBelowTopBar` con
  `RuleCreatedNotice` mientras `store.lastCreated`, `SuggestedRuleList` (con sus estados de
  carga, fallo con `Try again` y vacía, `data-test` `suggested-rules-loading`,
  `suggested-rules-error`, `suggested-rules-retry`, `suggested-rules-empty`), y después
  la lista de reglas con una cabecera `Your rules`. El test existente «says there are none,
  and offers no way to make one from here (R7)» deja de ser verdad en su segunda mitad:
  se renombra a `says there are no rules yet` y se queda solo con la primera.
- **`RuleCreatedNotice.vue`**: recibe `saved: SavedRule`; pinta `ruleCreatedLine` y, si
  `saved.result.error`, `UNFINISHED_MOVE` (`data-test="rule-created-unfinished"`). **Se
  quitan** el botón `apply-rules-now`, el `emit('apply')` y el icono (R13).
- **`LastApplyReport.vue`**: cabecera según `report.cause` (`lastApplyHeadline` si
  `'apply'`, `ruleSavedHeadline` si no); si `cause !== 'apply'` y `result.error`, la línea
  `UNFINISHED_MOVE` (`data-test="last-apply-unfinished"`). Lo demás, igual.
- **`RuleMatchPreview.vue`**: la constante `ESTIMATE` se sustituye por `PREVIEW_NOTE`
  (mismo `data-test="rule-preview-note"`). El recuento sigue siendo el de la feature 18.
- **`ReviewView.vue`**: `RuleCreatedNotice` recibe `:saved="rules.lastCreated"` y pierde
  `@apply`. `ApplyRulesDialog` se queda en la vista (si una aplicación empezada en `Rules`
  sigue en curso al cambiar de pantalla, la ventana tiene que seguir viéndose). Se
  actualizan los comentarios que dicen que crear una regla no aplica nada.
- **`src/features/statement/store.ts`**: vigila `useCategoryRulesStore().applyRun`, igual
  que hace `src/features/review/store.ts`, y al subir llama a `refreshQuietly()` si ya hay
  un mes cargado (R14). La dependencia sigue en un solo sentido: `category-rules` no sabe
  nada de `statement`. Efecto: aplicar las reglas desde `Rules` también refresca
  `Movements`, que antes no lo hacía.
- **`StatementView.vue`**: solo el comentario de la ventana de crear regla (R17 de la
  feature 21): el frontend no escribe en el movimiento de origen, pero el backend puede
  moverlo si su categoría la puso el cierre de la importación.

## 5. Textos nuevos (inglés, con su traducción)

En `rules.ts` como constantes o funciones puras:

| Constante / función | Texto | Traducción |
|---|---|---|
| cabecera | `Suggested rules` | Reglas propuestas |
| `SUGGESTIONS_INTRO` | `Texts that repeat among the movements no rule recognises. Choose a category to create the rule; nothing is created until you do.` | Textos que se repiten entre los movimientos que ninguna regla reconoce. Elige una categoría para crear la regla; no se crea nada hasta que lo hagas. |
| `KIND_LABEL` | `Expenses` / `Income` | Gastos / Ingresos |
| `suggestedCountLine(n)` | `73 movements` / `1 movement` | 73 movimientos |
| botón | `Show the 73 movements` / `Hide the movements` | Ver los 73 movimientos / Ocultar los movimientos |
| `manualMatchesLine(n)` | `3 movements you categorized by hand also contain this text. They will not move.` / `1 movement you categorized by hand also contains this text. It will not move.` | 3 movimientos que categorizaste a mano también contienen este texto. No se moverán. |
| `SUGGESTIONS_LOADING` | `Loading suggested rules…` | Cargando las reglas propuestas… |
| `suggestionsErrorMessage` | red: `Couldn't reach the server.`; respuesta ilegible: `The server answered, but the suggested rules couldn't be read.`; resto: `Something went wrong loading the suggested rules.` | No se pudo llegar al servidor / El servidor respondió, pero no se pudieron leer / Algo falló al cargar |
| `NO_SUGGESTIONS` | `No suggested rules right now.` | Ahora mismo no hay reglas propuestas. |
| cabecera | `Your rules` | Tus reglas |
| `ruleSavedHeadline(rule, cause, n, clock)` | `Rule “academia ficticia norte” → Educación created at 10:42: 73 movements categorized.` (`saved at` en un cambio; `no movements were categorized` con 0) | Regla «…» → Educación creada a las 10:42: 73 movimientos categorizados. |
| `ruleCreatedLine(saved)` | `Rule “academia ficticia norte” → Educación created: 73 movements categorized.` | Regla «…» → Educación creada: 73 movimientos categorizados. |
| `UNFINISHED_MOVE` | `Not all of its movements could be moved; the rest will move the next time you create or change a rule.` | No se pudieron mover todos sus movimientos; el resto se moverá la próxima vez que crees o cambies una regla. |
| `RULES_INTRO` | `Rules categorize pending movements without a category when you import, or when you apply them here. Creating or changing a rule also moves the movements whose category was set when the import was closed.` | Las reglas categorizan los pendientes sin categoría al importar o al aplicarlas aquí. Crear o cambiar una regla también mueve los movimientos cuya categoría se puso al cerrar la importación. |
| `PREVIEW_NOTE` | `Saving also moves the matching movements whose category was set when the import was closed. They are not in this count.` | Al guardar también se mueven los que casan y cuya categoría se puso al cerrar la importación. No están en este número. |

Los errores de crear desde una propuesta reutilizan `ruleErrorMessage` tal cual.

## 6. Por qué `UNFINISHED_MOVE` dice «el resto se moverá»

El contrato: crear o cambiar **cualquier** regla ejecuta la pasada con **todas** las
reglas sobre los pendientes sin categoría y los de `categorySource: "closing"`. Lo que la
regla no llegó a mover sigue en `closing` (o sin categoría), así que la siguiente creación
o cambio lo recoge. Si casa con otra regla de otra categoría, saldrá como choque.

## 7. Alternativas descartadas

- **Pantalla o ruta propia `/rules/suggested`**: el humano dijo «dentro de `Rules`».
- **Pestañas dentro de `Rules`** (propuestas / tus reglas): es la alternativa del 🔴 1 de
  la hoja; hoy se pintan las dos listas una debajo de otra.
- **Abrir la ventana de crear regla por cada propuesta**: dos clics más por decisión.
- **Texto editable con `GET /api/category-rules/preview`**: es lo que construye la
  feature 34; aquí rompería la garantía «el número que ves es el que se mueve».
- **Cambiar el recuento de la ventana de crear regla por `preview`**: exige categoría
  antes de contar y cambia la feature 18; queda para la feature 34 si el humano lo pide.
- **Quitar también `ApplyRulesDialog` de `Review`**: sin el botón no se abre desde ahí,
  pero quitarlo rompe tests de la feature 30 sin ganar nada visible.

## 8. Lo que no se toca

El backend; `src/shared/`; `ApplyRulesDialog`, `ApplyResult`, `RuleConflictList`,
`CategorizedMovementList`, `RuleDialog` (salvo lo que pinta `RuleMatchPreview`), la
propuesta de texto de la ventana (`proposeMatchText`), la aplicación de reglas y su
alcance. Los checks de las features 27 a 32 siguen pasando, **salvo uno de la feature 27**
cuyo test cambia de nombre (ver `tasks.md`, T14, y la hoja). El cambio de ese check lo hace el leader al aprobar:
pasa de filtrar `Review keeps the rule notice and Apply rules now in view from the bottom of the list`
a `Review keeps the rule notice in view from the bottom of the list`.
