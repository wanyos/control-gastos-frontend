# Design — Feature 18: rule-match-preview

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, tipos propios por feature, ADR-002 en la frontera, dependencias
> entre features en un solo sentido) y en `docs/conventions.md` (inglés, solo oscuro
> con alias semánticos y líneas `contrast:`, `money.ts` para fechas e importes, sin
> `@apply`). Aquí van solo los puntos donde la feature roza esas reglas.
>
> **Construye dentro de la F17, que está cerrada:** el diálogo de regla
> (`RuleDialog.vue`) es el mismo para crear desde Review y para editar desde Rules, así
> que la previsualización se cuelga de él **una vez** y aparece en los dos sitios (R11).

## 1. La pieza que hay que mover a `shared/`

La previsualización necesita leer `GET /api/movements`, y eso hoy vive en
`src/features/review/service.ts`. Pero `category-rules` **no puede importar de
`review`**: el sentido de la dependencia es `review` → `category-rules` (la F17 lo
dejó escrito en `architecture.md`) y darle la vuelta cerraría un ciclo.

Se aplica la misma regla que con las categorías en la F17: **la pieza que necesitan
las dos se mueve a `shared/`**. Se crea `src/shared/movements.ts` con **solo la parte
de lectura**:

| Se mueve a `src/shared/movements.ts` | Se queda en `features/review/` |
|---|---|
| `MOVEMENTS_PATH`, `MovementQuery`, `MovementPage`, `Movement`, `MovementAccount`, `MovementCategory`, `Pagination`, `Totals`, `MovementType`, `MovementStatus`, `DecimalString`, `DateOnly` | `MovementChanges`, `BulkUpdate`, `BulkResult`, `UndoGroup`, `LastAction`, `ReviewFilters` |
| `buildMovementsQuery`, `parseMovement`, `parseMovementPage`, `getMovements` | `updateMovement`, `updateMovements`, `parseUpdatedMovement`, `parseBulkResult`, `changesBody`, `patch` |
| `SEARCH_DEBOUNCE_MS = 350` (la espera compartida) | `PAGE_SIZE`, `QUEUE_STATUS`, `searchTerm`, `toQuery`, `toRouteQuery`, `fromRouteQuery`, `hasActiveFilters` |

`review/types.ts`, `review/service.ts` y `review/filters.ts` **re-exportan** lo movido
con el mismo nombre, exactamente como hicieron con `Category` y `getCategories`: ningún
import ni test de las F15/F16/F17 cambia (C4).

*Alternativa descartada:* declarar en `category-rules` un tipo y un parser propios para
los cinco campos que pinta (fecha, concepto, importe) y no mover nada. Son ~60 líneas de
guardas duplicadas de un endpoint que ya está parseado a dos carpetas de distancia, y
dos sitios que corregir cuando el contrato se mueva. La F17 aceptó una duplicación
parecida (`parseApplyResult` frente a `parseCategorization`) porque eran **endpoints
distintos**; aquí es literalmente el mismo.

## 2. Archivos

**Nuevos**

- `src/shared/movements.ts` — el traslado de §1 (código existente, sin cambios).
- `src/features/category-rules/components/RuleMatchPreview.vue` — el bloque que se
  pinta dentro del diálogo: recuento, avisos, hasta 5 ejemplos, spinner y error.
- `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts`
- `src/shared/__tests__/movements.spec.ts` (o el `service.spec.ts` de review reapuntado)

**Modificados**

- `src/features/category-rules/rules.ts` — umbrales, textos y el algoritmo nuevo de
  `proposeMatchText` (R13-R15).
- `src/features/category-rules/types.ts` — el tipo `MatchPreview`.
- `src/features/category-rules/store.ts` — estado `preview` + acción `previewMatches`.
- `src/features/category-rules/components/RuleDialog.vue` — temporizador de 350 ms,
  emisión `preview`, y el bloque `RuleMatchPreview` montado bajo el campo de texto.
- `src/features/category-rules/views/RulesView.vue` y
  `src/features/review/views/ReviewView.vue` — enganchan `@preview` al store y pasan
  `:preview`.
- `src/features/review/{service.ts,types.ts,filters.ts}` — re-exports (§1).
- `e2e/category-rules.spec.ts` — un escenario nuevo; `docs/architecture.md` — el árbol
  y la nota de `shared/movements.ts`.

