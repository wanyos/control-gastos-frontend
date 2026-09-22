# Tasks — Feature 17: category-rules

> En orden. Cada task marca `[x]` al completarse y referencia los `R<n>` que cubre.
> Antes de empezar: `./init.sh` en verde y `specs/17-category-rules/decisions.md`
> aprobado por el humano. **Ninguna task salvo T22 habla con el backend real**: todo
> va con el cliente HTTP mockeado o con `page.route`.

## T0 — Riesgos, antes de escribir código de producción

- [x] T0.1 — Con el cliente mockeado, comprobar que `http.ts` envía un `POST` con
      `init = { method: 'POST' }` **sin** `Content-Type` (solo `Accept`), y que un 204
      vacío de `DELETE` vuelve como `undefined`. Sin tocar `http.ts`. Cubre: R9, R11.
- [x] T0.2 — Comprobar que un `watch` dentro del setup store de `review` sobre un ref
      del store de reglas se dispara en los tests con Pinia de prueba
      (`setActivePinia(createPinia())`), y que no crea un import circular (`review` →
      `category-rules` solo). Si no, pasar a `rulesStore.$onAction` con `after`.
      Cubre: R14.
- [x] T0.3 — Confirmar que `normalizeMatchText` da lo mismo que `normalizeForMatch`
      del backend con `Café`, `  ÁRBOL  `, `a  b` (espacios interiores intactos) y
      `Ñandú`. Cubre: R2, R4.
- [x] T0.4 — Revisar que las parejas de color de §9 de `design.md` ya tienen su línea
      `contrast:`; añadir la que falte. Cubre: C3.

## Mover las categorías a `shared/`

- [x] T1 — Crear `src/shared/categories.ts` con `Category`, `CategoryKind`,
      `parseCategories` y `getCategories` movidos **sin cambios**; `review/types.ts` y
      `review/service.ts` los re-exportan. `src/shared/__tests__/categories.spec.ts`
      con un caso de parseo; la suite de `review` en verde sin tocarla. Cubre: C4.

## Capa de datos

- [x] T2 — `src/features/category-rules/types.ts` (`design.md` §3). Cubre: R5, R8, R12.
- [x] T3 — `service.ts`: `parseRule`, `parseRules`, `parseApplyResult`, `getRules`,
      `createRule`, `updateRule`, `deleteRule`, `applyRules`; cuerpos campo a campo;
      `updateRule` con body vacío lanza antes de la red. Cubre: R5, R8, R9, R11, C2.
- [x] T4 — `service.spec.ts`: método, ruta, cabecera y **claves exactas** del body en
      los cuatro endpoints de escritura; apply con `init` exactamente
      `{ method: 'POST' }`; respuestas que no cumplen → `ValidationError` con su ruta;
      `error` ausente / `null` / con `code`. Cubre: R5, R8, R9, R11, C2.

## Lógica pura

- [x] T5 — `rules.ts`: `normalizeMatchText`, `MIN_MATCH_TEXT`, `BANK_BOILERPLATE`,
      `proposeMatchText`, `isMatchTextTooShort`, `ruleErrorMessage`,
      `applyErrorMessage`, `applySummaryLines`. Cubre: R2, R4, R6, R9, R12, R13.
- [x] T6 — `rules.spec.ts`: los cuatro ejemplos de R2; los casos cortos de R4; los
      textos de la tabla de `design.md` §6 uno por caso, comprobando que ninguno
      contiene el `message` del cuerpo; singular y plural del resultado.
      Cubre: R2, R4, R6, R12, R13.

## Estado

- [x] T7 — `store.ts` de reglas: lista, carga, categorías, `create`, `update`,
      `remove` con un solo envío a la vez y la recarga de R6. Cubre: R4, R5, R6, R7,
      R8, R9.
- [x] T8 — `applyFlow`, `openApply`, `confirmApply`, `closeApply` (no cierra en
      `applying`) y `applyRun++` en `finally`. Cubre: R10, R11, R13.
- [x] T9 — `store.spec.ts` de reglas: doble clic sin segunda petición (crear y
      aplicar); 201 sin llamadas a `/apply` ni a `/api/movements`; editar sin cambios
      = 0 llamadas; editar y borrar sin llamadas a `/api/movements`; 404 al borrar
      quita la fila; recarga tras 404 e ilegible, no tras 409; cancelar la aplicación
      = 0 llamadas; `applyRun` sube con éxito, con `error` y con excepción.
      Cubre: R4, R5, R6, R8, R9, R10, R11, R13.
