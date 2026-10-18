# manual-category-offers-rule — implementación

## Lote A — implementación

Nada de lo ejecutado escribió en la base de datos ni en carpetas de datos del humano: todo
son pruebas unitarias con `fetch` simulado y las pruebas de navegador del propio
`./init.sh`, con el backend simulado.

**Estado: 10 de 10 tasks del Lote A cerradas (T1–T10), con un bloqueo que no puedo
resolver dentro de mis archivos** (ver «Bloqueo» abajo). `./init.sh` sale en rojo por ese
bloqueo y por pruebas de navegador que son del Lote B.

### Bloqueo: un test fuera de la cabecera `Archivos:` del Lote A

- **Archivo:** `src/features/review/__tests__/service.spec.ts` (no está en la cabecera del Lote A ni en la del B).
- **Test:** `parseMovementPage (R3, R4, R9) > keeps the whole movement, not only the painted fields`.
- **Error** (ejecutado con `pnpm exec vitest run src/features/review/__tests__/service.spec.ts -t "keeps the whole movement, not only the painted fields"`):

  ```
  AssertionError: expected { id: 10, type: 'expense', …(21) } to deeply equal { id: 10, type: 'expense', …(20) }
  +   "categorySource": null,
   ❯ src/features/review/__tests__/service.spec.ts:93:22
  ```

- **Por qué:** design §5 dice que `parseMovement` lee `categorySource` «ausente → `null`».
  Ese test compara con `toEqual` el movimiento leído entero con un objeto escrito a mano
  que no tiene la clave; ahora el movimiento leído lleva `categorySource: null`.
- **Arreglo que propongo (no aplicado):** añadir `categorySource: null,` al objeto
  esperado de ese test (una línea, junto a `categoryId: 1`). La otra salida sería que una
  respuesta sin el campo deje la clave sin poner en vez de `null`, que contradice design §5
  y el nombre del test de T2 (`reads categorySource and takes an absent one as null`).

### Archivos modificados / creados

Todos dentro de la cabecera `Archivos:` del Lote A, más `tasks.md` (marcas `[x]`):

- `src/features/category-rules/types.ts` — `PreviewMovement`, `RulePreview`, `QuestionCheck`, `OtherMovementsQuestionState`, `ManualChange`.
- `src/features/category-rules/service.ts` — `PREVIEW_PATH`, `getRulePreview`, `parseRulePreview`.
- `src/features/category-rules/rules.ts` — `MIN_SUGGESTION_TEXT`, `suggestionTextOf`, `TOO_SHORT`, `questionHeadline`, `otherMovementsLine`, `QUESTION_HINT`, `QUESTION_NONE`, `QUESTION_CHECKING`, `QUESTION_TAKEN`, `QUESTION_CHECK_FAILED`.
- `src/features/category-rules/store.ts` — `question`, `offerRule`, `checkQuestionText`, `acceptQuestion`, `dismissQuestion`.
- `src/features/category-rules/components/OtherMovementsQuestion.vue` (nuevo).
- `src/features/category-rules/components/RuleDialog.vue` — importa `TOO_SHORT` de `rules.ts` (mismo texto).
- `src/shared/movements.ts` — `CategorySource`, campo opcional `categorySource`, lectura en `parseMovement`, `CLOSING_SOURCE_LABEL`, `closingSourceLine`.
- `src/features/review/store.ts` — `categorizeOne` devuelve `Movement | null` (`runAction` y `write` devuelven su resultado).
- `src/features/statement/store.ts` — `categorize` devuelve `Movement | null` (`runWrite` y `write` igual).
- `src/features/review/views/ReviewView.vue` — la pregunta en `StickyBelowTopBar` debajo de `RuleCreatedNotice` / `ActionNotice`; `dismissQuestion` en `onCategorizeOne`, `onConfirmOne`, `run`, `onConfirmAll`, `onCreateRule`, `onUndo` y al desmontar.
- `src/features/statement/views/StatementView.vue` — `RuleCreatedNotice` (v-if `rules.lastCreated`, si no `StatementActionNotice`) y la pregunta en su `StickyBelowTopBar`; `dismissCreated` + `dismissQuestion` en cada escritura (categoría, marcar que no cuenta, `Undo`); `dismissQuestion` en `onCreateRule` y al desmontar.
- `src/features/review/components/MovementRow.vue`, `src/features/statement/components/StatementRow.vue` — `Set when the import was closed` en la línea gris bajo la descripción (`movement-closing`, `statement-row-closing`).
- Pruebas: `category-rules/__tests__/{fixtures,service.spec,rules.spec,store.spec,OtherMovementsQuestion.spec}.ts`, `shared/__tests__/movements.spec.ts`, `review/__tests__/{fixtures,store.spec,ReviewView.spec,MovementRow.spec}.ts`, `statement/__tests__/{fixtures,store.spec,StatementView.spec,StatementRow.spec}.ts`.
- `specs/34-manual-category-offers-rule/tasks.md` — `[x]` en T1–T10.