**No se tocan:** `service.ts` de `category-rules` (ninguna llamada nueva de escritura),
`actions.ts`, el store de `review`, `RuleList`, `RuleRow`, `ApplyRulesDialog`,
`ApplyResult`, el router ni el backend.

## 3. Firmas nuevas

```ts
// src/features/category-rules/rules.ts
export const PREVIEW_SAMPLE_SIZE = 5
export const BROAD_MATCH_LIMIT = 50
export const MAX_PREVIEW_TEXT = 100          // el tope de `q` del contrato
export const MAX_PROPOSAL_WORDS = 4

/** True cuando el texto se puede consultar: >= 3 normalizado y <= 100 tal cual (R2). */
export function canPreview(text: string): boolean

/** El filtro exacto que se pide; nunca lleva `categoryId` (sería un 400 con `uncategorized`). */
export function previewQuery(text: string, kind: CategoryKind): MovementQuery

/** «34 pending movements without a category contain this text.» (R3) */
export function matchCountLine(total: number): string

/** El aviso de R5 / R6, o null si el número no pide ninguno. */
export function matchWarning(total: number): string | null

/** La frase en inglés de una consulta que falló (R10). */
export function previewErrorMessage(error: AppError): string
```

```ts
// src/features/category-rules/types.ts
export type MatchPreview =
  | { step: 'idle' }
  | { step: 'loading'; text: string }
  | { step: 'ready'; text: string; total: number; samples: Movement[] }
  | { step: 'failed'; text: string; message: string }
```

```ts
// src/features/category-rules/store.ts  (dentro del setup store)
const preview = ref<MatchPreview>({ step: 'idle' })
async function previewMatches(text: string, kind: CategoryKind, client?: HttpClient): Promise<void>
function clearPreview(): void
```

```vue
<!-- RuleMatchPreview.vue -->
defineProps<{ preview: MatchPreview }>()
<!-- RuleDialog.vue -->
defineEmits<{ save: [NewRule]; cancel: []; preview: [string] }>()
defineProps<{ …lo de hoy…; preview?: MatchPreview }>()
```

## 4. El camino, paso a paso

1. `RuleDialog` observa su `text` (y el `open`). Con cada cambio arma un
   `setTimeout(…, SEARCH_DEBOUNCE_MS)` que cancela el anterior — calcado del
   temporizador de `ReviewFilterBar.vue:144` — y emite `preview(text)`. **Al abrirse
   emite sin esperar** (R11). Si `canPreview(text)` es falso, en vez de emitir, emite
   la cadena vacía: la vista llama a `clearPreview()` y no sale ninguna petición (R2).
2. La vista (`ReviewView` o `RulesView`) llama a
   `rulesStore.previewMatches(text, kind)` con el `kind` que ya le pasa al diálogo.
3. El store incrementa un contador interno `previewToken`, se queda con su valor, pone
   `preview = { step: 'loading', text }` y llama a
   `getMovements(previewQuery(text, kind))`. **Al volver, si el token ya no es el
   suyo, descarta la respuesta y no toca el estado** (R8) — el mismo patrón de
   «la última gana» que usa la cola, pero explícito porque aquí las teclas llegan más
   rápido que la red.
4. Éxito → `{ step: 'ready', text, total: pagination.total, samples: movements }`.
   Fallo → `{ step: 'failed', text, message: previewErrorMessage(toAppError(e)) }`.
   El store **nunca lanza** (patrón de net-worth).
5. `RuleMatchPreview` pinta el estado. El botón de guardar **no mira nunca al
   `preview`**: sigue dependiendo solo de `isTooShort` y de la categoría elegida
   (R7, R9).
6. `clearPreview()` también corre al cerrar el diálogo y tras un guardado correcto:
   el siguiente movimiento no hereda el recuento del anterior.

## 5. Por qué el número es una estimación honesta (y no una promesa)

La previsualización pregunta por la **búsqueda `q`** del backend; aplicar usa las
**reglas**. Los dos normalizan igual (NFD, sin marcas, minúsculas, `trim`, espacios
interiores intactos) y los dos comparan con «contiene» sobre `description`, así que el
conjunto casi siempre coincide. **Dónde puede no coincidir**, y hay que decirlo en la
interfaz con una línea (§6) en vez de esconderlo:

| Motivo | Efecto en el número |
|---|---|
| Otra regla, de otra categoría, casa con los mismos movimientos → `conflicts`, y apply los deja **sin categoría** | cuenta **de más** |
| Al **editar** una regla, lo que esa regla ya categorizó no está «sin categoría» | cuenta **de menos** que lo que la regla abarca de verdad |
| Entre mirar y aplicar entran movimientos nuevos (importación) o salen (los categorizas a mano) | cuenta de más o de menos |
| Apply nunca toca `neutral` ni cruza `kind`/`type` | **mitigado**: se pide `type=<kind>` (R1) |
| `q` es 2-100 caracteres; `matchText` es ≥3 sin tope | por debajo/encima **no se consulta** (R2), pero se puede guardar |
| El backend normaliza `q` con una lista explícita de acentos y las reglas con `normalizeForMatch`; un carácter fuera de esa lista (`ø`, `đ`) podría tratarse distinto | caso de laboratorio; no se compensa |

Por eso el recuento se redacta en presente y sobre lo que se mira hoy («contain this
text»), nunca como «se van a categorizar N».

## 6. Umbrales y textos (todos en inglés, todos en `rules.ts`)

| Constante | Valor | Por qué |
|---|---|---|
| `SEARCH_DEBOUNCE_MS` | 350 ms | Ya es la espera de la búsqueda de Review; dos esperas distintas en la misma app serían ruido. |
| `PREVIEW_SAMPLE_SIZE` | 5 | Caben en el diálogo sin scroll propio y bastan para reconocer el patrón. |
| `BROAD_MATCH_LIMIT` | 50 | Ver procedencia de R5. |
| `MAX_PROPOSAL_WORDS` | 4 | Tope duro para que el crecimiento de §7 no se lleve media línea. |

- Recuento: `34 pending movements without a category contain this text.`
  (singular: `1 pending movement without a category contains this text.`)
- Amplio (> 50, en `text-warning` sobre `bg-warning-subtle`):
  `That is a lot — check the examples below before you save.`
- Ninguno (0, en `text-ink-muted`): `Nothing pending without a category contains this text right now.`
- Nota fija bajo el recuento, en `text-ink-faint`, `text-2xs`:
  `Estimate: what a pass would look at today, not what it will change.`
- Error (R10): `Couldn't reach the server, so the count is unknown.` (red) /
  `The server answered, but the count couldn't be read.` (ValidationError) /
  `The backend rejected that search.` (400) / `Couldn't check how many match.` (resto).
  Nunca el `message` del backend, que viene en español.

## 7. La propuesta de texto: qué cambia en `proposeMatchText`

Hoy el algoritmo es: normaliza, salta las palabras de trámite (`BANK_BOILERPLATE`), las
de menos de 3 letras y las que llevan dígitos; coge la primera que queda y **crece
mientras no llegue a 6 caracteres**. El fallo que ve el humano es que 6 caracteres no
distinguen una marca de una palabra común: `servicios` mide 9 y se queda sola.

**Dos listas nuevas, un criterio de parada nuevo:**

1. `BANK_BOILERPLATE` **se amplía** con palabras de canal y de terminal de cobro
   (R13): `tpv`, `virtual`, `online`, `internet`, `web`, `terminal`, `comercio`,
   `efectivo`, `ingreso`, `ingresos`, `nomina`, `liquidacion`, `orden`, `envio`. Solo
   afectan a la **búsqueda de la primera palabra**, como las de hoy.
2. `GENERIC_WORDS` **es nueva**: palabras que sí son parte del nombre pero no lo
   identifican. Dos familias, escritas a mano y sin mirar ningún extracto real:
   - negocio: `servicios`, `servicio`, `grupo`, `centro`, `comercial`, `comerciales`,
     `distribuciones`, `distribucion`, `sociedad`, `hermanos`, `hijos`, `nuevo`,
     `nueva`, `gran`, `general`, `iberica`, `espana`, `europa`, `global`, `sistemas`,
     `soluciones`, `asociados`, `gestion`, `promociones`, `inversiones`;
   - nombres de pila: `juan`, `jose`, `maria`, `antonio`, `manuel`, `francisco`,
     `luis`, `carlos`, `miguel`, `angel`, `david`, `javier`, `jesus`, `pedro`,
     `rafael`, `fernando`, `sergio`, `pablo`, `jorge`, `alberto`, `alejandro`,
     `daniel`, `raul`, `ruben`, `victor`, `ivan`, `andres`, `adrian`, `alvaro`,
     `diego`, `mario`, `oscar`, `roberto`, `ramon`, `santiago`, `tomas`, `vicente`,
     `ana`, `carmen`, `laura`, `marta`, `lucia`, `elena`, `isabel`, `rosa`,
     `cristina`, `pilar`, `sara`, `paula`, `julia`.
