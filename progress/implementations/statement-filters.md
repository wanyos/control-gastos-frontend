# Informe de implementación — F20 `statement-filters`

- **Feature:** 20 — Filtrar y buscar dentro del mes del extracto (segunda rodaja de la E7)
- **Spec:** `specs/20-statement-filters/` (15 requisitos, 5 🔴 aprobadas por el humano
  el 2026-09-27 sin cambios)
- **Agente:** implementer — 2026-09-27
- **Tasks:** T0–T16 en `[x]`. **T17 no es del implementer** (comprobación con el humano
  delante contra el backend real de `:3000`); queda pendiente y no bloquea.
- **Dependencias nuevas:** ninguna. **`theme-dark.css` no se toca.**
- **Backend:** no se toca. Solo lectura: ni un `POST`, `PATCH` ni `DELETE`.

---

## 1. Qué se construyó

En `/movements` aparece una barra con **cuatro controles** entre la navegación de meses
y las cifras: búsqueda por concepto (350 ms tras la última tecla), cuenta, categoría y
casilla «sin categoría». Los filtros afinan el mes, viajan en la **misma petición** que
`from`/`to`, y las tres cifras y el recuento siguen siendo los que calcula el backend,
ahora sobre lo filtrado. Debajo de las cifras hay una línea nueva que dice qué se ha
filtrado y cuántos son. El mes y los filtros viven **solo en la URL** (`?month=` de la
F19 + `account`, `category`, `uncategorized`, `q`, las mismas claves de la cola).

Las 5 🔴 tal cual:

1. **Barra partida:** la lógica pura (`SEARCH_MIN`, `SEARCH_MAX`, `SEARCH_TOO_LONG`,
   `searchTerm`, `firstQueryValue`, `positiveIntegerQuery`) se muda a
   `src/shared/movement-filters.ts` y `review/filters.ts` la **re-exporta**; el extracto
   estrena su propia `StatementFilterBar.vue` con cuatro controles y **ningún** control
   de tipo, estado ni fechas. **Ningún test de la F15/F16 cambió de contenido.**
2. **Cifras con el mismo nombre** (`Money in` / `Money out` / `Difference`) y una línea
   de alcance con el recuento del propio filtro; no se pide el mes sin filtrar.
3. **URL con categoría y «sin categoría» a la vez:** se corrige en el cliente antes de
   pedir nada (gana «sin categoría»), con tres barreras (barra → `fromRouteQuery` →
   `buildMovementsQuery`). El 400 del contrato **no puede verse nunca**.
4. **Desplegables completos:** `GET /api/accounts` (nuevo cliente en `shared/`) y
   `GET /api/categories`, una petición por sesión cada uno; si una falla se apaga **solo
   ese** desplegable.
5. **«Sin categoría» arranca apagado.**

La **nota permanente de la F19 no cambió ni una palabra** y sigue sin poder cerrarse,
también con filtros puestos (test explícito comparando el texto con y sin filtros).

## 2. Archivos

**Nuevos**

| Archivo | Qué es |
|---|---|
| `src/shared/movement-filters.ts` | Las guardas de `q` y los dos lectores de querystring, movidos sin cambiarlos desde `review/filters.ts` |
| `src/shared/accounts.ts` | `ACCOUNTS_PATH`, `AccountSummary`, `parseAccounts` (solo los 5 campos del desplegable), `getAccounts` |
| `src/shared/__tests__/movement-filters.spec.ts` | 2 describes, 6 tests |
| `src/shared/__tests__/accounts.spec.ts` | 4 tests, con las 5 cuentas reales |
| `src/features/statement/filters.ts` | `StatementFilters`, `EMPTY_FILTERS`, `hasActiveFilters`, `monthQuery` (mudada de `months.ts` y ampliada), `toRouteQuery`, `fromRouteQuery`, `filterScopeLine`, `noMatchesLine` |
| `src/features/statement/components/StatementFilterBar.vue` | Los cuatro controles + `Clear filters`; tonta, emite el juego completo |
| `src/features/statement/components/StatementCategorySelect.vue` | Copia de `review/components/CategorySelect.vue` (design §1.3; C3) |
| `src/features/statement/__tests__/filters.spec.ts` | 25 tests de la lógica pura |
| `src/features/statement/__tests__/StatementFilterBar.spec.ts` | 16 tests del componente |

**Modificados**

