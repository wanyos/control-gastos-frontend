# Implementación — F15 `review-queue` (la cola de pendientes, solo lectura)

- **Fecha:** 2026-09-18
- **Spec:** `specs/15-review-queue/` (14 requirements R1-R14, restricciones C1-C7),
  aprobado por el humano tal cual con sus 6 decisiones 🔴.
- **Alcance:** solo lectura. Ni un `PATCH`, ni un control de selección, ni un botón
  de confirmar o categorizar: eso es la F16, y el diseño le deja el sitio hecho.

---

## Tasks

Todas marcadas `[x]` en `specs/15-review-queue/tasks.md`.

| Task | Qué se hizo |
|---|---|
| T0 | Riesgos medidos antes de construir (ver abajo). |
| T1 | `types.ts` + `__tests__/fixtures.ts`. |
| T2 | `service.ts` + `service.spec.ts` (23 casos). |
| T3 | `filters.ts` + `filters.spec.ts`. |
| T4 | `store.ts` + `store.spec.ts`. |
| T5 | `BaseInput`, `BaseSelect`, `BaseCheckbox` + casos en `BaseComponents.spec.ts`. |
| T6 | `MovementRow`, `MovementList`, `ReviewTotals`, `ReviewPager` + specs. |
| T7 | `CategorySelect`, `ReviewFilterBar` + specs. |
| T8 | `views/ReviewView.vue` + `ReviewView.spec.ts` con router de test. |
| T9 | Ruta `/review`, `REVIEW_ROUTE_NAME`, `ReviewCountBadge` en la barra lateral. |
| T10 | `import/store.ts` refresca el recuento tras importar. |
| T11 | e2e: ruta de movimientos en el smoke y en el de importación, `review-queue.spec.ts`. |
| T12 | `docs/architecture.md` y `docs/stack.md`. |
| T13 | Puerta completa en verde (abajo). |

### Resultados de T0 (los riesgos, antes de escribir código)

- **(a) Página fuera de rango / recuento.** El backend de `:3000` **no estaba
  levantado** (`curl` sin respuesta, código 000), así que los dos casos se
  reprodujeron con el `fetch` mockeado según el contrato: 400 `VALIDATION_ERROR` para
  `page` más allá de la última con coincidencias (`store.spec.ts`, «retries once on
  page 1…») y 200 con `total: 0` para la cola vacía (`EMPTY_PAGE`). **La comprobación
  contra datos reales (C7) queda sin hacer**, ver «Lo no probado».
- **(b) 100 filas.** Comprobado en Chromium con una página de fixture de 100 filas:
  el documento mide **6255 px** con un viewport de 720 (≈8,7 pantallas), los totales
  quedan arriba y el pager al final de la lista. **Decisión: la barra de filtros NO se
  fija (`sticky`)**; es una columna simple y fijarla sería alcance que el spec no pide.
  Si al usarla con 1.378 pendientes molesta, es un cambio de una clase.
- **(c) e2e de humo.** Confirmado **primero** que sin la ruta nueva el smoke se pone
  **rojo** (`502 Bad Gateway` en consola por el proxy, con el backend parado) y que
  `page.route('**/api/movements*', …)` lo devuelve a verde. Mismo efecto, y mismo
  arreglo, en `e2e/import-dialog.spec.ts`, cuya red de seguridad abortaba la llamada.
- **(d) Iconos.** `ListChecks`, `Search`, `ChevronLeft` y `ChevronRight` existen en
  `@lucide/vue` (comprobado importando el paquete, no leyendo el `.d.ts`).
- **(e) Contraste.** Medido con la misma matemática de `theme-dark.spec.ts`:
  `--positive on --surface-hover` = **3,95** y `--negative on --surface-hover` = **3,34**,
  los dos por debajo de 4,5. **La fila usa `hover:bg-surface-sunken`** en lugar de
  `surface-hover` (positive 7,44; negative 6,30; ink-faint 7,68). El recuento de la
  barra lateral **sí** llega con el fondo tintado que proponía el diseño
  (`--ink-on-dark on --accent/15 over --surface-inverse` = **14,45**), así que **no**
  hizo falta el plan B.

