# Design — Feature 17: category-rules

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, tipos propios por feature, ADR-002 y ADR-003, dependencias entre
> features en un solo sentido) y en `docs/conventions.md` (inglés, solo oscuro con
> alias semánticos y líneas `contrast:`, `money.ts`, Lucide por nombre, sin `@apply`).
> Aquí van solo los puntos donde la feature roza esas reglas.
>
> **Construye al lado de las F15 y F16**, que están cerradas: la regla nace en una fila
> de la cola y, al aplicarlas, la cola se refresca con el mismo camino silencioso de la
> F16 (`refreshAfterAction`, `store.ts:226`).

## 1. Una feature nueva y el sentido de las dependencias

Carpeta nueva `src/features/category-rules/` (ADR-001): tiene su pantalla, su store y su
service; no es una parte de `review`.

**Sentido único: `review` → `category-rules`.** `ReviewView` monta el diálogo de nueva
regla, el aviso y el diálogo de aplicar, que son de `category-rules`; y el store de
`review` **observa** al de `category-rules` para refrescarse tras cada aplicación (§5).
`category-rules` no importa nada de `review` ni de `import`.

*Alternativa descartada:* que el store de reglas llame a `useReviewStore()` al terminar,
como hace `import`. Cerraría un ciclo (`review` monta componentes de reglas y reglas
llamaría a `review`), que es justo lo que `architecture.md` prohíbe.

**Las categorías pasan a `shared/`.** Las necesitan `review` (filtro, fila, barra) y
`category-rules` (pantalla `Rules`, que no puede importarlas de `review`). Es la regla
escrita en `architecture.md`: «si una tercera pieza hiciera falta en las dos, se mueve a
`shared/`». Se mueven **tal cual** `Category`, `CategoryKind`, `parseCategories` y
`getCategories` a `src/shared/categories.ts`; `review/types.ts` y `review/service.ts`
los **re-exportan** con el mismo nombre, así que ningún import ni test de la F15/F16
cambia.

**El resultado de apply tiene parser propio**, no el `parseCategorization` de `import`:
es otro endpoint (tipos propios por feature) e importar de `import` cerraría otro ciclo
(`import` → `review` → `category-rules` → `import`). Son ~25 líneas repetidas a
sabiendas.

## 2. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/shared/categories.ts` | `Category`, `CategoryKind`, `parseCategories`, `getCategories`, movidos de `review` sin cambios. |
| `src/features/category-rules/types.ts` | `RuleCategory`, `CategoryRule`, `NewRule`, `RuleChanges`, `RuleMatch`, `RuleConflict`, `ApplyResult`, `ApplyFlow`. |
| `src/features/category-rules/service.ts` | `getRules`, `createRule`, `updateRule`, `deleteRule`, `applyRules` y sus parsers. |
| `src/features/category-rules/rules.ts` | Lógica pura: `normalizeMatchText`, `MIN_MATCH_TEXT`, `BANK_BOILERPLATE`, `proposeMatchText`, `isMatchTextTooShort`, `ruleErrorMessage`, `applyErrorMessage`, textos del resultado. |
| `src/features/category-rules/store.ts` | `useCategoryRulesStore` (§5). |
| `src/features/category-rules/views/RulesView.vue` | Pantalla `/rules`. |
| `src/features/category-rules/components/RuleList.vue`, `RuleRow.vue` | La lista y una fila (`Edit`, `Delete`). |
| `src/features/category-rules/components/RuleDialog.vue` | Diálogo de crear y de cambiar (mismo componente). |
| `src/features/category-rules/components/DeleteRuleDialog.vue` | Confirmación de borrado. |
| `src/features/category-rules/components/ApplyRulesDialog.vue` | Confirmar → aplicando → resultado / fallo. |
| `src/features/category-rules/components/ApplyResult.vue`, `RuleConflictList.vue` | Las tres cifras y la lista completa de conflictos. |
| `src/features/category-rules/components/RuleCreatedNotice.vue` | El aviso `Rule "…" → … created.` + `Apply rules now`. |
| Tests | `src/features/category-rules/__tests__/{rules,service,store,RuleDialog,ApplyRulesDialog,ApplyResult,RulesView}.spec.ts`, `src/shared/__tests__/categories.spec.ts`; casos nuevos en `review/__tests__/{MovementRow,MovementList,ReviewView,store}.spec.ts` y `router.spec.ts`; `e2e/category-rules.spec.ts`. |

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/features/review/types.ts`, `service.ts` | `Category`, `CategoryKind`, `parseCategories`, `getCategories` pasan a re-exportarse desde `@/shared/categories`. |
| `src/features/review/components/MovementRow.vue` | Botón `Create rule` (icono, `ghost`, `sm`) tras `Confirm`; emite `create-rule`. Deshabilitado en `neutral`, sin categorías o con `busy`. |
| `src/features/review/components/MovementList.vue` | Reenvía `create-rule` con el movimiento. |
| `src/features/review/views/ReviewView.vue` | Monta `RuleDialog` (modo crear), `RuleCreatedNotice` y `ApplyRulesDialog`; conecta los eventos con el store de reglas. |
| `src/features/review/store.ts` | Observa `rulesStore.applyRun` y se refresca (§5, R14). |
| `src/router/index.ts` | Ruta `/rules` (`name: 'rules'`, `meta: { label: 'Rules', icon: WandSparkles }`) justo después de `review`. |
| `docs/architecture.md` | Árbol con `features/category-rules/` y `shared/categories.ts`; nota de la dependencia `review` → `category-rules`. |
| `src/assets/theme-dark.css` | Solo si T0 encuentra una pareja sin medir (§9). |

No se tocan: `src/features/import/`, `src/features/net-worth/`, `src/services/http.ts`,
`src/shared/validation.ts`, `src/assets/styles/`, `design-system/`, `package.json`,
`../gastos-backend/`.

## 3. Tipos (`category-rules/types.ts`)

```ts
import type { CategoryKind } from '@/shared/categories'