### Decisiones tomadas

- **`questionHeadline(name)` en vez de `QUESTION_HEADLINE(name)`.** Design §6 lo nombra en
  mayúsculas pero es una función; `docs/conventions.md` reserva las mayúsculas para
  constantes y las funciones van en camelCase. El texto es el de design §6.
- **`suggestionTextOf`, paso 2:** solo se corta si la coincidencia de `/[ ,]concepto/u` no
  está en la posición 0. Paso 4: se corta la cadena desde el principio del primer tramo
  sin dígito hasta el final del último tramo sin dígito antes del siguiente con dígito.
  Los cinco ejemplos del contrato dan lo que dice su tabla (test de R2).
- **La URL del preview** se arma con `URLSearchParams` (design §2): los espacios viajan
  como `+`, igual que el `q` de `GET /api/movements` que ya usa la aplicación. No lo he
  probado contra el backend real (prohibido escribir; el preview es lectura, pero no he
  arrancado ni usado el backend real en esta sesión).
- **`acceptQuestion`** compara la pregunta por identidad antes de cerrarla, para que una
  respuesta que llega tarde no cierre una pregunta nueva. Si el `POST` falla sin garantía
  de no haber escrito (500, respuesta ilegible), recarga la lista de reglas y las
  propuestas, como `create`; si se rechaza (400, 404, 409) o no llega, no hace ninguna
  otra petición (R12).
- **Componente:** `Create rule` solo encendido si el paso es `ready`, el texto del campo es
  el de esa respuesta y no hay un `POST` en camino. La lista desplegada lleva
  `max-h-60 overflow-y-auto` (design §5).
- **`StatementView`:** en «marcar que no cuenta», la línea de la regla y la pregunta se
  cierran cuando la escritura sale de verdad (directa, o al aceptar la ventana de
  confirmación); si se cancela esa ventana no se cierran.
- **Fixtures de `review` y `statement`:** `CLOSING_EXPENSE` (`RECIBO /Academia Ficticia
  Norte` en `Otros gastos`, `categorySource: 'closing'`), `PREVIEW_CAFETERIA`; el
  `fakeQueue` de `review` pone `categorySource: 'manual'` al cambiar una categoría, como
  el backend; el `mockApi` de `statement` admite una ruta `preview`. Todos los datos son
  inventados.
- En `statement/__tests__/store.spec.ts`, el test `a 400 says it in English and does NOT
  reload the month (R14, R15)` esperaba `resolves.toBeUndefined()`; ahora
  `resolves.toBeNull()` (mismo nombre: `categorize` ahora devuelve `null` cuando no
  escribe).

### Trazabilidad (solo SDD)

