# action-notice-in-view — implementación

## Lote A — implementación

Fecha: 2026-10-11. Tasks cerradas: **T1 a T10 (10 de 10)**, marcadas `[x]` en
`specs/27-action-notice-in-view/tasks.md`. La feature sigue `in_progress`: queda el
Lote B (T11–T22) y la revisión.

**Lo que no se ha ejecutado, y por qué:** ni `./init.sh` completo ni
`pnpm test:e2e`. Los dos arrancan `npm run dev` en el puerto 5173 (o reutilizan el
servidor que haya ahí), y el encargo de este lote prohíbe arrancar o parar servidores
en ese puerto. Por tanto **no he comprobado** que los once archivos de `e2e/` que ya
existían sigan pasando con estos cambios; lo comprueba T20 del Lote B.

### Archivos modificados / creados

Creados:

- `src/shared/components/StickyBelowTopBar.vue`
- `src/shared/components/__tests__/StickyBelowTopBar.spec.ts`

Modificados (todos dentro de la cabecera `Archivos:` del Lote A):

- `src/features/review/components/ActionNotice.vue`, `MovementRow.vue`
- `src/features/review/views/ReviewView.vue`
- `src/features/review/__tests__/ActionNotice.spec.ts`, `MovementRow.spec.ts`,
  `ReviewView.spec.ts`
- `src/features/statement/components/StatementActionNotice.vue`, `StatementRow.vue`
- `src/features/statement/views/StatementView.vue`
- `src/features/statement/__tests__/StatementActionNotice.spec.ts`,
  `StatementRow.spec.ts`, `StatementView.spec.ts`
- `src/features/transfers/components/TransfersActionNotice.vue`
- `src/features/transfers/views/TransfersView.vue`
- `src/features/transfers/__tests__/TransfersActionNotice.spec.ts`,
  `TransfersView.spec.ts`

No tocado: `src/assets/theme-dark.css` (ver T10). Fuera de `src/`: las diez casillas de
`tasks.md`, una línea en `progress/current.md` y este informe.

### Qué se hizo, task por task

- **T1 — `StickyBelowTopBar.vue`.** El `div` con las clases literales de design §3
  (`sticky top-[var(--topbar-h)] z-[var(--z-sticky)] -my-2 bg-surface-app py-2`),
  `data-test="sticky-below-top-bar"`, el slot y la prop `keepClearOf`. Al montarse y
  cada vez que cambia `keepClearOf` espera a `nextTick` y a un `requestAnimationFrame`,
  busca la fila con `document.querySelector`, y si el borde inferior del bloque queda
  por debajo del borde superior de la fila **y** la fila no está entera por encima del
  bloque, llama a `window.scrollBy({ top: -overlap })`. No escucha `scroll`.
- **T2 — `StickyBelowTopBar.spec.ts`.** Cuatro tests: los tres de nombre literal y uno
  para (d), `measures again when the row to keep clear changes`. Las clases se componen
  en el test (también la de una sola palabra, partida en dos trozos).
- **T3 — los tres `*ActionNotice.vue`.** `variant="ghost"` pasa a `variant="secondary"`,
  fuera `<template #icon>` y fuera `import { Undo2 }`. Mismo `size`, `data-test`,
  `:disabled` y texto. Dos líneas añadidas al comentario de cabecera de cada uno.
- **T4 — los tres `*ActionNotice.spec.ts`.** Un test nuevo en cada uno, con el nombre
  literal `the Undo button shows the word Undo with a border and no icon`: texto `Undo`,
  ningún `svg`, clases de borde y fondo de `secondary`, y no la de fondo transparente de
  `ghost`. **Ningún test anterior de esos tres archivos afirmaba el icono ni `ghost`:**
  no se ha corregido ninguno.
- **T5 — `MovementRow.vue` y `StatementRow.vue`.** `:data-movement-id="movement.id"` en
  el `<li>` raíz, y en cada `*Row.spec.ts` el test
  `carries the id of its movement so the notice can find it`.
- **T6 — `ReviewView.vue`.** `StickyBelowTopBar` con `v-if="hasNotice"` alrededor de
  `RuleCreatedNotice` (`v-if`) y `ActionNotice` (`v-else`), con las mismas props y
  eventos que tenían. `hasNotice` y `touchedRow` como en design §4. `touchedRow` se
  escribe en `onConfirmOne`, `onCategorizeOne` y `onCreateRule`, y se pone a `null` en
  `run`.
- **T7 — `ReviewView.spec.ts`.** Un `describe` nuevo con cinco tests, (a) a (e). Los 36
  tests que ya había pasan sin tocar sus aserciones.
- **T8 — `StatementView.vue` y su spec.** Mismo envoltorio con
  `hasNotice = Boolean(store.actionNotice) || Boolean(store.actionMessage)`. `touchedRow`
  se escribe al cambiar la categoría de una línea y en `onCreateRule`, y se pone a
  `null` en `askOrWrite`. Cinco tests nuevos: (a), (b), (d), (e) y el de C6 (el bloque va
  justo después de `MonthTotals` y justo antes del botón `Select movements` o de la
  barra de selección, que siguen con sus botones).