export interface RuleCategory { id: number; name: string; kind: CategoryKind; parentId: number | null }

export interface CategoryRule {
  id: number
  /** As the backend stored it: lowercase, no accents, trimmed. */
  matchText: string
  categoryId: number
  category: RuleCategory
  createdAt: string
  updatedAt: string
}

export interface NewRule { matchText: string; categoryId: number }
/** Only what changed travels (R8). */
export interface RuleChanges { matchText?: string; categoryId?: number }

export interface RuleMatch { ruleId: number; matchText: string; categoryId: number; categoryName: string }
export interface RuleConflict { movementId: number; description: string; bookingDate: string; matches: RuleMatch[] }

export interface ApplyResult {
  categorized: number
  conflictCount: number
  conflicts: RuleConflict[]
  unmatched: number
  /** Present only when the pass failed; its message is never painted. */
  error: { code: string } | null
}

export type ApplyFlow =
  | { step: 'closed' }
  | { step: 'confirm' }
  | { step: 'applying' }
  | { step: 'done'; result: ApplyResult }
  | { step: 'failed'; message: string }
```

## 4. Service (`category-rules/service.ts`)

```ts
export const RULES_PATH = '/api/category-rules'
export const APPLY_PATH = '/api/category-rules/apply'

export function parseRule(raw: unknown): CategoryRule
export function parseRules(raw: unknown): CategoryRule[]
export function parseApplyResult(raw: unknown): ApplyResult
export async function getRules(client?: HttpClient): Promise<CategoryRule[]>
export async function createRule(rule: NewRule, client?: HttpClient): Promise<CategoryRule>
export async function updateRule(id: number, changes: RuleChanges, client?: HttpClient): Promise<CategoryRule>
export async function deleteRule(id: number, client?: HttpClient): Promise<void>
export async function applyRules(client?: HttpClient): Promise<ApplyResult>
```

- **Cuerpos campo a campo** (`ruleBody`), igual que `changesBody` de la F16
  (`review/service.ts:369`): se copian `matchText` y `categoryId` solo si están, nunca
  un `spread`. `updateRule` con un body vacío lanza un `ValidationError` local antes de
  la red (el contrato responde 400).
- `POST` y `PATCH` con `Content-Type: application/json` y `JSON.stringify(body)`.
  `DELETE` sin body. **`applyRules` con `{ method: 'POST' }` y nada más**: el contrato
  responde 400 `BAD_REQUEST` a un cuerpo vacío declarado como JSON (comentario idéntico
  al de `runImport`, `import/service.ts:278`).
- **Validación en frontera** con `createValidators('POST /api/category-rules')` y
  hermanos: `matchText` con `asText`, `category` con `asObject` + `asMember(kind)`;
  `error` de apply: ausente o `null` → `null`; si está, objeto con `code` (`asText`);
  su `message` **no se guarda** (no hay nada que lo pinte por error).
- `deleteRule` acepta la respuesta vacía del 204 (`http.ts` ya devuelve `undefined`).

## 5. Store (`category-rules/store.ts`) y el refresco de Review

```ts
const rules = ref<CategoryRule[] | null>(null)
const isLoading = ref(false)
const loadError = ref<AppError | null>(null)
const categories = ref<Category[] | null>(null)
const categoriesFailed = ref(false)
const isSaving = ref(false)
const saveMessage = ref<string | null>(null)      // R6, dentro del diálogo
const deleteMessage = ref<string | null>(null)    // R9
const lastCreated = ref<CategoryRule | null>(null) // el aviso de R5
const applyFlow = ref<ApplyFlow>({ step: 'closed' })
/** Increments when an apply ends, whatever the outcome: Review watches it (R14). */
const applyRun = ref(0)

