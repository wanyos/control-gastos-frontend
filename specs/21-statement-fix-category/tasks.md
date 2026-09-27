# Tasks — Feature 21: statement-fix-category

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).

## Preparación

- [x] T0 — Comprobaciones previas, antes de escribir código: (a) que
      `parseMovement` de `src/shared/movements.ts` mapea igual la respuesta de
      `PATCH /api/movements/:id` que un elemento de la lista (misma forma según el
      contrato); (b) que las parejas de color de la insignia pulsable y del aviso ya
      tienen su línea `contrast:` en `src/assets/theme-dark.css` (si falta alguna, se
      añade y se anota); (c) que `RuleDialog` de la F17 no importa nada de
      `features/review`, de modo que montarlo desde el extracto no arrastre una
      dependencia inesperada. Cubre: C4, C5, C6.

## La mitad de escritura baja a `shared/`

- [x] T1 — Mover `changesBody`, `patch`, `parseUpdatedMovement` y `updateMovement`
      de `src/features/review/service.ts` a `src/shared/movements.ts`, **sin cambiar
      una línea**, y re-exportarlos desde `review/service.ts`. `updateMovements` se
      queda en `review`. Cubre: C1, C6.
- [x] T2 — Mover `needsReload` de `src/features/review/actions.ts` a
      `src/shared/movements.ts` y re-exportarlo desde `review/actions.ts`.
      Cubre: R15, C6.
- [x] T3 — Ejecutar la suite de `review` y de `category-rules` **sin tocar ni un
      test**: debe pasar entera. Casos del `PATCH` movidos a
      `src/shared/__tests__/movements.spec.ts`. Cubre: C6.
      > **Nota (2026-09-27): la segunda mitad no se hizo.** Las suites de `review` y de
      > `category-rules` sí se ejecutaron enteras y en verde sin tocar ni un test (que es
      > lo que cubre C6), pero **los casos del `PATCH` no se movieron**: siguen en
      > `src/features/review/__tests__/service.spec.ts`, cubriendo el código ya mudado a
      > `src/shared/movements.ts` a través de la re-exportación; en
      > `src/shared/__tests__/` no se creó ningún `movements.spec.ts`. Moverlos era
      > refactor de tests ya verdes, sin cobertura nueva, y se dejó como deuda anotada por el reviewer (falta test co-localizado de
      > `src/shared/movements.ts`).

## La única escritura del extracto

- [x] T4 — Crear `src/features/statement/service.ts` con `setMovementCategory(id,
      categoryId, client?)`, que construye el objeto literal `{ categoryId }` aquí
      dentro (design §2). Cubre: R1, C1.
- [x] T5 — `src/features/statement/__tests__/service.spec.ts`: el cuerpo enviado es
      exactamente `{"categoryId":4}` y `{"categoryId":null}`, **no contiene `status`**
      ni ninguna otra clave, y la respuesta se valida en frontera (un `id` no entero
      da `ValidationError`). Cubre: R1, C1, C4.

## Lógica pura

- [x] T6 — Crear `src/features/statement/actions.ts` con `hasCategoryFilter`,
      `matchesCategoryFilter`, `actionSummary` y `writeErrorMessage` (los textos de
      design §8, en singular). Cubre: R8, R11, R14, R15.
- [x] T7 — `src/features/statement/__tests__/actions.spec.ts`: `matchesCategoryFilter`
      en los tres casos (`uncategorized`, `categoryId`, sin filtro de categoría), las
      dos frases de éxito y las cinco de error, y que ninguna contiene el `message`
      del backend. Cubre: R8, R11, R14, R15.

## Store

- [x] T8 — `src/features/statement/store.ts`: `editingId`, `openEditor`,
      `closeEditor`, `isActing`, `actionError`, `actionMessage`, `lastAction`; `show`
      los limpia todos. Cubre: R3, R13, C2.
- [x] T9 — `store.ts`: `adoptUpdated(updated)` — sustituye la fila en `result` o en
      `extra`, y la quita si deja de cumplir el filtro de categoría; **no toca
      `totals` ni `pagination`**. Cubre: R7, R8, R10.
