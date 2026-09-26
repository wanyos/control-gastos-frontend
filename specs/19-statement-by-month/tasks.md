# Tasks — Feature 19: statement-by-month

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).

## Preparación

- [ ] T0 — Comprobaciones previas, antes de escribir código: (a) que el par
      `--warning on --surface-card` **ya** tiene línea `contrast:` en
      `src/assets/theme-dark.css` (lo introdujo la F18) y por tanto no hay que
      tocar el tema; (b) que `<input type="month">` renderiza legible con los
      tokens del `BaseInput` actual en el navegador de desarrollo (si no, el plan B
      es un `BaseSelect` con los 12 meses del año mostrado + flechas de año, y se
      anota como desviación); (c) que `buildMovementsQuery` con solo
      `from`/`to`/`page`/`pageSize` **no** añade `status` (mirar
      `src/shared/movements.ts`). Cubre: C5.

## Lógica pura (`months.ts`)

- [ ] T1 — Crear `src/features/statement/months.ts` con `MonthKey`,
      `STATEMENT_PAGE_SIZE`, `currentMonth`, `monthRange`, `shiftMonth`,
      `formatMonthLabel`, `isAtOrAfterCurrentMonth`, `monthFromRouteQuery`,
      `monthToRouteQuery`, `monthQuery`, `groupByDay`, `movementCountLine`,
      `emptyMonthLine` y `statementErrorMessage` (design §3, §5, §6).
      Cubre: R1, R2, R4, R8, R11, R12, R13.
- [ ] T2 — `src/features/statement/types.ts`: re-export de los tipos de
      `@/shared/movements` que usa la pantalla + `DayGroup`. Cubre: C2, C3.
- [ ] T3 — `__tests__/months.spec.ts` con la batería de design §8 (febrero
      bisiesto, cruce de año, URL basura, que `monthQuery` no lleva `status`, que
      `groupByDay` no reordena). Cubre: R1, R2, R4, R8.

## Estado (`store.ts`)

- [ ] T4 — `useStatementStore` con `month`, `result`, `extra`, `isLoading`,
      `isLoadingMore`, `error`, `days`, `hasMore`, `show`, `shift` y `loadMore`,
      con el contador `loadRun` que descarta las respuestas que ya no son la
      última. La acción nunca lanza. Cubre: R1, R2, R5, R13, R14, R15.
- [ ] T5 — `__tests__/store.spec.ts`: rango pedido, cambio de mes, respuesta
      tardía descartada, fallo que deja `error`, `loadMore` que concatena sin
      mover `totals`, y `show` que vacía lo traído por `loadMore`.
      Cubre: R1, R5, R13, R15.

## Interfaz

- [ ] T6 — `StatementRow.vue`: concepto, cuenta, categoría e importe con signo;
      **sin** `balanceAfter` y sin ningún control; marca `Transfer` con
      `transferId`. Cubre: R9, R10.
- [ ] T7 — `MonthTotals.vue`: las tres cifras del `totals` inyectado con las
      etiquetas neutras, el recuento y la **nota fija no cerrable** de design §6.
      Cubre: R5, R6, R7.
- [ ] T8 — `StatementList.vue`: cabeceras de día sticky, filas, frase del mes
      vacío sin tabla, y `Load more` con `Showing N of M`. Cubre: R8, R11, R13.
- [ ] T9 — `MonthNav.vue`: flechas con `aria-label`, etiqueta del mes y selector
      de mes; la flecha de siguiente deshabilitada en el mes en curso. Antes,
      ampliar `BaseInput.type` a `'text' | 'date' | 'month'`. Cubre: R2.
- [ ] T10 — `StatementView.vue`: lee el mes de la URL al montar, `watch` sobre
      `route.query.month`, `router.push` al cambiar de mes, spinner, bloque de
      error con reintentar, y montaje de los tres componentes. Cubre: R1, R3, R4,
      R12, R14.