async function load(client?): Promise<void>
async function loadCategories(client?): Promise<void>
async function create(rule: NewRule, client?): Promise<boolean>   // true → the view closes the dialog
async function update(id: number, next: NewRule, client?): Promise<boolean>
async function remove(id: number, client?): Promise<void>
function openApply(): void
async function confirmApply(client?): Promise<void>
function closeApply(): void                  // no-op while 'applying'
function dismissCreated(): void
```

- **Un solo envío a la vez:** `isSaving` para crear/cambiar/borrar y el paso
  `applying` para aplicar se ponen **antes** del primer `await` (remedio del doble clic
  de la F13 y la F16).
- `create` comprueba `isMatchTextTooShort` antes de la red (R4). Con 201: añade la regla
  a `rules` si la lista estaba cargada, fija `lastCreated` y **no** llama a nada más.
- `update` calcula `RuleChanges` comparando con la regla actual (texto **normalizado**
  contra el guardado, para que `Mercadona` frente a `mercadona` no cuente como cambio).
- Tras un 404, una respuesta ilegible u otro fallo no seguro, `load()` de nuevo (R6).
- `confirmApply`: `applying` → `applyRules()` → `done` (sin `error`) o `failed` (con
  `error`, o con cualquier excepción, mensaje de `applyErrorMessage`) → `applyRun++`
  en un `finally`.

**En `review/store.ts`:**

```ts
const rulesStore = useCategoryRulesStore()
watch(() => rulesStore.applyRun, () => void refreshAfterRules())
```

`refreshAfterRules` vacía la selección y `lastAction` (`clearSelection()`), llama a
`refreshAfterAction()` si `result` está cargado (mismo refresco silencioso de la F16,
con su vuelta a la página 1) y a `refreshPendingCount()`. El store de Review vive toda
la sesión porque la barra lateral lo usa (`ReviewCountBadge`), así que el refresco
ocurre aunque se aplique desde `/rules`.

> El contador de pendientes **no debería moverse** al aplicar: el contrato solo escribe
> `categoryId`, nunca `status`. Se vuelve a pedir igualmente (acceptance 4), y es lo que
> hace visible cualquier sorpresa.

## 6. Lógica pura (`category-rules/rules.ts`)

```ts
export const MIN_MATCH_TEXT = 3
export const BANK_BOILERPLATE: ReadonlySet<string>
export function normalizeMatchText(text: string): string   // NFD, \p{Mn} fuera, lower, trim
export function isMatchTextTooShort(text: string): boolean
export function proposeMatchText(description: string): string
export function ruleErrorMessage(error: AppError): string
export function applyErrorMessage(failure: AppError | { code: string }): string
export function applySummaryLines(result: ApplyResult): string[]
```

- `normalizeMatchText` copia **exactamente** `normalizeForMatch` del backend
  (`category-rules.service.ts:30`): los espacios interiores no se tocan.
- `proposeMatchText` (R2): normaliza, parte por `/[^\p{L}\p{N}]+/u`, y devuelve el
  primer token con `length >= 3`, que case con `/^\p{L}+$/u` y no esté en
  `BANK_BOILERPLATE`; si no hay ninguno, la descripción normalizada entera.
- `BANK_BOILERPLATE` (lista cerrada, en minúsculas y sin tildes): `recib`, `recibo`,
  `recibos`, `compra`, `compras`, `tarj`, `tarjeta`, `pago`, `pagos`, `transf`,
  `transferencia`, `trf`, `traspaso`, `bizum`, `adeudo`, `cargo`, `abono`, `cajero`,
  `reintegro`, `comision`, `domiciliacion`, `cuota`, `favor`, `clientes`, `cliente`.
  **Se escribe sin mirar extractos reales**, como la semilla del backend; el humano la
  corrige si falla con sus conceptos.

Textos (R6, R9, R13), en inglés y sin el `message` del backend:

| Caso | Texto |
|---|---|
| Guardar, 409 | `Nothing was saved: another rule already uses that text.` |
| Guardar, 400 | `Nothing was saved: the text needs at least 3 letters or digits.` |
| Guardar, 404 | `Nothing was saved: that category or rule no longer exists.` (+ recarga) |
| Guardar, red | `Couldn't reach the server. Nothing was saved.` |
| Guardar, ilegible | `The server answered, but the reply couldn't be read. Reloading the rules to show what really happened.` |
| Guardar, otro | `Something went wrong. Reloading the rules to show what really happened.` |
| Borrar, 404 | `That rule no longer exists.` |
| Borrar, otro fallo | `Couldn't delete the rule. Nothing changed.` (red / 400) o texto de recarga (resto) |
| Apply, `error` en el 200 | `The rules pass didn't finish. Some movements may already be categorized. The review queue has been reloaded.` |
| Apply, red | `Couldn't reach the server. If the request got through, some movements may be categorized. The review queue has been reloaded.` |
| Apply, ilegible u otro | `Something went wrong applying the rules. Some movements may already be categorized. The review queue has been reloaded.` |