---

## Trazabilidad `R<n>` → test

| R | Qué exige | Test(s) |
|---|---|---|
| R1 | Entrada Review con el número; nada con 0 o con la consulta fallida | `ReviewCountBadge.spec.ts`: «shows how many movements are waiting», «shows nothing when the queue is empty», «shows nothing, and no error, when the count query fails», «leaves the sidebar without a single word about the failure»; `AppShell.spec.ts`: «lists a Review entry that goes to /review» |
| R2 | Recuento al montar, tras importar y al cargar la cola sin filtros; sin sondeo | `store.spec.ts`: «refreshPendingCount() asks the smallest possible query…», «a load with no filters updates the count without an extra request», «a filtered load does not touch the count»; `ReviewCountBadge.spec.ts`: «asks once on mount and never polls»; `import/__tests__/store.spec.ts`: «refreshes the review count after a 200 / a 503 / an unreadable report» |
| R3 | `status=pending_review`, `pageSize=100`, orden de la API | `service.spec.ts`: «sends the queue query: pending status and 100 per page»; `store.spec.ts`: «asks for the pending queue and keeps the page as the API sent it»; `MovementList.spec.ts`: «paints one row per movement, in the order the API sent them» (fixture desordenado a propósito); `ReviewView.spec.ts`: «asks for the pending queue on mount…» |
| R4 | Descripción, cuenta, fecha, importe con signo y categoría / `Uncategorized` | `MovementRow.spec.ts`: los cinco casos (`expense` → `-45,37 €`, `income` → `1.200,00 €` en tono positivo, `neutral` → `0,00 €`, fecha por `formatDate`, `Food` / `Uncategorized`) |
| R5 | Cambiar filtro → `page=1` y solo los parámetros con valor | `filters.spec.ts`: «sends only the filters that have a value», «always asks for the pending queue, 100 per page»; `service.spec.ts`: «omits every empty value…»; `store.spec.ts`: «apply() sends the chosen filters and goes back to page 1»; `ReviewView.spec.ts`: «writes a filter change into the query and asks again from page 1» |
| R6 | `categoryId` y `uncategorized` nunca juntos | `filters.spec.ts`: «never sends categoryId and uncategorized together», «never lets the URL bring the category and uncategorized together»; `service.spec.ts`: «never sends categoryId and uncategorized together: uncategorized wins»; `store.spec.ts`: «never sends categoryId and uncategorized in the same request»; `ReviewFilterBar.spec.ts`: «picking a category clears Uncategorized, and marking it clears the category»; `e2e/review-queue.spec.ts`: «Uncategorized travels alone» |
| R7 | `GET /api/categories` una vez, `<optgroup>` por raíz, fallo → selector deshabilitado | `service.spec.ts`: «maps the roots with their children», «rejects a response that is not an array»; `store.spec.ts`: «asks for the tree once…», «marks the failure and leaves the rest of the screen alive»; `CategorySelect.spec.ts` (4 casos); `ReviewView.spec.ts`: «keeps the list alive when the categories fail» |
| R8 | Espera de 350 ms, recorte, mínimo 2, máximo 100 con aviso, texto de ayuda | `filters.spec.ts`: bloque `searchTerm` (5 casos, incluido «99 letras + 3 espacios» del contrato); `ReviewFilterBar.spec.ts`: «waits for the typing to stop: three keystrokes make one change», «warns over 100 characters and sends nothing», «explains what the search looks at»; `e2e/review-queue.spec.ts`: «searching without accents finds the accented description, with one request» |
| R9 | `pagination.total` y los tres `totals` tal cual | `ReviewTotals.spec.ts`: «shows the matches and the three totals exactly as the API sent them», «keeps the API totals even when the loaded page does not add up to them» |
| R10 | Filtros y página en la URL, ida y vuelta | `filters.spec.ts`: bloque «the URL query» (8 casos, incluido `page=abc`); `ReviewView.spec.ts`: «writes the page into the query and asks for it», «restores the controls and the request from a URL that already carries them», «falls back to the defaults on a URL full of rubbish», «follows the browser going back to the previous filters»; `e2e/review-queue.spec.ts`: «walks to the next page, and a reload keeps you there» |
| R11 | Indicador de carga con los filtros visibles | `store.spec.ts`: «is loading while the request is in flight, and not after»; `ReviewView.spec.ts`: «shows the loading indicator with the filters still usable» |
| R12 | `total: 0` → una frase u otra, `Clear filters`, ninguna fila | `MovementList.spec.ts`: «says the queue is empty…», «offers Clear filters when it is the filters that match nothing»; `ReviewView.spec.ts`: «says the queue is empty when no filter is active», «says it is the filters when there are some, and clears them on demand»; `filters.spec.ts`: bloque `hasActiveFilters` |
| R13 | Solo `GET /api/movements` y `GET /api/categories` | `store.spec.ts`: «only ever talks to the two read endpoints»; `ReviewView.spec.ts`: «only ever GETs the two read endpoints»; `service.spec.ts`: bloque «the two read requests»; `e2e/review-queue.spec.ts` (método comprobado + red de seguridad que aborta cualquier otra `/api`); grep de cierre: ningún `PATCH` en `src/features/review/` (solo la palabra en un comentario de `filters.ts:11`) |
| R14 | Los mensajes de `design.md` §7 y el reintento único | `store.spec.ts`: «keeps a 404 without retrying», «retries once on page 1 when the page no longer exists, and says so», «does not chain a second retry when page 1 is rejected too», «keeps a 400 on page 1 without retrying», «reports a network failure as unreachable», «reports an unreadable answer as a contract problem», «falls back to a generic sentence», «never paints the backend message», «never throws, whatever the failure»; `ReviewView.spec.ts`: bloque «failures» (6 casos con sus botones y los filtros habilitados) |

