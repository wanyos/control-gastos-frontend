# suggested-rules — implementación

## Lote A — implementación

No se ha escrito nada en la base de datos ni en las carpetas de datos del humano: todas
las pruebas usan respuestas simuladas (cliente falso o `fetch` simulado) y datos inventados.

Tasks cerradas: T1 a T12 (las 12 del Lote A), marcadas `[x]` en
`specs/33-suggested-rules/tasks.md`.

### Archivos modificados / creados

Código:
- `src/features/category-rules/types.ts` — `SuggestedMovement`, `SuggestedRule`, `SavedRule`,
  `ResultCause`; `LastApply` con `cause` y `rule`.
- `src/features/category-rules/service.ts` — `SUGGESTIONS_PATH`, `parseSuggestions`,
  `getSuggestions`, `parseCategorization` (sacado de `parseApplyResult`, exportado),
  `parseSavedRule`; `createRule` y `updateRule` devuelven `SavedRule` y exigen
  `categorization`.
- `src/features/category-rules/rules.ts` — textos de design §5 (`RULES_INTRO`,
  `PREVIEW_NOTE`, `SUGGESTIONS_TITLE`, `SUGGESTIONS_INTRO`, `SUGGESTIONS_LOADING`,
  `NO_SUGGESTIONS`, `OWN_RULES_TITLE`, `UNFINISHED_MOVE`, `KIND_LABEL`,
  `suggestedCountLine`, `showMovementsLabel`, `HIDE_MOVEMENTS`, `manualMatchesLine`,
  `suggestionsErrorMessage`, `ruleSavedHeadline`, `ruleCreatedLine`) y `wroteNothing`.
- `src/features/category-rules/store.ts` — estado de propuestas, `loadSuggestions`,
  `createFromSuggestion`; `lastCreated` pasa a `SavedRule`; crear y cambiar una regla dejan
  el resultado en el recuadro y suben `applyRun`; cambiar, borrar y aplicar vuelven a pedir
  las propuestas si ya se habían pedido.
- `src/features/category-rules/components/SuggestedRuleList.vue` (nuevo)
- `src/features/category-rules/components/SuggestedRuleRow.vue` (nuevo)
- `src/features/category-rules/components/RuleCreatedNotice.vue` — recibe `saved`; sin
  botón `Apply rules now`, sin `emit('apply')`, sin icono.
- `src/features/category-rules/components/LastApplyReport.vue` — cabecera según `cause`;
  frase `UNFINISHED_MOVE` si la regla guardada trae `error`.
- `src/features/category-rules/components/RuleMatchPreview.vue` — `PREVIEW_NOTE` en lugar
  de la nota anterior.
- `src/features/category-rules/views/RulesView.vue` — `RULES_INTRO`, línea de la regla
  creada dentro de `StickyBelowTopBar`, lista de propuestas, título `Your rules`.
- `src/features/review/views/ReviewView.vue` — `RuleCreatedNotice :saved`, sin `@apply`;
  comentarios.
- `src/features/statement/store.ts` — vigila `applyRun` y, si hay un mes en pantalla,
  `refreshQuietly()`.
- `src/features/statement/views/StatementView.vue` — solo comentarios.

Tests y datos de prueba:
- `src/features/category-rules/__tests__/fixtures.ts` — `NOTHING_MOVED`, `saved()`,
  `EDUCATION`, `ACADEMY_RULE`, `ACADEMY_MOVED`, `ACADEMY_CREATED`, `ACADEMY_UNFINISHED`,
  tres propuestas (`SUGGESTIONS`: una de ingresos, una con `manualMatches: 2`); `mockFetch`
  contesta `GET /api/category-rules/suggestions` (por defecto `[]`).
- `src/features/review/__tests__/fixtures.ts` y `src/features/statement/__tests__/fixtures.ts`
  — `CREATED_RULE` con `categorization` (`categorized: 0`, listas vacías).
- Nuevos: `SuggestedRuleRow.spec.ts`, `RuleCreatedNotice.spec.ts`.
- Cambiados: `service.spec.ts`, `rules.spec.ts`, `store.spec.ts`, `LastApplyReport.spec.ts`,
  `RuleMatchPreview.spec.ts`, `RulesView.spec.ts`, `review/__tests__/ReviewView.spec.ts`,
  `statement/__tests__/store.spec.ts`.