- Aplicar **siempre** dice «puede que algunos ya estén»: el contrato no promete que la
  pasada sea todo o nada, y un fallo de red en un `POST` no prueba que no llegara.
- Resultado (R12): `12 movements categorized`, `5 still without a matching rule`,
  `1 conflict` / `3 conflicts` (singular y plural con `countOf` de la F16, copiado: no se
  importa de `review`).

## 7. Componentes

- **`RuleDialog.vue`** (tonto) — `BaseDialog`, título `Create a rule` / `Edit rule`.
  En crear, primera línea con la descripción del movimiento (`lang="es"`, `break-words`).
  `BaseInput` `Text to look for` con la pista `Matches any description that contains
  this text, ignoring case and accents.` (o el error de R4 en `invalid`). `BaseSelect`
  `Category` con `Choose a category…` y las categorías del `kind` recibido, en
  `optgroup` como `MovementCategorySelect`. Pie: `Cancel` / `Create rule` (o `Save`) con
  `loading`. El mensaje de R6 en `text-negative` sobre el pie. Props: `open`, `mode`,
  `description?`, `initialText`, `initialCategoryId`, `kind`, `categories`, `busy`,
  `message`; emite `save(NewRule)` y `cancel`.
- **`RuleCreatedNotice.vue`** — una línea en `text-positive`:
  `Rule "iberdrola" → Suministros created.` + `BaseButton ghost sm` `Apply rules now`;
  vive hasta la siguiente acción de la cola, el siguiente guardado o al salir de la
  pantalla (como el aviso de la F16). No convive con el de la F16: el más reciente
  gana.
- **`RulesView.vue`** — cabecera `Rules` + frase `Rules categorize pending movements
  without a category when you import, or when you apply them here.` + botón primario
  `Apply rules` (deshabilitado con 0 reglas o sin cargar). Debajo `RuleList`: tarjeta
  con una fila por regla: `"mercadona"` en `font-mono`, flecha, nombre de la categoría,
  `BaseBadge` `Expense`/`Income`, y `Edit` / `Delete` (`ghost sm`, con `aria-label` que
  nombra el texto). **No hay botón de nueva regla**: nacen de un movimiento.
- **`DeleteRuleDialog.vue`** — `Delete the rule "mercadona"?` + `Movements it already
  categorized keep their category.` + `Cancel` (`data-autofocus`) / `Delete`.
- **`ApplyRulesDialog.vue`** — pinta `applyFlow`: `confirm` (título `Apply your
  rules?`, cuerpo con las tres frases de R10: `Only pending movements without a
  category are touched.`, `Confirmed and already categorized movements are never
  changed.`, `This can't be undone from the app.`; `Cancel` con `data-autofocus` /
  `Apply rules`), `applying` (`Applying your rules…`, `dismissible: false`), `done`
  (`ApplyResult` + `Close`), `failed` (mensaje + `Close`).
- **`ApplyResult.vue` / `RuleConflictList.vue`** — tres líneas de cifras en
  `font-mono tabular-nums`; debajo, si hay conflictos, la frase `These movements match
  rules for different categories, so they were left without one.` y la lista completa
  (fecha `formatDate`, descripción `lang="es"`, y por regla `"texto" → categoría`),
  dentro del cuerpo con scroll de `BaseDialog`. Sin enlaces ni controles.
