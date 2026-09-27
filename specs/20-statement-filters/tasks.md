# Tasks — Feature 20: statement-filters

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).

## Preparación

- [x] T0 — Comprobaciones previas, antes de escribir código: (a) que
      `buildMovementsQuery` de `src/shared/movements.ts` ya descarta
      `categoryId` cuando viaja `uncategorized: true` (tercera barrera de
      design §5); (b) que `BaseCheckbox` y `BaseSelect` se leen bien con los
      alias actuales y que las parejas de color que usa la barra **ya** tienen
      su línea `contrast:` en `src/assets/theme-dark.css` (si falta alguna, se
      añade y se anota); (c) que `GET /api/accounts` del backend real devuelve
      las **5 cuentas** con `id`, `iban`, `bank`, `alias` y `type` tal como dice
      el contrato. Cubre: C5, R14.

## Lo común, a `shared/`

- [x] T1 — Crear `src/shared/movement-filters.ts` con `SEARCH_MIN`,
      `SEARCH_MAX`, `SEARCH_TOO_LONG`, `searchTerm`, `firstQueryValue` y
      `positiveIntegerQuery`, movidos **sin cambiarlos** desde
      `src/features/review/filters.ts`, que pasa a importarlos y re-exportarlos.
      La suite de `review` debe pasar **sin tocar ni un test**. Cubre: R7, C3, C4.
- [x] T2 — `src/shared/__tests__/movement-filters.spec.ts`: los tres casos de
      `searchTerm` (menos de 2 recortada, válida, 101 caracteres con espacios) y
      los dos ayudantes de querystring. Cubre: R7.
- [x] T3 — Crear `src/shared/accounts.ts` (`ACCOUNTS_PATH`, `AccountSummary`,
      `parseAccounts`, `getAccounts`) validando **solo** los cinco campos del
      desplegable e ignorando los saldos (design §3). Cubre: R14, C2.
- [x] T4 — `src/shared/__tests__/accounts.spec.ts`: parseo de 5 cuentas,
      `ValidationError` con un `id` que no es entero, y `GET` a
      `/api/accounts`. Cubre: R14, C1, C2.

## Lógica pura del extracto

- [x] T5 — Crear `src/features/statement/filters.ts` con `StatementFilters`,
      `EMPTY_FILTERS`, `hasActiveFilters`, `monthQuery` (mudada de `months.ts` y
      ampliada con los filtros), `toRouteQuery`, `fromRouteQuery`,
      `filterScopeLine` y `noMatchesLine`. Mover `noMatchesLine` junto a las
      frases del extracto y quitar `monthQuery` de `months.ts`, ajustando
      `months.spec.ts` (única excepción admitida de C4).
      Cubre: R1, R8, R9, R10, R5, R13.
- [x] T6 — Ampliar `statementErrorMessage` para devolver
      `{ message, action: 'clear' | 'retry' }` con el 404 de cuenta/categoría
      inexistente y el 400 con filtros (design §5). Cubre: R10, R13.
- [x] T7 — `__tests__/filters.spec.ts` con la batería de design §8: `monthQuery`
      sin `status` ni `type` y **nunca** con las dos claves de categoría juntas,
      `toRouteQuery` que omite lo vacío y siempre escribe `month`,
      `fromRouteQuery` con URL limpia / imposible / basura / `q` de 101 / mes
      inválido, y las frases de alcance y de vacío en singular y plural.
      Cubre: R1, R5, R8, R9, R10, R13.

## Estado

- [x] T8 — Ampliar `src/features/statement/store.ts`: `filters`, `accounts`,
      `accountsFailed`, `categories`, `categoriesFailed`; `show(month, filters)`
      que limpia `extra` y vuelve a la página 1; `applyFilters`; `loadAccounts`
      y `loadCategories` con guardia de una vez por sesión y captura del fallo;
      `loadMore` con los filtros puestos. Ninguna acción lanza.
      Cubre: R1, R3, R4, R12, R14, R15.
