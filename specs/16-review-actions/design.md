# Design — Feature 16: review-actions

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, tipos propios por feature, ADR-002 y ADR-003) y en
> `docs/conventions.md` (inglés, solo oscuro con alias semánticos y líneas
> `contrast:`, `money.ts`, Lucide por nombre, sin `@apply`). Aquí van solo los puntos
> donde la feature roza esas reglas.
>
> **Construye encima de la F15**, que ya está cerrada: reutiliza sus tipos, su
> service, su store, su fila y sus componentes base. El hueco de la casilla
> (`MovementRow.vue:7`) y el sitio de la barra de acciones
> (`ReviewFilterBar.vue:84`) ya están reservados en el código real.

## 1. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/features/review/actions.ts` | Lógica pura: `eligibleForCategory`, `undoPlan`, `actionErrorMessage`, `actionSummary`, `BULK_CONFIRM_THRESHOLD`, `MAX_IDS`. |
| `src/features/review/components/ReviewActionBar.vue` | La barra que aparece con la selección: recuento, selector de categoría, `Apply category`, `Confirm N movements`, `Clear selection`. |
| `src/features/review/components/MovementCategorySelect.vue` | El selector de categoría de una fila: solo las del `kind` que casa, más `No category`; deshabilitado en `neutral`. |
| `src/features/review/components/ActionNotice.vue` | El aviso de resultado (`3 movements confirmed`) con `Undo`, y el mensaje de error de acción. |
| `src/features/review/components/BulkConfirmDialog.vue` | Diálogo de confirmación previa (`BaseDialog`) para acciones de 20 movimientos o más. |
| Tests | `src/features/review/__tests__/{actions,ReviewActionBar,MovementCategorySelect,ActionNotice,BulkConfirmDialog}.spec.ts`; casos nuevos en `{service,store,MovementRow,MovementList,ReviewView}.spec.ts`; `e2e/review-actions.spec.ts`. |

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/features/review/service.ts` | Se añaden `updateMovement(id, changes, client?)` y `updateMovements(body, client?)`, `parseMovement` pasa a exportarse y aparece `parseBulkResult`. Cambia su cabecera: deja de ser «read only». |
| `src/features/review/types.ts` | `MovementChanges`, `BulkUpdate`, `BulkResult`, `UndoGroup`, `LastAction`. |
| `src/features/review/store.ts` | Selección, estado de acción, las cuatro acciones y el deshacer (§4). `load`, `apply` y `goToPage` vacían la selección. |
| `src/features/review/components/MovementRow.vue` | El hueco reservado pasa a ser la casilla; se añaden `MovementCategorySelect` y el botón `Confirm`; sigue sin tocar importe, fecha ni descripción. |
| `src/features/review/components/MovementList.vue` | Casilla «seleccionar todo» en la cabecera de la tarjeta (con `indeterminate`), y pasa la selección a cada fila. |
| `src/features/review/views/ReviewView.vue` | Monta `ReviewActionBar`, `ActionNotice` y `BulkConfirmDialog`; conecta los eventos de fila con el store. |
| `src/shared/components/BaseSelect.vue` | Prop opcional `labelHidden` (etiqueta `sr-only`, se mantiene el `for`/`id`): la fila no puede repetir «Category» 100 veces en pantalla. |
| `src/shared/components/BaseCheckbox.vue` | Props opcionales `indeterminate`, `disabled` y `ariaLabel` (cuando la etiqueta visible es otra cosa). |
| `src/features/review/components/CategorySelect.vue` | Props opcionales `placeholder` y `kind`: lo reutiliza la barra de acciones (`Choose a category…`). El filtro de la F15 lo sigue usando sin pasarlas. |
| `src/assets/theme-dark.css` | Solo líneas `contrast:` nuevas (§8). |
| `docs/architecture.md` | La nota de la F15 («la pantalla es de solo lectura») se corrige: `features/review/` ya escribe con los dos `PATCH`. |
| Tests de la F15 | §9. |

No se tocan: `src/assets/styles/`, `design-system/`, `package.json`,
`src/features/net-worth/`, `src/features/import/`, `../gastos-backend/`.

## 2. Tipos nuevos (`types.ts`)

```ts
/** The only two fields a movement accepts (contract: PATCH /api/movements/:id). */
export interface MovementChanges {
  categoryId?: number | null
  status?: MovementStatus
}