- R1 → `a change of category asks the preview with the suggested text and the chosen category and opens the question` (store), `changing the category of one row in Review opens the question under the notice`, `changing the category of one line in Movements opens the question under the notice`, `asks the preview with only matchText and categoryId` (service), `categorizeOne gives back the movement the PATCH answered or null`, `categorize gives back the movement the PATCH answered or null`
- R2 → `the suggested text of a description follows the five steps of the contract`
- R3 → `shows how many other movements would move and lists them before anything is created`, `keeps only the movements of the new rule from a preview`, `rejects a preview whose list does not add up`, `writes how many other movements would move to the category`
- R4 → `shows how many other movements would move and lists them before anything is created`
- R5 → `editing the text asks the preview again and only the last answer counts`, `asks again after the text is edited and keeps Create rule off while it checks`
- R6 → `a text another rule uses or too short leaves the question unable to create`, `says why Create rule is off for a short text a taken text or a failed check`
- R7 → `says no other movement would move and keeps Create rule on`, `editing the text asks the preview again and only the last answer counts` (respuesta sin movimientos)
- R8 → `asks nothing when no other movement would move`, `asks nothing when a rule already uses the suggested text`, `asks nothing when the preview fails or the description gives no suggested text`
- R9 → `giving a category to several rows at once asks nothing`
- R10 → `saying yes sends one POST with the text of the box and closes the question`, `saying yes in Review creates the rule and the line says how many it moved`
- R11 → `saying yes in Review creates the rule and the line says how many it moved`, `Movements shows the line of a created rule and the next write takes it away`
- R12 → `a rejected create from the question says why and changes nothing else`, `paints the failure of a create inside the question`
- R13 → `dismissing the question sends nothing`, `emits create on Create rule and dismiss on No only this one`, `Undo or another action in Review closes the question`, `Undo or another write in Movements closes the question`
- R14 → `changing the category of one row in Review opens the question under the notice` y `changing the category of one line in Movements opens the question under the notice` (orden dentro del bloque, en jsdom). La comprobación «a la vista desde una fila baja» es la prueba de navegador de T12 (Lote B).
- R15 → `reads categorySource and takes an absent one as null`, `rejects a categorySource outside the three of the contract`, `says the category was set when the import was closed only for that source` (en `MovementRow.spec.ts` y `StatementRow.spec.ts`)

### Documentos actualizados

Lanzado `git grep -n "categorizeOne\|TOO_SHORT\|RuleCreatedNotice\|categorySource\|getRulePreview" -- ':!progress' ':!specs' ':!src'`.
Líneas que dejan de ser verdad: `docs/architecture.md:244` y `:257` (la nota de la feature
27 dice que solo `Review` envuelve `RuleCreatedNotice`; ahora también `Movements`, y la
pregunta va en el mismo bloque) y `docs/architecture.md:95` (lista de componentes de
`category-rules` sin `OtherMovementsQuestion`). Son de T14 (Lote B): **no las toco**.
`docs/guia-de-uso.md` es de T15 (Lote B). No he tocado nada de `docs/`.

### Prueba real

No aplica en el sentido de §C4 bis: la feature no lee archivos del humano; lee
`GET /api/category-rules/preview` y `categorySource` del backend. **No lo he probado contra
el backend real** (ni arrancado servidores, ni hecho peticiones). Hace falta probarlo en el
navegador con el backend real; el leader lo apunta como cabo suelto según `decisions.md`.

### Último ./init.sh

`timeout 900 ./init.sh`, exit 1. Resumen de líneas `[OK]`/`[FAIL]`:

```
[OK]    feature_list.json válido (34 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  1 failed | 116 passed (117)
      Tests  1 failed | 1986 passed (1987)
[FAIL]  Hay tests rotos
[OK]    Cabeceras Archivos: de 23 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  12 failed
  56 passed (46.3s)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
EXIT=1
```

- El test unitario roto es el del bloqueo (`review/__tests__/service.spec.ts`).
- Las 12 pruebas de navegador rojas son todas de `e2e/action-notice-in-view.spec.ts` (8) y
  `e2e/statement-fix-category.spec.ts` (4), y todas por la misma causa: cada cambio de
  categoría pide ahora `GET /api/category-rules/preview`, que esas pruebas no simulan.
  En la salida, 15 apariciones de `"GET /api/category-rules/preview"` en
  `watch.aborted`, y en `statement-fix-category` el error de consola
  `Failed to load resource: net::ERR_FAILED`. Añadir esa ruta es T12 y T13 (Lote B):
  1. `action-notice-in-view.spec.ts:650` Review keeps the summary and its Undo in view after giving a category to the last row
  2. `:702` Movements keeps the summary and its Undo in view after changing the category of the last line
  3. `:843` at the top of the page the notice sits between the same blocks as before
  4. `:895` Undo pressed from the bottom of the list puts the row back
  5. `:1009` the notice does not cover the row that was just changed
  6. `:1079` (x2) the notice leaves the changed row clear with the result of applying the rules folded / open above the list
  7. `:1149` the notice does not cover a row changed while the notice is already showing
  8. `statement-fix-category.spec.ts:224`, `:257`, `:292`, `:319`

### Último ./init.sh --checks (si la feature tiene checks)

