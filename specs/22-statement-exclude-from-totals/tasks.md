# Tasks — Feature 22: statement-exclude-from-totals

> Orden de ejecución. El `implementer` marca `[x]` al completar cada una; el
> `reviewer` rechaza si queda alguna `[ ]` sin justificación escrita.
> Cada task dice qué `R<n>` / `C<n>` cubre (`requirements.md`).

## Preparación

- [x] T0 — Comprobaciones previas, antes de escribir código: (a) que `asFlag` de
      `src/shared/validation.ts` rechaza `"true"`, `0` y `null` (si no, se ajusta el
      parseo, no el contrato); (b) que las fixtures de `review`, `statement` y
      `category-rules` se pueden ampliar con `excludedFromTotals` desde un único sitio;
      (c) que las parejas de color de la etiqueta `Not counted` y del importe atenuado
      ya tienen su línea `contrast:` en `src/assets/theme-dark.css`. Cubre: C6.

## El campo nuevo entra por la frontera

- [x] T1 — `src/shared/movements.ts`: añadir `excludedFromTotals: boolean` a `Movement`
      y a `parseMovement` (con `asFlag`), y `excludedFromTotals?: boolean` a
      `MovementChanges`; en `changesBody`, copiarlo **solo** cuando
      `typeof === 'boolean'` (design §3, §5). Cubre: R1, C1, C6.
- [x] T2 — Actualizar las fixtures de los tests de `review`, `statement` y
      `category-rules` con el campo nuevo, y comprobar que una respuesta **sin**
      `excludedFromTotals` da `ValidationError` nombrando el campo. Cubre: C6, C7.

## El PATCH en bloque baja a `shared/`

- [x] T3 — Mover `updateMovements`, `parseBulkResult` y `MAX_IDS` a
      `src/shared/movements.ts`, y los tipos `BulkUpdate` / `BulkResult` desde
      `features/review/types.ts`, **sin cambiar una línea de lógica**; re-exportarlos
      desde `review/service.ts`, `review/actions.ts` y `review/types.ts` (design §4).
      Cubre: R1, C7.
- [x] T4 — Ejecutar enteras las suites de `review` y de `category-rules` **sin tocar ni
      un test**: deben pasar. Cubre: C7.

## La escritura del extracto

- [x] T5 — `src/features/statement/service.ts`: `setMovementsExcluded(ids, excluded,
      client?)`, que construye `{ ids, excludedFromTotals: excluded }` aquí dentro
      (design §2, §3). Cubre: R1, C1.
- [x] T6 — `src/features/statement/__tests__/service.spec.ts`: el cuerpo enviado es
      exactamente `{"ids":[210,211],"excludedFromTotals":true}` y `…:false`, **no
      contiene `status` ni `categoryId`**, un `excludedFromTotals` no booleano no sale
      del frontend, y la respuesta se valida en frontera. Cubre: R1, C1, C6.

## Lógica pura

- [x] T7 — `src/features/statement/actions.ts`: `STATEMENT_BULK_THRESHOLD = 20`,
      `countOf`, `exclusionSummary(count, excluded)`, `NOTHING_TO_CHANGE`, y el matiz
      de plural del 400 en `writeErrorMessage` (design §7.2, §8). Cubre: R3, R13, R14, R15.
- [x] T8 — Casos en `src/features/statement/__tests__/actions.spec.ts`: las dos frases
      de éxito en singular y en plural, la de «nada que cambiar», las cinco de error, y
      que ninguna contiene el `message` del backend. Cubre: R3, R14, R15.

## Store

- [x] T9 — `store.ts`: `isSelecting`, `selectedIds`, `startSelecting` (cierra el editor
      de categoría), `stopSelecting`, `toggleSelected`, `selectAllShown`,
      `clearSelection`; `show()` vacía la selección al cambiar de mes o de filtro.
      Cubre: R4, R5, R6, R7.
- [x] T10 — `store.ts`: `idsToChange(excluded)` — solo los seleccionados cuyo valor
      difiere, sin repetidos y topado a `MAX_IDS`. Cubre: R2, R3.
- [x] T11 — `store.ts`: `setExcluded(excluded)` — carril único, una sola petición,
      `adoptUpdated` por movimiento devuelto, aviso + `lastExclusion`, **siempre**
      `refreshQuietly()`, selección vaciada al terminar; `catch` con
      `writeErrorMessage` y recarga si `needsReload` (design §6, §7.1).
      Cubre: R1, R2, R10, R11, R12, R15, R16, C3, C5.