- **T9 — `TransfersView.vue` y su spec.** Envoltorio con
  `v-if="store.notice.summary || store.notice.error"`, sin `keepClearOf`. Tres tests
  nuevos: (a), (b) —que además afirma que la prop `keepClearOf` llega `undefined` y que
  el bloque sigue entre el título y la sección de dudosas— y (e).
- **T10.** `pnpm test:unit` y `pnpm type-check` lanzados y pegados abajo.
  `theme-dark.spec.ts` pasa dentro de la suite sin pedir ningún par nuevo:
  `src/assets/theme-dark.css` no se ha tocado.

### Decisiones tomadas y desviaciones del design

1. **`ref="block"` se lee con `useTemplateRef<HTMLElement>('block')`** (Vue 3.5) en vez
   de con una variable `ref` del mismo nombre. El template es el de design §3, letra por
   letra.
2. **T7 (d) pide «categorizar la fila 12», y la fila 12 del fixture por defecto
   (`NEUTRAL`) no admite categoría:** su selector está deshabilitado. El test siembra
   `fakeQueue` con un gasto de id 12 (`changed(EXPENSE, { id: 12 })`) más `INCOME`. No se
   ha tocado ningún fixture: `fixtures.ts` no está en los archivos del lote.
3. **T2 (c) es un solo test con cinco casos** (sin selector, selector `null`, selector
   que no encuentra nada, fila ya por debajo, fila entera por encima), para conservar el
   nombre literal. Cada caso lleva su motivo en el valor que se compara, así un fallo
   dice cuál es.
4. **En `StatementView.vue` el manejador de `@categorize` deja de ser una función en
   línea** y pasa a `onCategorize(id, categoryId)`, que escribe `touchedRow` y llama a
   `store.categorize` con los mismos dos argumentos.
5. **`onUndo` (Review) y `store.undo()` (Movements) no tocan `touchedRow`:** design §4 no
   los nombra.
6. **Cuándo mide (design §3, «riesgo conocido»): sin cambios respecto al design.** Dos
   cosas que se deducen del código y que **no he comprobado en un navegador**, por si le
   sirven a quien haga T18: (i) si el aviso ya estaba en pantalla y se actúa sobre otra
   fila, `keepClearOf` cambia al pulsar —antes de que responda el backend—, así que la
   medida se hace con el aviso anterior todavía pintado; (ii) si se actúa dos veces
   seguidas sobre la misma fila, `keepClearOf` no cambia y no se vuelve a medir.

### Trazabilidad

Los requirements de «a la vista» (R1–R7) solo se pueden demostrar en un navegador: sus
tests son del Lote B. Lo que cubre este lote:

- R1 → `ReviewView.spec.ts` › `puts the summary and its Undo inside the block after confirming a row (R1)`
- R2 → `StatementView.spec.ts` › `puts the summary and its Undo inside the block after a category change (R2)`
- R3 → `TransfersView.spec.ts` › `puts the summary and its Undo inside the block after unlinking, with no row to keep clear (R3)`
- R4, C5 → `ReviewView.spec.ts` › `holds the rule notice or the action notice, never both (R4, C5)`
- R5 → `puts the sentence of a failed action inside the block (R5)` (Review) y
  `puts the sentence of a failed write inside the block (R5)` (Movements y Transfers)
- R8, C4 → los tres `*ActionNotice.spec.ts` › `the Undo button shows the word Undo with a border and no icon`
- R9, R10 (la parte que jsdom puede ver: fondo de la página y nivel `--z-sticky`) →
  `StickyBelowTopBar.spec.ts` › `renders its slot inside a block that sticks below the top bar on the page background`
- R11 → `StickyBelowTopBar.spec.ts` › `moves the page up by the overlap when the row to keep clear is under the block`,
  `leaves the page alone when there is nothing to keep clear`,
  `measures again when the row to keep clear changes`; los dos `*Row.spec.ts` ›
  `carries the id of its movement so the notice can find it`; y
  `tells the block which row to keep clear, and none after a bulk action (R11)` (Review),
  `tells the block which line to keep clear, and none after a batch (R11)` (Movements)
- R12 → los tres `*View.spec.ts` › `paints no notice block while there is nothing to say`
- C6 → `StatementView.spec.ts` › `sits right before the selection button or bar, which stay where they were (C6)`
- C1 → el `git diff --quiet 8f0dce6 -- …` de los doce archivos, abajo

### Los tests nuevos fallan cuando el código está mal

Rompí el código a propósito de cinco maneras, lancé los tests y restauré el archivo
cada vez (al final, `diff` con la copia: idéntico):