`timeout 900 ./init.sh --checks 34` — exit 1, **8 de 12 en verde**:

```
[1] [OK] exit 0
[2] [OK] exit 0
[3] [FAIL] exit 2 — grep: e2e/manual-category-offers-rule.spec.ts: No such file or directory
[4] [FAIL] exit 2 — grep: e2e/manual-category-offers-rule.spec.ts: No such file or directory
[5] [FAIL] exit 2 — grep: e2e/manual-category-offers-rule.spec.ts: No such file or directory
[6] [OK] exit 0
[7] [OK] exit 0
[8] [OK] exit 0
[9] [OK] exit 0
[10] [OK] exit 0
[11] [FAIL] exit 1 — el test "the question about other movements sits under the notice and is in view from a low row" aún no existe en e2e/action-notice-in-view.spec.ts
[12] [OK] exit 0
[FAIL]  Checks: 8 de 12 en verde. La feature no se puede cerrar.
```

Las cuatro rojas dependen de archivos del Lote B (T11 y T12). Las partes unitarias de
[3], [4] y [5] no se llegan a ejecutar en el check porque el `grep` del e2e va antes en
su `&&`; las he lanzado sueltas y pasan (`store.spec.ts`, `OtherMovementsQuestion.spec.ts`, `ReviewView.spec.ts`: todas verdes).

`timeout 900 ./init.sh --checks 27` — exit 1, **7 de 12 en verde**. Rojas [2], [3], [5],
[7] y [12], todas con `> 151 | expect(watch.aborted).toEqual([])` en
`e2e/action-notice-in-view.spec.ts` (la petición del preview abortada). Se arreglan con la
ruta del preview de T12 (Lote B). Las unitarias de la feature 27 ([6], [8]) pasan.

`timeout 900 ./init.sh --checks 33` — exit 0, **11 de 11 en verde**.

### Sugerencias fuera de scope (NO aplicadas)

- Que el leader autorice la línea del bloqueo en `src/features/review/__tests__/service.spec.ts` (o la añada al Lote B).
- No he anotado nada en `progress/current.md`: el leader ya había escrito «Lote A lanzado» y me limitó a los archivos de la cabecera.

## Lote B — implementación

Nada de lo ejecutado escribió en la base de datos ni en carpetas de datos del humano: solo
pruebas unitarias con `fetch` simulado y pruebas de navegador con todas las peticiones
`/api` respondidas por `page.route` (la primera ruta de cada archivo aborta cualquier
petición no prevista). No se arrancó ni paró ningún servidor a mano. Todos los datos de
prueba son inventados; las respuestas simuladas de `GET /api/movements` llevan
`deposit: null`.

**Estado: 5 de 5 tasks del Lote B cerradas (T11–T15)**, más la línea de
`src/features/review/__tests__/service.spec.ts` que el leader añadió a este lote. Ninguna
prueba de navegador destapó un defecto del código del Lote A.

### Archivos modificados / creados

- `src/features/review/__tests__/service.spec.ts` — solo `categorySource: null,` en el
  objeto esperado de `keeps the whole movement, not only the painted fields`.
- `e2e/manual-category-offers-rule.spec.ts` (nuevo, T11) — un mes de `Movements` simulado
  con estado: el `PATCH` de una línea escribe en ella (`categorySource: 'manual'`);
  `GET /api/category-rules/preview` normaliza `matchText` y lista, con `ruleId: null`, los
  movimientos sin categoría o con `categorySource: 'closing'` cuyo concepto contiene el
  texto (nunca `manual` ni `rule`); el `POST` de regla mueve esos mismos y responde
  `categorization`. Tres tests con los nombres de `tasks.md`.
- `e2e/action-notice-in-view.spec.ts` (T12) — `Watch.previews` (cada preview pedido, como
  `<matchText> → <categoryId>`), `previewAnswer` (la respuesta 200 del contrato), una ruta
  `**/api/category-rules/preview*` en `routeReview` y en `routeMovements` (por defecto, sin
  movimientos de la regla nueva: no sale la pregunta) y la opción
  `routeReview(..., { preview: 'matching' })`, que lista las filas pendientes sin
  categoría que contienen el texto. Test nuevo:
  `the question about other movements sits under the notice and is in view from a low row`.
  Ninguna aserción de los tests existentes cambia.
