# rules-applied-result — implementación

## Lote A — implementación

Fecha: 2026-10-13. Tasks cerradas: **T1 a T12, las doce del lote** (T8 incluida: el
leader confirmó el sí del humano a R16). La feature sigue `in_progress`; no se ha tocado
`feature_list.json`, ni el backend, ni ningún archivo del Lote B.

**`./init.sh` termina en rojo (exit 1) y `./init.sh --checks 30` en 7 de 9**, las dos
cosas por trabajo que es del Lote B. El detalle está en «Último ./init.sh» y en «Lo que
tiene que saber el Lote B».

### Archivos modificados / creados

Todos están en la cabecera `Archivos:` del Lote A.

Creados:

- `src/features/category-rules/components/LastApplyReport.vue`
- `src/features/category-rules/components/CategorizedMovementList.vue`
- `src/features/category-rules/__tests__/LastApplyReport.spec.ts`
- `src/features/review/components/UncategorizedCount.vue`
- `src/features/review/__tests__/UncategorizedCount.spec.ts`

Modificados:

- `src/features/category-rules/types.ts`, `service.ts`, `rules.ts`, `store.ts`
- `src/features/category-rules/components/ApplyResult.vue` (solo el comentario)
- `src/features/category-rules/views/RulesView.vue`
- `src/features/category-rules/__tests__/fixtures.ts`, `service.spec.ts`,
  `rules.spec.ts`, `store.spec.ts`, `RulesView.spec.ts`
- `src/shared/money.ts`, `src/shared/__tests__/money.spec.ts`
- `src/features/review/store.ts`, `src/features/review/views/ReviewView.vue`
- `src/features/review/__tests__/fixtures.ts`, `store.spec.ts`, `ReviewView.spec.ts`

Fuera de `src/`: `specs/30-rules-applied-result/tasks.md` (las doce casillas del lote) y
`progress/current.md`.

### Qué se hizo, task por task

- **T1** — `types.ts`: `AppliedRule`, `CategorizedMovement`,
  `ApplyResult.categorizedMovements` y `LastApply`. Las dos `fixtures.ts` ganan el
  constructor `categorizedMovement(id, description, overrides)` y una lista de 12
  elementos en `APPLY_OK` y en `APPLY_RESULT`. En la de `category-rules` la lista y sus
  dos primeros elementos se exportan con nombre (`TWELVE_CATEGORIZED`,
  `TWO_RULES_MOVEMENT`, `INCOME_MOVEMENT`) para que los tests comparen contra ellos.
  `rules.spec.ts`: su `result(...)` gana el campo. Ninguna aserción que ya existía en
  `category-rules` cambió.
- **T2** — `parseApplyResult` valida, en este orden, `categorized`, cada elemento de
  `categorizedMovements` y el tamaño de la lista. Los cuatro tests con los nombres del
  spec.
- **T3** — `lastApplyHeadline` y `lastApplyFigures` en `rules.ts`, con los textos de R5
  y R6.
- **T4** — `formatClock` en `shared/money.ts`.
- **T5** — `lastApply`, `dismissLastApply` y las dos líneas de `confirmApply`. Los
  siete tests con los nombres del spec, en un bloque `describe` nuevo. Los seis tests de
  `applying (R10, R11, R13)` no se editaron.
- **T6** — los dos componentes y el comentario de `ApplyResult.vue`. Los seis tests.
- **T7** — `RulesView.vue` monta el recuadro justo debajo de `<header>`. Los dos tests
  del spec y uno más (sin aplicar nada, no hay recuadro). El test `always asks before
  applying, and cancelling sends nothing (R10)` no se editó.
- **T8** — bajo el concepto de cada fila, una línea por regla con su `matchText` entre
  comillas tipográficas. Test `names the rules that matched each categorized movement`.
- **T9** — `uncategorizedCount`, `refreshUncategorizedCount`, su llamada al final de
  `refreshAfterAction`, y el comentario de `refreshAfterRules`. Los cuatro tests.