| Cambio hecho a propósito | Tests que fallaron |
|---|---|
| `scrollBy({ top: overlap })`, signo cambiado | `moves the page up by the overlap…` y `measures again…` |
| Quitar la condición «la fila no está entera por encima del bloque» | `leaves the page alone…`, caso `the whole row above the block` |
| Quitar el `watch` de `keepClearOf` | `measures again…` |
| Quitar el `v-if` del bloque en las tres pantallas | `paints no notice block…` en los tres archivos (3 de 3) |
| No poner `touchedRow` a `null` en la acción sobre varias filas | los dos `tells the block which … to keep clear…` |

### Documentos actualizados

Ninguno: los que quedan falsos son del Lote B. `git grep` lanzados fuera de `progress/`
y `specs/`:

- `git grep -n "Undo2"` → una línea, `docs/stack.md:325`: «El aviso de la pantalla
  reutiliza `Undo2`». **Ya es falsa** (ningún archivo de `src/` importa `Undo2`). Es de
  T21 (design §8).
- `git grep -n -i "ActionNotice\|action-undo" -- docs README.md` →
  `docs/architecture.md` líneas 76, 99, 118 y 257 (la lista de componentes, donde falta
  `StickyBelowTopBar.vue`, y el párrafo del aviso copiado): también de T21.
  `docs/roadmap.md:448` es el cabo suelto 24, que describe lo que pasó; no cambia.

### Prueba real

No aplica: este lote no lee datos de fuera del código.

### Comandos lanzados y su salida

Antes de empezar, `pnpm test:unit`: `Test Files 104 passed (104)`, `Tests 1703 passed (1703)`.

Al terminar, los cuatro con su código de salida:

```
$ pnpm test:unit            → exit 0
 Test Files  105 passed (105)
      Tests  1726 passed (1726)

$ pnpm type-check           → exit 0
$ vue-tsc --build

$ pnpm lint:oxlint:check    → exit 0
$ oxlint .

$ pnpm format:check         → exit 0
Checking formatting...
All matched files use Prettier code style!
```

Por el camino salieron en rojo, y se arreglaron: `pnpm format:check` (cinco archivos de
test sin pasar por Prettier) y `pnpm lint:oxlint:check` (dos avisos en
`StickyBelowTopBar.spec.ts`: `vitest(valid-expect)` por un segundo argumento en `expect`
y `vitest(require-mock-type-parameters)` en `vi.fn()`).

Los tres `checks` de `feature_list.json` que ya se pueden ejecutar:

```
«mientras no hay nada que avisar no se pinta nada, en las tres pantallas»   → exit 0
 Test Files  3 passed (3)
      Tests  3 passed | 114 skipped (117)

«en los tres avisos el botón lleva la palabra Undo, con borde y sin icono»  → exit 0
 Test Files  3 passed | 1 skipped (4)
      Tests  3 passed | 18 skipped (21)
   (lo lancé con un archivo de más, StickyBelowTopBar.spec.ts, que no tiene ese
    test: es el «1 skipped»; los tres archivos del check pasan)

«los archivos que deciden eso son idénticos» (git diff --quiet 8f0dce6 -- …) → exit 0
```

Los otros diez `checks` nombran `e2e/action-notice-in-view.spec.ts`, que aún no existe:
es del Lote B. No he lanzado `./init.sh --checks`.

`./init.sh --fast` → exit 0 («Estado y tipos OK»). Su paso de tipos no mira los `.vue`
(`docs/lessons.md`, entrada 1): la comprobación de tipos que vale es el `pnpm type-check`
de arriba.

### Sugerencias fuera de scope (NO aplicadas)

Ninguna.

## Lote B — implementación

Fecha: 2026-10-11. **Estado: bloqueado, a la espera de decisión del leader.** Tasks
cerradas: **T11–T17, T19, T20 y T21 (10 de 12)**, marcadas `[x]` en `tasks.md`. Quedan
abiertas **T18** y **T22**: dos tests de navegador salen en rojo por cómo se comporta
`src/shared/components/StickyBelowTopBar.vue` (Lote A). No he tocado ese archivo ni
ningún otro de `src/`. `./init.sh` completo sale con 1 y `./init.sh --checks 27` da
12 de 13.

### Los dos fallos que he visto en el navegador (bloqueo)

Los dos se reproducen con:

```
pnpm test:e2e --project=chromium e2e/action-notice-in-view.spec.ts -g "the notice does not cover"
```

**Fallo 1 — con una sola acción, la fila queda tapada menos de un píxel.** Test
«the notice does not cover the row that was just changed» (el de T18 y del check 12),
escrito como pide `tasks.md`: borde superior de la fila ≥ borde inferior del bloque.

```
Error: expect(received).toBeGreaterThanOrEqual(expected)
Expected: >= 0
Received:    -0.0625
```

Medido en `Review`: el bloque va de 60 a 108 px y la fila queda con su borde superior
en 107,9375. En `Movements`, 107,703125 (diferencia −0,296875). Lo que he visto: las
filas miden un número de píxeles con decimales (73,5625 en `Review`, 57,5625 en
`Movements`) y `window.scrollY` sale siempre entero (2579, 2583, 3042…), así que
`window.scrollBy({ top: -overlap })` con un `overlap` de 48,0625 deja la página a
0,0625 px de donde hacía falta. **No lo he comprobado cambiando el código**, pero
redondear `overlap` hacia arriba (`Math.ceil`) antes de llamar a `scrollBy` dejaría la
fila entre 0 y 1 px por debajo del bloque. La alternativa es aceptar en el test una
diferencia de menos de 1 px; eso cambia la aserción que pide T18 y no lo he decidido yo.

