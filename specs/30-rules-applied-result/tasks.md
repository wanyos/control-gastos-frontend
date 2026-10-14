# Tasks — F30 `rules-applied-result`

Dos lotes en secuencia: el E2E recorre las dos pantallas que monta el lote A.

Los nombres de test entre comillas invertidas son **literales**: los `checks` de
`feature_list.json` los buscan con `grep -F` y los filtran con `vitest -t` o con
`playwright -g`. No llevan paréntesis, corchetes, puntos, comillas ni `? + * | ^ $`. No
se cambian.

Ningún test hace peticiones al backend real: la frontera HTTP se simula como en los
tests que ya existen (`fakeClient`, `mockFetch`, `mockApi`, `page.route`). Los datos de
las fixtures son sintéticos: sin nombres de personas ni números de cuenta reales.

**T8 es condicional.** Solo se hace si el leader confirma que el humano dijo sí a la
decisión 2 de la hoja (R16). Si dijo que no, se marca `[x]` con la nota «no aprobada» y
no se escribe ni el código ni el test.

## Lote A — el resultado de aplicar en `Rules` y en `Review`, y el número de `Review`
Archivos: `src/features/category-rules/types.ts`, `src/features/category-rules/service.ts`, `src/features/category-rules/rules.ts`, `src/features/category-rules/store.ts`, `src/features/category-rules/components/LastApplyReport.vue`, `src/features/category-rules/components/CategorizedMovementList.vue`, `src/features/category-rules/components/ApplyResult.vue`, `src/features/category-rules/views/RulesView.vue`, `src/shared/money.ts`, `src/features/category-rules/__tests__/fixtures.ts`, `src/features/category-rules/__tests__/service.spec.ts`, `src/features/category-rules/__tests__/rules.spec.ts`, `src/features/category-rules/__tests__/store.spec.ts`, `src/features/category-rules/__tests__/LastApplyReport.spec.ts`, `src/features/category-rules/__tests__/RulesView.spec.ts`, `src/shared/__tests__/money.spec.ts`, `src/features/review/store.ts`, `src/features/review/components/UncategorizedCount.vue`, `src/features/review/views/ReviewView.vue`, `src/features/review/__tests__/fixtures.ts`, `src/features/review/__tests__/store.spec.ts`, `src/features/review/__tests__/UncategorizedCount.spec.ts`, `src/features/review/__tests__/ReviewView.spec.ts`
Depende de: —

- [x] T1 — `types.ts`: `AppliedRule`, `CategorizedMovement`, el campo
  `ApplyResult.categorizedMovements` y `LastApply` (design §2). `fixtures.ts` de
  `category-rules` y de `review`: un constructor `categorizedMovement(id, description,
  overrides)` y `categorizedMovements` con 12 elementos en `APPLY_OK` y en
  `APPLY_RESULT` (design §9). `rules.spec.ts`: su constructor `result(...)` gana el
  campo. Ninguna aserción que ya exista cambia. Cubre: R1, C3.
- [x] T2 — `service.ts`: `parseApplyResult` valida `categorizedMovements` y su tamaño,
  en el orden de design §2. Tests nuevos en `service.spec.ts`, con estos nombres
  exactos:
  - `reads the movements the apply answer says it categorized` — de la respuesta del
    contrato (dos movimientos, uno con dos reglas) sale cada campo con su valor, en el
    orden en que llega; con `categorized: 0` y `[]`, una lista vacía. Cubre: R1.
  - `rejects an apply answer without the list of categorized movements` — sin el
    campo, y con `null`: `ValidationError` que nombra `categorizedMovements`.
    Cubre: R2.
  - `rejects an apply answer whose list does not have as many movements as categorized`
    — `categorized: 3` con dos elementos, y `categorized: 0` con uno: `ValidationError`
    con `categorizedMovements is not a list of 3 movements`. Cubre: R2.
  - `names the failing field of a categorized movement it cannot read` — `amount:
    41.37` como número, `type: 'neutral'`, `bookingDate: ''` y `rules[0].ruleId` como
    texto: cada uno lanza nombrando su ruta (`categorizedMovements[0].amount`…).
    Cubre: R1, R2.
- [x] T3 — `rules.ts`: `lastApplyHeadline` y `lastApplyFigures` con los textos exactos
  de requirements R5 y R6. Tests en `rules.spec.ts` (plural, singular y cero del
  titular; singular y plural de `conflict`). Cubre: R5, R6.
- [x] T4 — `shared/money.ts`: `formatClock`. Test en `money.spec.ts`:
  `new Date(2026, 9, 12, 10, 42)` → `10:42`; `new Date(2026, 9, 12, 9, 5)` → `09:05`.
  Cubre: R5.