Además: `progress/current.md` (plan del lote) y `specs/33-suggested-rules/tasks.md`
(marcas `[x]`).

### Decisiones tomadas

1. **Un 404 al crear desde una propuesta no vuelve a pedir la lista de reglas.** R10 exige
   «sin otra petición que ese `POST`» también con 404, pero el `create` de la feature 17
   (la ventana de crear regla) vuelve a pedir la lista tras un 404, y lo comprueba el test
   existente `reloads the rules after a 404 and after an answer it could not read (R6)`.
   design §3 dice que `needsRulesReload` «ya lo distingue», y no es exacto: para un 404
   devuelve `true`. Solución: una función nueva en `rules.ts`, `wroteNothing` (400, 404,
   409 o la petición no llegó), que usan solo los caminos nuevos; la ventana de crear regla
   se queda como estaba. El contrato confirma que con 400/404/409 no se escribe nada.
2. **Sin conexión no sube `applyRun` ni se vuelven a pedir las propuestas.** R14 y R15
   hablan de «respuestas»; R10 pide que, si no se llega al servidor, la única petición sea
   el `POST`.
3. **`SuggestedRuleList` recibe también `loading` y `errorMessage` y emite `retry`**
   (design §4 nombraba solo `suggestions`, `categories`, `busy`, `failure`): R12 pide los
   estados de carga, fallo y vacío dentro de `data-test="suggested-rules"`. El texto
   `Loading suggested rules…` solo sale si todavía no hay lista: al volver a pedirla tras
   crear una regla, la lista no desaparece mientras llega la nueva.
4. **`ruleCreatedLine` con 0 movimientos** dice `no movements were categorized`, igual que
   `ruleSavedHeadline` (design §5 solo daba el plural).
5. **La frase `UNFINISHED_MOVE` de la línea de la regla creada** va en `text-ink-strong`:
   esa línea está sobre `--surface-app` y `--warning` sobre ese fondo no tiene línea
   `contrast:` medida en `theme-dark.css` (archivo fuera del lote). En el recuadro
   (`--surface-card`) va en `text-warning`, que sí está medido.
6. **Al empezar a crear una regla desde una propuesta se borra la línea de la regla
   creada anterior** (lo que ya hacía `create` en la feature 17). Si la creación falla, el
   recuadro del resultado sigue igual (R10), pero esa línea no vuelve.
7. **Tests renombrados o sustituidos que no estaban en ningún check:**
   - `ReviewView.spec.ts`: `creates it with one POST of two fields, and applies nothing by
     itself (R5)` pasa a `creates it with one POST of two fields, and asks for no separate
     pass (R5)`: crear ya mueve movimientos, y el nombre viejo dejaba de ser verdad.
   - `RuleMatchPreview.spec.ts`: `admits the number is an estimate, right under it` se
     sustituye por `says that saving also moves the movements the closing of the import
     categorized` (la nota vieja ya no existe).
   - `RulesView.spec.ts`: `says there are none, and offers no way to make one from here (R7)`
     pasa a `says there are no rules yet`, como pide T10.
   - `ReviewView.spec.ts`: `asks before applying, and one confirmation sends one pass (R10,
     R11)` conserva el nombre; ya no pulsa `apply-rules-now` (comprueba que no existe) y abre
     la ventana de aplicar con `openApply()` del store, que sigue pintándose en `Review`.

### Trazabilidad