3. **Se crece mientras** (a) el texto acumulado no llegue a `MIN_PROPOSAL_LENGTH` (6)
   —el criterio de hoy, que salva `mega deportes`— **o** (b) la última palabra añadida
   esté en `GENERIC_WORDS`. Se para igual que hoy ante una palabra con dígitos o no
   alfabética, al acabarse el concepto, y además a las `MAX_PROPOSAL_WORDS` palabras.
   El corte sigue siendo **verbatim sobre el normalizado**, así que la propuesta
   siempre está contenida en el concepto.

Tabla de verificación (va tal cual a los tests, R13-R15):

| Concepto | Hoy | Con la regla nueva |
|---|---|---|
| `AB Servicios Selecta E` | `servicios` | **`servicios selecta`** |
| `TPV VIRTUAL` | `tpv virtual` | `tpv virtual` (ninguna palabra queda → concepto entero, como hoy) |
| `TPV VIRTUAL 1234 AMAZON MARKETPLACE` | `tpv virtual` | **`amazon`** |
| `JUAN JOSE ROMERO RAMOS - INGRESO` | `juan jose` | **`juan jose romero`** |
| `RECIB /IBERDROLA CLIENTES, S.A` | `iberdrola` | `iberdrola` (igual) |
| `COMPRA TARJ. MERCADONA` | `mercadona` | `mercadona` (igual) |
| `MEGA DEPORTES` | `mega deportes` | `mega deportes` (igual) |
| `TULOTERO` | `tulotero` | `tulotero` (igual) |

*Alternativa descartada:* deducir lo genérico **del propio historial** (pedir el
recuento de cada palabra candidata y quedarse con la menos frecuente). Acierta sin
listas escritas a mano, pero son N peticiones por cada diálogo que se abre, y la
propuesta dejaría de ser una función pura verificable con una tabla. Con la
previsualización delante, la lista a mano basta: el número desmiente al algoritmo en
el acto.

## 8. Estilo y accesibilidad

El bloque vive dentro de `BaseDialog`, bajo `BaseInput`, separado con
`border-t border-line-subtle pt-3`. Ejemplos en una lista `text-sm` con el concepto en
`text-ink-body` (`lang="es"`, como `rule-source`), fecha e importe en `text-ink-muted`
`font-mono tabular-nums` vía `formatDate` / `formatMoney` de `@/shared/money`. Spinner:
`BaseSpinner`. `data-test`: `rule-preview`, `rule-preview-count`, `rule-preview-warning`,
`rule-preview-sample`, `rule-preview-error`. El único par de color nuevo es
`--warning on --surface-card`: si no tiene línea `contrast:` en `theme-dark.css`, se
añade (T0 lo mide antes de escribir nada).

## 9. Tests

- `rules.spec.ts`: `canPreview`, `previewQuery` (los seis parámetros y que **nunca**
  lleva `categoryId`), `matchCountLine` (singular/plural), `matchWarning` (0, 1, 50,
  51), `previewErrorMessage` (red, 400, ValidationError, genérico) y la **tabla entera
  de §7**.
- `store.spec.ts`: la consulta sale con el filtro esperado; la respuesta tardía de una
  consulta vieja **no** pisa a la nueva (R8); el fallo deja `failed` y no lanza; el
  store no hace ninguna llamada con `canPreview` falso.
- `RuleDialog.spec.ts`: con temporizadores falsos, una ráfaga de teclas emite **un**
  `preview`; al abrir emite sin esperar; por debajo de 3 no emite texto; el botón de
  guardar sigue habilitado con el aviso de amplitud (R7) y con `loading` (R9).
- `RuleMatchPreview.spec.ts`: los cuatro estados, los cinco ejemplos como máximo y los
  dos avisos.
- e2e (`e2e/category-rules.spec.ts`, con la red de seguridad que aborta todo `/api` no
  previsto): abrir el diálogo desde una fila de Review, escribir, ver el recuento y los
  ejemplos, y comprobar que **ninguna** petición interceptada usa un método distinto de
  `GET` (C1).
