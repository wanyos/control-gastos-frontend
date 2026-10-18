# Tasks — F34 `manual-category-offers-rule`

Dos lotes en secuencia, como en la feature 33: todo el código y sus pruebas unitarias en
uno (el store de reglas, el componente nuevo, las dos pantallas y `shared/movements.ts`
cambian a la vez y partirlo dejaría un lote sin compilar), y las pruebas de navegador y
los documentos después.

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies. Ningún dato de
prueba lleva nombres de personas, comercios reales ni números de cuenta reales (usa
conceptos como `RECIBO /Academia Ficticia Norte`, `SUPERMERCADO INVENTADO 4521`,
`8812 KIOSCO DE PRUEBA`, los del propio contrato). **No apuntes nada en
`docs/roadmap.md`**: los cabos sueltos los numera el leader.

## Lote A — la pregunta, el origen de la categoría y las dos pantallas
Archivos: `src/features/category-rules/types.ts`, `src/features/category-rules/service.ts`, `src/features/category-rules/rules.ts`, `src/features/category-rules/store.ts`, `src/features/category-rules/components/OtherMovementsQuestion.vue`, `src/features/category-rules/components/RuleDialog.vue`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/service.spec.ts`, `src/features/category-rules/__tests__/rules.spec.ts`, `src/features/category-rules/__tests__/store.spec.ts`, `src/features/category-rules/__tests__/OtherMovementsQuestion.spec.ts`, `src/shared/movements.ts`, `src/shared/__tests__/movements.spec.ts`, `src/features/review/store.ts`, `src/features/review/views/ReviewView.vue`, `src/features/review/components/MovementRow.vue`, `src/features/review/__tests__/store.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`, `src/features/review/__tests__/MovementRow.spec.ts`, `src/features/review/__tests__/fixtures.ts`, `src/features/statement/store.ts`, `src/features/statement/views/StatementView.vue`, `src/features/statement/components/StatementRow.vue`, `src/features/statement/__tests__/store.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/statement/__tests__/StatementRow.spec.ts`, `src/features/statement/__tests__/fixtures.ts`
Depende de: —

- [x] T1 — `types.ts` (design §2) y fixtures. En `category-rules/__tests__/fixtures.ts`,
  respuestas inventadas del preview: una con dos movimientos de la regla nueva
  (`ruleId: null`) y uno movido por otra regla, una sin ninguno, y el cuerpo de un 409.
  En `review/__tests__/fixtures.ts` y `statement/__tests__/fixtures.ts`, un movimiento con
  `categorySource: 'closing'` en `Otros gastos`. Cubre: R1–R15 (soporte).
- [x] T2 — `shared/movements.ts` (design §5, `categorySource`): tipo, lectura en
  `parseMovement` y `closingSourceLine`. Tests en `movements.spec.ts`:
  `reads categorySource and takes an absent one as null`,
  `rejects a categorySource outside the three of the contract`. Cubre: R15.
- [x] T3 — `service.ts`: `getRulePreview` y `parseRulePreview` (design §2). Tests en
  `service.spec.ts`: `asks the preview with only matchText and categoryId`,
  `keeps only the movements of the new rule from a preview`,
  `rejects a preview whose list does not add up`. Cubre: R1, R3.
- [x] T4 — `rules.ts`: `suggestionTextOf`, `MIN_SUGGESTION_TEXT`, los textos de design §6
  y `TOO_SHORT` (que `RuleDialog.vue` pasa a importar de aquí, sin cambiar su texto).
  Tests en `rules.spec.ts`:
  `the suggested text of a description follows the five steps of the contract` (los
  cinco ejemplos de la tabla del contrato, `ABC 1234` da null),
  `writes how many other movements would move to the category`. Cubre: R2, R3, R7.
- [x] T5 — `store.ts`: `question`, `offerRule`, `checkQuestionText`, `acceptQuestion`,
  `dismissQuestion` (design §4). Tests en `store.spec.ts`:
  `a change of category asks the preview with the suggested text and the chosen category and opens the question`,
  `asks nothing when no other movement would move`,
  `asks nothing when a rule already uses the suggested text` (409),
  `asks nothing when the preview fails or the description gives no suggested text`
  (500, red, y una descripción como `ABC 1234`: ninguna petición),
  `editing the text asks the preview again and only the last answer counts`,
  `a text another rule uses or too short leaves the question unable to create`,
  `saying yes sends one POST with the text of the box and closes the question`
  (comprueba también `lastCreated` y que sube `applyRun`),
  `a rejected create from the question says why and changes nothing else`
  (400, 404, 409 y red: la única petición es el `POST`),
  `dismissing the question sends nothing`. Cubre: R1, R5, R6, R7, R8, R10, R11, R12, R13.
- [x] T6 — `OtherMovementsQuestion.vue` (design §5). Tests en
  `OtherMovementsQuestion.spec.ts` (nuevo):
  `shows how many other movements would move and lists them before anything is created`
  (lista plegada; desplegarla no pide nada),
  `asks again after the text is edited and keeps Create rule off while it checks`,
  `says no other movement would move and keeps Create rule on`,
  `says why Create rule is off for a short text a taken text or a failed check`,
  `emits create on Create rule and dismiss on No only this one`,
  `paints the failure of a create inside the question`. Cubre: R3, R4, R5, R6, R7, R12,
  R13.
- [x] T7 — `review/store.ts` (`categorizeOne` devuelve el movimiento o `null`) y
  `statement/store.ts` (`categorize`, igual). Tests:
  `categorizeOne gives back the movement the PATCH answered or null` en
  `review/__tests__/store.spec.ts` y
  `categorize gives back the movement the PATCH answered or null` en
  `statement/__tests__/store.spec.ts`. Los demás tests de los dos stores no cambian de
  nombre y pasan. Cubre: R1 (soporte).
- [x] T8 — `ReviewView.vue` (design §5). Tests en `ReviewView.spec.ts`:
  `changing the category of one row in Review opens the question under the notice`,
  `saying yes in Review creates the rule and the line says how many it moved`,
  `giving a category to several rows at once asks nothing`,
  `Undo or another action in Review closes the question`. Los tests con nombre en los
  checks de las features 27, 30 y 33 conservan su nombre y pasan. Cubre: R1, R9, R11,
  R13, R14.
- [x] T9 — `StatementView.vue` (design §5, también `RuleCreatedNotice` en su bloque bajo
  la barra). Tests en `StatementView.spec.ts`:
  `changing the category of one line in Movements opens the question under the notice`,
  `Movements shows the line of a created rule and the next write takes it away`,
  `Undo or another write in Movements closes the question`. El test
  `creating the rule writes nothing on the movement it was born from (R17)` conserva su
  nombre y pasa. Cubre: R1, R11, R13, R14.
- [x] T10 — `MovementRow.vue` y `StatementRow.vue`: `closingSourceLine` en la línea gris
  bajo la descripción. Test con el mismo nombre en `MovementRow.spec.ts` y en
  `StatementRow.spec.ts`:
  `says the category was set when the import was closed only for that source` (con
  `closing` sale; con `manual`, `rule`, `null` y sin el campo, no). Cubre: R15.

## Lote B — pruebas de navegador y documentos
Archivos: `e2e/manual-category-offers-rule.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `e2e/statement-fix-category.spec.ts`, `docs/architecture.md`, `docs/guia-de-uso.md`, `src/features/review/__tests__/service.spec.ts`
> **Corrección del leader (2026-10-18):** se añade `src/features/review/__tests__/service.spec.ts` a este lote. Su test `keeps the whole movement, not only the painted fields` compara el movimiento entero con un objeto escrito a mano, y desde design §5 el movimiento leído trae `categorySource: null`. Solo se añade `categorySource: null,` al objeto esperado; nada más de ese archivo.
Depende de: Lote A

