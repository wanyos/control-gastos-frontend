# Design — Feature 15: review-queue

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, tipos propios por feature) y `docs/conventions.md` (inglés,
> solo oscuro con alias semánticos y líneas `contrast:`, `money.ts` para cifras y
> fechas, Lucide por nombre, sin `@apply`). Aquí van solo los puntos donde la
> feature roza esas reglas y las decisiones propias. Los patrones de referencia son
> `src/features/net-worth/` y `src/features/import/`.
>
> **Solo lectura:** nada de lo descrito aquí llama a `PATCH`. La selección de filas y
> las acciones son la F16; el diseño reserva su sitio (§8) sin construirlo.

## 1. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/features/review/types.ts` | `Movement` (con `account` y `category` embebidos), `Pagination`, `Totals`, `MovementPage`, `Category`, `ReviewFilters`, `MovementQuery`. |
| `src/features/review/service.ts` | `getMovements`, `getCategories`, `parseMovementPage`, `parseCategories`, `buildMovementsQuery`, `MOVEMENTS_PATH`, `CATEGORIES_PATH`. |
| `src/features/review/store.ts` | `useReviewStore`: filtros, página, página de datos, carga, error, categorías y recuento de pendientes. |
| `src/features/review/filters.ts` | Lógica pura: filtros ↔ querystring de la API, filtros ↔ query de la URL, validación de `q`, `hasActiveFilters`. |
| `src/features/review/views/ReviewView.vue` | La pantalla: cabecera con totales, filtros, lista, paginación y estados. |
| `src/features/review/components/ReviewFilterBar.vue` | Los seis controles de filtro + `Clear filters`. |
| `src/features/review/components/CategorySelect.vue` | `<select>` con un `<optgroup>` por categoría raíz. |
| `src/features/review/components/MovementList.vue` | La lista (tarjeta) y sus estados vacíos. |
| `src/features/review/components/MovementRow.vue` | Una fila: port de `design-system/components/finance/TransactionRow.jsx`. |
| `src/features/review/components/ReviewTotals.vue` | `N movements` + `in` / `out` / `net`. |
| `src/features/review/components/ReviewPager.vue` | `Previous` / `Next` + `Page X of Y`. |
| `src/features/review/components/ReviewCountBadge.vue` | El número de la entrada Review de la barra lateral. |
| `src/shared/components/BaseInput.vue` | Port de `design-system/components/forms/Input.jsx` (texto y `date`). |
| `src/shared/components/BaseSelect.vue` | Port de `design-system/components/forms/Select.jsx`. |
| `src/shared/components/BaseCheckbox.vue` | Port de `design-system/components/forms/Checkbox.jsx` (lo usa «Uncategorized»). |
| Tests | `src/features/review/__tests__/{fixtures,service,store,filters,ReviewView,ReviewFilterBar,CategorySelect,MovementList,MovementRow,ReviewTotals,ReviewPager,ReviewCountBadge}.spec.ts` (`fixtures.ts` sin `.spec`); casos nuevos en `src/shared/components/__tests__/BaseComponents.spec.ts`; `e2e/review-queue.spec.ts`. |

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/router/index.ts` | Ruta `/review` (nombre `review`, `label: 'Review'`, icono `ListChecks`) **antes** de `/overview`; exporta `REVIEW_ROUTE_NAME`. `/movements` se queda intacto. |
| `src/router/__tests__/router.spec.ts` | 5 rutas navegables; `/review` resuelve a `ReviewView`. |
| `src/shared/components/AppSidebar.vue` | Dentro del enlace, `<ReviewCountBadge v-if="entry.name === REVIEW_ROUTE_NAME" />` a la derecha del label. |
| `src/shared/components/__tests__/AppShell.spec.ts` | La entrada Review existe; el `fetch` mockeado cubre el GET del recuento. |
| `src/features/import/store.ts` | En el `finally` de `start()`, además de lo de hoy: `void useReviewStore().refreshPendingCount(client)`. |
| `src/features/import/__tests__/store.spec.ts` | Casos nuevos: tras cada resultado hay 1 GET de recuento. |
| `src/assets/theme-dark.css` | Solo líneas `contrast:` nuevas (§9). |
| `e2e/app-boot.spec.ts` | `page.route('**/api/movements*', …)` con una página vacía (§10). |
| `docs/architecture.md`, `docs/stack.md` | Árbol de `features/review/`, componentes base nuevos, dependencia `import → review`. |

No se tocan: `src/assets/styles/`, `design-system/`, `package.json`,
`src/features/net-worth/`, `../gastos-backend/`.

## 2. Tipos (`src/features/review/types.ts`)

Propios de la feature, escritos desde `### GET /api/movements` y `### GET /api/categories`.
`DecimalString` y `DateOnly` se declaran aquí, como hace `import/types.ts`: los tipos
no se comparten entre features.