- **T10** — corregidos **cinco** tests de `review/__tests__/store.spec.ts` que contaban
  lecturas (el spec nombraba uno «al menos»): `asks for the page again after the change,
  so the API keeps owning the totals`, `reloads the list after a 404: the change may
  have gone through`, `reloads the list when the answer cannot be read`, `stops at the
  group that failed, says so and reloads (R14)` y `asks for the page and the count
  again, and drops the selection and the undo`. Antes contaban cuántas lecturas había;
  ahora comparan las consultas exactas, en orden. Lo que comprobaban de la selección, del
  `Undo` y de los `PATCH` sigue igual.
- **T11** — `UncategorizedCount.vue` y su spec (varios, uno, cero, `null`, y que sigue
  al número cuando cambia).
- **T12** — `ReviewView.vue`: la petición en `onMounted`, la frase en la cabecera bajo
  `ReviewTotals`, y el recuadro entre la cabecera y `ReviewFilterBar`, fuera de
  `StickyBelowTopBar`. Los cuatro tests del spec y cuatro más (singular y cero; con
  filtros en la URL la consulta del número no los lleva; tras confirmar una fila el
  número se vuelve a pedir; aplicar desde `Review` y cerrar la ventana deja el recuadro).
  Ajustados **siete** tests que ya existían a la petición nueva: seis que miraban las
  consultas de `GET /api/movements` al montar (`asks for the pending queue on mount and
  paints the rows and the totals`, `writes a filter change into the query and asks again
  from page 1`, `writes the page into the query and asks for it`, `restores the controls
  and the request from a URL that already carries them`, `falls back to the defaults on a
  URL full of rubbish, without breaking`, `retries the same request when asked to`) y
  `shows the loading indicator with the filters still usable (R11)`, que respondía a las
  dos peticiones con el mismo objeto `Response` (solo se puede leer una vez).
  **Los cinco tests del bloque `the block that keeps the notice under the top bar
  (feature 27)` no se han editado** y pasan.

### Decisiones tomadas y desviaciones del design

1. **Singular en los dos botones.** El spec escribe `Show the <N> movements` y `Show
   the <N> conflicts`. Con N = 1 he puesto `Show the 1 movement` y `Show the 1
   conflict`, como hace el spec con el titular y con la línea de cifras. **No está
   escrito en el spec: es una decisión mía.** Si se quiere el texto literal, son dos
   líneas de `LastApplyReport.vue` (`movementsLabel` y `conflictsLabel`). Ningún test
   depende del singular de los botones.
2. **`signedAmount` en `rules.ts`** (no está en design §2). El design pide
   `formatMoney(type === 'expense' ? '-' + amount : amount)`. Como R1 no valida que
   `amount` sea positivo (design §0), un importe que llegara ya con signo menos daría
   `--41.37`, `formatMoney` lanzaría y se rompería el recuadro en las dos pantallas. La
   función deja tal cual un importe que ya trae signo. Con lo que promete el contrato
   (importe siempre positivo) el resultado es idéntico al del design. Tiene test.
3. **`leading-5` en `UncategorizedCount.vue`.** Con el alto de línea por defecto, una
   línea `text-sm` mide 19,5 px (13 px × 1,5). Ese medio píxel desplazaba
   todas las filas de `Review` y ponía en rojo una prueba de navegador de la feature 27
   (ver abajo). Con `leading-5` la línea mide 20 px y la prueba vuelve a pasar.
4. **`refreshUncategorizedCount` se espera con `await`** al final de
   `refreshAfterAction`: la acción no termina (`isActing`) hasta que el número ha
   vuelto. El design solo dice «su llamada al final». Lo elegí para que el orden de las
   peticiones sea fijo: página, número sin categoría y, tras aplicar las reglas, el
   recuento del menú, que sigue siendo la última.
5. **`formatClock` no usa `Intl`:** escribe la hora y el minuto locales con dos dígitos.
   Evita que una versión de ICU escriba `24:07` a medianoche. Tiene test de medianoche y
   de tarde.
6. **La frase del número vive dentro de `UncategorizedCount.vue`,** no en un `.ts`
   aparte: los archivos de funciones puras de `review` no están en el lote.
