# Tasks — F30 `rules-applied-result`

Tres lotes en secuencia: `ReviewView` monta el bloque que crea el lote A, y el E2E
recorre las dos pantallas.

Los nombres de test entre comillas invertidas son **literales**: los `checks` de
`feature_list.json` los buscan con `grep -F` y los filtran con `vitest -t` o con
`playwright -g`. No llevan paréntesis, corchetes, puntos, comillas ni `? + * | ^ $`. No
se cambian.

Ningún test hace peticiones al backend real: la frontera HTTP se simula como en los
tests que ya existen (`fakeClient`, `mockApi`, `page.route`).

## Lote A — saber cuáles se categorizaron y enseñarlo en `Rules`
Archivos: `src/features/category-rules/types.ts`, `src/features/category-rules/service.ts`, `src/features/category-rules/rules.ts`, `src/features/category-rules/store.ts`, `src/features/category-rules/components/LastApplyReport.vue`, `src/features/category-rules/components/CategorizedMovementList.vue`, `src/features/category-rules/views/RulesView.vue`, `src/shared/money.ts`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/service.spec.ts`, `src/features/category-rules/__tests__/rules.spec.ts`, `src/features/category-rules/__tests__/store.spec.ts`, `src/features/category-rules/__tests__/LastApplyReport.spec.ts`, `src/features/category-rules/__tests__/RulesView.spec.ts`, `src/shared/__tests__/money.spec.ts`
Depende de: —

- [ ] T1 — `types.ts`: `LastApplyList` y `LastApply` (design §2). Cubre: R3, R4.
- [ ] T2 — `service.ts`: `FULL_READ_PAGE_SIZE` y `getAllMovements` (design §2). Tests en
  `service.spec.ts`:
  - `reads every page of a query with 200 movements per page` — con `total: 450`
    salen tres peticiones (`page=1`, `2`, `3`, todas `pageSize=200` y la misma
    consulta) y devuelve los 450 movimientos; con `total: 0`, una petición y `[]`.
  - `rejects a read whose pages do not add up` — una página con otro `total`, un `id`
    repetido entre páginas y una página que falla: las tres rechazan.
  Cubre: R1, R3 (definición «leer todas las páginas»).
- [ ] T3 — `rules.ts`: `APPLY_NOT_STARTED`, `categorizedByPass`, `lastApplyHeadline`,
  `lastApplyFigures`, `listUnavailableMessage`, con los textos exactos de
  requirements R2, R4, R5 y R6. Tests en `rules.spec.ts` (singular, plural, cero, las
  dos frases de motivo; `categorizedByPass` deja fuera los que no estaban antes, los
  que siguen sin categoría y conserva el orden de la lectura de después).
  Cubre: R2, R3, R4, R5, R6.
- [ ] T4 — `shared/money.ts`: `formatClock`. Test en `money.spec.ts`:
  `new Date(2026, 9, 12, 10, 42)` → `10:42`; `new Date(2026, 9, 12, 9, 5)` → `09:05`.
  Cubre: R5.
- [ ] T5 — `store.ts`: `lastApply`, `dismissLastApply` y `confirmApply` según design §3.
  Tests nuevos en `store.spec.ts`, con estos nombres exactos:
  - `reads the pending movements without a category before sending the POST` — el
    orden de las llamadas es: los `GET` de `status=pending_review&uncategorized=true`,
    después el `POST`. Cubre: R1.
  - `sends no POST when the pending movements cannot be read first` — la lectura de
    antes falla: ningún `POST`, `applyFlow` en `failed` con `APPLY_NOT_STARTED`,
    `applyRun` sigue en 0, `lastApply` es `null`. Cubre: R2.
  - `works out which movements the pass categorized from the reads before and after`
    — antes: ids 1, 2, 3 sin categoría; después: 1 y 2 con categoría, 3 sin ella y un 9
    con categoría que no estaba antes; `categorized: 2` → la lista es [1, 2] con sus
    categorías. Cubre: R3.
  - `keeps the numbers and no list when the read after the pass fails` —
    `lastApply.result` es la respuesta y `list` es `unavailable` con `read-failed`.
    Cubre: R4.
  - `keeps no list when it does not add up to the number the server gave` — la lista
    saldría con 2 y `categorized` es 3 → `unavailable` con `count-mismatch`. Cubre: R4.
  - `asks for nothing after the pass when it categorized none` — `categorized: 0`:
    ningún `GET` posterior al `POST`; `list` es `ready` y vacía. Cubre: R6.
  - `drops the previous result when another pass is confirmed` — con un resultado
    guardado, confirmar otra vez lo deja en `null` antes de que responda la primera
    lectura. Cubre: R10.
  - `keeps no result when the pass fails` — `POST` que falla y `POST` 200 con `error`:
    `lastApply` es `null` en los dos. Cubre: R12.
  - `a new page load starts with no result and writes nothing to the browser storage`
    — tras una aplicación con lista, `localStorage.length` y `sessionStorage.length`
    son 0; con `setActivePinia(createPinia())` de nuevo, `lastApply` es `null`.
    Cubre: R11.
  - `applying sends one POST without a body and no other write` — todas las llamadas
    salvo una son `GET /api/movements`; la otra es el `POST` de aplicar, sin cuerpo.
    Cubre: C1.
  - `Dismiss forgets the result` — `dismissLastApply()` deja `lastApply` en `null`.
    Cubre: R9.
- [ ] T6 — `store.spec.ts`: corregir los tests que quedan falsos. Hoy:
  `runs one pass, shows the figures and bumps applyRun (R11, R12)`, `a second click
  while the pass runs adds no request, and the dialog will not close`, `shows no
  figures when the 200 carries an error, and still bumps applyRun (R13)` y `bumps
  applyRun when the request itself fails (R14)` necesitan simular los `GET` de
  movimientos; `never sends anything about a movement, whatever it does` afirma que
  ninguna llamada toca `/api/movements` y pasa a afirmar que ninguna **escribe** en
  movimientos. Lo que cada uno comprobaba de la ventana y de `applyRun` se conserva.
  Cubre: C1, C3.
- [ ] T7 — `LastApplyReport.vue` y `CategorizedMovementList.vue` (design §4). Tests en
  `LastApplyReport.spec.ts`, con estos nombres exactos:
  - `says how many movements were categorized and at what time` — titular y línea de
    cifras con los textos de R5, en plural y en singular. Cubre: R5.
  - `says no movements were categorized when the pass categorized none` — titular de
    R6 y no existe `last-apply-show-movements`. Cubre: R6.
  - `lists each categorized movement with the category it was given` — plegada al
    montar (ninguna `last-apply-movement`); tras pulsar el botón, una fila por
    movimiento con fecha, concepto, importe y `last-apply-movement-category` con el
    nombre de su categoría; el botón pasa a `Hide the movements`. Cubre: R7.
  - `says why there is no list instead of offering it` — con cada motivo, su frase en
    `last-apply-list-unavailable` y sin botón de lista. Cubre: R4.
  - `offers the conflicts behind their own button` — con choques, el botón dice
    `Show the 3 conflicts` y al pulsarlo aparece `rule-conflicts`; sin choques no hay
    botón. Cubre: R8.
  - `emits dismiss when Dismiss is pressed`. Cubre: R9.
  - `offers no way to change a movement` — dentro del bloque no hay `select`, `input`
    ni más botones que los tres descritos. Cubre: C1.
- [ ] T8 — `RulesView.vue`: montar el bloque bajo la cabecera. Tests en
  `RulesView.spec.ts`:
  - `after closing the apply dialog Rules still shows how many movements were categorized`
    — aplicar, pulsar `Close`: `last-apply-headline` sigue en la página. Cubre: R5.
  - `Dismiss takes the result off Rules`. Cubre: R9.
  - Ajustar los tests de aplicar que ya existen para simular los `GET` de movimientos;
    el contenido de la ventana (`apply-figure`, `rule-conflicts`) se sigue comprobando
    igual. Cubre: C3.

## Lote B — `Review`: el número de pendientes sin categoría y el bloque
Archivos: `src/features/review/store.ts`, `src/features/review/components/UncategorizedCount.vue`, `src/features/review/views/ReviewView.vue`, `src/features/review/__tests__/fixtures.ts`, `src/features/review/__tests__/store.spec.ts`, `src/features/review/__tests__/UncategorizedCount.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`
Depende de: Lote A

- [ ] T9 — `store.ts`: `uncategorizedCount`, `refreshUncategorizedCount` y su llamada
  al final de `refreshAfterAction` (design §5). Tests nuevos en `store.spec.ts`:
  - `asks how many pending movements have no category with the smallest request` — la
    consulta es `status=pending_review&uncategorized=true&page=1&pageSize=1` y el
    número es su `pagination.total`. Cubre: R13.
  - `asks for that number again after an action an undo and a rules pass`. Cubre: R14.
  - `forgets the number when the request fails` — queda en `null`. Cubre: R15.
  - `a rules pass still clears the Undo and the ticked rows` — con un `Undo` y una
    casilla marcada, `rules.applyRun += 1` deja `lastAction` en `null` y `selectedIds`
    vacío. Cubre: C2.
- [ ] T10 — `store.spec.ts`: corregir los tests que cuentan peticiones tras una acción
  o tras `applyRun` (hoy, al menos `asks for the page and the count again, and drops
  the selection and the undo`, que espera 2 lecturas y pasan a ser 3). Lo que
  comprobaban de la selección, del `Undo` y de los `PATCH` se conserva. Cubre: R14, C2.
- [ ] T11 — `UncategorizedCount.vue`. Test en `UncategorizedCount.spec.ts`: las tres
  frases de R13 (varios, uno, cero) y nada con `null`. Cubre: R13, R15.
- [ ] T12 — `ReviewView.vue`: `refreshUncategorizedCount()` en `onMounted`,
  `UncategorizedCount` en la cabecera y `LastApplyReport` entre la cabecera y
  `ReviewFilterBar`, fuera de `StickyBelowTopBar` (design §4, §6). Tests nuevos en
  `ReviewView.spec.ts`, con estos nombres exactos:
  - `shows how many pending movements have no category without applying anything` — al
    montar, sin ninguna escritura, `review-uncategorized-count` dice la frase de R13.
    Cubre: R13.
  - `shows nothing about uncategorized movements when that request fails`. Cubre: R15.
  - `shows the result of the last rules pass under the title` — con `rules.lastApply`
    puesto, `last-apply-headline` está en la página; al pulsar `Dismiss`, no.
    Cubre: R5, R9.
  - `draws the result of the rules pass outside the block that sticks under the top bar`
    — con `rules.lastApply` puesto y sin aviso, no existe `sticky-below-top-bar`; con
    un aviso de acción, `last-apply` no está dentro de `sticky-below-top-bar`.
    Cubre: C2.
  Los cinco tests del bloque `the block that keeps the notice under the top bar
  (feature 27)` no se editan y siguen en verde; los que cuentan los `GET` de
  movimientos al montar se ajustan a la petición nueva. Cubre: C2.

## Lote C — el recorrido entero y los documentos
Archivos: `e2e/category-rules.spec.ts`, `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `docs/architecture.md`, `docs/guia-de-uso.md`
Depende de: Lote B