- `e2e/statement-fix-category.spec.ts` (T13) — la ruta del preview (200, sin movimientos).
  Comprobado antes de añadirla: sin ella fallaban 4 de 5 tests (`:224`, `:257`, `:292`,
  `:319`); con ella, 5 de 5. Ninguna aserción cambia.
- `docs/architecture.md` (T14) — ver «Documentos actualizados».
- `docs/guia-de-uso.md` (T15) — ver «Documentos actualizados».
- `specs/34-manual-category-offers-rule/tasks.md` — `[x]` en T11–T15.

### Decisiones tomadas

- **La pregunta sale de verdad en el navegador** en el test nuevo de T12: la última fila
  de `Review` es `PAGO PEAJE AUTOPISTA 64`, el texto propuesto es `pago peaje autopista`
  y otras 7 filas pendientes sin categoría lo contienen. El test comprueba, con la página
  bajada: el bloque pegado bajo la barra; la línea `1 movement categorized as Groceries`,
  su `Undo`, la pregunta y sus botones `Create rule` y `No, only this one` a la vista y
  sin nada encima (`expectInView`: dentro de la ventana, por debajo de la barra, y el
  elemento del centro es suyo); el borde superior de la pregunta por debajo del borde
  inferior de la línea y del `Undo`; y la fila cambiada entera por debajo del bloque, ya
  más alto (`expectRowClearOfNotice`). Además, un solo preview
  (`pago peaje autopista → 12`) y una sola escritura (el `PATCH`).
- **Solo en `Review`** se comprueba «a la vista desde una fila baja» con la pregunta
  abierta, como dice T12. En `Movements` la pregunta en el navegador la cubre T11 (dentro
  del bloque pegado bajo la barra), sin medir posiciones.
- En T11 añadí dos aserciones que la task no nombra: tras `Create rule` en `Movements`,
  `statement-action-summary` y `statement-action-undo` ya no están (la línea de la regla
  creada ocupa su sitio, design §5). Están para respaldar lo que dice la guía.
- **Comprobación de una frase de la guía con un archivo temporal.** Para escribir que en
  `Review` decir que sí hace perder el `Undo` del cambio, lancé una copia temporal de
  `action-notice-in-view.spec.ts` con un test más (`e2e/zz-tmpcheck.spec.ts`): cambiar la
  última fila, `Create rule`, y comprobar `rule-created-line` =
  `Rule “pago peaje autopista” → Groceries created: 7 movements categorized.`,
  `action-undo` y `action-summary` a 0, escrituras
  `["PATCH /api/movements/4164","POST /api/category-rules"]`. Pasó (16 passed) y borré el
  archivo; no queda en el repositorio.

### Trazabilidad (solo SDD) — lo que añade este lote

- R1 → `in Movements saying yes creates the rule and the line says how many movements it moved` (preview con `academia ficticia norte → 8`)
- R3, R4 → `in Movements saying yes creates the rule and the line says how many movements it moved` (número, lista plegada, desplegarla no pide nada)
- R5, R7 → `editing the text asks the preview again and the count follows it`
- R8 (soporte) → la ruta del preview de `e2e/statement-fix-category.spec.ts` y la de por defecto de `e2e/action-notice-in-view.spec.ts`
- R10, R11 → `in Movements saying yes creates the rule and the line says how many movements it moved`
- R13 → `saying no sends nothing after the change of the one movement`
- R14 → `the question about other movements sits under the notice and is in view from a low row`

### Documentos actualizados

Lanzado `git grep -n -i "no dice cuántos\|RuleCreatedNotice\|categorySource\|preview\b\|category-rules/preview\|OtherMovementsQuestion\|categorizeOne" -- ':!progress' ':!specs' ':!src' ':!e2e'`.
Fuera de `docs/architecture.md` y `docs/guia-de-uso.md` no salió ninguna línea que la
feature vuelva falsa (`docs/roadmap.md:462` es histórico de la feature 27; las de
`preview` de `docs/stack.md`, `docs/verification.md` y `playwright.config.ts` son el
servidor `vite preview`).