- [x] T10 — `review/store.ts`: observar `applyRun` → `clearSelection()`,
      `refreshAfterAction()` si hay `result`, `refreshPendingCount()`; casos nuevos en
      `review/__tests__/store.spec.ts`. Cubre: R14.

## Interfaz

- [x] T11 — `RuleDialog.vue` + test (propuesta editable, categorías del `kind`,
      preselección, `Choose a category…`, error de R4, mensaje de R6, `loading`,
      modos crear y editar). Cubre: R2, R3, R4, R6, R8.
- [x] T12 — `MovementRow.vue` (`Create rule`) y `MovementList.vue` (reenvío);
      **sustituir** el test de la F16 que fija los controles de la fila
      (`design.md` §10). Cubre: R1, C4.
- [x] T13 — `RuleCreatedNotice.vue` + montar en `ReviewView.vue` `RuleDialog`, el
      aviso y `ApplyRulesDialog`; casos nuevos en `ReviewView.spec.ts` (abrir, crear,
      aviso, `Apply rules now` abre la confirmación). Cubre: R1, R5, R10.
- [x] T14 — `ApplyRulesDialog.vue`, `ApplyResult.vue`, `RuleConflictList.vue` + tests
      (los cuatro pasos, sin cerrar en `applying`, cifras, 14 conflictos pintados,
      `and N more not listed`, sin controles en la lista, sin cifras en `failed`).
      Cubre: R10, R11, R12, R13.
- [x] T15 — `RuleList.vue`, `RuleRow.vue`, `DeleteRuleDialog.vue`, `RulesView.vue` +
      `RulesView.spec.ts` (lista en orden, vacío, error con `Try again`, editar, borrar
      con confirmación y cancelar, `Apply rules` deshabilitado con 0 reglas).
      Cubre: R7, R8, R9, R10.
- [x] T16 — Ruta `/rules` con `WandSparkles` tras `review`; **sustituir** la lista
      esperada de `router.spec.ts:63`. Cubre: R7, C4.

## Cierre

- [x] T17 — Repasar textos (todo en inglés), colores (solo alias semánticos) y
      `theme-dark.spec.ts` en verde. Cubre: C3.
- [x] T18 — `e2e/category-rules.spec.ts` con los cinco escenarios de `design.md` §11;
      `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts` y `e2e/app-boot.spec.ts`
      verdes sin tocarlos. Cubre: R1, R2, R5, R6, R8, R9, R11, R12, R14, C4.
- [x] T19 — Grep de cierre: ningún `POST`/`PATCH`/`DELETE` a `/api/categories`; ningún
      body con otra clave que `matchText`/`categoryId`; `category-rules/` no importa de
      `review/` ni de `import/`. Cubre: C1, C2.
- [x] T20 — `docs/architecture.md`: árbol con `features/category-rules/` y
      `shared/categories.ts`, y la nota de la dependencia `review` → `category-rules`.
      Cubre: C4.
- [x] T21 — Puerta: `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
      `./init.sh` en verde; `progress/implementation/category-rules.md` con la
      trazabilidad `R<n> → test`. Cubre: C5.
- [x] T22 — **Solo con el visto bueno explícito del humano** (escribe en datos reales,
      en masa, y apply no se deshace desde la API). Con el backend en `:3000` y
      `pnpm dev`, pulsando en la interfaz:
      1. **Foto previa** con `curl`: los ids de todos los movimientos
         `status=pending_review&uncategorized=true` (páginas de 200), en un fichero
         del scratchpad, fuera del repo; y `GET /api/category-rules` entero.
      2. Elegir con el humano **un** movimiento pendiente sin categoría y un texto que
         `GET /api/movements?q=<texto>&status=pending_review&uncategorized=true`
         devuelva en 1-2 movimientos.
      3. Crear la regla desde su fila (anotar el texto propuesto); probar que crear
         otra vez el mismo texto da el aviso de 409 y que `ab` no deja guardar.
      4. `Apply rules now` → confirmar → anotar las tres cifras.
      5. **Foto posterior** y diferencia: los ids que salieron de «sin categoría»
         tienen que ser los del paso 2. **Si salen más** (otras reglas actuaron sobre
         movimientos que alguien des-categorizó), **se para** y se le enseñan al humano
         antes de tocar nada: pueden ser categorizaciones correctas que quiera
         conservar.
      6. Vuelta atrás acordada: `PATCH /api/movements` con esos ids y
         `categoryId: null`; en `/rules`, cambiar la regla (texto) y borrarla; nueva
         foto igual a la del paso 1 y `GET /api/category-rules` igual al inicial.
      Sin visto bueno, se anota como pendiente en el resumen y no bloquea el cierre.
      Cubre: C6.