**Fallo 2 — si se actúa dos veces seguidas sobre la misma fila, la segunda vez la
página no se mueve y la fila queda tapada.** Es el comportamiento (ii) que el Lote A
dejó sin comprobar. Test «the notice does not cover a row changed while the notice is
already showing», que **`tasks.md` no pide**: lo he añadido porque el encargo pedía el
test que demuestra el defecto. Pasos, en `Review`: se cambia la categoría de una fila
(aparece el aviso), se baja la página hasta dejar el borde superior de **otra** fila
30 px por debajo de la barra superior (la parte de arriba de la fila queda detrás del
aviso), se le cambia la categoría: la página sube y la fila queda libre. Se repite con
esa **misma** fila: la página no se mueve.

```
Error: expect(received).toBeGreaterThanOrEqual(expected)
Expected: >= 0
Received:    -17.6875
    at e2e\action-notice-in-view.spec.ts:1038:3
```

La línea 1038 es la segunda acción sobre la misma fila. Con un test de un solo uso (ya
borrado) medí lo mismo en `Movements`: −18,328125 px. La causa se lee en el código:
`StickyBelowTopBar.vue` mide al montarse y en `watch(() => props.keepClearOf, …)`, y al
repetir fila el selector es el mismo, así que el `watch` no salta. R11 dice «al aparecer
**o cambiar** el aviso tras una acción sobre una sola fila». Corregirlo pide tocar
archivos del Lote A (el componente y, probablemente, cómo le avisan las dos vistas de
que ha habido otra acción): no lo he hecho.

En este mismo test el paso anterior (otra fila con el aviso ya puesto) pasa en `Review`.
En `Movements` ese paso tiene el fallo 1 (−0,328125 px), y por eso el test no se
pondrá en verde solo con arreglar el fallo 2.

### Los dos comportamientos que el Lote A dejó sin comprobar: qué pasa de verdad

Medido en Chromium con un test de un solo uso que retrasaba 900 ms la respuesta del
`PATCH` y apuntaba `window.scrollY`, los bordes de la fila y los del bloque en cada
paso. El test está borrado; las cifras son las que escribió.

1. **Aviso ya en pantalla y acción sobre otra fila: confirmado, la medida se hace al
   pulsar, antes de que responda el backend.** `Review`: antes de pulsar, `scrollY`
   3042 y fila en 90,3125 (17,6875 px detrás del bloque); 300 ms después de pulsar, con
   el aviso anterior todavía en pantalla y sin respuesta, `scrollY` 3024 y fila en
   108,3125; al llegar la respuesta cambia la frase y no se mueve nada más. La fila
   queda libre. `Movements`: lo mismo, de 3039 a 3021, fila en 107,671875 (el fallo 1).
   Esto solo vale si el aviso nuevo mide lo mismo que el anterior: **no he comprobado**
   un aviso de más de una línea (una frase de fallo larga en una ventana estrecha).
2. **Dos veces la misma fila: confirmado, no se vuelve a medir.** Es el fallo 2.

Además, sobre el «riesgo conocido, sin comprobar» de design §3: en la primera acción
(sin aviso previo) `scrollY` pasa de 2580 a 2583 y la fila de 59,9375 a 107,9375. Esas
cifras cuadran con que Chromium, al aparecer el bloque por encima, mueva él solo la
página lo que el bloque ocupa (52 px) y después el componente la suba 48. **No he
observado el instante intermedio**, solo el antes y el después. No hizo falta cambiar
cuándo se mide.

### Archivos modificados / creados

- Creado: `e2e/action-notice-in-view.spec.ts` (12 tests: los 11 de T12–T19 y el añadido).
- Modificados: `docs/architecture.md`, `docs/stack.md`.
- Además: diez casillas de `tasks.md`, una línea de `progress/current.md` y esta sección.
- No tocados: nada de `src/`, ninguno de los once archivos de `e2e/` que ya había,
  `feature_list.json`, el backend, el motor del harness.

### Qué se hizo, task por task

- **T11.** El archivo nuevo. Cada pantalla tiene su función de rutas (`routeReview`,
  `routeMovements`, `routeTransfers`); la primera ruta de cada una aborta cualquier
  `/api` y apunta método y ruta en `watch.aborted`, que cada test comprueba vacía al
  acabar junto con los errores de consola y de página. Listas: 64 filas en `Review`,
  66 líneas en `Movements` (tres por día, del 22 al 1 del mes en curso) y 24 parejas en
  `Transfers`. `expectInView` afirma las tres cosas de la definición de
  `requirements.md` y devuelve la lista de lo que no se cumple, para que el fallo diga
  cuál. Mide con `evaluate`, que no desplaza la página. `goToBottom` baja al final y
  afirma `window.scrollY > 0`. Además, `expectStuckUnderTopBar`: el borde superior del
  bloque está a menos de 0,5 px del borde inferior de la barra superior (la segunda
  mitad de R1–R4).