/** Body of PATCH /api/movements: ids plus at least one of the two fields. */
export interface BulkUpdate extends MovementChanges {
  ids: number[]
}

export interface BulkResult {
  updated: number
  movements: Movement[]
}

/** One PATCH of the undo: the ids that shared the same previous value. */
export interface UndoGroup {
  ids: number[]
  changes: MovementChanges
}

export interface LastAction {
  /** English sentence already built: "3 movements confirmed". */
  summary: string
  undo: UndoGroup[]
}
```

## 3. Service (`service.ts`)

```ts
export const MAX_IDS = 200

export function parseBulkResult(raw: unknown): BulkResult
export async function updateMovement(id: number, changes: MovementChanges, client?: HttpClient): Promise<Movement>
export async function updateMovements(update: BulkUpdate, client?: HttpClient): Promise<BulkResult>
```

- **El body se construye campo a campo**, nunca con un `spread` de un objeto que
  venga de la vista: solo se copian `categoryId` (si la clave está presente, para
  poder mandar `null`) y `status`. Es lo que garantiza R9 y el criterio 8 del
  `acceptance`; el contrato responde 400 a cualquier propiedad de más.
- `updateMovements` **deduplica** `ids`, y **lanza** un `ValidationError` local si
  quedan 0 o más de `MAX_IDS`: una barrera antes del 400, igual que la de
  `categoryId` + `uncategorized` de la F15 (`service.ts:55`).
- La petición va con `method: 'PATCH'`, `Content-Type: application/json` y
  `JSON.stringify(body)` sobre el `HttpClient` de siempre (`services/http.ts`, que ya
  mezcla `init` y cabeceras y traduce el no-2xx a `ApiError` con `status` y `apiCode`).
- **Validación en frontera** (ADR-002) con los `createValidators` ya existentes: la
  respuesta del PATCH individual es un `Movement` y la del bloque es
  `{ updated, movements }`; se reutiliza `parseMovement`, que la F15 ya escribió
  entero a propósito (`service.ts:92`).

## 4. Store (`store.ts`, el de la F15 ampliado)

```ts
const selectedIds = ref<number[]>([])        // array: el orden se conserva y es serializable en tests
const isActing = ref(false)
const actionError = ref<AppError | null>(null)
const lastAction = ref<LastAction | null>(null)