```ts
export type DecimalString = string
export type DateOnly = string

export type MovementType = 'expense' | 'income' | 'neutral'
export type MovementStatus = 'confirmed' | 'pending_review'
export type CategoryKind = 'expense' | 'income'

/** The account as it travels embedded in a movement (no `balance`). */
export interface MovementAccount {
  id: number
  iban: string
  bank: string
  alias: string
  type: string            // open text: a new account type must not break the list
}

export interface MovementCategory {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
}

export interface Movement {
  id: number
  type: MovementType
  bookingDate: DateOnly
  valueDate: DateOnly
  amount: DecimalString           // always positive; the sign comes from `type`
  description: string
  balanceAfter: DecimalString | null
  currency: string
  note: string | null
  accountId: number
  account: MovementAccount
  categoryId: number | null
  category: MovementCategory | null
  paymentMethod: string | null    // open text, always null today
  origin: string                  // open text
  status: MovementStatus
  transferId: string | null
  daySequence: number | null
  createdAt: string
  updatedAt: string
}

export interface Pagination { page: number; pageSize: number; total: number; totalPages: number }
export interface Totals { income: DecimalString; expense: DecimalString; net: DecimalString }
export interface MovementPage { movements: Movement[]; pagination: Pagination; totals: Totals }

/** A root category with its children embedded (subcategories are one level deep). */
export interface Category {
  id: number
  name: string
  kind: CategoryKind
  parentId: number | null
  createdAt: string
  children: Category[]
}

/** What the user chose. Empty string / null means "not filtering by this". */
export interface ReviewFilters {
  accountId: number | null
  from: DateOnly | ''
  to: DateOnly | ''
  type: MovementType | ''
  categoryId: number | null
  uncategorized: boolean
  q: string                       // raw, as typed; trimmed at the boundary
}
```

- **Los importes siguen siendo strings** (`asDecimal`), como en net-worth e import:
  parsearlos a `number` perdería céntimos.
- **`type`, `status` y `kind` son estrictos** (`asMember`): son enumeraciones cerradas
  del contrato y una deriva debe verse. **`origin`, `paymentMethod`, `account.type` y
  `currency` son texto abierto** (`asText` / `asString`): que el backend añada un valor
  nuevo no puede tumbar la pantalla.
- **Se parsea el movimiento entero**, no solo los cinco campos que se pintan: la F16
  necesita `id`, `type` y `categoryId`, y así no tiene que reabrir el service.
  *Alternativa descartada:* parsear solo lo visible; ahorra veinte líneas y obliga a
  tocar service y tests en la feature siguiente.

## 3. Service (`src/features/review/service.ts`)

```ts
export const MOVEMENTS_PATH = '/api/movements'
export const CATEGORIES_PATH = '/api/categories'

export interface MovementQuery {
  status?: MovementStatus
  accountId?: number
  from?: string
  to?: string
  type?: MovementType
  categoryId?: number
  uncategorized?: true
  q?: string
  page?: number
  pageSize?: number
}

/** `/api/movements?status=pending_review&page=1&pageSize=100` — omits empty values. */
export function buildMovementsQuery(query: MovementQuery): string
export function parseMovementPage(raw: unknown): MovementPage
export function parseCategories(raw: unknown): Category[]
export async function getMovements(query: MovementQuery, client?: HttpClient): Promise<MovementPage>
export async function getCategories(client?: HttpClient): Promise<Category[]>
```