- R1 → `lists the suggested rules in the order of the answer`, `shows the text the kind and how many movements a suggestion would take`, `reads the suggested rules of the contract`
- R2 → `shows the movements of a suggestion before any rule is created`
- R3 → `offers only categories of its kind and no category chosen`, `keeps Create rule off until a category is chosen`
- R4 → `only one create travels at a time from the suggestions`, `draws the line of the created rule inside the block that sticks under the top bar` (cuerpo del `POST`)
- R5 → `creating a rule leaves its result in the box and in the line of the created rule`, `changing a rule leaves its result in the box`, `heads the box with the rule and its category when a rule was created or changed`, `reads the rule and what its pass moved from the answer of a create`, `writes the headline of a created or changed rule with how many it moved`
- R6 → `says how many movements the new rule categorized and offers no Apply rules now`, `draws the line of the created rule inside the block that sticks under the top bar`, `the rule notice in Review says how many it moved and has no Apply rules now`
- R7 → `drops the used suggestion and asks for the list again after the rule is created`
- R8 → `offers no way to dismiss a suggestion`, `keeps the unused suggestions after a rule is created from another`
- R9 → `says how many movements categorized by hand also contain the text and that they will not move`, `writes how many movements categorized by hand also contain the text`
- R10 → `a rejected create from a suggestion leaves the suggestions the rules and the result as they were`, `paints the failure of a create in the row of its suggestion`
- R11 → `a create whose pass did not finish keeps the rule and says the rest will move later`, `adds the unfinished sentence when the pass of the new rule did not finish`, `adds the unfinished sentence to the box of a rule whose pass did not finish`
- R12 → `shows the loading the failure with Try again and the empty list of suggestions`, `a suggestion load that fails or does not follow the contract leaves no list`, `rejects a suggested rule whose count does not match its movements`, `rejects a create answer without categorization`
- R13 → `says how many movements the new rule categorized and offers no Apply rules now`, `the rule notice in Review says how many it moved and has no Apply rules now`, `holds the rule notice or the action notice, never both (R4, C5)`
- R14 → `creating or changing a rule makes Review and Movements ask again`, `asks for the month again when a rule is created or changed`
- R15 → `changing deleting or applying rules asks for the suggestions again`
- R16 → `the intro says that creating or changing a rule also moves movements`, `says that saving also moves the movements the closing of the import categorized`

El recorrido en el navegador (R4, R5, R6, R7, R10, R13 de punta a punta) es del Lote B (T13).

### Documentos actualizados

Lanzado:

```
git grep -n -E "Apply rules now|apply-rules-now|Estimate: what a pass|applies nothing|categorizes nothing|creating it applies|Create one from a movement in Review|always born from a movement|no way to make one" -- ':!progress' ':!specs'
git grep -n -i -E "nothing by itself|does not apply|categorizes? nothing|applies nothing|apply.*separate gesture|decisions.md 🔴 3" -- src e2e docs README.md
```

Corregido en archivos del lote: comentarios de `ReviewView.vue`, `StatementView.vue`,
`RulesView.vue`, `RuleCreatedNotice.vue`, `LastApplyReport.vue`, `store.ts`, `service.ts`; el
nombre del test de `ReviewView.spec.ts` (decisión 7).

Sin corregir porque son del Lote B: `docs/architecture.md:234`, `docs/guia-de-uso.md:16`,
`:950`, `:968`; `e2e/action-notice-in-view.spec.ts:669`, `:689`, `:1060`;
`e2e/category-rules.spec.ts:266`, `:279`, `:297`, `:299`, `:415`.

**Bloqueo (fuera de los dos lotes):** `src/features/category-rules/components/RuleList.vue`
- línea 8: `No rules yet. Create one from a movement in Review.` — sigue siendo posible, pero
  ahora también se crea desde la lista de propuestas de la misma pantalla.
- línea 26: comentario `a rule is always born from a movement in Review (decisions.md)` —
  ya no es verdad.
No está en la cabecera `Archivos:` de ningún lote; no lo he tocado.

`feature_list.json` cita `Apply rules now` en respuestas del humano y en checks: es
histórico o es el propio check de esta feature; no se toca.

### Prueba real

La feature lee una respuesta de la API del backend (`GET /api/category-rules/suggestions`
y el `categorization` del `POST`/`PATCH`). No la he probado contra el backend real: la regla
del encargo prohíbe peticiones de escritura al backend real y arrancar servidores a mano, y
crear una regla es una escritura que mueve movimientos del humano. Lo leído sigue la forma
del contrato (`gastos-backend/docs/api-contract.md`, secciones citadas en el spec). Intenté
una lectura sola (`GET /api/category-rules/suggestions` con `curl` contra
`localhost:3000`, guardando la respuesta en una carpeta temporal fuera del repositorio para
contar elementos y comprobar la forma) y el sistema de permisos la denegó; no lo he
rodeado. Para comprobarlo hace falta que el humano autorice esa lectura o abra `Rules` en el
navegador con sus datos (hoja de decisiones, 📌).