| Archivo | Cambio |
|---|---|
| `src/features/review/filters.ts` | Importa y re-exporta las 4 constantes/función de `q` y usa los dos ayudantes de `shared/`. Nada más; su suite (240 tests) pasa **sin tocarla** |
| `src/features/statement/months.ts` | Sale `monthQuery`; `statementErrorMessage` devuelve `{ message, action }` con el 404 y el 400 con filtros |
| `src/features/statement/store.ts` | `filters`, `accounts`, `accountsFailed`, `categories`, `categoriesFailed`; `show(month, filters?)`, `applyFilters`, `loadAccounts`, `loadCategories` (guardia de una vez por sesión), `loadMore` con los filtros. Ninguna acción lanza |
| `src/features/statement/types.ts` | Re-export de `AccountSummary` y `Category` desde `shared/` |
| `src/features/statement/views/StatementView.vue` | La URL es la única escritora de **mes + filtros**: `watch` de `route.query` entero, `replace` al filtrar, `push` al cambiar de mes conservando filtros, barra entre `MonthNav` y `MonthTotals`, error con el botón que diga `statementErrorMessage`, carga de las dos listas al montar |
| `src/features/statement/components/MonthTotals.vue` | Prop `scope?: string` (la línea de R5) **fuera** de la nota permanente, que no se toca |
| `src/features/statement/components/StatementList.vue` | Prop `emptyState: 'month' \| 'noMatches'` con las dos frases y evento `clear` |
| `src/features/statement/__tests__/{fixtures,store,StatementView,MonthTotals,months}.spec.ts` | Ampliados (ver §4) |
| `e2e/statement.spec.ts` | `prepare` intercepta además `/api/accounts` y `/api/categories` y responde un mes filtrado; **2 escenarios nuevos** |

## 3. Decisiones de implementación

- **`monthQuery` vive en `filters.ts`, no en `months.ts`:** la query de esta pantalla es
  «este mes Y estos filtros» en una sola petición, y `months.ts` no conoce filtros.
  `noMatchesLine` también se queda en `filters.ts`, junto a `filterScopeLine` (design §3;
  la tabla de «Modificados» del design la ponía en `months.ts` — se sigue la firma).
- **La línea de alcance va fuera de la nota permanente**, como manda el design §6: la
  nota habla de un mes entero y sigue siendo verdad; el alcance se dice aparte.
- **Los nombres de la cuenta y la categoría los resuelve la vista** (tiene las dos
  listas) y se pasan a `filterScopeLine`; un id sin nombre (cuenta borrada) se pinta como
  `Account #77`, no se inventa nada.
- **`statementErrorMessage(error, hasFilters)`**: el 404 siempre ofrece `Clear filters`
  (el id vino de la URL); el 400 ofrece `Clear filters` con filtros y `Try again` sin
  ellos. Mismo criterio que `reviewErrorMessage`.
- **El desplegable de cuentas conserva la cuenta elegida** aunque la lista no la traiga
  (URL vieja), igual que hace la cola.

## 4. Trazabilidad `R<n>` → test