7. **`mountView` de `ReviewView.spec.ts`** acepta un tercer parámetro opcional (una
   función que recibe el `pinia` antes de montar) y devuelve también `pinia`. Hace falta
   para poner `rules.lastApply` antes de pintar. Las llamadas que ya existían no cambian.
8. **Cifras de los tests.** Los textos de ejemplo de la hoja usan 362, 1011 y 1373, que
   son recuentos reales del humano. En los tests y fixtures he puesto otras cifras
   inventadas (214, 847, 905, 58).

### Algo que encontré y que no estaba previsto

`e2e/action-notice-in-view.spec.ts`, test `the notice does not cover the row that was
just changed`, se puso en rojo con mi primera versión, de forma repetible (3 ejecuciones
de 3):

```
Error: expect(received).toBeLessThan(expected)
Expected: < 0.5
Received:   0.5
  at expectAtBottomOfTopBar (e2e\action-notice-in-view.spec.ts:555:59)
```

Falla en la preparación del test (colocar una fila justo bajo la barra superior), antes
de que aparezca ningún aviso. Comprobado quitando la línea `<UncategorizedCount …>` de
`ReviewView.vue`: `1 passed`. Con `leading-5`: los tres archivos de `Review` pasan
(`20 passed`). No he tocado el archivo de la prueba, que es del Lote B.

**Lo que no he comprobado:** qué pasa con esa prueba cuando el recuadro del resultado
está pintado en `Review` (sus líneas `text-sm` miden 19,5 px). Ninguna prueba de
navegador de hoy lo pinta en `Review` con la página bajada. Haría falta una prueba que
aplique las reglas, baje la página y actúe sobre una fila.

### Trazabilidad

- R1 → `reads the movements the apply answer says it categorized`, `names the failing
  field of a categorized movement it cannot read` (`service.spec.ts`); `keeps the
  categorized movements the server sent as the list of the result` (`store.spec.ts`)
- R2 → `rejects an apply answer without the list of categorized movements`, `rejects an
  apply answer whose list does not have as many movements as categorized`
  (`service.spec.ts`); `keeps no result when the answer of the server does not follow the
  contract` (`store.spec.ts`)
- R5 → `says at what time the rules were applied and how many movements were
  categorized`, `reads the other two figures in one line, with the singular of conflict`
  (`rules.spec.ts`); `formatClock (feature 30)` (`money.spec.ts`); `says how many
  movements were categorized and at what time` (`LastApplyReport.spec.ts`); `after
  closing the apply dialog Rules still shows how many movements were categorized`
  (`RulesView.spec.ts`); `shows the result of the last rules pass under the title`
  (`ReviewView.spec.ts`)
- R6 → `says with those words that no movements were categorized` (`rules.spec.ts`);
  `says no movements were categorized when the pass categorized none`
  (`LastApplyReport.spec.ts`)
- R7 → `lists each categorized movement with the category it was given`
  (`LastApplyReport.spec.ts`); `puts the minus sign on an expense and none on an income`
  (`rules.spec.ts`)
- R8 → `offers the conflicts behind their own button` (`LastApplyReport.spec.ts`)
- R9 → `emits dismiss when Dismiss is pressed` (`LastApplyReport.spec.ts`); `Dismiss
  forgets the result` (`store.spec.ts`); `Dismiss takes the result off Rules`
  (`RulesView.spec.ts`); `shows the result of the last rules pass under the title`
  (`ReviewView.spec.ts`)
- R10 → `drops the previous result when another pass is confirmed` (`store.spec.ts`)
- R11 → `a new page load starts with no result and writes nothing to the browser
  storage` (`store.spec.ts`)
- R12 → `keeps no result when the pass fails` (`store.spec.ts`)
- R13 → `asks how many pending movements have no category with the smallest request`
  (`review/store.spec.ts`); las frases en `UncategorizedCount.spec.ts`; `shows how many
  pending movements have no category without applying anything` (`ReviewView.spec.ts`)
- R14 → `asks for that number again after an action an undo and a rules pass` y los
  cinco tests corregidos en T10 (`review/store.spec.ts`); `asks for the number again
  after confirming a row` (`ReviewView.spec.ts`)