### Último ./init.sh

`timeout 900 ./init.sh`, código de salida **1**. Todo en verde salvo el paso de pruebas de
navegador, y sus 9 fallos están todos en los dos archivos del Lote B
(`e2e/category-rules.spec.ts`, `e2e/action-notice-in-view.spec.ts`):

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  116 passed (116)
      Tests  1953 passed (1953)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  9 failed
    [chromium] › e2e\action-notice-in-view.spec.ts:669:1 › Review keeps the rule notice and Apply rules now in view from the bottom of the list
    [chromium] › e2e\action-notice-in-view.spec.ts:1080:3 › the notice leaves the changed row clear with the result of applying the rules folded above the list
    [chromium] › e2e\action-notice-in-view.spec.ts:1080:3 › the notice leaves the changed row clear with the result of applying the rules open above the list
    [chromium] › e2e\category-rules.spec.ts:266:1 › a rule is born from a row, and creating it applies nothing
    [chromium] › e2e\category-rules.spec.ts:291:1 › applying asks first, sends one bodyless POST and refreshes the queue
    [chromium] › e2e\category-rules.spec.ts:361:1 › changing and deleting a rule never touches a movement
    [chromium] › e2e\category-rules.spec.ts:389:1 › the dialog says how many movements a text would match, and writes nothing
    [chromium] › e2e\category-rules.spec.ts:528:1 › the result of applying stays in view from Rules to Review
    [chromium] › e2e\category-rules.spec.ts:660:1 › the result of applying looks the same on Rules and on Review and the next pass replaces it
  56 passed (1.5m)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Causa de cada uno, leída en el registro de esa pasada (todas son trabajo de T13 y T14):
- `action-notice-in-view.spec.ts:669` — la ventana de crear regla no se cierra: el `POST`
  simulado no trae `categorization` (T14).
- `action-notice-in-view.spec.ts:1080` (×2) — `applyRulesInReview` espera
  `apply-rules-now`, que ya no existe (T14).
- `category-rules.spec.ts:266`, `:291` — esperan la línea con `apply-rules-now` / el `POST`
  simulado sin `categorization` (T13).
- `category-rules.spec.ts:361` — el `PATCH` simulado sin `categorization`: la ventana de
  editar no se cierra y tapa `rule-delete` (T13).
- `category-rules.spec.ts:389` — espera el texto viejo
  `Estimate: what a pass would look at today, not what it will change.`; ahora sale
  `PREVIEW_NOTE` (T13).
- `category-rules.spec.ts:528`, `:660` — errores de consola
  `Failed to load resource: ... 404`: la ruta simulada `**/api/category-rules/*` contesta
  404 a `GET /api/category-rules/suggestions` (T13; design §1 ya lo anticipaba).

### Último ./init.sh --checks 33

`timeout 900 ./init.sh --checks 33`, código de salida **1**: `Checks: 10 de 11 en verde`.
El único rojo es el [3] (`a suggested rule becomes a rule and the box lists the movements it
moved`, en `e2e/category-rules.spec.ts`): esa prueba de navegador la escribe el Lote B (T13)
y todavía no existe, así que su `grep -qF` sale con 1. Los checks [1], [2], [4]–[11] salen
con `exit 0`.

### Checks de otras features afectados mientras no esté el Lote B

Lanzados `./init.sh --checks 27` y `./init.sh --checks 30` (con `timeout 900`), los dos con
código de salida 1:
- F27: `11 de 12 en verde`. Rojo el [11], que filtra por
  `Review keeps the rule notice in view from the bottom of the list`: ese nombre lo pone T14
  (Lote B); hoy la prueba sigue con el nombre viejo.
- F30: `8 de 9 en verde`. Rojo el [1], `the result of applying stays in view from Rules to
  Review` (`e2e/category-rules.spec.ts:528`), por los errores de consola del 404 de
  `GET /api/category-rules/suggestions` (T13).