- **Querystring a mano con `URLSearchParams`**, como el resto del proyecto (no hay
  librería de query). Solo se añade una clave si su valor está definido y no es cadena
  vacía; `uncategorized` solo se añade cuando vale `true` (`uncategorized=false` no
  filtra nada según el contrato, así que no se manda nunca). El `q` se manda **ya
  recortado**; la codificación la hace `URLSearchParams` (un `%` o un `&` en la
  búsqueda viajan escapados y el backend los trata como literales).
- **`categoryId` y `uncategorized` son excluyentes en el propio tipo de entrada**: el
  store nunca puede construir un `MovementQuery` con los dos porque `filters.ts` los
  resuelve antes (§5). Aun así, `buildMovementsQuery` da prioridad a `uncategorized` y
  descarta `categoryId` si le llegaran los dos: una barrera más antes del 400.
- **Validación en frontera** con `createValidators('GET /api/movements')` y
  `createValidators('GET /api/categories')` de `src/shared/validation.ts`, exactamente
  como `import/service.ts`. `categories` se mapea recursivamente (un solo nivel, pero
  la función se llama a sí misma y así un nivel más no rompería el parseo).
- `getMovements` y `getCategories` reciben `client: HttpClient = http` para poder
  inyectar el mock en los tests, igual que el resto de features.

## 4. Paginación

- `pageSize` **fijo a 100**, constante `PAGE_SIZE` del store. No hay selector.
  Razón: el tope de `PATCH /api/movements` es 200 ids y el `pageSize` máximo también,
  así que «marcar toda la página» de la F16 seguirá cabiendo en una petición; 100 es
  el punto medio entre eso y una página que se recorre cómodamente.
  *Alternativa descartada:* el 50 por defecto del backend (más clics para vaciar una
  cola de 1.378) y el 200 máximo (una página muy larga de leer).
- `page` vive en la URL. Al cambiar de página se pide de nuevo y se sube el scroll al
  principio de la lista.
- El contrato responde **400** si `page` va más allá de la última página con
  coincidencias; el store lo trata con el reintento único de §7.

## 5. Filtros puros (`src/features/review/filters.ts`)

```ts
export const EMPTY_FILTERS: ReviewFilters
export function toQuery(filters: ReviewFilters, page: number): MovementQuery   // API
export function toRouteQuery(filters: ReviewFilters, page: number): LocationQueryRaw  // URL
export function fromRouteQuery(query: LocationQuery): { filters: ReviewFilters; page: number }
export function hasActiveFilters(filters: ReviewFilters): boolean              // ignores `status`
export function searchTerm(q: string): { value?: string; error?: string }
```

- **`searchTerm`** implementa las reglas del contrato en el cliente, para no provocar
  400 evitables: el **máximo de 100 se mide sobre lo tecleado tal cual** (espacios
  incluidos) y el **mínimo de 2 sobre lo recortado**, igual que el backend. Más de
  100 → `error: 'Search is limited to 100 characters'` y no se pide nada; menos de 2
  → sin `q` (la lista vuelve a los pendientes sin búsqueda), sin error: escribir la
  primera letra no es un fallo.
- **Excluyentes:** `toQuery` manda `uncategorized=true` **o** `categoryId`, nunca los
  dos (R6); la interfaz ya limpia el otro control al tocar uno.
- **URL:** claves cortas y legibles `account`, `from`, `to`, `type`, `category`,
  `uncategorized`, `q`, `page`. `fromRouteQuery` es tolerante: lo que no sea entero
  positivo o no esté en la enumeración se descarta y cae al valor por defecto
  (R10), nunca lanza.
- **`status` no está en los filtros:** esta pantalla es la cola, siempre
  `status=pending_review`. Es la decisión 🔴 nº 2 de `decisions.md`; si el humano pide
  poder ver también lo confirmado, se añade aquí un campo `status` y un control más, y
  el resto del diseño no cambia.

## 6. Store (`src/features/review/store.ts`)