- [x] T5 — `store.ts`: `lastApply`, `dismissLastApply` y las dos líneas de
  `confirmApply` (design §3). Tests nuevos en `store.spec.ts`, con estos nombres
  exactos:
  - `keeps the categorized movements the server sent as the list of the result` — tras
    aplicar, `lastApply.result.categorizedMovements` son los de la respuesta, con sus
    categorías y sus reglas, y `lastApply.at` es una fecha. Cubre: R1.
  - `keeps no result when the answer of the server does not follow the contract` — una
    respuesta sin `categorizedMovements` y otra con un elemento menos que
    `categorized`: en las dos `lastApply` es `null`, `applyFlow` es `failed` con
    `Something went wrong applying the rules. Some movements may already be
    categorized. The review queue has been reloaded.` y `applyRun` vale 1. Cubre: R2.
  - `drops the previous result when another pass is confirmed` — con un resultado
    guardado, confirmar otra vez lo deja en `null` antes de que responda el `POST`.
    Cubre: R10.
  - `keeps no result when the pass fails` — `POST` que falla y `POST` 200 con `error`
    (y su lista dentro): `lastApply` es `null` en los dos. Cubre: R12.
  - `a new page load starts with no result and writes nothing to the browser storage`
    — tras una aplicación con lista, `localStorage.length` y `sessionStorage.length`
    son 0; con `setActivePinia(createPinia())` de nuevo, `lastApply` es `null`.
    Cubre: R11.
  - `applying sends a single request and it is the POST without a body` — tras
    `confirmApply`, `api.calls` es exactamente `[{ path: APPLY_PATH, method: 'POST',
    body: undefined, contentType: undefined }]`. Cubre: C1.
  - `Dismiss forgets the result` — `dismissLastApply()` deja `lastApply` en `null`.
    Cubre: R9.
  Los seis tests de `applying (R10, R11, R13)` que ya existen no se editan y siguen en
  verde con la fixture de T1. Cubre: C1, C3.
- [x] T6 — `LastApplyReport.vue` y `CategorizedMovementList.vue` (design §4), y el
  comentario de `ApplyResult.vue` que dice que el backend no devuelve cuáles (solo el
  comentario). Tests en `LastApplyReport.spec.ts`, con estos nombres exactos:
  - `says how many movements were categorized and at what time` — titular y línea de
    cifras con los textos de R5, en plural y en singular. Cubre: R5.
  - `says no movements were categorized when the pass categorized none` — titular de
    R6 y no existe `last-apply-show-movements`. Cubre: R6.
  - `lists each categorized movement with the category it was given` — plegada al
    montar (ninguna `last-apply-movement`); tras pulsar el botón, una fila por
    movimiento, en el orden de la respuesta, con fecha, concepto, importe (el del gasto
    con signo menos, el del ingreso sin él) y `last-apply-movement-category` con su
    `categoryName`; el botón pasa a `Hide the movements`. Cubre: R7.
  - `offers the conflicts behind their own button` — con choques, el botón dice
    `Show the 3 conflicts` y al pulsarlo aparece `rule-conflicts`; sin choques no hay
    botón. Cubre: R8.
  - `emits dismiss when Dismiss is pressed`. Cubre: R9.
  - `offers no way to change a movement` — dentro del bloque no hay `select`, `input`
    ni más botones que los tres descritos. Cubre: C1.
- [x] T7 — `RulesView.vue`: montar el bloque bajo la cabecera. Tests en
  `RulesView.spec.ts`:
  - `after closing the apply dialog Rules still shows how many movements were categorized`
    — aplicar, pulsar `Close`: `last-apply-headline` sigue en la página. Cubre: R5.
  - `Dismiss takes the result off Rules`. Cubre: R9.
  El test que ya existe `always asks before applying, and cancelling sends nothing
  (R10)` no se edita: sigue comprobando `12 movements categorized` en la ventana y que
  la pantalla no pide movimientos. Cubre: C1, C3.
- [x] T8 — **Condicional (ver arriba).** `CategorizedMovementList.vue`: bajo el
  concepto, el texto de cada regla de `rules` (design §4). Test en
  `LastApplyReport.spec.ts`, con este nombre exacto:
  - `names the rules that matched each categorized movement` — la fila del movimiento
    con dos reglas tiene dos `last-apply-movement-rule` con sus `matchText`, en el
    orden de la respuesta; la de una regla, uno.
  Cubre: R16.
- [x] T9 — `review/store.ts`: `uncategorizedCount`, `refreshUncategorizedCount` y su
  llamada al final de `refreshAfterAction` (design §5); y el comentario de
  `refreshAfterRules`, que dice que el backend no dice cuáles. Tests nuevos en
  `review/__tests__/store.spec.ts`:
  - `asks how many pending movements have no category with the smallest request` — la
    consulta es `status=pending_review&uncategorized=true&page=1&pageSize=1` y el
    número es su `pagination.total`. Cubre: R13.
  - `asks for that number again after an action an undo and a rules pass`. Cubre: R14.
  - `forgets the number when the request fails` — queda en `null`. Cubre: R15.
  - `a rules pass still clears the Undo and the ticked rows` — con un `Undo` y una
    casilla marcada, `rules.applyRun += 1` deja `lastAction` en `null` y `selectedIds`
    vacío. Cubre: C2.