Restricciones de cierre: **C1** `router.spec.ts` («declares the five navigable routes…»,
«keeps /movements as a placeholder…»); **C2** `ReviewView.spec.ts` («writes every word in
English») + `theme-dark.spec.ts` (contraste) + el test de «no raw colors» de todos los
`.vue`; **C3** `e2e/app-boot.spec.ts` y `e2e/review-queue.spec.ts` en verde sin backend;
**C4** `git diff package.json pnpm-lock.yaml` vacío, nada fuera de `gastos-frontend/`;
**C5** `ReviewView.spec.ts` («builds no selection or action control: that is the F16») y
`MovementRow.spec.ts` («keeps the left slot the F16 will use»); **C6** abajo;
**C7** no verificada (backend apagado).

---

## Archivos

### Creados

| Archivo | Pieza |
|---|---|
| `src/features/review/types.ts` | `Movement`, `Pagination`, `Totals`, `MovementPage`, `Category`, `ReviewFilters`, `MovementQuery` |
| `src/features/review/service.ts` | `buildMovementsQuery` (:44), `parseMovementPage` (:147), `parseCategories` (:160), `getMovements` (:182), `getCategories` (:192) |
| `src/features/review/filters.ts` | `PAGE_SIZE` (:14), `SEARCH_DEBOUNCE_MS` (:22), `searchTerm` (:44), `hasActiveFilters` (:53), `toQuery` (:66), `toRouteQuery` (:85), `fromRouteQuery` (:128) |
| `src/features/review/store.ts` | `reviewErrorMessage` (:26), `useReviewStore` (:53) con `load`, `apply`, `goToPage`, `loadCategories`, `refreshPendingCount` |
| `src/features/review/views/ReviewView.vue` | La pantalla; la URL es la única escritora de los filtros |
| `src/features/review/components/MovementRow.vue` | Port de `TransactionRow.jsx`; hueco de la F16 reservado (`li > span.w-6`) |
| `src/features/review/components/MovementList.vue` | Tarjeta con las filas y los dos estados vacíos |
| `src/features/review/components/ReviewFilterBar.vue` | Los seis controles, la espera de 350 ms y `Clear filters` |
| `src/features/review/components/CategorySelect.vue` | `<optgroup>` por raíz; deshabilitado si la consulta falló |
| `src/features/review/components/ReviewTotals.vue` | `N movements` + In / Out / Net |
| `src/features/review/components/ReviewPager.vue` | Previous / Next + `Page X of Y` |
| `src/features/review/components/ReviewCountBadge.vue` | El número de la barra lateral |
| `src/shared/components/BaseInput.vue`, `BaseSelect.vue`, `BaseCheckbox.vue` | Ports de `design-system/components/forms/` |
| `src/features/review/__tests__/*.spec.ts` (10) + `fixtures.ts` | 111 tests de la feature |
| `e2e/review-queue.spec.ts` | 4 escenarios en chromium |