- **T12–T14.** Los seis tests con sus nombres literales. Cada uno afirma también el
  cuerpo de la petición que viajó.
- **T15.** Un test, las tres pantallas. Los dos bloques vecinos se leen del DOM
  (`previousElementSibling` y `nextElementSibling` del bloque) y se comprueba cuáles
  son: `review-filters` (y `review-actions` con una fila marcada) y la lista, en
  `Review`; `statement-totals` y `statement-start-selecting`, en `Movements`; el `h1` y
  `doubtful-section`, en `Transfers`. Sin solape con ninguno, `scrollY` 0 y borde
  superior del bloque por debajo de 60 px.
- **T16.** `Review` (los dos cuerpos: `{status: 'confirmed'}` y
  `{ids: [id], status: 'pending_review'}`) y `Movements` (categoría `Groceries` y de
  vuelta a `Food`); tras cada `Undo`, `scrollY > 0`.
- **T17.** Las tres pantallas con respuesta 400. Las tres frases de fallo, con
  `expectInView`.
- **T18.** Escrito como pide la task. **En rojo: fallo 1.** Casilla sin marcar.
- **T19.** Con el aviso pegado en `Review`, se abre el diálogo de regla desde otra
  fila; en el centro del bloque, `document.elementFromPoint` devuelve un elemento que
  está dentro de `dialog-scrim` y no dentro del bloque.
- **T20.** Hecho, salida abajo: los once archivos que ya había, 46 tests, pasan sin
  tocarlos.
- **T21.** Ver «Documentos actualizados».
- **T22.** Lanzados los dos, salidas abajo, los dos en rojo. Casilla sin marcar.

### Decisiones tomadas

1. **Un test que `tasks.md` no pide** (fallo 2). Si no se quiere en el archivo, se
   borra entero: no lo nombra ningún check.
2. **T15, T16 y T17 son un test cada uno que recorre varias pantallas**, porque el
   check busca un único nombre. Cada pantalla vuelve a registrar sus rutas; las últimas
   registradas ganan.
3. **Datos inventados.** Descripciones de comercios y recibos inventadas, importes sin
   redondear (7,35, 10,52…). Los dos IBAN son los de ejemplo que publica la
   documentación bancaria, no de ninguna cuenta. No he copiado valores de los `e2e/`
   que ya había.
4. **Sin nombre corto para la primera ruta que aborta** en los comentarios del archivo
   ni en `docs/`: se describe lo que hace. `docs/stack.md` ya usaba «red de seguridad»
   en párrafos anteriores; no los he tocado ni lo he usado en el párrafo nuevo.

### Los tests nuevos fallan cuando el código está mal

Sin tocar `src/`: una hoja de estilo inyectada desde el test (cambio de un solo uso en
`goToBottom`, ya quitado; `grep -c BREAK` da 0) y la suite del archivo entera.

| Estilo inyectado en el bloque | Qué pasó |
|---|---|
| `position: static !important` | 11 de 12 en rojo. Pasa solo el de «at the top of the page» (R6), como debe: arriba del todo no cambia nada. Mensaje: `its top (-4086.0625) is above the bottom of the top bar (60)` |
| `z-index: 9999 !important` | «an open dialog paints over the notice» en rojo; los nueve de «a la vista» siguen en verde |

### Trazabilidad (lo que añade este lote)

- R1 → `Review keeps the summary and its Undo in view after confirming the last row`,
  `Review keeps the summary and its Undo in view after giving a category to the last row`
- R2, C6 → `Movements keeps the summary and its Undo in view after changing the category of the last line`,
  `Movements keeps the summary and its Undo in view at the end of the month after excluding a line`
- R3 → `Transfers keeps the summary and its Undo in view after unlinking the last pair`
- R4 → `Review keeps the rule notice and Apply rules now in view from the bottom of the list`
- R5 → `a failed action shows its error in view from the bottom of the list`
- R6 → `at the top of the page the notice sits between the same blocks as before`
- R7, C1 → `Undo pressed from the bottom of the list puts the row back`
- R9, R11 → `the notice does not cover the row that was just changed` (**en rojo**) y
  `the notice does not cover a row changed while the notice is already showing` (**en rojo**)
- R10 → `an open dialog paints over the notice`
- R8, R12 → tests unitarios del Lote A.

### Documentos actualizados

`git grep` lanzados fuera de `progress/` y `specs/` (más `grep -rn` en `src` y `e2e`,
porque `git grep` no mira los archivos sin añadir a git):