```ts
export const PAGE_SIZE = 100

export const useReviewStore = defineStore('review', () => {
  const filters = ref<ReviewFilters>({ ...EMPTY_FILTERS })
  const page = ref(1)
  const result = ref<MovementPage | null>(null)      // null: never loaded or failed
  const isLoading = ref(false)
  const error = ref<AppError | null>(null)
  const notice = ref<string | null>(null)            // "showing the first page", etc.
  const categories = ref<Category[] | null>(null)
  const categoriesFailed = ref(false)
  const pendingCount = ref<number | null>(null)      // null: unknown or query failed

  async function load(client?: HttpClient): Promise<void>            // never throws
  async function apply(next: ReviewFilters, client?: HttpClient): Promise<void>  // resets page to 1
  async function goToPage(next: number, client?: HttpClient): Promise<void>
  async function loadCategories(client?: HttpClient): Promise<void>  // once; failure → categoriesFailed
  async function refreshPendingCount(client?: HttpClient): Promise<void>  // never throws
  return { … }
})
```

- **`load()` nunca relanza** (patrón de `net-worth/store.ts`): el fallo vive en
  `error` y la vista lo pinta. Un contador de ejecución (`loadRun`, como el `checkRun`
  de import) descarta la respuesta de una petición que ya no es la última: con
  búsqueda mientras se escribe, las respuestas pueden llegar desordenadas.
- **Recuento de pendientes:** `refreshPendingCount` hace
  `getMovements({ status: 'pending_review', page: 1, pageSize: 1 })` y guarda
  `pagination.total`; si falla, `pendingCount = null` y no se muestra nada (R1).
  Además, cada `load()` cuyo filtro efectivo es solo el estado escribe `pendingCount`
  con el `pagination.total` que ya trae, sin una petición extra (R2).
- **Dependencia entre features:** `import/store.ts` → `review/store.ts`, en un solo
  sentido y por alias (`@/features/review/store`), igual que ya hace con net-worth.
  `review` no conoce `import`.
- *Alternativa descartada:* un composable `useReviewQueue()` con estado local en la
  vista. El recuento de la barra lateral lo necesita también, y vive fuera de la
  vista: el estado tiene que ser de store.

## 7. Errores (R14)

`load()` traduce el fallo con `toAppError` y lo guarda entero; la vista elige el
texto con una función pura `reviewErrorMessage(error, page)`:

| Caso | Texto | Acción |
|---|---|---|
| `status === 404` | `That account or category no longer exists.` | `Clear filters` |
| `status === 400` y `page > 1` | `That page no longer exists. Showing the first page.` | ninguna: se recarga `page=1` una sola vez |
| `status === 400` (en `page === 1`) | `The backend rejected these filters.` | `Clear filters` |
| `code === 'API_NETWORK'` | `Couldn't reach the server.` | `Try again` |
| `ValidationError` | `The server answered, but the list couldn't be read.` | `Try again` |
| resto | `Something went wrong loading the list.` | `Try again` |

- El **reintento único** se hace en el store, con un flag local para no encadenar dos:
  si el reintento en `page=1` vuelve a fallar, se muestra el mensaje que corresponda y
  ya no se reintenta.
- El `message` del backend **no se pinta** (viene en español y nombra ids); el error
  entero sigue en el store para el `handleGlobalError` de siempre.
- Los controles de filtro **nunca se deshabilitan por un error**: es lo que permite
  salir del error cambiando el filtro que lo causó.

## 8. Componentes

### Compartidos (ports de `design-system/components/forms/`)

```ts
// BaseInput.vue
defineProps<{ modelValue: string; type?: 'text' | 'date'; placeholder?: string; label: string; invalid?: boolean }>()
defineEmits<{ 'update:modelValue': [string] }>()
// BaseSelect.vue
defineProps<{ modelValue: string; label: string; disabled?: boolean }>()   // <option>/<optgroup> por slot
// BaseCheckbox.vue
defineProps<{ modelValue: boolean; label: string }>()
```

- `label` siempre presente y asociado con `for`/`id` (id generado con `useId()`): son
  controles de filtro, no se dejan sin etiqueta.
- Clases (literales, por el escaneo de Tailwind): campo
  `h-9 rounded-md border border-line-default bg-surface-card px-3 text-sm text-ink-strong placeholder:text-ink-faint`,
  foco `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`,
  inválido `border-negative`. El `<select>` nativo conserva su flecha del sistema: no
  se construye un desplegable a medida (sería un componente entero, no un port).

### De la feature