`docs/architecture.md` (T14):
- Lista de `category-rules`: `OtherMovementsQuestion` en `components/`; `question`,
  `offerRule`, `checkQuestionText`, `acceptQuestion` y `dismissQuestion` en `store.ts`;
  `getRulePreview` y `parseRulePreview` en `service.ts`; `suggestionTextOf`, `TOO_SHORT` y
  los textos de la pregunta en `rules.ts`; los tipos nuevos en `types.ts`.
- `shared/movements.ts`: lee `categorySource`, y `closingSourceLine`.
- Nota de la feature 27: `Movements` también pinta `RuleCreatedNotice` en su
  `StickyBelowTopBar`, en lugar de `StatementActionNotice` mientras está; la pregunta va en
  ese mismo bloque, debajo de la línea de la última acción y de su `Undo`. La frase «Los
  cuatro componentes que envuelve … siguen siendo uno por pantalla, y ningún `store.ts` …
  cambió» pasa a decir que eso fue así en la feature 27 (hoy ya no es verdad).

`docs/guia-de-uso.md` (T15). **Las notas del humano no cambian.** Recuento antes y
después, sobre una copia del archivo hecha antes de editar:
- líneas que empiezan por `--` (con o sin sangría): **107 antes, 107 después**;
- bloques «Mis notas de esta prueba»: **11 antes, 11 después**;
- comparando en orden todas las líneas de nota (las `--` con sus líneas de continuación y
  los bloques «Mis notas» enteros): 166 líneas antes, 166 después, **idénticas**.
- `git diff docs/guia-de-uso.md` solo borra dos líneas, y no son notas del humano: el
  final de una viñeta de «Lo que no hace o hace a medias» de `Movements` que decía que esa
  pantalla no dice cuántos movimientos movió crear una regla (ya no es verdad). Todo lo
  demás son líneas añadidas.

Lo añadido:
- `4. Movements`, al final de «primero lo que solo mira»: párrafo «Nuevo desde la
  feature 34…» sobre `Set when the import was closed`.
- `4. Movements`, paso 15: debajo de su nota `-- cambie la categoria…`, un párrafo que
  empieza por «Nuevo desde la feature 34, sin probar en tu primera revisión:» con la
  pregunta, y viñetas para desplegar la lista, cambiar el texto, `No, only this one`,
  `Create rule` y cuándo no sale.
- `4. Movements`, tabla «Qué escribe y cómo se deshace»: fila de `Create rule` en la
  pregunta.
- `5. Review`, paso 3: debajo del párrafo de la feature 31 (que va debajo de la nota
  `-- ok`), párrafo «Nuevo desde la feature 34…» sobre `Set when the import was closed`.
- `5. Review`, paso 10: debajo de su nota `-- ok`, párrafo «Nuevo desde la feature 34,
  sin probar en tu primera revisión:» con la pregunta, el `Undo` que se pierde al decir
  que sí y cuándo no sale.
- `5. Review`, tabla «Qué escribe y cómo se deshace»: fila de `Create rule` en la pregunta.

### Prueba real

No se ha podido: la feature lee `GET /api/category-rules/preview` y `categorySource` del
backend, y en este lote no se usó el backend real (no se arrancan servidores ni se
escribe en los datos del humano). Hace falta probarlo en el navegador con el backend
real; según `decisions.md`, el leader lo apunta como cabo suelto.

### Último ./init.sh

`timeout 900 ./init.sh` — **exit 0**:

```
[OK]    feature_list.json válido (34 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  117 passed (117)
      Tests  1987 passed (1987)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 23 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último ./init.sh --checks

Cada uno con `timeout 900 ./init.sh --checks <n>`, todos con exit 0. Última línea de cada
uno:

```
34: [OK]    Checks: 12 de 12 en verde.
33: [OK]    Checks: 11 de 11 en verde.
32: [OK]    Checks: 14 de 14 en verde.
31: [OK]    Checks: 10 de 10 en verde.
30: [OK]    Checks: 9 de 9 en verde.
29: [OK]    Checks: 11 de 11 en verde.
28: [OK]    Checks: 8 de 8 en verde.
27: [OK]    Checks: 12 de 12 en verde.
```

### Sugerencias fuera de scope (NO aplicadas)

- `docs/architecture.md` no pasa `prettier --check` (no entra en `pnpm format:check`, que
  solo mira `src/`, `e2e/` y la configuración). No he comprobado si ya pasaba antes de
  este lote; no lo he formateado para no reescribir el archivo entero.