| R | Qué exige | Test que lo fija |
|---|---|---|
| R1 | mes + filtros en la misma petición, `q` tal cual | `filters.spec.ts` «carries the month AND the filters in the same request», «sends the search trimmed and as typed»; `store.spec.ts` «carries the month and the filters in one request (R1, R4)»; `StatementView.spec.ts` «reads the filters of the URL and sends them with the month» |
| R2 | cuatro controles exactos, sin tipo/estado/fechas | `StatementFilterBar.spec.ts` «shows exactly four controls…», «has no type, no status and no date range control (R2)» |
| R3 | un filtro nuevo vuelve a la página 1 y tira `Load more` | `store.spec.ts` «applyFilters stays on the month and throws away what Load more brought (R3)», «Load more asks the next page with the filters put»; `StatementView.spec.ts` «a filter change throws away what Load more had brought (R3)» |
| R4 | las cifras son las de `totals` filtrado | `store.spec.ts` «carries the month and the filters in one request (R1, R4)» (los totales son los del backend, que no cuadran con las filas); `MonthTotals.spec.ts` «does not recompute anything…» |
| R5 | línea de alcance con el recuento del filtro | `filters.spec.ts` «names the count, the month and what was filtered, in that order», «falls back to the id…», «counts in singular and plural»; `MonthTotals.spec.ts` «says what the figures above were computed over»; `StatementView.spec.ts` «shows the scope line with the count of the filter…», «names the chosen category in the scope line», «has no scope line when nothing filters» |
| R6 | la nota permanente intacta con filtros | `MonthTotals.spec.ts` «leaves the permanent note word for word, and still undismissable (R6)»; `StatementView.spec.ts` «shows the scope line… and keeps the note (R5, R6)»; e2e «filtering inside the month…» |
| R7 | 350 ms, mínimo 2 sin error, aviso sobre 100 | `movement-filters.spec.ts` «does not travel under two characters…», «warns over a hundred characters…»; `StatementFilterBar.spec.ts` «waits 350 ms for the typing to stop…», «warns over a hundred characters and sends nothing (R7)» |
| R8 | mes y filtros solo en la querystring | `filters.spec.ts` «always writes the month…», «writes the same keys the review queue already uses», «never writes a page key»; `StatementView.spec.ts` «replaces the URL when a filter changes, without filling the history (R8)» |
| R9 | `categoryId` y `uncategorized` nunca juntos | `filters.spec.ts` «never carries both category keys: uncategorized wins (R9)», «never writes both category keys»; `StatementFilterBar.spec.ts` «picking a category clears Uncategorized…»; `store.spec.ts` «asks for uncategorized alone, never with a category (R9)» |
| R10 | URL imposible o basura, corregida en silencio | `filters.spec.ts` «drops the category when the URL also says uncategorized, before asking (R10)», «ignores rubbish in silence…», «drops a search of more than a hundred characters…»; `StatementView.spec.ts` «a URL with a category AND uncategorized never emits the forbidden request (R10)», «a 404 of a deleted account offers Clear filters, not Try again (R10)»; e2e «a URL with a category and uncategorized together never asks for both» |
| R11 | quitar todos los filtros conservando el mes | `StatementFilterBar.spec.ts` «offers Clear filters only when something is filtering, and clears the four (R11)»; `StatementView.spec.ts` «clearing from the empty state drops the filters and keeps the month (R11)»; e2e (clear deja `month=` intacto) |
| R12 | al cambiar de mes los filtros siguen puestos | `store.spec.ts` «keeps the filters when the month changes (R12)»; `StatementView.spec.ts` «keeps the filters when the month changes, and pushes that (R12)» |
| R13 | «no hay nada con estos filtros» ≠ mes vacío | `filters.spec.ts` «tells nothing matched apart from an empty month»; `StatementView.spec.ts` «tells a filter with no matches apart from an empty month (R13)»; e2e (frase de no-matches con `q=zzzz`); el mes vacío de la F19 sigue probado en «says an empty month in its own words» |
| R14 | desplegables con todo lo que existe, una petición por sesión | `accounts.spec.ts` (parseo + `GET` único); `store.spec.ts` «asks each list once per session and keeps every account and category»; `StatementFilterBar.spec.ts` «lists every account there is…», «lists the categories as a tree…»; `StatementView.spec.ts` «mounts the bar between the month nav and the figures, and asks both lists» |
| R15 | una lista caída apaga solo su desplegable | `store.spec.ts` «a failed account list only switches its own select off (R15)», «a failed category list…»; `StatementFilterBar.spec.ts` «a list that did not load (R15)» (2 tests); `StatementView.spec.ts` «a failed account list leaves the month and the rest of the bar working (R15)» |

**Restricciones**

- **C1 (solo lectura):** grep en `src/features/statement/` → ni `POST`, ni `PATCH`, ni
  `DELETE` (la única coincidencia es el campo `method: string` del registro de llamadas de
  `fixtures.ts`). Tests: `StatementView.spec.ts` «only ever reads…» (los tres paths son
  `/api/movements`, `/api/accounts`, `/api/categories`, todos `GET`), `store.spec.ts`
  (`api.methods()` = `['GET']`) y las dos aserciones e2e de método.
- **C2 (frontera):** `parseAccounts` con `createValidators`, `parseCategories` y
  `parseMovementPage` de `shared/`; ningún tipo paralelo.
- **C3 (un solo sentido):** grep → `src/features/statement/` no importa nada de
  `@/features/review`, y `review/` no importa nada de `statement/`.
- **C4 (F15–F19 sin cambios de comportamiento):** la suite de `review` (240 tests) pasa
  **sin tocar ni un test**. Ver las desviaciones de §6 para lo que sí se ajustó.