- **`ReviewView.vue`**: título `Review`, `ReviewTotals`, `ReviewFilterBar`, y debajo
  la tarjeta con `MovementList` + `ReviewPager`. Al montar: `fromRouteQuery` →
  `store.apply()` + `store.loadCategories()`. `watch` sobre `route.query` para
  responder a atrás/adelante del navegador; cada cambio de filtro o página hace
  `router.replace({ query: toRouteQuery(...) })` (`replace`, no `push`: teclear en el
  buscador no debe llenar el historial; cambiar de **página** sí usa `push`).
- **`ReviewFilterBar.vue`** (tonto: `props` + `emit('change', filters)`): buscador
  (icono `Search`, `data-test="review-search"`, debounce de 350 ms con
  `setTimeout`/`clearTimeout` en el componente), cuenta (`<select>` construido con
  las cuentas presentes en la página + las de la URL —ver nota—), `From` y `To`
  (`type="date"`), tipo (`All types` / `Expense` / `Income` / `Neutral`),
  `CategorySelect`, casilla `Uncategorized` y botón `Clear filters` (solo si
  `hasActiveFilters`).
  > **Nota — de dónde salen las cuentas del selector:** **no** se llama a
  > `GET /api/accounts`; ese endpoint no está en el alcance del `acceptance` de esta
  > feature. El selector se construye con las cuentas que aparecen
  > en `movements[].account` de la página cargada, más la cuenta seleccionada si viene
  > de la URL. Es suficiente para la cola (un puñado de cuentas propias) y no añade
  > una petición más. Si al probar resulta pobre, la alternativa (`GET /api/accounts`)
  > queda anotada en `decisions.md` ⚙️.
- **`MovementRow.vue`** (port de `TransactionRow.jsx`, `data-test="movement-row"`):
  fila flex con `rounded-md px-3 py-2.5 hover:bg-surface-hover`;
  **hueco a la izquierda reservado para la F16** (un `<span class="w-6 shrink-0">`
  vacío, comentado como tal: ahí irá la casilla de selección);
  punto de color `bg-chart-*` por categoría (índice estable = `category.id % 8`, o
  `bg-surface-sunken` sin categoría); descripción en `font-semibold text-ink-strong`
  truncada; segunda línea `text-xs text-ink-muted`: `bankLabel(bank) · alias` ·
  `formatDate(bookingDate)` · categoría (`BaseBadge` con `Uncategorized` en tono
  neutro cuando falta); a la derecha el importe en
  `font-mono tabular-nums font-semibold`, `text-positive` para `income`,
  `text-ink-strong` para `expense` (formateado desde `` `-${amount}` ``) y
  `text-ink-muted` para `neutral`.
- **`MovementList.vue`**: tarjeta (`BaseCard`); con `total === 0` pinta el estado
  vacío que le pasen por prop (`caughtUp` / `noMatches`) y **ninguna fila**.
- **`ReviewTotals.vue`**: `N movements` + tres cifras (`In`, `Out`, `Net`) en
  `font-mono tabular-nums`, `Net` en `text-positive` si es ≥ 0 y `text-negative` si no.
- **`ReviewPager.vue`**: `Previous` / `Next` (`BaseButton variant="secondary"`,
  deshabilitados en los extremos) y `Page X of Y`; no se pinta con `totalPages <= 1`.
- **`ReviewCountBadge.vue`**: `BaseBadge` con el número; `onMounted →
  store.refreshPendingCount()`. Vive en la barra lateral, que es `shared/`: la
  dependencia shared → feature ya tiene precedente (`AppShell` monta `ImportButton`).

**Iconos nuevos** (import por nombre): `ListChecks` (barra lateral), `Search`,
`ChevronLeft`, `ChevronRight`, `X` (ya usado por `BaseDialog`). Los nombres se
confirman en T0 contra `@lucide/vue`.

**Lo que NO se construye (F16):** casillas de selección, barra de acciones, botones
de confirmar o categorizar, menú por fila. El hueco de la izquierda de la fila y el
espacio bajo la barra de filtros quedan reservados y comentados.

## 9. Contraste: líneas `contrast:` nuevas en `theme-dark.css`

