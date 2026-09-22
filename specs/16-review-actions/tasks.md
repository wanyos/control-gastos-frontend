# Tasks — Feature 16: review-actions

> En orden. Cada task marca `[x]` al completarse y referencia los `R<n>` que cubre.
> Antes de empezar: `./init.sh` en verde y `specs/16-review-actions/decisions.md`
> aprobado por el humano.

## T0 — Riesgos, antes de escribir código de producción

- [x] T0.1 — Con respuestas simuladas (vitest, sin backend), comprobar **cómo se
      comporta la lista al vaciarse una página entera**: confirmar los 100 de una
      página 2 de 2 y ver qué responde el refresco (`page=2` deja de existir →
      400 del contrato → reintento único a `page=1` de la F15, `store.ts:97`). Si el
      reintento no cubre el caso, ajustar el refresco silencioso **antes** de seguir.
      Cubre: R10.
- [x] T0.2 — Comprobar el **caso de 200 ids**: una página simulada de 200 movimientos
      (`pageSize=200` forzado en el fixture) selecciona los 200 y produce **una** sola
      petición; 201 ids lanzan el `ValidationError` local sin tocar el HTTP. Cubre:
      R2, R9.
- [x] T0.3 — Confirmar los nombres de icono `Check`, `Undo2` y `Tag` en `@lucide/vue`
      y medir las dos líneas `contrast:` nuevas de `design.md` §8; si alguna baja del
      umbral, aplicar el plan B escrito allí. Cubre: C2.
- [x] T0.4 — Verificar que `services/http.ts` manda bien un `PATCH` con cuerpo JSON
      (cabecera y `body`) con el cliente mockeado, sin tocar `http.ts`. Cubre: R4, R9.

## Capa de datos

- [x] T1 — Añadir `MovementChanges`, `BulkUpdate`, `BulkResult`, `UndoGroup` y
      `LastAction` a `src/features/review/types.ts`. Cubre: R4, R6, R13.
- [x] T2 — En `service.ts`: exportar `parseMovement`, añadir `parseBulkResult`,
      `updateMovement` y `updateMovements` (body campo a campo, dedupe, guarda de
      `MAX_IDS`) y actualizar la cabecera del archivo. Cubre: R4, R5, R6, R7, R9.
- [x] T3 — Tests de `service.spec.ts`: método, ruta, cabecera y **claves exactas** del
      body en los dos endpoints; 0 ids y 201 ids lanzan sin llamar al cliente; ids
      repetidos se deduplican; respuesta que no cumple la forma → `ValidationError`.
      Cubre: R4, R5, R9.

## Lógica pura

- [x] T4 — Crear `src/features/review/actions.ts` con `eligibleForCategory`,
      `undoPlan`, `actionSummary`, `actionErrorMessage`, `BULK_CONFIRM_THRESHOLD` y
      `MAX_IDS`. Cubre: R7, R8, R12, R13.
- [x] T5 — `actions.spec.ts`: elegibilidad con `expense`/`income`/`neutral` y con
      `kind: null`; plan de deshacer de una confirmación (un grupo) y de una
      categorización con categorías previas distintas (dos grupos); los cinco textos
      de error; los textos de resumen en singular y plural. Cubre: R7, R12, R13.

## Estado

- [x] T6 — Ampliar `store.ts`: `selectedIds`, `isActing`, `actionError`,
      `lastAction`, `toggleSelection`, `selectPage`, `clearSelection`; vaciar
      selección y aviso en `load`, `apply` y `goToPage`. Cubre: R1, R2, R3.
- [x] T7 — Añadir `runAction`, `categorizeOne`, `confirmOne`, `confirmSelected`,
      `categorizeSelected` y `applyUpdated` (sustituir / quitar filas, decremento de
      `pendingCount`, refresco silencioso de la página). Cubre: R4, R5, R6, R7, R10,
      R11, R12.
- [x] T8 — Añadir `undoLast` (grupos en serie, parada al primer fallo, refresco y
      mensaje). Cubre: R13, R14.
- [x] T9 — Casos nuevos en `store.spec.ts`: selección y su vaciado; una llamada por
      acción; doble clic sin segunda petición; filas sustituidas vs. quitadas;
      `pendingCount`; refresco tras 200, 404 y respuesta ilegible; ausencia de refresco
      tras un 400 con la selección intacta; deshacer completo y deshacer a medias.
      Cubre: R1, R3, R5, R6, R10, R11, R12, R13, R14.

## Interfaz

- [x] T10 — `BaseSelect.labelHidden` y `BaseCheckbox` con `indeterminate`, `disabled`
      y `ariaLabel`; casos en `BaseComponents.spec.ts`. Cubre: R1, R2, R4.
- [x] T11 — `MovementCategorySelect.vue` + su test (filtrado por `kind`, opción
      `No category`, `neutral` deshabilitado con su texto). Cubre: R4.
- [x] T12 — `MovementRow.vue`: casilla, selector, botón `Confirm`, estilo de fila
      seleccionada; **sustituir** el test `MovementRow.spec.ts:70` por el equivalente
      de `design.md` §9. Cubre: R1, R4, R5, C4.
- [x] T13 — `MovementList.vue`: casilla «seleccionar todo» con indeterminado y
      recuento; casos en `MovementList.spec.ts`. Cubre: R2.
- [x] T14 — `ReviewActionBar.vue` + `CategorySelect` con `placeholder`/`kind` + su
      test (recuento, `Applies to N of M selected`, botones deshabilitados sin
      elegibles, estado de carga). Cubre: R6, R7, R11.
- [x] T15 — `BulkConfirmDialog.vue` y `ActionNotice.vue` + sus tests (umbral de 20,
      cancelar no envía nada, aviso de éxito con `Undo`, mensaje de error).
      Cubre: R8, R12, R13.
- [x] T16 — `ReviewView.vue`: montar los tres componentes nuevos y conectar los
      eventos con el store; casos nuevos en `ReviewView.spec.ts` y **sustituir** el
      test `:296` por el de `design.md` §9. Cubre: R1, R6, R8, R10, R13.

## Cierre

- [x] T17 — Líneas `contrast:` nuevas en `theme-dark.css` y `theme-dark.spec.ts` en
      verde; repasar que no haya un solo color crudo ni texto en español. Cubre: C2.
- [x] T18 — `e2e/review-actions.spec.ts` con los cinco escenarios de `design.md` §10;
      comprobar que `e2e/review-queue.spec.ts` y `e2e/app-boot.spec.ts` siguen verdes
      sin tocarlos. Cubre: R6, R7, R10, R12, R13, C3.
- [x] T19 — Actualizar la nota de `docs/architecture.md` sobre `features/review/`
      (deja de ser de solo lectura) y el árbol de componentes. Cubre: C3.
- [x] T20 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
      `./init.sh` en verde; escribir `progress/implementation/review-actions.md` con
      la trazabilidad `R<n> → test`. Cubre: C5.
- [x] T21 — **Solo con el visto bueno explícito del humano** (escribe en datos
      reales): con el backend en `:3000`, confirmar **un** movimiento y deshacerlo, y
      categorizar **dos** y deshacerlos, comprobando con `curl` que quedan como
      estaban. Si no hay visto bueno, anotarlo como pendiente en el resumen. Cubre: C6.
      **PENDIENTE:** el humano no dio el visto bueno en esta sesión (instrucción
      explícita de no lanzar ningún PATCH contra el backend real de `:3000`, con
      1.607 pendientes). Queda anotado en el informe y en el resumen.