- [ ] T13 — `e2e/category-rules.spec.ts`: la ruta simulada de `**/api/movements*` pasa
  a responder según la consulta (antes y después de aplicar), y el test que ya existe
  `applying asks first, sends one bodyless POST and refreshes the queue` sigue
  comprobando un solo `POST` sin cuerpo. Test nuevo, con este nombre exacto:
  - `the result of applying stays in view from Rules to Review` — en `/rules`: aplicar,
    cerrar la ventana, ver el titular con el número; pulsar `Show the 2 movements` y
    ver cada fila con su categoría; ir a `/review` por el menú y ver el mismo titular;
    pulsar `Dismiss` y dejar de verlo; recargar la página y seguir sin verlo.
    Cubre: R5, R7, R9, R11.
- [ ] T14 — Ejecutar `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts` y
  `e2e/action-notice-in-view.spec.ts`. Solo si alguno deja de pasar por la petición
  nueva de R13, ajustar su ruta simulada; sus aserciones no se cambian. Cubre: C2.
- [ ] T15 — `docs/architecture.md`: en el árbol, los componentes y funciones nuevos de
  `category-rules/`, `review/` y `shared/money.ts`; y un párrafo que diga que aplicar
  las reglas hace ahora dos lecturas de todas las páginas, por qué, y que la lista no
  se enseña si no cuadra con `categorized`. Añadir arriba del párrafo «La pantalla de
  reglas y su sentido de dependencia (feature #17)» la línea «Revisado el … por la
  feature 30». Cubre: R1, R3, R4.
- [ ] T16 — `docs/guia-de-uso.md`: corregir lo que queda falso sin tocar las
  anotaciones del humano (`--`): «el backend dice cuántos categorizó, pero no cuáles»
  (pasos de aplicar las reglas), el paso 15 (qué se ve en `Review` después), el paso 4
  del recorrido final («Lee cuántos se categorizaron y los choques») y la fila
  `Apply rules` de la tabla «Qué escribe y cómo se deshace». Cubre: R5, R7, R13.