- [x] T11 — `e2e/manual-category-offers-rule.spec.ts` (nuevo). Sin backend: primero una
  ruta `**/api/**` que aborta y apunta todo lo no previsto, como en
  `e2e/action-notice-in-view.spec.ts`; después el mes de `Movements`, las categorías, el
  `PATCH` de un movimiento, `GET /api/category-rules/preview` (que mira `matchText` y
  `categoryId` y contesta según el texto) y el `POST` de regla con `categorization`, que
  mueve en las filas lo que diga. Tests:
  `in Movements saying yes creates the rule and the line says how many movements it moved`
  (cambia la categoría de `RECIBO /Academia Ficticia Norte`, ve la pregunta con
  `academia ficticia norte`, despliega los movimientos, pulsa `Create rule`, comprueba que
  las escrituras son exactamente el `PATCH` y un `POST` con ese cuerpo, y la línea verde
  con el número),
  `saying no sends nothing after the change of the one movement` (las escrituras son solo
  el `PATCH`),
  `editing the text asks the preview again and the count follows it`. Cubre: R1, R3, R4,
  R5, R10, R11, R13.
- [x] T12 — `e2e/action-notice-in-view.spec.ts`: una ruta para
  `**/api/category-rules/preview*` en los montajes de `Review` y de `Movements` (por
  defecto 200 sin movimientos de la regla nueva: no sale la pregunta), para que ningún
  test existente vea una petición abortada. Test nuevo:
  `the question about other movements sits under the notice and is in view from a low row`
  (en `Review`, cambia la última fila con un preview que trae movimientos: la línea, el
  `Undo` y la pregunta están a la vista y no se solapan). Los tests con nombre en los
  checks de las features 27 y 33 conservan su nombre y pasan. Cubre: R14.
- [x] T13 — `e2e/statement-fix-category.spec.ts`: la misma ruta del preview (200 sin
  movimientos de la regla nueva), solo si sin ella algún test falla por la petición
  abortada o por el error de consola; ninguna aserción existente cambia. Cubre: R8
  (soporte).
- [x] T14 — `docs/architecture.md`: `OtherMovementsQuestion` en la lista de componentes de
  `category-rules`, `getRulePreview` en el servicio, `categorySource` en
  `shared/movements.ts`, y en la nota de la feature 27: `Movements` también pinta
  `RuleCreatedNotice`, y la pregunta va en el mismo `StickyBelowTopBar`. Cubre: —
  (documento).
- [x] T15 — `docs/guia-de-uso.md`, secciones `4. Movements` (corregir la categoría) y
  `5. Review` (sobre un solo movimiento): pasos nuevos para la pregunta (sí, no, cambiar
  el texto, cuándo no sale) y para `Set when the import was closed`. **El archivo tiene
  notas del humano** (líneas que empiezan por `--` y bloques «Mis notas de esta prueba»):
  no se tocan, y no se reescribe el texto de un paso que ya tenga debajo una nota suya.
  Si un paso ya probado deja de ser verdad (el 15 de `Movements` o el 10 de `Review`), el
  texto nuevo va en un párrafo aparte **debajo de su nota**. Cubre: — (documento).