- [x] T9 — Ampliar `__tests__/store.spec.ts`: la query que sale con cada filtro,
      `applyFilters` que descarta lo traído por `Load more`, cambio de mes que
      conserva los filtros, respuesta tardía descartada, y fallo de cuentas que
      solo marca `accountsFailed`. Cubre: R1, R3, R12, R14, R15.

## Interfaz

- [x] T10 — `StatementCategorySelect.vue`: copia de
      `review/components/CategorySelect.vue` con los tipos de `statement`
      (design §1.3). Cubre: R2, R14, R15, C3.
- [x] T11 — `StatementFilterBar.vue`: búsqueda con temporizador de 350 ms y
      aviso de longitud, desplegable de cuenta (`bankLabel · alias`) con las 5
      cuentas, desplegable de categoría, casilla «sin categoría» excluyente en
      los dos sentidos, y `Clear filters` visible solo con filtros activos.
      **Ningún control de tipo, estado ni fechas.** Cubre: R2, R7, R9, R11, R15.
- [x] T12 — `MonthTotals.vue`: prop `scope?: string` con la línea de alcance
      (R5) **sin tocar la nota permanente ni sus textos**, y `StatementList.vue`:
      prop `emptyState` con las dos frases y evento `clear`.
      Cubre: R4, R5, R6, R13.
- [x] T13 — `StatementView.vue`: `fromRouteQuery` al montar y en el `watch` de
      `route.query` completo, `router.replace` al cambiar un filtro y
      `router.push` al cambiar de mes conservando los filtros, montaje de la
      barra entre `MonthNav` y `MonthTotals`, bloque de error con el botón que
      diga `statementErrorMessage`, y carga de cuentas y categorías al montar.
      Cubre: R2, R3, R5, R8, R10, R11, R12, R13.

## Tests de interfaz y cierre

- [x] T14 — `__tests__/StatementFilterBar.spec.ts` y ampliación de
      `__tests__/StatementView.spec.ts` y `__tests__/MonthTotals.spec.ts` según
      design §8, incluido el test de que **no existen** `filter-type`,
      `filter-from` ni `filter-to`, y el de que la nota permanente sigue
      visible con filtros puestos. Cubre: R2, R5, R6, R7, R9, R10, R11, R13.
- [x] T15 — Dos escenarios e2e en `e2e/statement.spec.ts` con todas las
      llamadas interceptadas y la red de seguridad: (a) filtrar por «sin
      categoría» dentro de un mes y ver cambiar cifras y recuento; (b) entrar
      con `?month=2026-03&category=3&uncategorized=true` y comprobar que la
      petición que sale **no** lleva `categoryId`. Cubre: R1, R5, R10.
- [x] T16 — Grep de cierre en `src/features/statement/`: ni `POST`, ni `PATCH`,
      ni `DELETE`, ni un solo import de `@/features/review`. Puerta completa:
      `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, e2e
      chromium y `./init.sh`. Informe en
      `progress/implementation/statement-filters.md` con el mapa
      `R<n>` → test. Cubre: C1, C3, C4, C5, C6.

## Fuera del implementer

- [x] T17 — **Comprobación con el humano delante, contra el backend real de
      `:3000` y de solo lectura** (C7). Comparar, para un mes con datos
      (2026-03 o 2025-12) y en la propia pantalla frente a la respuesta de la
      API: (a) sin filtros; (b) solo «sin categoría»; (c) solo una cuenta;
      (d) solo una categoría; (e) una cuenta + «sin categoría»; (f) una
      búsqueda con tilde (`luz`, `cafetería`) y la misma sin tilde; (g) una
      combinación que no deja nada, para ver la frase de «no hay nada con estos
      filtros»; (h) una URL a mano con `category` y `uncategorized=true` a la
      vez, comprobando en la pestaña de red que **no sale ningún 400**. En cada
      caso deben cuadrar al céntimo las tres cifras y el recuento. Cero
      escrituras y cero errores de consola.
