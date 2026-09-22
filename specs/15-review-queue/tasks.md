# Tasks — Feature 15: review-queue

> Checklist ejecutable para el `implementer`, en orden. Cada task referencia los
> `R<n>` / `C<n>` de `requirements.md`. Marcar `[x]` al completar.
>
> **No se toca el backend. Esta feature es de solo lectura:** ni un `PATCH`, ni un
> checkbox de selección, ni un botón de confirmar o categorizar. Todo eso es la F16.

- [x] T0 — **Riesgos, antes de construir.** `./init.sh` en verde primero. Anotar cada
  resultado en `progress/implementation/review-queue.md`:
  (a) **Página fuera de rango:** con el backend en `:3000`, `curl` a
  `/api/movements?status=pending_review&pageSize=100&page=999` y a
  `/api/movements?status=pending_review&pageSize=1&page=1` con la cola vacía;
  confirmar que el primero es 400 `VALIDATION_ERROR` y que el segundo es 200 con
  `total: 0` (es la base del reintento único de design.md §7 y del recuento de R2).
  Si el backend no está disponible, decirlo y probarlo con el `fetch` mockeado.
  (b) **Aspecto con muchas filas:** montar provisionalmente `MovementList` con 100
  filas de fixture y mirar en Chromium que la página se recorre sin que la cabecera de
  totales ni la barra de filtros estorben; anotar si hace falta que la barra quede
  pegada arriba (`sticky`) y dejarlo decidido antes de maquetar.
  (c) **e2e de humo:** con el backend parado, comprobar que el smoke se pone rojo al
  montar la barra lateral con el recuento (502 en consola) y que la `page.route` de
  design.md §10 lo devuelve a verde.
  (d) Confirmar en `node_modules/@lucide/vue` los nombres `ListChecks`, `Search`,
  `ChevronLeft`, `ChevronRight`.
  (e) Añadir las líneas `contrast:` de design.md §9 a `theme-dark.css` y pasar
  `theme-dark.spec.ts`; aplicar el plan B del recuento si no llega. Cubre: C2, C3.

- [x] T1 — `src/features/review/types.ts` (design.md §2) y
  `__tests__/fixtures.ts`: una página de 3 movimientos (un `expense` con categoría, un
  `income` sin categoría, un `neutral` de `0.00`), una página vacía con `total: 0`, una
  página 2 de 100 elementos, un movimiento con `category: null` y `balanceAfter: null`,
  descripciones con tildes y mayúsculas (`CAFETERÍA CENTRAL`), y el árbol de
  `GET /api/categories` con dos raíces y sus `children`. Cubre: soporte de R3-R9.

- [x] T2 — `src/features/review/service.ts` + `service.spec.ts`:
  `buildMovementsQuery` (omite vacíos; `uncategorized` solo si `true`; nunca
  `categoryId` + `uncategorized`; `q` recortado y escapado; `pageSize=100`);
  `parseMovementPage` (mapea el fixture entero; `type`/`status`/`kind` desconocidos →
  `ValidationError`; `origin`, `paymentMethod` y `account.type` desconocidos
  aceptados; `amount` no decimal → `ValidationError`; `movements` que no es array →
  `ValidationError` con el contexto `GET /api/movements`); `parseCategories` (raíces
  con hijos; array vacío; respuesta que no es array → `ValidationError`);
  `getMovements`/`getCategories` llaman al `fetch` mockeado con `GET` y la URL
  esperada. Cubre: R3, R5, R6, R7, R13.

- [x] T3 — `src/features/review/filters.ts` + `filters.spec.ts`: `toQuery`,
  `toRouteQuery`, `fromRouteQuery` (ida y vuelta, y tolerancia a `page=abc`,
  `type=foo`, `account=-1`), `hasActiveFilters`, `searchTerm` (`"  ca  "` → `ca`;
  `"a"` → sin `q` y sin error; 100 caracteres → válido; 99 letras + 3 espacios → error
  de longitud, como en el contrato). Cubre: R5, R6, R8, R10.

- [x] T4 — `src/features/review/store.ts` (design.md §6 y §7) + `store.spec.ts` con
  `fetch` mockeado y Pinia de test: `load()` guarda `result` y nunca lanza; `apply()`
  vuelve a `page=1`; `goToPage()` pide la página pedida; respuesta obsoleta descartada
  (dos cargas encadenadas, resuelve la primera al final); 404 → `error` sin reintento;
  400 en `page=3` → 1 reintento con `page=1` + `notice`; 400 en `page=1` → error sin
  reintento; red y `ValidationError` → su mensaje; `loadCategories()` una sola vez y
  fallo → `categoriesFailed`; `refreshPendingCount()` con la querystring exacta
  (`status=pending_review&page=1&pageSize=1`) y fallo → `pendingCount = null`; una
  carga sin filtros actualiza `pendingCount` sin GET extra y una con filtros no lo
  toca. Cubre: R2, R5, R7, R9, R11, R12, R13, R14.