### Modificados

| Archivo:línea | Cambio |
|---|---|
| `src/router/index.ts:22` | `REVIEW_ROUTE_NAME` |
| `src/router/index.ts:43` | Ruta `/review` con `ListChecks`, delante de `/overview`; `/movements` intacto |
| `src/shared/components/AppSidebar.vue:38,50-51` | `ReviewCountBadge` dentro de la entrada Review |
| `src/features/import/store.ts:5,78` | `void useReviewStore().refreshPendingCount(client)` en el `finally` de `start()` |
| `src/features/import/__tests__/fixtures.ts` | `mockApi` acepta `movements`; `GET_MOVEMENTS`, `PENDING_COUNT_PAGE` |
| `src/features/import/__tests__/store.spec.ts` | 3 casos nuevos del recuento; los 26 existentes siguen pasando |
| `src/assets/theme-dark.css` | 3 líneas `contrast:` nuevas (positive y ink-faint sobre `--surface-sunken`, recuento sobre `--accent/15`) |
| `src/router/__tests__/router.spec.ts` | 5 rutas navegables + `/movements` sigue siendo placeholder |
| `src/shared/components/__tests__/AppShell.spec.ts` | La entrada Review apunta a `/review` |
| `src/shared/components/__tests__/BaseComponents.spec.ts` | 7 casos de los tres controles nuevos |
| `e2e/app-boot.spec.ts`, `e2e/import-dialog.spec.ts` | `page.route('**/api/movements*', …)` |
| `docs/architecture.md`, `docs/stack.md` | Árbol de `features/review/`, componentes base, dependencias, iconos, e2e |

---

## Decisiones de implementación (dentro del spec)

1. **La URL es la única escritora de los filtros.** Un control cambia →
   `router.replace` (filtros) o `router.push` (página) → el `watch` sobre
   `route.query` traduce eso en la petición. Así atrás/adelante, recargar y un enlace
   compartido pasan exactamente por el mismo camino, y no hay dos fuentes de verdad.
2. **`MovementQuery` vive en `types.ts`**, no en `service.ts` como dibujaba el diseño:
   `filters.ts` lo necesita y así no hay ciclo `filters → service → filters`.
   `PAGE_SIZE` se define en `filters.ts` (lo usa `toQuery`) y **el store lo re-exporta**,
   que es donde el diseño decía que estaría.
3. **El componente de filtros se llama `ReviewFilterBar`** (como la tabla de archivos de
   `design.md` §1), no `ReviewFilters`: ese nombre ya es el del tipo. La prosa de
   `requirements.md` lo cita como `ReviewFilters.spec.ts`; el fichero es
   `ReviewFilterBar.spec.ts`.