Ya medidas y reutilizables: `--ink-strong/--ink-body/--ink-muted/--ink-faint on
--surface-card`, `--positive/--negative on --surface-card`, `--ink-body on
--surface-hover`, `--ink-strong on --surface-hover`, `--ink-muted on --surface-hover`,
`--border-default on --surface-card` (campos), `--chart-* on --surface-card` (punto de
categoría), `--ink-body on --surface-sunken` (badge neutro), `--brand on
--surface-card` (foco).

Se añaden (valores a confirmar por el test en T0):

```
contrast: --ink-strong on --surface-hover >= 4.5 (movement description on a hovered row)   ← ya existe, se reetiqueta si hace falta
contrast: --positive on --surface-hover >= 4.5 (income amount on a hovered row)
contrast: --negative on --surface-hover >= 4.5 (negative net on a hovered row)
contrast: --ink-muted on --surface-card >= 4.5 (filter labels and row metadata)             ← ya existe
contrast: --ink-faint on --surface-card >= 4.5 (input placeholder)                          ← ya existe
contrast: --negative on --surface-card >= 4.5 (invalid search hint)                         ← ya existe
contrast: --ink-on-dark on --accent/15 over --surface-inverse >= 4.5 (Review count in the sidebar)
contrast: --accent on --surface-inverse >= 4.5 (Review count text, if painted in accent)
```

Si el recuento de la barra lateral no llega a 4,5:1 con el fondo tintado, se pinta con
`--ink-on-dark` sobre `--ink-on-dark/10` en vez de tocar ningún token; lo que se elija
queda escrito en su línea.

## 10. e2e

- **Humo (`e2e/app-boot.spec.ts`):** la barra lateral pide el recuento al montar; sin
  backend el proxy responde 502 y Chromium lo escribe como error de consola, que
  pondría rojo el smoke (misma lección que la F13). Se añade
  `page.route('**/api/movements*', route => route.fulfill({ json: { movements: [], pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 }, totals: { income: '0.00', expense: '0.00', net: '0.00' } } }))`.
  **T0 comprueba primero que sin esa ruta el smoke se pone rojo**, para no añadir
  código sin motivo.
- **`e2e/review-queue.spec.ts` (nuevo, chromium):** con `page.route` para
  `/api/movements*` (respuesta según la querystring) y `/api/categories`:
  1. la cola carga 3 filas, el total y los `totals`; la barra lateral muestra el número;
  2. `Next` pide `page=2` y la URL lo refleja; recargar esa URL mantiene la página;
  3. escribir `cafeteria` en el buscador lanza **una** petición con `q=cafeteria` y
     deja una fila (`CAFETERÍA CENTRAL`); borrar el texto vuelve a la cola completa;
  4. marcar `Uncategorized` manda `uncategorized=true` y **nunca** `categoryId`.
  Sin errores de consola.

## 11. Alternativas descartadas (resumen)

| Alternativa | Por qué no |
|---|---|
| Sustituir el placeholder `/movements` por Review | El extracto de la E7 va a querer esa ruta y ese nombre; son dos pantallas distintas (cola de pendientes vs. histórico completo). Decisión 🔴 nº 1. |
| Filtros solo en memoria | Recargar o volver atrás perdería lo que estabas mirando, que es un punto explícito del intent. |
| Buscar solo al pulsar Intro | Más predecible, pero obliga a un gesto extra en la operación más repetida; el debounce de 350 ms con descarte de respuestas obsoletas cubre el riesgo de carreras. Decisión 🔴 nº 4. |
| `pageSize` seleccionable (50/100/200) | Un control más en una barra ya cargada, y un parámetro más que sincronizar con la URL; 100 sirve para el caso real. |
| Recuento de pendientes con `GET /api/overview` | No separa por estado de revisión; habría que derivarlo y podría no cuadrar. |
| Cargar `GET /api/accounts` para el selector de cuenta | Una petición y un endpoint más fuera del acceptance; las cuentas de la página bastan para la cola (§8). |
| Scroll infinito en vez de páginas | El contrato pagina y devuelve `total` y `totals` por filtro; el scroll infinito los deja sin sitio y complica volver a donde estabas. |
| Librería de tabla / data-grid | Dependencia nueva prohibida por el intent y por `docs/architecture.md`; la fila es un port del design system. |