- [x] T5 — Componentes compartidos `BaseInput.vue`, `BaseSelect.vue`,
  `BaseCheckbox.vue` (design.md §8) + casos en `BaseComponents.spec.ts`: `label`
  asociado por `for`/`id`, `update:modelValue`, `disabled`, estado inválido.
  Cubre: R7, R8, C2.

- [x] T6 — `MovementRow.vue`, `MovementList.vue`, `ReviewTotals.vue`,
  `ReviewPager.vue` + sus specs: gasto/ingreso/neutral con su formato y su tono, fecha
  por `formatDate`, `Uncategorized` con `category: null`, orden de filas igual al del
  array, estados vacíos (`caughtUp` / `noMatches`) sin ninguna fila, totales pintados
  tal cual aunque no cuadren con la página, pager oculto con `totalPages <= 1` y
  botones deshabilitados en los extremos. Cubre: R3, R4, R9, R12.

- [x] T7 — `CategorySelect.vue` y `ReviewFilterBar.vue` + sus specs: `<optgroup>` por
  raíz; selector deshabilitado con `Categories unavailable` si las categorías
  fallaron; elegir categoría desmarca `Uncategorized` y viceversa; debounce de 350 ms
  con timers falsos (tres pulsaciones → 1 `change`); aviso de más de 100 caracteres sin
  emitir; `Clear filters` solo con filtros activos. Cubre: R5, R6, R7, R8, R12.

- [x] T8 — `views/ReviewView.vue` + `ReviewView.spec.ts` con router de test: carga al
  montar con los filtros de la URL; cambiar filtro y página escribe la querystring
  (`replace` para filtros, `push` para página) y vuelve a pedir; montar con
  `?account=1&page=2&q=luz` restaura controles y petición; indicador de carga con los
  filtros visibles; los cuatro mensajes de error de design.md §7 con sus acciones y
  los filtros habilitados; ningún texto en español. Cubre: R3, R10, R11, R12, R14, C2.

- [x] T9 — Barra lateral y router: ruta `/review` con `ListChecks` antes de
  `/overview` (sin tocar `/movements`), `REVIEW_ROUTE_NAME` exportado,
  `ReviewCountBadge.vue` montado en `AppSidebar.vue`; actualizar `router.spec.ts` (5
  rutas navegables, `/review` resuelve) y `AppShell.spec.ts` (entrada Review presente).
  `ReviewCountBadge.spec.ts`: 7 → `7`, 0 → nada, fallo → nada y sin error en el
  `aside`, 1 GET al montar y ninguno más con timers falsos. Cubre: R1, R2, C1.

- [x] T10 — Refresco tras importar: en el `finally` de `start()` de
  `src/features/import/store.ts`, `void useReviewStore().refreshPendingCount(client)`;
  casos nuevos en `import/__tests__/store.spec.ts` (200, 503 e informe ilegible → 1 GET
  de recuento). Los tests existentes de import siguen pasando. Cubre: R2.

- [x] T11 — e2e: `page.route('**/api/movements*', …)` en `e2e/app-boot.spec.ts` (si T0
  confirmó que hace falta) y `e2e/review-queue.spec.ts` con los cuatro escenarios de
  design.md §10. `pnpm test:e2e --project=chromium` en verde sin backend. Cubre: R1,
  R3, R6, R8, R10, C3.

- [x] T12 — Docs: `docs/architecture.md` (árbol de `features/review/`, componentes
  base nuevos, dependencia `import → review`) y `docs/stack.md` (iconos nuevos; el
  smoke responde también `/api/movements`). Cubre: C1, C3.

- [x] T13 — Cierre: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` verdes; `git diff package.json` sin dependencias; grep sin `fetch(` en
  `.vue` y sin `PATCH` en `src/features/review/`. Comprobación real con el backend en
  `:3000` y `pnpm dev` (**solo lecturas, no modifica datos**): el recuento de la barra
  lateral coincide con el `pagination.total` de
  `curl "http://localhost:3000/api/movements?status=pending_review&pageSize=1"`, y una
  búsqueda sin tildes encuentra un movimiento con tildes. Mapa de trazabilidad R↔test
  en `progress/implementation/review-queue.md`. Cubre: C4, C5, C6, C7.
  > **C7 superada (2026-09-20).** El implementer no pudo hacerla (backend apagado); la
  > hizo el leader contra el backend real, solo lecturas y cero escrituras: con 1.607
  > pendientes la pantalla dio el mismo contador y los mismos totales que la API,
  > «Page 1 of 17» con 100 filas, `q=cafeteria` y `q=CAFETERÍA` los mismos 3
  > resultados que `curl`, `uncategorized=true` 1.379, y los filtros sobrevivieron a
  > una recarga. Evidencia al final de `progress/reviews/review-queue.md`.