4. **Hover de fila en `--surface-sunken`** en vez de `--surface-hover`, por el contraste
   medido en T0(e). Es el único punto donde me aparté de la letra de `design.md` §8, y
   fue para cumplir su §9.
5. **`reviewErrorMessage` vive en `store.ts`** (el diseño no le daba fichero) y devuelve
   `{ message, action }`: la vista no decide textos ni conoce códigos HTTP.
6. **El recuento de la barra lateral y la cola comparten store.** Cargar la cola sin
   filtros escribe `pendingCount` con el `pagination.total` que ya viene, sin petición
   extra (R2); en el e2e ambos fixtures dan la misma cifra a propósito, porque en la
   realidad son la misma consulta.
7. **`BaseCheckbox` es un `<input type="checkbox">` nativo** con `accent-brand`, no el
   `role="checkbox"` a mano de la referencia: el nativo ya trae teclado y semántica.
8. **`data-test="review-count"`** es el de la barra lateral (R1); el contador de
   coincidencias de la pantalla es `totals-matches`, para que no choquen.

---

## Verificación

Última pasada, toda en verde:

```
pnpm type-check                  → vue-tsc --build, sin errores
pnpm lint                        → oxlint . --fix, sin avisos
pnpm test:unit                   → 51 ficheros, 691 tests (antes: 40 / 529)
pnpm build                       → 1975 módulos; dist 181,19 kB JS (62,33 gzip), 30,93 kB CSS
pnpm test:e2e --project=chromium → 8 tests (4 nuevos de review-queue)
./init.sh                        → [OK] Entorno listo. Puedes empezar a trabajar.
npx prettier --check src e2e     → All matched files use Prettier code style!
git diff --stat package.json pnpm-lock.yaml → sin cambios (ninguna dependencia nueva)
grep -rn "PATCH" src/features/review/       → solo un comentario, ninguna llamada
grep -rn "fetch(" --include=*.vue src/      → ninguna
```

---

## Lo no probado

- **C7 / T13, comprobación contra el backend real:** `:3000` no respondía durante toda
  la sesión (`curl` → código 000), así que **no** se ha contrastado que el recuento de
  la barra lateral coincida con el `pagination.total` real, ni que una búsqueda sin
  tildes encuentre un movimiento con tildes en datos de verdad. Todo lo demás está
  cubierto con el contrato como fuente. **Es una comprobación de solo lectura**: cuando
  el humano levante el backend basta con `pnpm dev`, abrir `/review` y comparar con
  `curl "http://localhost:3000/api/movements?status=pending_review&pageSize=1"`.
- **Aspecto real con 1.378 pendientes:** se midió con 100 filas de fixture (T0b), no con
  la base de datos real.
- **Firefox y WebKit:** el e2e nuevo solo se ha ejecutado en chromium, que es lo que
  exige la puerta; `pnpm test:e2e` los tres sigue disponible.

## Sugerencias fuera de alcance (NO aplicadas)

1. **`GET /api/accounts` para el selector de cuenta.** Hoy se rellena con las cuentas de
   la página cargada (decisión ⚙️ 6 del humano): si filtras muy estrecho, el desplegable
   enseña pocas cuentas. Si molesta al usarlo, es una petición más en una feature futura.
2. **Barra de filtros fija (`sticky`).** Con 100 filas la página mide ~8,7 pantallas y
   los filtros se van arriba. No entra en esta feature; es una clase si se decide.
3. **`e2e` de la cola en firefox y webkit.** La puerta solo pide chromium.
4. **`pageSize` seleccionable** y **recuento por WebSocket / sondeo**: descartados en el
   spec, se anotan solo por si vuelven a plantearse.

## Estado en `feature_list.json`

La feature 15 sigue en **`in_progress`**, como se pidió: no la he marcado `done`.
El cierre lo hará el implementer cuando el `reviewer` apruebe y exista
`progress/summaries/review-queue.md`.