- [ ] T11 — `src/router/index.ts`: `/movements` monta `StatementView`; reescribir
      el comentario del placeholder. Y adaptar `router.spec.ts:58` (única
      excepción prevista a C4): «/movements monta el extracto y sigue sin ser
      ReviewView». Cubre: R1, C4.
- [ ] T12 — Tests de componentes y de vista de design §8
      (`MonthNav`, `MonthTotals`, `StatementList`, `StatementRow`,
      `StatementView`), incluido el que afirma que **ninguna petición usa un
      método distinto de `GET`** y el que afirma que no aparecen las palabras
      `spent` / `earned` / `savings`. Cubre: R1, R3, R4, R5, R6, R7, R8, R9, R10,
      R11, R12, R13, R14, C1.

## Cierre

- [ ] T13 — `e2e/statement.spec.ts` nuevo con la red de seguridad
      (`page.route('**/api/**', route => route.abort())`) y las rutas concretas
      interceptadas: entrar por el menú, ver mes y cifras, flecha atrás, URL con
      `month=`, recarga, y aserción de solo `GET`. Los cinco specs anteriores,
      verdes sin tocarlos. Cubre: R2, R3, C1, C4.
- [ ] T14 — Repaso de textos (todo en inglés, sin el `message` del backend),
      colores (solo alias semánticos) y `theme-dark.spec.ts` en verde.
      Cubre: C5.
- [ ] T15 — Grep de cierre: `src/features/statement/` no importa nada de
      `features/review`, `features/import`, `features/category-rules` ni
      `features/net-worth`, y ninguna de ellas importa `statement`; en toda la
      carpeta no aparece `POST`, `PATCH` ni `DELETE`. Cubre: C1, C3.
- [ ] T16 — `docs/architecture.md`: `features/statement/` en el árbol con la nota
      de que es de solo lectura y no depende de ninguna otra feature. Cubre: C3.
- [ ] T17 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`,
      `pnpm build`, e2e chromium y `./init.sh` en verde;
      `progress/implementation/statement-by-month.md` con la trazabilidad
      `R<n> → test`. Cubre: C6.
- [ ] T18 — **Comprobación con el humano delante**, con el backend real en `:3000`
      y `pnpm dev`. Es de **solo lectura**: ninguna petición de esta pantalla
      escribe, así que no hace falta foto previa ni vuelta atrás; lo único que se
      pide es que él esté mirando y diga si las cifras le cuadran.
      1. Entrar en `Movements` y comprobar que sale el **mes en curso** sin tocar
         nada, con su etiqueta, sus tres cifras y su nota.
      2. Contrastar esas cifras y el recuento a mano con
         `GET /api/movements?from=<1º>&to=<último>&pageSize=1`: `totals.income`,
         `totals.expense`, `totals.net` y `pagination.total` tienen que ser los
         mismos números que se ven en pantalla (R5).
      3. Repetir el contraste en **un mes cargado de depósitos** (2026-07, que el
         análisis mide en ≈57.949 € de entrada y ≈59.096 € de salida) y confirmar
         con él que la nota de R6 explica esa cifra de forma que no se le olvide.
      4. Ir hacia atrás mes a mes hasta **2024-01**, comprobar que las sumas
         cambian con el mes, y seguir un mes más atrás para ver la frase del mes
         vacío (R11).
      5. Recargar con `?month=2025-08` y comprobar que vuelve a ese mes, y que el
         botón de atrás del navegador devuelve al anterior (R3).
      6. Con las herramientas de red abiertas: confirmar que **no sale ni un
         `POST`, `PATCH` ni `DELETE`** en toda la sesión, y cero errores de consola.
      7. Anotar en el informe qué mes eligió, las cifras comparadas y si alguna no
         cuadró.
      Si el backend no está levantado, se anota como pendiente y **no bloquea el
      cierre**. Cubre: C7.