- **C5:** sin dependencias nuevas, todo en inglés, `theme-dark.css` intacto (las parejas
  de color de la barra ya tenían su línea `contrast:`).
- **C6:** puerta completa, §5.
- **C7 / T17:** pendiente, es del humano.

## 5. Puerta (último paso, 2026-09-27)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | ✅ sin errores |
| `pnpm lint` | ✅ `oxlint . --fix` limpio |
| `pnpm test:unit` | ✅ **78 ficheros, 1.135 tests** (antes 1.060; **+75**) |
| `pnpm build` | ✅ `dist/assets/index-*.js` 238,91 kB (76,93 kB gzip), CSS 31,76 kB |
| `pnpm test:e2e --project=chromium` | ✅ **23 tests** (antes 21; **+2**) en 9,9 s |
| `./init.sh` | ✅ «Entorno listo. Puedes empezar a trabajar.» |

Nota de entorno: los binarios de Playwright faltaban en la máquina (`Executable doesn't
exist… chromium_headless_shell-1243`) y se instalaron con
`pnpm exec playwright install chromium`, tal como documenta `docs/stack.md`. No es una
dependencia nueva.

Comprobación previa de la T0, hecha antes de escribir código: (a) `buildMovementsQuery`
ya descarta `categoryId` con `uncategorized: true`; (b) las parejas de color de la barra
ya tienen su línea `contrast:`; (c) `GET http://localhost:3000/api/accounts` devuelve las
**5 cuentas** reales con los cinco campos del contrato (lectura, sin escribir).

## 6. Desviaciones declaradas

1. **`months.spec.ts` cambió más de lo que preveía C4.** El spec admitía como única
   excepción los tests de `monthQuery` (que se mudan a `filters.spec.ts`). Además hubo que
   **reescribir las aserciones de `statementErrorMessage`**, porque la T6 cambia su firma
   a `{ message, action }`: es una consecuencia directa de una task del propio spec, no un
   cambio de comportamiento de la F19 (los cuatro mensajes anteriores siguen siendo
   literalmente los mismos; se añade el 404 y el 400 con filtros). Se sustituyó también
   el describe de `monthQuery` por uno que sigue fijando `STATEMENT_PAGE_SIZE = 200`.
2. **`StatementView.spec.ts`: una aserción de la F19 se ensanchó.** «only ever reads…»
   comprobaba `call.path === '/api/movements'` para **todas** las llamadas; ahora la
   pantalla pide también las dos listas, así que mide los **tres** paths (los tres de
   lectura) y sigue midiendo que ningún método es distinto de `GET`. Sin esto la
   aserción sería imposible de cumplir con la R14.
3. **Ningún test de la F15/F16/F17/F18 cambió** (240 tests de `review` intactos): la
   re-exportación funcionó como en las mudanzas de la F17 y la F18.
4. **`noMatchesLine` quedó en `filters.ts`**, no en `months.ts`: la tabla de «Modificados»
   del design la mencionaba en `months.ts`, pero su firma de §3 y la T5 la ponen en
   `filters.ts`, junto a la otra frase de filtros. Se siguió la firma.
5. **`fixtures.ts` de statement: `queries()` ahora filtra por path** `/api/movements`.
   Antes daba la querystring de **todas** las llamadas; con dos endpoints nuevos habría
   metido dos cadenas vacías en cada aserción. El significado del helper no cambia
   («las querystrings de las peticiones de movimientos»).

## 7. Sugerencias fuera de scope (NO aplicadas)

- `StatementCategorySelect.vue` es una copia literal de `review/components/CategorySelect.vue`.
  Si una tercera pantalla necesita el mismo control, toca moverlo a `shared/components/`
  con su vocabulario de filtro revisado (design §1.3 ya lo anticipa).
- La cola de revisión sigue llenando su desplegable de cuentas con la página cargada; con
  `shared/accounts.ts` ya disponible, podría pasar a la lista completa. Es un cambio de
  comportamiento de la F15: feature aparte.
- `movementCountLine` (`months.ts`) y `countLine` (`filters.ts`) dicen cosas parecidas en
  sitios distintos; unificarlas no aporta hoy y tocaría textos de la F19.

## 8. Estado en `feature_list.json`

Sigue en **`in_progress`**. No se marca `done` ni se hace commit: falta el `reviewer` y,
después, la T17 con el humano delante.