function toggleSelection(id: number): void
function selectPage(selected: boolean): void
function clearSelection(): void
async function categorizeOne(id: number, categoryId: number | null, client?): Promise<void>
async function confirmOne(id: number, client?): Promise<void>
async function confirmSelected(client?): Promise<void>
async function categorizeSelected(categoryId: number | null, client?): Promise<void>
async function undoLast(client?): Promise<void>
```

- **Vive en el store de la F15, no en uno propio.** La selección se vacía cuando
  cambian filtros o página (estado de ese store) y las acciones reescriben
  `result.movements` (también suyo). *Alternativa descartada:* un
  `useReviewActionsStore` separado, que tendría que espiar el `result` del otro y
  duplicar el ciclo de vida; el precedente de `import → net-worth` es para
  dependencias entre features, no dentro de una.
- **Un solo carril:** todas las acciones pasan por un `runAction(fn)` privado que
  ignora la llamada si `isActing` ya es `true` (R11), limpia `actionError`, ejecuta y
  aplica el resultado. Es el mismo remedio del doble clic de la F13.
- **Aplicación del resultado** (`applyUpdated(movements)`): por cada movimiento
  devuelto, si `status === 'pending_review'` se **sustituye** en `result.movements`;
  si no, se **quita** de la lista y se resta 1 a `pendingCount`. Después se lanza un
  **refresco silencioso** de la página actual (`fetchPage` sin vaciar `result` ni
  encender `isLoading`), para que `pagination` y `totals` sigan siendo los de la API y
  la página se rellene. `pendingCount` se corrige solo en cuanto ese `GET` llega sin
  filtros activos, y en el resto de casos vale el decremento local.
  *Alternativa descartada:* recalcular `pagination.total` y los `totals` en el cliente
  — prohibido por la F15 (R9) y por el contrato, que los calcula sobre todas las
  coincidencias del filtro, no sobre la página.
- **El deshacer** se construye **antes** de enviar, con `undoPlan(movements, changes)`
  (`actions.ts`): agrupa los ids por el par `(status, categoryId)` que tenían y
  devuelve un `UndoGroup` por grupo, con **solo** los campos que la acción cambió.
  `undoLast()` los envía en serie; si uno falla, para ahí, escribe el mensaje de R14 y
  refresca la página. Tras un deshacer con éxito `lastAction` vuelve a `null` (no se
  rehace lo deshecho).

## 5. Componentes

- **`MovementRow.vue`** — el `<span class="w-6">` reservado pasa a ser un
  `BaseCheckbox` con `ariaLabel = 'Select ' + description`. A la derecha del badge de
  categoría, `MovementCategorySelect` (compacto, `labelHidden`) y un
  `BaseButton size="sm" variant="secondary"` con el texto `Confirm`. El badge de
  categoría se mantiene para las filas sin interacción de teclado y como lectura
  rápida. MIENTRAS la fila está seleccionada: `bg-surface-sunken border-l-2
  border-brand` (§8: es el fondo que la F15 ya mide para todos los tokens de la fila;
  pintarla con `bg-brand-subtle` obligaría a re-medir los ocho `--chart-*`).
- **`MovementList.vue`** — cabecera con el `BaseCheckbox` «seleccionar todo»
  (`indeterminate` cuando hay algunos), el recuento y nada más; con el estado vacío no
  se pinta.
- **`ReviewActionBar.vue`** (tonto: props + emits) — va **bajo los filtros**, en el
  sitio que la F15 dejó marcado: `N selected`, `CategorySelect` con placeholder
  `Choose a category…` y opción `Remove category`, texto
  `Applies to N of M selected`, `Apply category`, `Confirm N movements` y
  `Clear selection`. Los dos botones llevan `loading` mientras `isActing`.
- **`BulkConfirmDialog.vue`** — `BaseDialog` (`dismissible`), título
  `Confirm 24 movements?` / `Apply "Groceries" to 24 movements?`, cuerpo de una línea
  recordando que la operación es todo o nada, y botones `Cancel` / `Yes, continue`
  (`data-autofocus` en `Cancel`).
- **`ActionNotice.vue`** — una línea sobre la lista: en éxito
  `3 movements confirmed` + `Undo` (`BaseButton variant="ghost" size="sm"`); en
  error, el texto de `actionErrorMessage` en `text-negative`. Nunca los dos a la vez.
- **Iconos nuevos** (import por nombre, confirmados en T0 contra `@lucide/vue`):
  `Check`, `Undo2`, `Tag`.

## 6. Elegibilidad y textos (`actions.ts`, puro)

```ts
export const MAX_IDS = 200
export const BULK_CONFIRM_THRESHOLD = 20

export function eligibleForCategory(movements: Movement[], kind: CategoryKind | null): Movement[]
export function undoPlan(before: Movement[], changes: MovementChanges): UndoGroup[]
export function actionSummary(count: number, changes: MovementChanges, categoryName?: string): string
export function actionErrorMessage(error: AppError): string
```

- `eligibleForCategory`: `kind === null` (quitar categoría) → todos menos los
  `neutral`; con `kind` → los de `type === kind`. **El `kind` sale de
  `GET /api/categories`**, porque `GET /api/movements` no lo trae para las categorías
  que el movimiento *podría* recibir.
- Textos de error (R12), todos en inglés y sin el `message` del backend (viene en
  español y nombra ids):

| Caso | Texto |
|---|---|
| `ApiError` 400 | `Nothing changed. Some of those movements don't accept that category.` |
| `ApiError` 404 | `Nothing changed: a movement or the category no longer exists. Reloading the list.` |
| `code === API_NETWORK` | `Couldn't reach the server. Nothing changed.` |
| `ValidationError` | `The server answered, but the reply couldn't be read. Reloading the list to show what really happened.` |
| resto | `Something went wrong. Reloading the list to show what really happened.` |

- Solo el 400 y el fallo de red garantizan que no se escribió nada (todo o nada del
  contrato); los otros tres recargan porque el cambio **pudo** aplicarse.

## 7. Qué NO se construye

Emparejar traspasos, reglas de categorías (`POST /api/category-rules`), crear
categorías desde la pantalla, seleccionar entre páginas, «confirmar todo lo que
cumple el filtro» (variante que el backend descartó), y cualquier edición del hecho
bancario.

## 8. Contraste: líneas `contrast:` en `theme-dark.css`

