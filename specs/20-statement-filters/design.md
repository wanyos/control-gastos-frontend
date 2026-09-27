# Design — Feature 20: statement-filters

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` (una pieza que necesitan dos features vive en
> `shared/`; el estado en un store de Pinia que **nunca lanza**; la frontera se
> valida, ADR-002) y en `docs/conventions.md`. Solo documenta los puntos donde
> esta feature roza esas reglas.

## 1. La decisión de fondo: se comparte el cerebro, se copia la cara

La cola de revisión (F15) ya tiene barra de filtros, espera tras la última
tecla, guardas de `q`, exclusión categoría ↔ «sin categoría» y lectura de
filtros desde la URL. Hay tres caminos y se eligen **los dos a la vez, cada uno
donde toca**:

1. **La lógica pura se mueve a `shared/`** y `review/filters.ts` la re-exporta,
   exactamente como la F17 hizo con las categorías y la F18 con la lectura de
   movimientos: `review/` **no cambia de comportamiento** y su suite pasa sin
   tocarla (C4). Lo que se mueve es lo que las dos pantallas necesitan letra por
   letra: `SEARCH_MIN`, `SEARCH_MAX`, `SEARCH_TOO_LONG`, `searchTerm` y los dos
   ayudantes de querystring (`firstQueryValue`, `positiveIntegerQuery`).
2. **El componente `ReviewFilterBar.vue` NO se comparte.** Para servir a las dos
   pantallas necesitaría condicionar cuatro de sus controles (tipo, desde,
   hasta) y cambiar de dónde salen las cuentas: cada retoque futuro del extracto
   pasaría por el componente del que dependen la F15 y la F16. El extracto
   estrena `StatementFilterBar.vue` con **sus cuatro controles** y reutiliza las
   piezas de presentación que ya son genéricas (`BaseInput`, `BaseSelect`,
   `BaseCheckbox`, `BaseButton`).
3. **`CategorySelect.vue` se copia** a `features/statement/components/` (23
   líneas de plantilla) porque hoy vive en `features/review/` y el extracto no
   puede importar de ahí (C3). No se mueve a `shared/components/` para no
   arrastrar un componente con vocabulario de filtro («All categories») al
   cajón de los componentes base; si una tercera pantalla lo necesita, ese será
   el momento.

**Alternativa descartada:** compartir el componente entero con props
`showType`/`showDates`/`accountsSource`. Ahorra unas 60 líneas de plantilla y
pone en riesgo dos features cerradas cada vez que el extracto cambie.
**Segunda alternativa descartada:** copiar también `filters.ts` completo —
duplicaría las guardas de `q`, que son las que tienen que casar al carácter con
el contrato.

## 2. Archivos

**Nuevos**

| Archivo | Qué contiene |
|---|---|
| `src/shared/movement-filters.ts` | Lo común de los filtros de movimientos: límites y guardas de `q` y los ayudantes de querystring. Sin estado, sin HTTP. |
| `src/shared/accounts.ts` | `ACCOUNTS_PATH`, `AccountSummary`, `parseAccounts`, `getAccounts`. Solo lectura. |
| `src/features/statement/filters.ts` | `StatementFilters`, `EMPTY_FILTERS`, `hasActiveFilters`, `monthQuery` (mudada de `months.ts` y ampliada con los filtros), `toRouteQuery`, `fromRouteQuery`, y las frases de R5 y R13. |
| `src/features/statement/components/StatementFilterBar.vue` | Los cuatro controles + `Clear filters`. Tonto: no guarda filtros, emite el juego completo. |
| `src/features/statement/components/StatementCategorySelect.vue` | Copia de `review/components/CategorySelect.vue` (§1.3). |
| `src/features/statement/__tests__/filters.spec.ts` | Tests de la lógica pura. |
| `src/features/statement/__tests__/StatementFilterBar.spec.ts` | Tests del componente. |
| `src/shared/__tests__/accounts.spec.ts` | Tests del parser y del cliente de cuentas. |
| `src/shared/__tests__/movement-filters.spec.ts` | Tests de las guardas movidas (se mueven los casos que hoy viven en `review/__tests__/filters.spec.ts`; **los de review se quedan igual**, prueban el re-export). |

**Modificados**

| Archivo | Cambio |
|---|---|
| `src/features/review/filters.ts` | Borra `searchTerm`, `SEARCH_MIN`, `SEARCH_MAX`, `SEARCH_TOO_LONG` y los dos ayudantes de querystring; los **importa y re-exporta** de `shared/movement-filters`. Nada más. |
| `src/features/statement/months.ts` | Sale `monthQuery` (se va a `filters.ts`, que ya conoce los filtros). Entra `noMatchesLine(month)` junto a `emptyMonthLine`. `STATEMENT_PAGE_SIZE` se queda aquí. |
| `src/features/statement/store.ts` | Estado nuevo: `filters`, `accounts`, `accountsFailed`, `categories`, `categoriesFailed`. `show(month, filters?)`, `applyFilters`, `loadAccounts`, `loadCategories`. `loadRun` sigue descartando respuestas viejas. |
| `src/features/statement/types.ts` | Re-export de `AccountSummary` y `Category` desde `shared/`. |
| `src/features/statement/views/StatementView.vue` | La URL pasa a ser la única escritora de **mes + filtros**: `watch` sobre `route.query` entero, `replace` al cambiar un filtro, `push` al cambiar de mes (conservando los filtros), montaje de la barra y cálculo del estado vacío. |
| `src/features/statement/components/MonthTotals.vue` | Prop nueva `scope?: string`: la línea de R5. La nota permanente **no se toca**. |
| `src/features/statement/components/StatementList.vue` | Prop `emptyState: 'month' \| 'noMatches'` y evento `clear`. |
| `e2e/statement.spec.ts` | Dos escenarios nuevos (filtrar + URL con combinación imposible). |

## 3. Firmas nuevas

```ts
// src/shared/movement-filters.ts
export const SEARCH_MIN = 2
export const SEARCH_MAX = 100
export const SEARCH_TOO_LONG: string
export function searchTerm(q: string): { value?: string; error?: string }
export function firstQueryValue(value: LocationQuery[string] | undefined): string | undefined
export function positiveIntegerQuery(value: LocationQuery[string] | undefined): number | undefined