- [x] T12 — `store.ts`: `undoExclusion()` — un único `PATCH` con el valor contrario
      sobre exactamente los ids de `lastExclusion`, mismo camino de adopción, refresco
      y error; `lastExclusion = null` al terminar bien. Cubre: R14.
- [x] T13 — Casos nuevos en `src/features/statement/__tests__/store.spec.ts`: marcar
      tres (una sola petición, un solo refresco), marcar cuando dos ya estaban marcados
      (solo viajan los que cambian), selección ya en el estado pedido (**cero
      peticiones** y aviso `Nothing to change`), desmarcar, `neutral` y pierna de
      traspaso seleccionables y marcables, tope de 200, deshacer, 400 sin recarga, 404
      con recarga, segundo clic ignorado mientras hay uno en vuelo, y cambio de mes que
      vacía la selección. Cubre: R1, R2, R3, R7, R10, R11, R12, R14, R15, R16, C3, C5.
- [x] T14 — Test de regresión: las tres cifras que pinta la pantalla salen siempre de
      `totals` de la última respuesta; ninguna resta se hace en el cliente. Cubre: C3.

## Interfaz

- [x] T15 — `StatementRow.vue`: casilla cuando `selectable`, insignia de categoría no
      pulsable en ese modo, etiqueta `Not counted` junto a la de `Transfer` e importe
      atenuado cuando `excludedFromTotals`. Casos en `StatementRow.spec.ts`, incluido
      que **fuera** del modo selección no hay ninguna casilla. Cubre: R4, R5, R6, R8, R9.
- [x] T16 — `StatementSelectionBar.vue` (copia reducida de `ReviewActionBar`) + su test:
      recuento, las dos acciones, `Select all shown`, `Clear selection`, `Done`, y todo
      deshabilitado mientras hay una escritura en vuelo. Cubre: R5, C5.
- [x] T17 — `ExcludeConfirmDialog.vue` (copia de `BulkConfirmDialog`) + su test: los dos
      títulos con el número exacto, `Cancel` con el foco, y que solo aparece a partir de
      20. Cubre: R13.
- [x] T18 — `StatementList.vue`: baja `selectable` y `selectedIds`, sube `toggle`; la
      lista **no ordena ni esconde** por la marca. Casos en `StatementList.spec.ts`.
      Cubre: R8, R9.
- [x] T19 — `StatementView.vue`: el botón `Select movements` y, en su lugar, la barra
      cuando el modo está encendido; el diálogo; el aviso de éxito con `Undo`
      reutilizando `StatementActionNotice`. Casos nuevos en `StatementView.spec.ts`.
      Cubre: R5, R13, R14.
- [x] T20 — Comprobar que la **nota permanente** de `MonthTotals.vue` sigue intacta,
      visible y sin poder cerrarse, y que su test pasa **sin tocarlo**: la reescribe la
      feature siguiente, no esta. Cubre: C4.

## Cierre

- [x] T21 — `e2e/statement-exclude-from-totals.spec.ts` con los seis recorridos de
      `design.md` §9; comprobar que `e2e/statement.spec.ts`,
      `e2e/statement-fix-category.spec.ts`, `e2e/review-actions.spec.ts` y
      `e2e/category-rules.spec.ts` siguen verdes **sin tocarlos**.
      Cubre: R1, R5, R11, R12, R13, R14, R16, C7.
- [x] T22 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
      `./init.sh` en verde; escribir
      `progress/implementation/statement-exclude-from-totals.md` con la trazabilidad
      `R<n> → test`. Cubre: C7.
- [x] T23 — *(HECHA el 2026-09-29 por el leader, con visto bueno explícito del humano:
      movimiento 42373; la entrada de agosto baja de 2.590,26 € a 2.240,26 € al marcarlo
      y vuelve al deshacer. Detalle en `progress/current.md`.)* **Solo con el visto bueno explícito del humano** (escribe en datos reales):
      con el backend en `:3000`, y **antes de tocar nada**, guardar con `curl` la foto de
      **uno o dos** movimientos (`id`, `amount`, `status`, `categoryId`,
      `excludedFromTotals`) **y de los `totals` de su mes**; desde el extracto marcarlos
      y volver a desmarcarlos; volver a pedir los movimientos y los `totals` con `curl` y
      comprobar que todo queda **idéntico salvo `updatedAt`**, que las cifras bajaron y
      volvieron exactamente en ese importe, y que ni `status` ni `categoryId` cambiaron.
      Pegar las cuatro fotos en el informe. Sin visto bueno, se anota como pendiente y
      **no se ejecuta**. Cubre: C8.