- R15 → `forgets the number when the request fails` (`review/store.spec.ts`); `paints
  nothing while the number is unknown` (`UncategorizedCount.spec.ts`); `shows nothing
  about uncategorized movements when that request fails` (`ReviewView.spec.ts`)
- R16 → `names the rules that matched each categorized movement`
  (`LastApplyReport.spec.ts`)
- C1 → `applying sends a single request and it is the POST without a body`
  (`store.spec.ts`); `offers no way to change a movement` (`LastApplyReport.spec.ts`)
- C2 → `a rules pass still clears the Undo and the ticked rows` (`review/store.spec.ts`);
  `draws the result of the rules pass outside the block that sticks under the top bar`
  (`ReviewView.spec.ts`); los cinco tests de la feature 27, sin editar
- C3 → `ApplyResult.spec.ts` y `ApplyRulesDialog.spec.ts`, sin editar, en verde
- C4 → **sin test todavía:** es T15, del Lote B

### Tests que fallan si se rompe el código

Cuatro cambios hechos a propósito y deshechos después (los archivos volvieron a su
estado desde una copia):

| Cambio | Tests que se pusieron en rojo |
|---|---|
| `confirmApply` no borra `lastApply` al empezar | 1: `drops the previous result when another pass is confirmed` |
| `parseApplyResult` no comprueba el tamaño de la lista | 2: `rejects an apply answer whose list does not have as many movements as categorized` y `keeps no result when the answer of the server does not follow the contract` |
| `refreshAfterAction` no pide el número | 7 (los cinco de T10, `asks for that number again after an action an undo and a rules pass` y `asks for the number again after confirming a row`) |
| `ReviewView` no pide el número al montar | 10 |

### Documentos actualizados

`git grep -n -i -E "does not say which|not say WHICH|no cuáles|no dice cuáles|which
movements it categorized|cuántos categorizó" -- . ':!progress' ':!specs'` devuelve tres
líneas:

- `src/features/category-rules/components/ApplyResult.vue:24` — es el comentario ya
  corregido (T6).
- `docs/guia-de-uso.md:773` — «el backend dice cuántos categorizó, pero no cuáles». Ya
  no es verdad. **No es de mi lote: es T18, del Lote B.**
- `feature_list.json:1484` — es una frase del humano en `delego_en_agente`, de antes de
  que el backend cambiara. No se toca.

También corregido el comentario de `refreshAfterRules` en `review/store.ts`, que decía
que el backend no dice cuáles (T9). `docs/architecture.md` no nombra todavía los
componentes ni las funciones nuevas: es T17, del Lote B.

### Prueba real

**No se ha hecho.** La feature lee la respuesta de `POST /api/category-rules/apply`, y el
encargo prohíbe hacer peticiones al backend real y arrancar servidores a mano. Todo lo
que se ha ejecutado usa respuestas simuladas con la forma del contrato. La hoja de
decisiones ya lo apunta como deber del humano al cerrar: aplicar las reglas con sus
datos y abrir la lista.

### Comandos, con su salida

Los cuatro, ejecutados el 2026-10-13 después del último cambio de código:

```
$ pnpm test:unit            → exit 0
 Test Files  107 passed (107)
      Tests  1819 passed (1819)

$ pnpm type-check           → exit 0
$ vue-tsc --build

$ pnpm lint:oxlint:check    → exit 0
$ oxlint .

$ pnpm format:check         → exit 0
Checking formatting...
All matched files use Prettier code style!
```

Antes de empezar, `pnpm test:unit` daba `Tests  1772 passed (1772)`: hay 47 tests más.

### Último ./init.sh

**exit 1.** Todo en verde menos las pruebas de navegador, con un solo fallo:

```
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  107 passed (107)
      Tests  1819 passed (1819)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 19 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  1) [chromium] › e2e\category-rules.spec.ts:234:1 › applying asks first, sends one bodyless POST and refreshes the queue
    Expected: "12 movements categorized"
  1 failed
  59 passed (18.3s)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Es trabajo del Lote B (T13): la respuesta simulada de aplicar de
`e2e/category-rules.spec.ts` no trae `categorizedMovements`, así que con R2 la aplicación
la trata como ilegible y la ventana enseña el mensaje de fallo en vez de las cifras. Es
el caso que design §9 anuncia.

### Último ./init.sh --checks 30

**exit 1: 7 de 9 en verde.** Los dos rojos son de tasks del Lote B:

- Check 1 (el recorrido entero en el navegador): falta el test `the result of applying
  stays in view from Rules to Review` en `e2e/category-rules.spec.ts` (T13).
- Check 8 (la importación): falta el test `reads a report whose categorization carries
  the categorized movements` en `src/features/import/__tests__/service.spec.ts` (T15).

Los checks 2, 3, 4, 5, 6, 7 y 9 salen con exit 0.

### Lo que tiene que saber el Lote B

- **`e2e/category-rules.spec.ts`:** el test `applying asks first, sends one bodyless POST
  and refreshes the queue` está en rojo hasta que `APPLY_RESULT` gane
  `categorizedMovements` con 12 elementos (T13). Es el único rojo de `./init.sh`.
- **`e2e/review-queue.spec.ts`, `e2e/review-actions.spec.ts` y
  `e2e/action-notice-in-view.spec.ts` (T14):** ejecutados los tres con el código de este
  lote, `20 passed`. Ninguno necesita cambios por la petición nueva de R13. No he
  comprobado si alguno cuenta peticiones de un modo que la petición nueva debería haber
  cambiado y no cambió; solo que pasan.
- **Al montar `Review` sale una petición más:**
  `GET /api/movements?status=pending_review&uncategorized=true&page=1&pageSize=1`. Y otra
  igual después de cada acción, cada `Undo` y cada aplicación de las reglas (cuando hay
  página cargada). Tras aplicar, el orden es: la página, esa petición y el recuento del
  menú.
- **Atributos `data-test` nuevos**, para T13: `last-apply`, `last-apply-headline`,
  `last-apply-figures`, `last-apply-dismiss`, `last-apply-show-movements`,
  `last-apply-show-conflicts`, `last-apply-movements` (la lista), `last-apply-movement`
  (cada fila) y, dentro de ella, `last-apply-movement-date`,
  `last-apply-movement-description`, `last-apply-movement-category`,
  `last-apply-movement-amount` y `last-apply-movement-rule`; en `Review`,
  `review-uncategorized-count`.
- **Textos de los botones:** `Show the 2 movements` / `Hide the movements`; con un solo
  choque, `Show the 1 conflict` (decisión 1 de arriba).
- **El titular lleva la hora local del navegador** en el momento en que respondió el
  `POST`: en una prueba de navegador conviene compararlo con una expresión regular
  (`Rules applied at \d{2}:\d{2}: 2 movements categorized.`), como hacen
  `RulesView.spec.ts` y `ReviewView.spec.ts`.
- **`docs/architecture.md` (T17):** además de lo que lista la task, `rules.ts` tiene
  `signedAmount`, que no está en el design.
- **`docs/guia-de-uso.md:773`** es la línea que mi cambio deja falsa (T18).

### Sugerencias fuera de scope (NO aplicadas)

- La prueba de navegador `the notice does not cover the row that was just changed` exige
  que la fila quede a menos de 0,5 px de la barra superior **antes** de actuar, y eso
  depende de que el alto de todo lo que hay encima de la lista no termine en medio píxel.
  Cualquier línea `text-sm` nueva sobre la lista de `Review` la pondrá en rojo otra vez.
  Se podría hacer que esa preparación no dependa de la altura de la cabecera.
- `shared/money.ts` se llama así y ya tiene fechas y, desde hoy, la hora. No lo he
  movido: el design lo pone ahí.

---

## Lote B — implementación

> Transcrito por el leader el 2026-10-13 a partir del informe que el implementer del
> Lote B devolvió en su respuesta: su herramienta de escritura rechazó crear esta
> sección. Resumido; las salidas de comandos son las que él pegó.

Tasks cerradas: **T13 a T18** (18 de 18 en `tasks.md`). La feature sigue `in_progress`.

### Archivos modificados

- `e2e/category-rules.spec.ts` (+347 −8): T13 y la prueba de «se ve igual en `Rules` y en `Review`».
- `e2e/action-notice-in-view.spec.ts` (+137 −1): dos pruebas nuevas con el recuadro pintado.
- `src/features/import/__tests__/service.spec.ts` (+35): T15.
- `feature_list.json` (−8): T16, retirados el último check de la F27 y el de la F29.
- `docs/architecture.md` (+37 −8): T17.
- `docs/guia-de-uso.md` (+37 −9): T18.
- `e2e/review-queue.spec.ts` y `e2e/review-actions.spec.ts`, sin editar (T14).

### Task por task

- **T13.** `APPLY_RESULT` lleva `categorizedMovements` con 12 elementos. `prepare` acepta
  `applyAnswers` (lo que responde cada `POST` de aplicar, por orden) y `movements` (los
  pendientes de la cola). Prueba nueva `the result of applying stays in view from Rules
  to Review`. La prueba `applying asks first, sends one bodyless POST and refreshes the
  queue` no se editó y vuelve a pasar.
- **T14.** Los tres archivos de navegador de `Review`: `20 passed`, sin cambiar rutas
  simuladas ni aserciones.
- **T15.** `reads a report whose categorization carries the categorized movements`: el
  informe de importación se lee sin lanzar y el resultado no lleva la lista.
- **T16.** F27 pasa de 13 a 12 checks y F29 de 12 a 11. Antes de retirarlos, los dos
  comandos salían con 1.
- **T17.** `docs/architecture.md` nombra los componentes, el estado y la validación nuevos.
- **T18.** Cinco sitios de la guía. **Las notas del humano no cambiaron:** 106 líneas que
  empiezan por `--` antes y después; 52 líneas de bloques «Mis notas de esta prueba»
  antes y después; las 158 idénticas y en el mismo orden.

### Comprobado en el navegador a petición del leader

1. **La prueba de la F27 con el recuadro pintado en `Review`.** Dos pruebas nuevas:
   `the notice leaves the changed row clear with the result of applying the rules folded
   above the list` y `… open above the list`. Las dos pasan. Medido: recuadro plegado
   127,125 px y abierto 523,125 px; en los dos, borde inferior del aviso 108 px y borde
   superior de la fila 108,0625 px.
2. **El recuadro en `Rules` y en `Review`.** Prueba `the result of applying looks the same
   on Rules and on Review and the next pass replaces it`: compara texto y medidas, colores,
   borde y tipografía de sus partes (no es una comparación de capturas). `Dismiss` lo
   quita; tras recargar no queda nada (`localStorage` y `sessionStorage` vacíos); otra
   aplicación lo sustituye. **Sin comprobar en el navegador:** que tras `Dismiss` en
   `Review` tampoco esté al volver a `Rules` (solo lo cubren tests unitarios).

### Lo que encontró

- `e2e/review-queue.spec.ts`, `Uncategorized travels alone: never together with a
  category`: su aserción «alguna petición lleva `uncategorized=true`» se cumple ya al abrir
  `Review` por la petición nueva, así que ha dejado de demostrar nada por sí sola. La
  prueba sigue comprobando lo suyo por la cuenta de filas. No se editó.
- Queda un tercer check que compara con un commit, en la F26 (`git diff --quiet a68df91 …`).
  Sale con 1 desde antes de este lote.

### Verificación (salidas del implementer)

- `pnpm test:e2e --project=chromium`: `64 passed (22.4s)`, exit 0.
- `./init.sh` completo: exit 0, `Tests 1820 passed (1820)`, lint, formato, `pnpm type-check`
  y navegador en verde.
- `./init.sh --checks 30`: `Checks: 9 de 9 en verde.`
- `./init.sh --checks 27`: `Checks: 12 de 12 en verde.`
- `./init.sh --checks 29`: `Checks: 11 de 11 en verde.`

### Prueba real

No se ha hecho: el encargo prohíbe hablar con el backend real.