- `Undo2` → solo `docs/stack.md:325`. Corregida: la línea de la feature #24 dice ahora
  «(hasta la feature #27, que lo retira)», y hay una línea nueva de la feature #27 en
  *Iconos (Lucide)*. `grep -rn Undo2 src e2e` no encuentra nada.
- «once specs» → `docs/stack.md:511`, ahora «doce»; y un párrafo nuevo, «El duodécimo
  es `e2e/action-notice-in-view.spec.ts`…».
- `docs/architecture.md`, leído entero. **Las líneas 76, 99 y 118 que señalaba el
  Lote A siguen siendo verdad** (los tres componentes existen con ese nombre) y no las
  he cambiado. Lo que faltaba o había quedado corto: la lista de `shared/components/`
  (añadido `StickyBelowTopBar`); un párrafo nuevo de la feature #27 con lo que hace el
  componente y quién escribe `keepClearOf`; y una frase al final de los dos párrafos
  que dicen que el aviso está copiado (el de `Transfers` y el del extracto, antes
  línea 257): sigue copiado, y lo que lo deja a la vista es común. Ningún ADR cambia.
- El párrafo nuevo de `docs/architecture.md` describe lo que el código hace hoy (mide
  al montarse y cuando cambia la prop). Si el fallo 2 se corrige, esa frase hay que
  volver a mirarla.

### Prueba real

No aplica: la feature no lee datos de fuera del código.

### `pnpm test:e2e --project=chromium` entero (T20)

Exit 1. Líneas de resumen de la salida real, con `--reporter=list`:

```
Running 58 tests using 6 workers
  ok … (56 líneas)
  x  56 [chromium] › e2e\action-notice-in-view.spec.ts:959:1 › the notice does not cover the row that was just changed (5.6s)
  x  57 [chromium] › e2e\action-notice-in-view.spec.ts:1011:1 › the notice does not cover a row changed while the notice is already showing (5.8s)
  2 failed
  56 passed (29.0s)
```

De los 58, 12 son del archivo nuevo (10 en verde, 2 en rojo) y 46 de los once archivos
que ya había: los 46 en verde. `git status --short e2e/` solo lista
`?? e2e/action-notice-in-view.spec.ts`.

### Último `./init.sh` (T22)

Exit 1. Líneas `[OK]` / `[FAIL]` / `[INFO]` y de recuento de la salida real:

```
[OK]    feature_list.json válido (27 features)
[OK]    Specs presentes para features sdd con estado no-pending
[INFO]  Ejecutando: npx tsc --noEmit --incremental
[OK]    Type check OK (tsc sin errores)
[INFO]  Ejecutando: pnpm lint:oxlint:check
[OK]    OK: pnpm lint:oxlint:check
[INFO]  Ejecutando: pnpm format:check
[OK]    OK: pnpm format:check
[INFO]  Ejecutando: pnpm test:unit
 Test Files  105 passed (105)
      Tests  1726 passed (1726)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 17 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[FAIL]  E2E smoke rojo (chromium):
    Received:    -0.0625
    Received:    -17.6875
  2 failed
  56 passed (28.2s)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

### Último `./init.sh --checks 27` (T22)

Exit 1.

```
[1]  Review, confirmar la última fila                       [OK] exit 0   1 passed
[2]  Review, categoría a la última fila                     [OK] exit 0   1 passed
[3]  Movements, categoría de la última línea                [OK] exit 0   1 passed
[4]  Movements, excluir y volver a bajar                    [OK] exit 0   1 passed
[5]  arriba del todo, entre los mismos bloques              [OK] exit 0   1 passed
[6]  sin nada que avisar no se pinta nada (unitarios)       [OK] exit 0
[7]  Undo desde abajo                                       [OK] exit 0   1 passed
[8]  el botón Undo, palabra con borde y sin icono (unit.)   [OK] exit 0
[9]  el fallo, a la vista desde abajo                       [OK] exit 0   1 passed
[10] Transfers                                              [OK] exit 0   1 passed
[11] Review, la línea de la regla creada                    [OK] exit 0   1 passed
[12] la fila recién cambiada queda entera bajo el aviso     [FAIL] exit 1   1 failed
[13] los doce archivos de C1 idénticos a 8f0dce6            [OK] exit 0
[FAIL]  Checks: 12 de 13 en verde. La feature no se puede cerrar.
```

(La primera columna resume la `descripcion` de cada check; el resultado y el código de
salida son los de la salida real.) El check 12 es el fallo 1. No he tocado ningún check.

### Servidores

Antes de empezar nada respondía en el puerto 5173 ni en el 3000 (`curl` a los dos:
sin respuesta). Todas las pasadas usaron el servidor que arranca y para la
configuración de Playwright. Al acabar, `netstat` no muestra nada escuchando en 5173.

### Lo que no he comprobado

- Firefox y WebKit: solo he lanzado `--project=chromium`.
- Un aviso de más de una línea, y ventanas distintas de 1280×720.
- Que `Math.ceil` arregle el fallo 1: es una deducción de las cifras medidas.

### Sugerencias fuera de scope (NO aplicadas)

Ninguna aparte de las dos correcciones de arriba, que son del Lote A.

## Corrección tras el Lote B

Fecha: 2026-10-11. **Los dos fallos del Lote B están corregidos en el código; ningún test
se ha relajado.** Cerradas **T18** y **T22**, marcadas `[x]` en `tasks.md`: 22 de 22. La
feature sigue `in_progress`: falta la revisión. No he tocado `feature_list.json`, el
backend ni el motor del harness. Nada está commiteado.

### Archivos modificados

- `src/shared/components/StickyBelowTopBar.vue` — las dos correcciones.
- `src/shared/components/__tests__/StickyBelowTopBar.spec.ts` — tres tests nuevos (7 en
  total; los cuatro que había no cambian).
- `docs/architecture.md` — el párrafo de la feature #27, la frase de cuándo mide.
- `specs/27-action-notice-in-view/design.md` — una viñeta marcada «Corrección» en §3.
- `specs/27-action-notice-in-view/tasks.md` (dos casillas), `progress/current.md` (una
  línea) y esta sección.

No tocados: las tres vistas, ningún otro archivo de `src/`, y
`e2e/action-notice-in-view.spec.ts` (sigue con sus 12 tests y sus aserciones tal cual;
el test «the notice does not cover a row changed while the notice is already showing»
se queda).

### Fallo 1 — la fila quedaba tapada menos de un píxel

**Causa, comprobada en Chromium antes de cambiar nada.** Con una copia de un solo uso del
archivo de tests de navegador (ya borrada) que apuntaba cada llamada a `window.scrollBy`
con `window.scrollY` antes y después:

```
scrollBy [0,2579.9375]        scrollY 0    -> 2580
scrollBy [{"top":-48.0625}]   scrollY 2632 -> 2584
scrollBy [{"top":-17.6875}]   scrollY 3042 -> 3024
```

Chromium deja la página en un píxel entero, redondeando al más cercano: pedidos 48,0625
mueve 48, y pedidos 17,6875 mueve 18. Por eso el fallo salía con unas filas y con otras
no, según los decimales.

**Corrección.** `window.scrollBy({ top: -Math.ceil(overlap) })`. Con el mismo registro,
después del cambio:

```
scrollBy [{"top":-49}]   scrollY 2632 -> 2583     (Review)
scrollBy [{"top":-49}]   scrollY 2672 -> 2623     (Movements)
```

La fila queda entre 0 y 1 px por debajo del borde inferior del bloque. La aserción de T18
es la de `tasks.md`, sin tolerancia: borde superior de la fila ≥ borde inferior del bloque.

**Lo que he comprobado además y lo que no.** Lancé esos dos tests con el
`deviceScaleFactor` de Playwright en 1,25, 1,5, 1,75 y 2: pasan, y `window.scrollY` sigue
saliendo entero en los cuatro. Eso es la emulación de Playwright en Chromium sin ventana;
**no lo he comprobado** en una pantalla real con escalado de Windows, ni con el zoom del
navegador, ni en Firefox ni WebKit.

### Fallo 2 — la segunda acción sobre la misma fila no volvía a medir

**Corrección.** El componente mide ahora en tres momentos: al montarse (`onMounted`), al
cambiar `keepClearOf` (`watch`, como antes) y cada vez que Vue vuelve a pintarlo
(`onUpdated`). Lo tercero es lo nuevo: el contenido del slot lee la frase del store, así
que cuando la frase cambia, Vue vuelve a pintar el componente aunque el selector sea el
mismo. Como una misma acción puede disparar dos de esos tres momentos a la vez, una
variable (`waiting`) hace que mientras hay una medida esperando al
`requestAnimationFrame` no se pida otra: sale una sola medida y una sola llamada a
`scrollBy`.

Las vistas no cambian: no hizo falta que avisaran de nada al componente.

Registro de `scrollBy` en el test del navegador, las dos acciones seguidas sobre la misma
fila (entre una y otra el test vuelve a bajar la página):

```
scrollBy [{"top":-18}]   scrollY 3042 -> 3024     (Review, primera vez)
scrollBy [{"top":-18}]   scrollY 3042 -> 3024     (Review, segunda vez, misma fila)
scrollBy [{"top":-19}]   scrollY 3039 -> 3020     (Movements, primera vez)
scrollBy [{"top":-19}]   scrollY 3039 -> 3020     (Movements, segunda vez, misma fila)
```

**Una consecuencia de medir cada vez que se vuelve a pintar, que no cubre ningún test de
navegador:** al pulsar `Undo` también cambia la frase, y la vista conserva el selector de
la última fila tocada (`onUndo` y `store.undo()` no lo cambian, como dejó el Lote A). Si
en ese momento esa fila está en parte detrás del bloque, la página sube lo justo para
dejarla libre. Lo leo en el código; **no lo he comprobado en el navegador**. Es la fila
que el `Undo` acaba de cambiar, así que no contradice R11, pero el design no lo nombra.

### Tests unitarios nuevos (`StickyBelowTopBar.spec.ts`)

- `rounds the overlap up, because the browser keeps the page at a whole pixel` — bloque
  de 60 a 108 y fila con el borde superior en 59,9375: `scrollBy` recibe `{ top: -49 }`.
- `measures again when what it shows changes and the row to keep clear is the same` —
  un componente de prueba que hace de vista: cambia la frase del slot con el mismo
  selector, y `scrollBy` se llama por segunda vez.
- `measures once when the sentence and the row to keep clear change together` — cambian
  a la vez el selector y la frase: una sola llamada.

Fallan cuando el código está mal. Rompí el componente de tres maneras, lancé el archivo
y lo restauré cada vez (al final, `diff` con la copia: idéntico):

| Cambio hecho a propósito | Tests que fallaron |
|---|---|
| Quitar `onUpdated(keepRowClear)` | `measures again when what it shows changes…` |
| `-overlap` en vez de `-Math.ceil(overlap)` | `rounds the overlap up…` |
| Quitar `if (waiting) return` | `measures once when the sentence and the row…` y `measures again when the row to keep clear changes` |

### Trazabilidad (lo que cambia)

- R9, R11 → `the notice does not cover the row that was just changed` (**ahora en
  verde**) y `the notice does not cover a row changed while the notice is already showing`
  (**ahora en verde**, `Review` y `Movements`); y en `StickyBelowTopBar.spec.ts`, los tres
  tests nuevos junto a los que ya había.

### Documentos actualizados

`git grep -n -i "cada vez que esa prop\|cuando cambia la prop\|scrollBy\|al montarse"`
fuera de `progress/` y `specs/` → dos líneas sobre este componente, las dos en el párrafo
de la feature #27 de `docs/architecture.md` (199 y 202). Corregidas: ahora dice los tres
momentos en que mide, que redondea hacia arriba y por qué, y que varias causas a la vez
dan una sola medida. La tercera línea que sale (`docs/architecture.md:247`) habla de otra
función y no cambia.

En `design.md` §3, una viñeta «Corrección (2026-10-11, tras el Lote B)» con los dos
cambios; el resto del design queda como estaba.

### Comandos lanzados y su salida

```
$ pnpm test:unit            → exit 0
 Test Files  105 passed (105)
      Tests  1729 passed (1729)

$ pnpm type-check           → exit 0
$ vue-tsc --build

$ pnpm lint:oxlint:check    → exit 0
$ oxlint .

$ pnpm format:check         → exit 0
Checking formatting...
All matched files use Prettier code style!

$ pnpm test:e2e --project=chromium --reporter=list   → exit 0
Running 58 tests using 6 workers
  ok … (58 líneas «ok», ninguna «x»)
  ok 56 [chromium] › e2e\action-notice-in-view.spec.ts:959:1 › the notice does not cover the row that was just changed (996ms)
  ok 57 [chromium] › e2e\action-notice-in-view.spec.ts:1011:1 › the notice does not cover a row changed while the notice is already showing (1.3s)
  58 passed (18.3s)
```

De los 58, 12 son de `e2e/action-notice-in-view.spec.ts` y 46 de los once archivos que
ya había. `git status --short e2e/` solo lista `?? e2e/action-notice-in-view.spec.ts`.

Para ver si alguno pasa unas veces sí y otras no, el archivo de la feature diez veces
seguidas:

```
$ pnpm test:e2e --project=chromium e2e/action-notice-in-view.spec.ts --repeat-each=10
  120 passed (41.0s)
```

### Último `./init.sh` (T22)

Exit 0. Líneas de la salida real (quitadas las de «Existe <archivo>»):

```
[OK]    feature_list.json válido (27 features)
[OK]    Specs presentes para features sdd con estado no-pending
[INFO]  Ejecutando: npx tsc --noEmit --incremental
[OK]    Type check OK (tsc sin errores)
[INFO]  Ejecutando: pnpm lint:oxlint:check
[OK]    OK: pnpm lint:oxlint:check
[INFO]  Ejecutando: pnpm format:check
[OK]    OK: pnpm format:check
[INFO]  Ejecutando: pnpm test:unit
 Test Files  105 passed (105)
      Tests  1729 passed (1729)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 17 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último `./init.sh --checks 27` (T22)

Exit 0. Los trece salen `[OK] exit 0`, y la última línea de la salida real es:

```
[OK]    Checks: 13 de 13 en verde.
```

El check 12 (`the notice does not cover the row that was just changed`) es el que estaba
en rojo. No he tocado ningún check.

### Servidores

Antes de empezar, `netstat` no mostraba nada escuchando en 5173 ni en 3000. Todas las
pasadas usaron el servidor que arranca y para la configuración de Playwright. Al acabar,
`netstat` no muestra nada escuchando en 5173. No he parado ningún proceso.

### Lo que no he comprobado

- Firefox y WebKit: solo `--project=chromium`.
- Una pantalla real con escalado, y el zoom del navegador (ver fallo 1).
- Un aviso de más de una línea, y ventanas distintas de 1280×720.
- El `Undo` con la fila tocada en parte detrás del bloque (ver fallo 2).

### Sugerencias fuera de scope (NO aplicadas)

Ninguna.