// src/shared/accounts.ts
export const ACCOUNTS_PATH = '/api/accounts'
export interface AccountSummary { id: number; iban: string; bank: string; alias: string; type: string }
export function parseAccounts(raw: unknown): AccountSummary[]
export function getAccounts(client?: HttpClient): Promise<AccountSummary[]>

// src/features/statement/filters.ts
export interface StatementFilters {
  accountId: number | null
  categoryId: number | null
  uncategorized: boolean
  q: string
}
export const EMPTY_FILTERS: StatementFilters
export function hasActiveFilters(filters: StatementFilters): boolean
export function monthQuery(month: MonthKey, filters: StatementFilters, page?: number): MovementQuery
export function toRouteQuery(month: MonthKey, filters: StatementFilters): LocationQueryRaw
export function fromRouteQuery(query: LocationQuery, now?: Date): { month: MonthKey; filters: StatementFilters }
export function filterScopeLine(
  filters: StatementFilters,
  total: number,
  month: MonthKey,
  names: { account?: string; category?: string },
): string
export function noMatchesLine(month: MonthKey): string
```

`parseAccounts` valida **solo los cinco campos que el desplegable usa** y
**ignora** `balance`, `initialBalance`, `balanceAnchor`, `balanceAnchorDate`,
`createdAt` y `updatedAt`: pedir menos es menos superficie de rotura, y
`net-worth` seguirá con su propio parser para su propia respuesta.

## 4. El camino, paso a paso

1. `StatementView` monta → `fromRouteQuery(route.query)` da mes + filtros →
   `store.show(month, filters)`; en paralelo `store.loadAccounts()` y
   `store.loadCategories()` (una vez por sesión, con su propio guardia).
2. El usuario toca un control → la barra emite `change` con el juego completo →
   la vista hace `router.replace({ query: toRouteQuery(month, next) })`.
3. El `watch` de `route.query` recarga: `show(month, filters)` limpia `extra`,
   pone `page = 0` y pide la página 1 (R3).
4. `MonthNav` emite un mes → `router.push({ query: toRouteQuery(next, filters) })`
   (R12: el mismo objeto de filtros).
5. `Load more` sigue pidiendo `monthQuery(month, filters, page + 1)`: la
   paginación vive **dentro** del filtro.
6. La respuesta se pinta: `MonthTotals` con `totals` y, si
   `hasActiveFilters`, con la línea de alcance; `StatementList` con los días o
   con la frase vacía que toque.

## 5. La combinación imposible no sale nunca del cliente

Tres barreras, en este orden:

1. **La barra**: elegir categoría desmarca «sin categoría» y al revés (R9),
   igual que `ReviewFilterBar.onCategory`/`onUncategorized`.
2. **`fromRouteQuery`**: con `uncategorized=true` en la URL, `categoryId` se lee
   como `null`, gane quien gane en el orden del texto (R10). Un `account` o
   `category` que no sea entero positivo se lee como `null`; una `q` de más de
   100 caracteres se lee como `''`.
3. **`buildMovementsQuery`** (ya existe en `shared/movements.ts`): si por lo que
   sea llegaran los dos, `uncategorized` gana y `categoryId` no se escribe.

Un `accountId` o `categoryId` **que no existe** sí puede llegar de una URL vieja:
eso es un **404** legítimo del contrato y se pinta como error con el botón de
quitar filtros, reutilizando el criterio de `reviewErrorMessage`. Se amplía
`statementErrorMessage` para devolver, además del texto, qué botón ofrecer:

```ts
export function statementErrorMessage(error: AppError): { message: string; action: 'clear' | 'retry' }
```

- `404` → `'That account or category no longer exists.'` + `clear`.
- `400` → `'The backend rejected these filters.'` + `clear` (con filtros) o
  `'The backend rejected that month.'` + `retry` (sin filtros).
- resto → como hoy, con `retry`.

## 6. Textos (inglés, todos en `filters.ts` salvo los rótulos fijos)

| Sitio | Texto |
|---|---|
| Rótulos | `Search`, `Account`, `Category`, `Uncategorized`, `Clear filters` |
| Ayuda de la búsqueda | `Searches the description, ignoring case and accents` |
| Aviso de longitud | `Search is limited to 100 characters` (el de `shared/movement-filters`) |
| Alcance (R5) | `12 movements match these filters in March 2026 · Uncategorized · Account bankinter ···0236 · "luz"` |
| Vacío con filtros (R13) | `No movements match these filters in March 2026.` + botón `Clear filters` |
| Vacío sin filtros | `No movements in March 2026.` (el de la F19, intacto) |
| Cuentas caídas (R15) | `Accounts unavailable` (paralelo a `Categories unavailable`) |

La **nota permanente** de `MonthTotals.vue` no cambia ni una palabra: su ejemplo
de julio de 2026 habla de un mes entero y seguiría siendo cierto. Lo que cambia
es que, con filtros puestos, la línea de alcance dice sobre qué se han calculado
las cifras, así que la nota no queda desmentida.

## 7. Estilo, accesibilidad y `data-test`

- `data-test`: `statement-filters`, `statement-search`, `filter-account`
  (dentro de la barra del extracto), `filter-category`,
  `filter-uncategorized`, `clear-filters`, `statement-scope`,
  `statement-no-matches`. Los de la F19 no se renombran.
- La barra va entre `MonthNav` y `MonthTotals`: primero el mes, luego cómo se
  afina, luego las cifras de lo que queda.
- Sin colores nuevos: todo con los alias ya presentes, así que
  `theme-dark.css` no se toca (se verifica en la T0).
- Cada `select` y cada `input` con su `label` propio de los componentes base.

## 8. Tests

- **`filters.spec.ts`**: `monthQuery` con cada filtro y con ninguno (y que
  **nunca** lleva `status`, `type` ni las dos claves de categoría juntas);
  `toRouteQuery` omite los filtros vacíos y siempre escribe `month`;
  `fromRouteQuery` con URL limpia, con `category`+`uncategorized`, con basura,
  con `q` de 101 caracteres y con mes inválido; `filterScopeLine` con uno y con
  varios filtros; singular/plural del recuento.
- **`movement-filters.spec.ts`**: los tres casos de `searchTerm` (corta, válida,
  101 caracteres con espacios) y los ayudantes de querystring.
- **`accounts.spec.ts`**: parseo de las 5 cuentas, `ValidationError` con un `id`
  que no es entero, y que `getAccounts` pega a `/api/accounts` con `GET`.
- **`store.spec.ts`** (ampliado): la query que sale con filtros, `applyFilters`
  que vacía `extra` y vuelve a la página 1, cambio de mes que conserva filtros,
  respuesta tardía descartada, fallo de cuentas que solo apaga su desplegable.
- **`StatementFilterBar.spec.ts`**: los cuatro controles y ninguno más (test
  explícito de que no hay `filter-type`, `filter-from` ni `filter-to`), el
  temporizador con `vi.useFakeTimers()`, la exclusión en los dos sentidos,
  `Clear filters` que solo aparece con filtros activos.
- **`StatementView.spec.ts`** (ampliado): URL con filtros al montar, `replace`
  al filtrar y `push` al cambiar de mes, las dos frases de vacío, el 404 con
  `Clear filters`, y la nota permanente presente **con** filtros.
- **e2e**: filtrar por «sin categoría» dentro de un mes y ver cambiar las tres
  cifras y el recuento; entrar con `?month=…&category=3&uncategorized=true` y
  comprobar que la petición que sale **no** lleva `categoryId`. Todas las
  llamadas interceptadas, con la red de seguridad que aborta `**/api/**`.
