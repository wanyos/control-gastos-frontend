# Tasks — F33 `suggested-rules`

Dos lotes en secuencia: todo el código y sus tests unitarios en uno (el store, los
componentes y las vistas cambian a la vez la forma de `lastCreated` y de `LastApply`, y
partirlo dejaría un lote sin compilar), y las pruebas de navegador y los documentos
después.

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies. Ningún dato de
prueba nuevo lleva nombres de personas, comercios reales ni números de cuenta reales
(usa textos como `academia ficticia norte`, `supermercado inventado`).

## Lote A — propuestas, resultado de crear o cambiar una regla, y lo que lo enseña
Archivos: `src/features/category-rules/types.ts`, `src/features/category-rules/service.ts`, `src/features/category-rules/rules.ts`, `src/features/category-rules/store.ts`, `src/features/category-rules/components/SuggestedRuleList.vue`, `src/features/category-rules/components/SuggestedRuleRow.vue`, `src/features/category-rules/components/RuleCreatedNotice.vue`, `src/features/category-rules/components/LastApplyReport.vue`, `src/features/category-rules/components/RuleMatchPreview.vue`, `src/features/category-rules/views/RulesView.vue`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/service.spec.ts`, `src/features/category-rules/__tests__/rules.spec.ts`, `src/features/category-rules/__tests__/store.spec.ts`, `src/features/category-rules/__tests__/SuggestedRuleRow.spec.ts`, `src/features/category-rules/__tests__/RuleCreatedNotice.spec.ts`, `src/features/category-rules/__tests__/LastApplyReport.spec.ts`, `src/features/category-rules/__tests__/RuleMatchPreview.spec.ts`, `src/features/category-rules/__tests__/RulesView.spec.ts`, `src/features/review/views/ReviewView.vue`, `src/features/review/__tests__/ReviewView.spec.ts`, `src/features/review/__tests__/fixtures.ts`, `src/features/statement/store.ts`, `src/features/statement/views/StatementView.vue`, `src/features/statement/__tests__/store.spec.ts`, `src/features/statement/__tests__/StatementView.spec.ts`, `src/features/statement/__tests__/fixtures.ts`
Depende de: —

- [x] T1 — `types.ts` y fixtures (design §1 y §2): `SuggestedMovement`, `SuggestedRule`,
  `SavedRule`, `ResultCause`, y `LastApply` con `cause` y `rule`. En
  `category-rules/__tests__/fixtures.ts`, una respuesta inventada de propuestas (tres, una
  de ingresos, una con `manualMatches: 2`) y una respuesta de `POST` con `categorization`.
  Añade `categorization` a `CREATED_RULE` de `review/__tests__/fixtures.ts` y de
  `statement/__tests__/fixtures.ts` (`categorized: 0`, listas vacías). Cubre: R1–R16
  (soporte).
- [x] T2 — `service.ts` (design §2). Tests en `service.spec.ts`:
  `reads the suggested rules of the contract`,
  `rejects a suggested rule whose count does not match its movements`,
  `reads the rule and what its pass moved from the answer of a create`,
  `rejects a create answer without categorization`. Los tests de la feature 30 sobre
  `parseApplyResult` no cambian. Cubre: R4, R5, R12.
- [x] T3 — `rules.ts`: los textos de design §5. Tests en `rules.spec.ts`:
  `writes the headline of a created or changed rule with how many it moved`,
  `writes how many movements categorized by hand also contain the text`,
  `names the kind of a suggestion and how many movements it would take`.
  Cubre: R1, R5, R6, R9, R11, R16.
- [x] T4 — `store.ts` (design §3). Tests en `store.spec.ts`:
  `creating a rule leaves its result in the box and in the line of the created rule`,
  `only one create travels at a time from the suggestions`,
  `drops the used suggestion and asks for the list again after the rule is created`,
  `keeps the unused suggestions after a rule is created from another`,
  `a rejected create from a suggestion leaves the suggestions the rules and the result as they were`
  (400, 404, 409 y red: comprueba que la única petición es el `POST`),
  `a create whose pass did not finish keeps the rule and says the rest will move later`,
  `creating or changing a rule makes Review and Movements ask again` (sube `applyRun`;
  también tras un 500),
  `changing deleting or applying rules asks for the suggestions again`,
  `a suggestion load that fails or does not follow the contract leaves no list`,
  `changing a rule leaves its result in the box`. Ajusta los tests existentes que leían
  `lastCreated` como una regla. Cubre: R4, R5, R6, R7, R8, R10, R11, R12, R14, R15.
- [x] T5 — `statement/store.ts` vigila `applyRun` (design §4). Test en
  `statement/__tests__/store.spec.ts`:
  `asks for the month again when a rule is created or changed`. Cubre: R14.
- [x] T6 — `SuggestedRuleRow.vue` y `SuggestedRuleList.vue` (design §4). Tests en
  `SuggestedRuleRow.spec.ts`:
  `shows the text the kind and how many movements a suggestion would take`,
  `shows the movements of a suggestion before any rule is created` (sin ninguna petición),
  `offers only categories of its kind and no category chosen`,
  `keeps Create rule off until a category is chosen`,
  `says how many movements categorized by hand also contain the text and that they will not move`,
  `offers no way to dismiss a suggestion`,
  `paints the failure of a create in the row of its suggestion`.
  Cubre: R1, R2, R3, R8, R9, R10.
- [x] T7 — `RuleCreatedNotice.vue` (design §4). Tests en `RuleCreatedNotice.spec.ts`
  (nuevo): `says how many movements the new rule categorized and offers no Apply rules now`,
  `adds the unfinished sentence when the pass of the new rule did not finish`.
  Cubre: R6, R11, R13.
- [x] T8 — `LastApplyReport.vue`. Tests en `LastApplyReport.spec.ts`:
  `heads the box with the rule and its category when a rule was created or changed`,
  `adds the unfinished sentence to the box of a rule whose pass did not finish`. Los tests
  de la feature 30 siguen igual (sus fixtures llevan `cause: 'apply'`). Cubre: R5, R11.
- [x] T9 — `RuleMatchPreview.vue`: `PREVIEW_NOTE`. Test en `RuleMatchPreview.spec.ts`:
  `says that saving also moves the movements the closing of the import categorized`.
  Cubre: R16.
- [x] T10 — `RulesView.vue` (design §4). Tests en `RulesView.spec.ts`:
  `lists the suggested rules in the order of the answer`,
  `shows the loading the failure with Try again and the empty list of suggestions`,
  `draws the line of the created rule inside the block that sticks under the top bar`,
  `the intro says that creating or changing a rule also moves movements`. Renombra
  `says there are none, and offers no way to make one from here (R7)` a
  `says there are no rules yet` y quítale la parte de «no way to make one». Los tests de
  la feature 30 de este archivo siguen pasando con su nombre. Cubre: R1, R6, R12, R16.
- [x] T11 — `ReviewView.vue` (design §4) y `ReviewView.spec.ts`: los tests que pulsaban
  `apply-rules-now` o esperaban verlo pasan a esperar que no exista; `holds the rule
  notice or the action notice, never both (R4, C5)` conserva su nombre. Test nuevo:
  `the rule notice in Review says how many it moved and has no Apply rules now`. Los tests
  con nombre en los checks de las features 27 y 30 conservan nombre y pasan. Cubre: R6,
  R13.
- [x] T12 — `StatementView.vue` (solo el comentario de la ventana de crear regla) y
  `StatementView.spec.ts` (la respuesta del `POST` con `categorization`; el test
  `creating the rule writes nothing on the movement it was born from (R17)` conserva su
  nombre). Cubre: R14 (soporte).

## Lote B — pruebas de navegador y documentos
Archivos: `e2e/category-rules.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `docs/guia-de-uso.md`, `docs/architecture.md`
Depende de: Lote A