No he tocado esos archivos: son del Lote B.

### Sugerencias fuera de scope (NO aplicadas)

- `RuleList.vue` (ver el bloqueo de «Documentos actualizados»): cambiar el texto de la lista
  vacía y el comentario, en el lote que el leader decida.

## Lote B — implementación

No se ha escrito nada en la base de datos ni en las carpetas de datos del humano: las pruebas
de navegador contestan toda petición `/api` con `page.route` (la primera ruta aborta cualquier
otra), con datos inventados. No he arrancado ni parado servidores a mano.

Tasks cerradas: T13, T14, T15 y T16 (las 4 del Lote B), marcadas `[x]` en
`specs/33-suggested-rules/tasks.md`. Además, los dos textos de `RuleList.vue` que añadió el
leader a la cabecera del lote.

### Archivos modificados

- `e2e/category-rules.spec.ts` (T13)
  - `prepare`: categoría inventada `Educación` (id 8) y `CATEGORY_BY_ID`; opciones
    `suggestions` y `suggestionsFailWith`; `runPass`, que hace en las filas simuladas lo que
    dice `categorization` (pone la categoría a los pendientes sin categoría que contienen el
    texto y los lista); el `POST` y el `PATCH` devuelven la regla con `categorization`; el
    `POST` quita de la lista simulada la propuesta del mismo texto; ruta nueva para
    `GET /api/category-rules/suggestions`.
  - Renombrado `a rule is born from a row, and creating it applies nothing` →
    `a rule is born from a row and its line says how many movements it moved`: espera la
    línea `Rule “iberdrola” → Suministros created: 1 movement categorized.`, que no exista
    `apply-rules-now` y que la fila ya salga en `Suministros`.
  - `applying asks first, sends one bodyless POST and refreshes the queue` (mismo nombre):
    empieza con la regla ya creada, va de `Review` a `Rules` por el menú, aplica con
    `apply-rules`, vuelve a `Review` y comprueba la categoría y la frase de pendientes sin
    categoría (de 2 a 1).
  - `the dialog says how many movements a text would match, and writes nothing`: solo cambia
    el texto esperado de la nota (`PREVIEW_NOTE`).
  - Nuevas: `a suggested rule becomes a rule and the box lists the movements it moved`,
    `the line of a rule created from a suggestion low in the list is in view`,
    `a create from a suggestion that fails leaves the list as it was and says why`.
- `e2e/action-notice-in-view.spec.ts` (T14)
  - La lógica que movía filas al aplicar pasa a una función `runPass`; el `POST` simulado la
    usa y devuelve `categorization`. Se quita la ruta simulada de `/apply`: ya ninguna prueba
    del archivo aplica, y una petición a `/apply` cae en la primera ruta y hace fallar la
    prueba.
  - Renombrado `Review keeps the rule notice and Apply rules now in view from the bottom of the list`
    → `Review keeps the rule notice in view from the bottom of the list`, sin la comprobación
    de `apply-rules-now`.
  - `applyRulesInReview` ya no pulsa `apply-rules-now`: crea la regla y comprueba la cabecera
    `Rule “panaderia” → Transport created at HH:MM: 8 movements categorized.`.
- `src/features/category-rules/components/RuleList.vue`: texto de lista vacía
  `No rules yet. Create one from a suggested rule above, or from a movement in Review.` y el
  comentario (una regla nace de un movimiento, en `Review` o en `Movements`, o de una regla
  propuesta). Su test (`says there are no rules yet`) solo comprueba `No rules yet.`: no ha
  hecho falta tocarlo.
- `docs/guia-de-uso.md` (T15) y `docs/architecture.md` (T16): ver «Documentos actualizados».
- `progress/current.md` (plan del lote) y `specs/33-suggested-rules/tasks.md` (marcas).

### Decisiones tomadas

1. **La ruta de propuestas se registra después de `**/api/category-rules/*`, no antes.** T13
   dice «antes», pero en Playwright gana la última ruta registrada (el propio archivo lo dice
   en el comentario de su primera ruta). Para que conteste antes que la ruta que lee
   `/suggestions` como el id de una regla, tiene que registrarse después. Está comentado en
   el código.