- [x] T10 — `store.ts`: `categorize(id, categoryId)` con carril único, plan de
      deshacer, aviso de éxito, `refreshQuietly()` **solo** si hay filtro de categoría
      activo, y el `catch` con `writeErrorMessage` + recarga cuando `needsReload`.
      Cubre: R1, R6, R9, R11, R14, R15, C2.
- [x] T11 — `store.ts`: `undoLast()` — un solo `PATCH` con el `categoryId` anterior,
      mismo camino de adopción y de error, y `lastAction = null` al terminar bien.
      Cubre: R12, R13.
- [x] T12 — Casos nuevos en `src/features/statement/__tests__/store.spec.ts`:
      cambio sobre un `confirmed` (el `status` de la fila no cambia), fila que
      desaparece con `uncategorized`, fila que desaparece filtrando por una categoría
      concreta, **cero peticiones extra sin filtro de categoría**, una petición de
      refresco con filtro, deshacer, 400 sin recarga, 404 con recarga, y segundo clic
      ignorado mientras hay uno en vuelo. Cubre: R6, R7, R8, R9, R10, R11, R12, R14,
      R15, C2.

## Interfaz

- [x] T13 — `RowCategoryEditor.vue` (copia de `MovementCategorySelect` de la F16 más
      `Create rule` y `Close`) + `RowCategoryEditor.spec.ts`: solo categorías del
      `kind` del movimiento, opción `No category`, `neutral` deshabilitado con su
      texto, y el evento `create-rule`. Cubre: R4, R5, R16.
- [x] T14 — `StatementRow.vue`: la insignia pasa a `<button>` con su `aria-label`
      cuando el movimiento es categorizable, y se sustituye por el editor cuando esta
      fila es la que está en edición; en un `neutral` sigue sin ser un botón. Casos en
      `StatementRow.spec.ts`. Cubre: R2, R3, R5.
- [x] T15 — `StatementList.vue`: pasa hacia abajo `editingId`, `categories` y `busy`,
      y sube `edit`, `categorize` y `create-rule`. Casos en `StatementList.spec.ts`.
      Cubre: R3, R7.
- [x] T16 — `StatementActionNotice.vue` (copia de `ActionNotice`) + su test: el aviso
      de éxito con `Undo` **sin cuenta atrás**, el de error que gana al de éxito, y el
      `Undo` deshabilitado mientras hay una escritura en vuelo. Cubre: R11, R14, C2.
- [x] T17 — `StatementView.vue`: montar el aviso entre las cifras y la lista, y el
      `RuleDialog` de la F17 con `preview` de la F18 (mismas props que
      `ReviewView.vue`); al guardar, **no se toca el movimiento de origen**. Casos
      nuevos en `StatementView.spec.ts`. Cubre: R11, R16, R17.
- [x] T18 — Comprobar que la nota permanente de `MonthTotals.vue` sigue **intacta,
      visible y sin poder cerrarse**, y que su test sigue verde sin tocarlo.
      Cubre: R10, C3.

## Cierre

- [x] T19 — `e2e/statement-fix-category.spec.ts` con los cinco recorridos de
      `design.md` §9; comprobar que `e2e/statement.spec.ts`,
      `e2e/review-actions.spec.ts` y `e2e/category-rules.spec.ts` siguen verdes sin
      tocarlos. Cubre: R1, R6, R8, R9, R12, R14, C6.
- [x] T20 — Actualizar la nota de `docs/architecture.md` sobre `features/statement/`
      (deja de ser de solo lectura y pasa a montar el diálogo de `category-rules`,
      mismo sentido que `review → category-rules`). Cubre: C6.
- [x] T21 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
      `./init.sh` en verde; escribir `progress/implementation/statement-fix-category.md`
      con la trazabilidad `R<n> → test`. Cubre: C7.
- [x] T22 — **Solo con el visto bueno explícito del humano** (escribe en datos
      reales): con el backend en `:3000`, y **antes de tocar nada**, guardar con `curl`
      la foto de **uno o dos** movimientos (`id`, `categoryId`, `status`); desde el
      extracto cambiarles la categoría y deshacerlo; volver a pedirlos con `curl` y
      comprobar que `categoryId` vuelve a su valor original y que **`status` no ha
      cambiado**. Pegar las dos fotos en el informe. Si no hay visto bueno, se anota
      como pendiente en el resumen y no se ejecuta. Cubre: C8.