Ya medidas y reutilizables: todo lo de la fila sobre `--surface-sunken`
(`--ink-strong`, `--ink-muted`, `--positive`, `--ink-faint`, `--chart-*`), los textos
sobre `--surface-card`, `--negative on --surface-card` (error de acción),
`--ink-muted on --surface-hover`, y las del diálogo sobre el velo.

Se añaden (valores a confirmar por el test en T0):

```
contrast: --brand on --surface-sunken >= 3 (left edge of a selected review row)
contrast: --brand on --surface-card >= 3 (checkbox tick and focus ring on a row)
contrast: --ink-body on --surface-card >= 4.5 (action bar copy)          ← ya existe
contrast: --positive on --surface-card >= 4.5 (action result notice)     ← ya existe
```

Si el borde izquierdo no llega a 3:1 sobre `--surface-sunken`, se usa `--accent`
(mismo verde) o se sube el grosor; lo que se elija queda escrito en su línea. No se
toca ningún token.

## 9. Impacto en los tests de la F15

Tres tests afirman hoy que no existe nada de esto y **se sustituyen** por su
equivalente (no se borran):

| Test | Qué pasa a comprobar |
|---|---|
| `MovementRow.spec.ts:70` «keeps the left slot the F16 will use…» | que la casilla ocupa ese hueco, que hay exactamente un selector y un botón, y que **no** hay control de importe, fecha ni descripción (C4). |
| `ReviewFilterBar.spec.ts:131` «offers no selection, no confirm…» | la barra de filtros **sigue** sin acciones: son de `ReviewActionBar`. |
| `ReviewView.spec.ts:296` «builds no selection or action control» | la barra aparece con selección y desaparece sin ella. |

Los dos tests «only ever GETs / talks to the two read endpoints» (`store.spec.ts:335`,
`ReviewView.spec.ts:279`) **se conservan tal cual**: siguen ejercitando solo caminos
de lectura, y son la red que impide que cargar la lista escriba algo. Lo mismo con la
red de seguridad de `e2e/review-queue.spec.ts`, que aborta lo que no sea `GET`: el
nuevo `e2e/review-actions.spec.ts` trae la suya, que sí admite `PATCH`.

## 10. e2e (`e2e/review-actions.spec.ts`, chromium)

Con `page.route` para `/api/movements*` (GET y PATCH), `/api/categories`:

1. marcar una fila y pulsar `Confirm 1 movement` manda **un** `PATCH` a
   `/api/movements` con `{ ids: [10], status: 'confirmed' }`, la fila desaparece sin
   recargar y el número de la barra lateral baja;
2. `Undo` manda el `PATCH` inverso y la fila vuelve;
3. «seleccionar todo» + aplicar una categoría `expense` sobre una página con un
   `income` dentro manda solo los ids `expense` y enseña `Applies to 2 of 3 selected`;
4. un `PATCH` respondido con 400 deja la lista **idéntica** y enseña el mensaje de
   «nothing changed»;
5. sin errores de consola.

`e2e/app-boot.spec.ts` no cambia (esta feature no añade peticiones al arranque).

## 11. Alternativas descartadas (resumen)

| Alternativa | Por qué no |
|---|---|
| Un store propio para la selección | Necesitaría el `result` y el ciclo de filtros del store de la F15; duplicar estado para no tocar un archivo no compensa. |
| Conservar la selección al cambiar de página o de filtro | Permite pasar de los 200 ids del contrato y confirmar a ciegas movimientos que ya no ves. 🔴 1. |
| Categorizar con un botón `Save` por fila | Un clic más en la operación que se repite mil veces; el selector ya es un gesto explícito y el `Undo` cubre el error. 🔴 2. |
| Mandar toda la selección y enseñar el 400 del backend | El contrato es todo o nada: un `neutral` colado tumba la operación entera y el usuario no sabe cuál era. Se filtra en el cliente. 🔴 6. |
| Dejar las filas confirmadas en pantalla, tachadas | Es una **cola**: lo confirmado ya no pertenece a ella, y `pagination.total` dejaría de casar con lo que se ve. 🔴 4. |
| Deshacer con temporizador (toast de 10 s) | Obliga a correr; el aviso hasta la siguiente acción no molesta y no se pierde. 🔴 5. |
| Recalcular `pagination` y `totals` tras la acción | Prohibido por la F15 y por el contrato: los calcula el backend sobre todo el filtro. |
| Trocear en varias peticiones de 200 para «confirmar todo el filtro» | El backend descartó la variante por filtro; y con la selección por página nunca se pasa de 100 ids. |