2. **`applying asks first…` ya no crea la regla dentro de la prueba.** Sin
   `Apply rules now`, la única forma de aplicar es `apply-rules` en `Rules`, y crear la regla
   ya mueve el movimiento de `iberdrola`: si la prueba la creaba, lo que se veía al final en
   la lista lo habría puesto el `POST` y no la aplicación. Empieza con la regla ya creada, y
   la frase de pendientes sin categoría (de 2 a 1) demuestra que la lista se volvió a pedir.
3. **Cambio en las dos pruebas `the notice leaves the changed row clear with the result of applying the rules folded|open above the list`
   (feature 30, sin check), más allá del botón quitado. Te lo señalo por si no lo das por
   bueno.** Antes, pulsar `apply-rules-now` borraba la línea de la regla creada, así que esas
   pruebas empezaban sin ningún aviso a la vista y comprobaban
   `expect(page.locator(BLOCK)).toHaveCount(0)`. Ahora crear la regla deja esa línea (es lo
   que pide la feature) y en `Review` no hay forma de quitarla sin escribir. He cambiado esa
   comprobación (en `applyRulesInReview` y en la prueba) por «el bloque que se queda bajo la
   barra contiene la línea de la regla creada», he añadido que esa línea desaparece cuando
   sale el aviso de la acción, y he quitado `POST /api/category-rules/apply` de la lista de
   escrituras esperadas. El resto de la prueba (la fila queda entera por debajo del aviso)
   sigue igual y pasa. No es un defecto del Lote A: es lo que piden R6 y R13.
4. **`suggestionsFailWith` no lo usa ninguna prueba.** T13 pide la opción; ninguna de las tres
   pruebas nuevas tiene que hacer fallar la carga de propuestas (eso lo cubre el test unitario
   `shows the loading the failure with Try again and the empty list of suggestions`).
5. **`runPass` de `e2e/category-rules.spec.ts` solo pasa la regla guardada**, no todas, y no
   simula los movimientos que categorizó el cierre de una importación: ninguna prueba de este
   archivo depende de eso. Está dicho en su comentario.
6. **Guía:** los párrafos `**Nuevo desde la feature 33, sin probar en tu primera revisión:**`
   llevan las negritas que ya usan los de las features 30 y 31.

### Trazabilidad (pruebas de navegador de este lote)

- R4 → `a suggested rule becomes a rule and the box lists the movements it moved` (un solo `POST` con su cuerpo)
- R5 → `a suggested rule becomes a rule and the box lists the movements it moved` (cabecera y `Show the 4 movements` con sus filas)
- R6 → `a suggested rule becomes a rule and the box lists the movements it moved`, `the line of a rule created from a suggestion low in the list is in view`, `a rule is born from a row and its line says how many movements it moved`
- R7 → `a suggested rule becomes a rule and the box lists the movements it moved`
- R10 → `a create from a suggestion that fails leaves the list as it was and says why` (la única petición tras el clic es el `POST`)
- R13 → `a rule is born from a row and its line says how many movements it moved`, `a suggested rule becomes a rule and the box lists the movements it moved`, `Review keeps the rule notice in view from the bottom of the list`
- R14 → `a rule is born from a row and its line says how many movements it moved` (la cola se vuelve a pedir tras crear)
- R16 → `the dialog says how many movements a text would match, and writes nothing` (`PREVIEW_NOTE`)

### Documentos actualizados

Lanzado:

```
git grep -n -E "Apply rules now|apply-rules-now|Estimate: what a pass|applies nothing|categorizes nothing|creating it applies|Create one from a movement in Review|always born from a movement|no way to make one|no categoriza nada|Crear una regla \*\*no\*\*" -- ':!progress' ':!specs'
git grep -n -i -E "nothing by itself|does not apply|apply.*separate gesture|no aplica nada|crear una regla no|no toca.*movimiento del que|sin categoría.*solo al aplicar" -- ':!progress' ':!specs' ':!feature_list.json'
```