- **Iconos nuevos** (confirmados en `@lucide/vue` 1.45.0): `WandSparkles` (barra
  lateral y botón `Create rule` de la fila), `Pencil`, `Trash2` (fila de regla).

## 8. Qué NO se construye

Crear, renombrar o borrar categorías; resolver conflictos (ni un enlace al
movimiento); crear una regla en blanco desde `/rules`; una vista previa de «a cuántos
afectaría» (el contrato no la tiene); deshacer una aplicación; decir **qué**
movimientos categorizó una pasada (el contrato solo devuelve el número).

## 9. Contraste

Todo sale de parejas ya medidas: textos `ink-*` sobre `--surface-card` (pantalla y
diálogo), la lista de conflictos sobre `--surface-sunken` (la misma de
`CategoryConflictList` de la F14), `--positive` y `--negative` sobre `--surface-card`
(avisos de la F16), `BaseBadge` en sus tonos. T0 lo comprueba; si aparece una pareja
nueva, se añade su línea `contrast:` en `theme-dark.css` sin tocar ningún token.

## 10. Impacto en tests existentes

| Test | Qué pasa |
|---|---|
| `router.spec.ts:63` «exposes one navigation entry per navigable route» | Se **sustituye** la lista esperada: `Rules` entre `Review` y `Overview`. |
| `AppShell.spec.ts` | Deriva de `navEntries`: pasa sin cambios. |
| `MovementRow.spec.ts` «la casilla ocupa ese hueco, un selector y un botón» (F16, C4) | Se **sustituye**: un selector, `Confirm` y `Create rule`, y sigue sin control de importe, fecha ni descripción. |
| `review/service.spec.ts` (categorías) | Sin cambios: importa `getCategories`/`parseCategories` de `review/service`, que los re-exporta. |
| `store.spec.ts:335` y `ReviewView.spec.ts:279` «solo GET» | Se conservan: cargar la cola sigue sin escribir nada. |
| `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts`, `e2e/app-boot.spec.ts` | Sin tocar. Montar Review **no** pide `/api/category-rules` (la lista solo se pide en `/rules`). |

## 11. e2e (`e2e/category-rules.spec.ts`, chromium)

Con `page.route` para `/api/movements*`, `/api/categories`, `/api/category-rules*`, y
una red de seguridad que aborta cualquier otra escritura:

1. en `/review`, `Create rule` en la fila `RECIB /IBERDROLA CLIENTES, S.A` propone
   `iberdrola`, y guardar manda **un** `POST` con exactamente `matchText` y
   `categoryId`; aparece el aviso con `Apply rules now`;
2. `Apply rules now` → confirmación → `Apply rules` manda **un** `POST` a `/apply` sin
   body; el diálogo enseña las tres cifras y un conflicto; al cerrar, la fila pintada
   tiene su categoría nueva sin recargar;
3. un 409 al crear deja el diálogo abierto con su mensaje y sin aviso;
4. en `/rules`, cambiar la categoría de una regla manda un `PATCH` con solo
   `categoryId`, y borrar pide confirmación y manda un `DELETE`; ninguno de los dos
   toca `/api/movements`;
5. sin errores de consola.

## 12. Alternativas descartadas (resumen)

| Alternativa | Por qué no |
|---|---|
| Lista de reglas como panel dentro de Review | La pantalla ya lleva filtros, barra de acciones, avisos y 100 filas; editar reglas es otra tarea. 🔴 1. |
| Proponer el concepto entero | No se pasa de amplio, pero tal cual solo casa con conceptos idénticos: la regla no enseñaría nada. 🔴 2. |
| Aplicar sola al crear la regla | Una escritura en masa, sin deshacer, a cada regla creada. 🔴 3. |
| Aplicar sin confirmar | Una regla con un texto flojo categoriza cientos sin aviso. 🔴 4. |
| Crear la regla y categorizar también el movimiento | Dos escrituras sin atomicidad: la regla puede quedar creada y el movimiento no. 🔴 5. |
| Los 10 primeros conflictos, como el informe de importación | Aquí ver los conflictos **es** el objetivo; el cuerpo del diálogo ya tiene scroll. 🔴 6. |
| El store de reglas refresca Review (como `import`) | Ciclo `review` ↔ `category-rules` (§1). |
| Importar `parseCategorization` / `CategoryConflictList` de `import` | Ciclo `import` → `review` → `category-rules` → `import`, y otro endpoint con otros límites. |
| Vista previa de a cuántos afectaría con `GET /api/movements?q=` | `q` pide 2-100 caracteres y no es la misma función que la regla; parecería exacta sin serlo. |