- [x] T10 — `review/__tests__/store.spec.ts`: corregir los tests que cuentan lecturas
  tras una acción o tras `applyRun` (hoy, al menos `asks for the page and the count
  again, and drops the selection and the undo`, que espera 2 lecturas y pasan a ser 3).
  Lo que comprobaban de la selección, del `Undo` y de los `PATCH` se conserva.
  Cubre: R14, C2.
- [x] T11 — `UncategorizedCount.vue`. Test en `UncategorizedCount.spec.ts`: las tres
  frases de R13 (varios, uno, cero) y nada con `null`. Cubre: R13, R15.
- [x] T12 — `ReviewView.vue`: `refreshUncategorizedCount()` en `onMounted`,
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
  Los tests del bloque `the block that keeps the notice under the top bar (feature 27)`
  no se editan y siguen en verde; los que cuentan los `GET` de movimientos al montar se
  ajustan a la petición nueva. Cubre: C2.

## Lote B — el recorrido entero, la importación, los documentos y los checks viejos
Archivos: `e2e/category-rules.spec.ts`, `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts`, `e2e/action-notice-in-view.spec.ts`, `src/features/import/__tests__/service.spec.ts`, `docs/architecture.md`, `docs/guia-de-uso.md`, `feature_list.json`
Depende de: Lote A

- [x] T13 — `e2e/category-rules.spec.ts`: `APPLY_RESULT` gana `categorizedMovements`
  con 12 elementos (design §9), y `prepare` acepta en `options` otra respuesta de
  aplicar. El test que ya existe `applying asks first, sends one bodyless POST and
  refreshes the queue` no cambia sus aserciones. Test nuevo, con este nombre exacto:
  - `the result of applying stays in view from Rules to Review` — con una respuesta de
    aplicar de 2 movimientos categorizados y 1 choque. En `/rules`: aplicar, cerrar la
    ventana, ver el titular con el número; pulsar `Show the 2 movements` y ver cada
    fila con su categoría; ir a `/review` por el menú y ver el mismo titular; pulsar
    `Dismiss` y dejar de verlo; recargar la página y seguir sin verlo. Al final, la
    única escritura registrada es el `POST` de aplicar, sin cuerpo.
    Cubre: R5, R7, R9, R11, C1.
- [x] T14 — Ejecutar `e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts` y
  `e2e/action-notice-in-view.spec.ts`. Solo si alguno deja de pasar por la petición
  nueva de R13, ajustar su ruta simulada; sus aserciones no se cambian. Cubre: C2.
- [x] T15 — `src/features/import/__tests__/service.spec.ts`: test nuevo, con este
  nombre exacto:
  - `reads a report whose categorization carries the categorized movements` —
    `parseImportReport` de `FULL_REPORT` con `categorization.categorizedMovements`
    relleno (un elemento, como el ejemplo del contrato) no lanza, conserva
    `categorized`, `conflicts` y `unmatched`, y el resultado no tiene la propiedad
    `categorizedMovements`.
  No se edita nada más de `src/features/import/` (design §8). Cubre: C4.
- [x] T16 — `feature_list.json`: quitar el último check de la feature 27 (el que
  ejecuta `git diff --quiet 8f0dce6 -- …`) y el último de la feature 29 (el que ejecuta
  `git diff --quiet d5290e7 -- …`). Decidido por el leader con el humano informado
  (lección 3 de `docs/lessons.md`). No se toca ningún otro check, ni los de la
  feature 30. Después, `./init.sh --state` tiene que salir con 0. Cubre: C2.
- [x] T17 — `docs/architecture.md`: en el árbol, los componentes y funciones nuevos de
  `category-rules/`, `review/` y `shared/money.ts`; y en el párrafo «La pantalla de
  reglas y su sentido de dependencia (feature #17)», una frase que diga que la
  respuesta de aplicar trae la lista de lo categorizado, que el store de reglas la
  guarda en memoria como resultado de la última aplicación y que `Rules` y `Review` la
  enseñan con el mismo componente. Añadir arriba de ese párrafo la línea «Revisado el
  … por la feature 30». Cubre: R1, R5.
- [x] T18 — `docs/guia-de-uso.md`: corregir lo que queda falso sin tocar las
  anotaciones del humano (`--`): «el backend dice cuántos categorizó, pero no cuáles»
  (aviso antes del paso 14 de `Rules`), el paso 15 (qué se ve en `Review` después),
  «los choques … no se guardan: al cerrar la ventana desaparecen» (lista «Lo que no
  hace o hace a medias» de `Rules`) y el paso 4 del recorrido B («Lee cuántos se
  categorizaron y los choques»). Cubre: R5, R7, R8, R13.