Corregido:
- `docs/architecture.md`: árbol de `category-rules` (componentes `SuggestedRuleList` y
  `SuggestedRuleRow`, `RulesView`, store, `getSuggestions` y `parseSavedRule` en el servicio,
  textos, tipos); párrafo de la feature 27 (`RuleCreatedNotice` sin `Apply rules now`, y
  pintado también en `Rules`); párrafo de `statement` (`statement/store.ts` observa
  `applyRun`); párrafo de la feature 17 («crear una regla no escribe nada» → el `POST` y el
  `PATCH` traen `categorization`, se guarda en `lastApply` y sube `applyRun`).
- `docs/guia-de-uso.md`: nota de la cabecera sobre `Apply rules now`; fila `Rules` del mapa;
  fila `Create rule` desde el editor y viñeta «Crear una regla desde aquí no ofrece aplicarla»
  de `Movements`; «Para qué sirve» de `Rules`; párrafos nuevos después del `-- ok` de los
  pasos 1, 5, 9 y 12 de `Rules`; subsección nueva «Qué probar — las reglas propuestas»
  (pasos 16 a 22); filas `Create rule` y `Edit → Save` de la tabla de `Rules`; viñetas de
  «Lo que no hace» de `Rules` (el número de la ventana, el recuadro, crear en blanco, quitar
  la categoría); pasos 2 a 4 del trabajo B.
- `src/features/category-rules/components/RuleList.vue`: los dos textos.

Lo que queda en la salida del `git grep` y no se toca: los textos de los pasos 5 y 9 de
`Rules` en la guía (tienen debajo un `-- ok` del humano; lo nuevo va en el párrafo de debajo),
`feature_list.json` (histórico y el check de esta feature), los tests que comprueban que
`apply-rules-now` no existe, y los comentarios nuevos que dicen que ya no existe.

**Notas del humano en `docs/guia-de-uso.md`:** líneas que empiezan por `--`: 107 antes y 107
después, idénticas y en el mismo orden (comparadas con `diff` contra una lista sacada antes
de editar). Bloques «Mis notas de esta prueba»: 11 antes y 11 después. En
`git diff -U0 docs/guia-de-uso.md` ninguna línea quitada es una nota suya (las que salen como
`-- **…` son viñetas `- **…` de texto no suyo con el `-` del diff delante). Ningún texto nuevo
queda justo encima de un `-- ok`: los párrafos nuevos van después de su nota, y los pasos 16 a
22 no tienen notas.

### Prueba real

No hecha. La feature lee la respuesta de la API del backend, pero el encargo de este lote
prohíbe hablar con el backend real y arrancar servidores; las pruebas usan solo respuestas
simuladas. Sigue pendiente lo que dice el Lote A: que el humano abra `Rules` con sus datos.

### Último ./init.sh

`timeout 900 ./init.sh`, código de salida **0**:

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  116 passed (116)
      Tests  1953 passed (1953)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Antes, por separado: `pnpm test:e2e --project=chromium e2e/category-rules.spec.ts` → 10 passed;
`pnpm test:e2e --project=chromium e2e/action-notice-in-view.spec.ts` → 14 passed.

### Último ./init.sh --checks

Todos con `timeout 900`, todos con código de salida 0:

| Feature | Última línea |
|---|---|
| 33 | `Checks: 11 de 11 en verde.` |
| 30 | `Checks: 9 de 9 en verde.` |
| 27 | `Checks: 12 de 12 en verde.` |
| 28 | `Checks: 8 de 8 en verde.` |
| 29 | `Checks: 11 de 11 en verde.` |
| 31 | `Checks: 10 de 10 en verde.` |
| 32 | `Checks: 14 de 14 en verde.` |

### Sugerencias fuera de scope (NO aplicadas)

- La guía, paso 2 de `Review` (párrafo «Nuevo desde la feature 30»), dice que la frase de
  pendientes sin categoría se pone al día «de aplicar las reglas»; desde esta feature también
  al crear o cambiar una regla (`refreshAfterRules` de `review/store.ts` corre cuando sube
  `applyRun`). No lo he añadido: lo que dice sigue siendo verdad, y no lo he comprobado en el
  navegador.