- [ ] T13 — `e2e/category-rules.spec.ts`: en `prepare`, una ruta para
  `GET /api/category-rules/suggestions` (con una opción para la lista y para hacerla
  fallar) **antes** de la de `**/api/category-rules/*`, y `categorization` en las
  respuestas del `POST` y del `PATCH` (moviendo en `rows` lo que diga). Adapta
  `a rule is born from a row, and creating it applies nothing` (renómbralo a
  `a rule is born from a row and its line says how many movements it moved`) y
  `applying asks first, sends one bodyless POST and refreshes the queue` (abre la
  aplicación desde `/rules` con `apply-rules`). Tests nuevos:
  `a suggested rule becomes a rule and the box lists the movements it moved`
  (elige categoría, pulsa `Create rule`, comprueba el único `POST` con su cuerpo, la
  cabecera del recuadro, `Show the N movements` con sus filas, y que la propuesta ya no
  está), `the line of a rule created from a suggestion low in the list is in view`,
  `a create from a suggestion that fails leaves the list as it was and says why`.
  `the result of applying stays in view from Rules to Review` conserva su nombre y pasa.
  Cubre: R4, R5, R6, R7, R10, R13.
- [ ] T14 — `e2e/action-notice-in-view.spec.ts`: el `POST` simulado devuelve
  `categorization` y mueve en `rows` las filas que casan, como haría el backend.
  `applyRulesInReview` deja de pulsar `apply-rules-now`: crear la regla ya deja el
  recuadro (cabecera `Rule “panaderia” → Transport created at …`). Renombra
  `Review keeps the rule notice and Apply rules now in view from the bottom of the list`
  a `Review keeps the rule notice in view from the bottom of the list` y quítale lo de
  `apply-rules-now`. **No toques `feature_list.json`**: el check de la feature 27 que
  filtra por el nombre viejo lo cambia el leader (está en la hoja). Los demás tests con
  nombre en los checks de la feature 27 conservan su nombre y pasan. Cubre: R13, R14.
- [ ] T15 — `docs/guia-de-uso.md`, sección `6. Rules` y donde se cite `Apply rules now`.
  **El archivo tiene notas del humano** (líneas que empiezan por `--` y bloques
  «Mis notas de esta prueba»): no se tocan, y no se reescribe el texto de un paso que
  tenga debajo un `-- ok` suyo. Donde un paso así ya no es verdad (el 9 de crear una
  regla), se añade un paso nuevo **después** de su `-- ok` con lo que pasa ahora. Se
  corrigen el párrafo «Para qué sirve» de `Rules`, las filas `Create rule` y
  `Edit → Save` de las tablas «Qué escribe y cómo se deshace», y la nota de la cabecera
  sobre `Apply rules now`. Pasos nuevos para la lista de reglas propuestas. Cubre: —
  (documento).
- [ ] T16 — `docs/architecture.md`: componentes nuevos de `category-rules`, `getSuggestions`
  y `parseSavedRule` en el servicio, `RuleCreatedNotice` sin `Apply rules now` en el
  párrafo de la feature 27, y que `statement/store.ts` vigila `applyRun`. Cubre: —
  (documento).
