# Resumen — feature 27 `action-notice-in-view`

Fecha de cierre: 2026-10-11
Intención original: `feature_list.json` → feature `action-notice-in-view`, bloque `intent`
Spec (si SDD): `specs/27-action-notice-in-view/`

## Qué hace ahora la app que antes no

En `Review`, `Movements` y `Transfers`, la línea que dice lo último que hiciste, con su
botón `Undo` (o la frase de un fallo), se queda justo debajo de la barra de arriba
cuando bajas por la página. Antes estaba solo encima de la lista y, con la página
bajada, no se veía. Lo mismo vale para la línea verde de `Review` con `Apply rules now`.
El botón `Undo` ya no lleva la flecha curva: es la palabra `Undo` con fondo y borde. Y
si la fila que acabas de cambiar queda detrás de esa línea, la página sube unos píxeles
para que la fila se vea entera.

## Por dónde se toca (puntos de entrada)

> Los únicos con número de línea, y son clicables.

| Cómo se usa | Código |
| --- | --- |
| El componente común que deja lo que envuelve bajo la barra superior y sube la página si tapa la fila | [StickyBelowTopBar.vue:35](../../src/shared/components/StickyBelowTopBar.vue#L35) |
| `Review`: envuelve la línea de la regla creada o la de la última acción | [ReviewView.vue:35](../../src/features/review/views/ReviewView.vue#L35) |
| `Movements`: envuelve la línea de la última escritura | [StatementView.vue:41](../../src/features/statement/views/StatementView.vue#L41) |
| `Transfers`: envuelve la línea de la última escritura, sin fila que dejar libre | [TransfersView.vue:8](../../src/features/transfers/views/TransfersView.vue#L8) |

## Dónde está el código

> Todo lo que la feature creó o tocó, por tema. Enlace al archivo, sin línea, y
> el símbolo al lado: ninguno de los dos caduca.

### El componente común

| Qué hace | Dónde |
| --- | --- |
| El `div` con `position: sticky`, fondo de la página y el nivel de la barra superior | [StickyBelowTopBar.vue](../../src/shared/components/StickyBelowTopBar.vue) → `data-test="sticky-below-top-bar"` |
| Recibe el selector de la fila que no debe quedar tapada | [StickyBelowTopBar.vue](../../src/shared/components/StickyBelowTopBar.vue) → prop `keepClearOf` |
| Mide y sube la página (al montarse, al cambiar la prop y cada vez que Vue vuelve a pintar lo que envuelve), redondeando hacia arriba | [StickyBelowTopBar.vue](../../src/shared/components/StickyBelowTopBar.vue) → `keepRowClear` |

### Las tres pantallas

| Qué hace | Dónde |
| --- | --- |
| Decide si hay algo que avisar en `Review` | [ReviewView.vue](../../src/features/review/views/ReviewView.vue) → `hasNotice` |
| Guarda qué fila se acaba de tocar en `Review` | [ReviewView.vue](../../src/features/review/views/ReviewView.vue) → `touchedRow`, `rowSelector`; se escribe en `onConfirmOne`, `onCategorizeOne`, `onCreateRule` y se borra en `run` |
| Decide si hay algo que avisar en `Movements` | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `hasNotice` |
| Guarda qué línea se acaba de tocar en `Movements` | [StatementView.vue](../../src/features/statement/views/StatementView.vue) → `touchedRow`, `onCategorize`; también `onCreateRule`, y se borra en `askOrWrite` |
| Pinta el componente en `Transfers` solo con frase de resultado o de fallo | [TransfersView.vue](../../src/features/transfers/views/TransfersView.vue) → `StickyBelowTopBar` |

### Las filas

| Qué hace | Dónde |
| --- | --- |
| La fila de `Review` lleva el id de su movimiento | [MovementRow.vue](../../src/features/review/components/MovementRow.vue) → `data-movement-id` |
| La línea de `Movements` lleva el id de su movimiento | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `data-movement-id` |

### El botón `Undo`

| Qué hace | Dónde |
| --- | --- |
| `Undo` de `Review`: variante `secondary`, sin icono | [ActionNotice.vue](../../src/features/review/components/ActionNotice.vue) → `data-test="action-undo"` |
| `Undo` de `Movements`: ídem | [StatementActionNotice.vue](../../src/features/statement/components/StatementActionNotice.vue) → `data-test="statement-action-undo"` |
| `Undo` de `Transfers`: ídem | [TransfersActionNotice.vue](../../src/features/transfers/components/TransfersActionNotice.vue) → `data-test="transfers-action-undo"` |

### Documentos

| Qué cambia | Dónde |
| --- | --- |
| El componente nuevo en la lista de `shared/components/` y un párrafo de la feature #27 | [architecture.md](../../docs/architecture.md) → «La frase de la última acción se ve con la página bajada (feature #27)» |
| Sale el icono `Undo2`; los archivos de `e2e/` pasan a doce; qué mide el duodécimo | [stack.md](../../docs/stack.md) → *Iconos (Lucide)*, «El duodécimo es `e2e/action-notice-in-view.spec.ts`» |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Clases del `div`, cuándo sube la página y cuánto, cuándo no la toca, una sola medida por instante (7 tests) | [StickyBelowTopBar.spec.ts](../../src/shared/components/__tests__/StickyBelowTopBar.spec.ts) → `StickyBelowTopBar (feature 27)` |
| `Review`: sin nada que avisar no se pinta; la frase y el `Undo` dentro; regla o acción, nunca las dos; qué fila se le pasa; el fallo dentro | [ReviewView.spec.ts](../../src/features/review/__tests__/ReviewView.spec.ts) → `the block that keeps the notice under the top bar (feature 27)` |
| `Movements`: lo mismo, y que sigue justo antes del botón o la barra de selección | [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts) → `the block that keeps the notice under the top bar (feature 27)` |
| `Transfers`: lo mismo, sin fila que dejar libre | [TransfersView.spec.ts](../../src/features/transfers/__tests__/TransfersView.spec.ts) → `the block that keeps the notice under the top bar (feature 27)` |
| El botón `Undo`: palabra, borde, sin icono | [ActionNotice.spec.ts](../../src/features/review/__tests__/ActionNotice.spec.ts), [StatementActionNotice.spec.ts](../../src/features/statement/__tests__/StatementActionNotice.spec.ts), [TransfersActionNotice.spec.ts](../../src/features/transfers/__tests__/TransfersActionNotice.spec.ts) → `the Undo button shows the word Undo with a border and no icon` |
| Las filas llevan su id | [MovementRow.spec.ts](../../src/features/review/__tests__/MovementRow.spec.ts), [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) → `carries the id of its movement so the notice can find it` |
| En un navegador, con el backend imitado: la línea y su botón dentro de la ventana y sin nada encima, desde el final de la lista, en las tres pantallas; arriba del todo; `Undo` desde abajo; el fallo; la fila recién cambiada; el diálogo por encima (12 tests) | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `expectInView`, `expectRowClearOfNotice`, `routeReview`, `routeMovements`, `routeTransfers` |

## Cumplimiento de la intención

Resultados de `./init.sh --checks 27` lanzado por el reviewer el 2026-10-11: 13 de 13
en verde.

- ✅ "En `Review`, bajo hasta el final de la lista, pulso `Confirm` en una fila y, sin
  subir, veo qué ha pasado y el botón para deshacerlo." → se cumple; lo verifica
  `Review keeps the summary and its Undo in view after confirming the last row`.
  Check 1: ✅ `1 passed`.
- ✅ "Lo mismo al poner una categoría a una fila del final de la lista." → se cumple;
  `Review keeps the summary and its Undo in view after giving a category to the last row`.
  Check 2: ✅ `1 passed`.
- ✅ "En `Movements`, lo mismo al cambiar la categoría de una línea del final del mes y
  al marcar que un movimiento no cuenta." → se cumple, con un matiz que aprobaste: para
  marcar que no cuenta sigues subiendo a pulsar `Exclude from totals`, y la línea te
  sigue al volver a bajar. `Movements keeps the summary and its Undo in view after
  changing the category of the last line` y `… at the end of the month after excluding
  a line`. Checks 3 y 4: ✅ `1 passed` cada uno.
- ✅ "Si estoy arriba del todo, lo sigo viendo, como hasta ahora." → se cumple;
  `at the top of the page the notice sits between the same blocks as before` y, en las
  tres pantallas, `paints no notice block while there is nothing to say`.
  Check 5: ✅ `1 passed`. Check 6: ✅ `3 passed` (lanzado aparte para ver el recuento).
- ✅ "Pulso deshacer desde ahí abajo y la fila vuelve a como estaba." → se cumple;
  `Undo pressed from the bottom of the list puts the row back`. Check 7: ✅ `1 passed`.
- ✅ a medias, "El botón de deshacer no se confunde con uno de recargar." → se comprueba
  que lleva la palabra `Undo`, borde y ningún icono
  (`the Undo button shows the word Undo with a border and no icon`). Check 8: ✅
  `3 passed`. Si se confunde o no, solo lo puedes decir tú mirándolo.
- ✅ "Si lo que hice falla, el mensaje de error también lo veo desde donde estoy." → se
  cumple en las tres pantallas; `a failed action shows its error in view from the bottom
  of the list`. Check 9: ✅ `1 passed`.
- ✅ (respuesta) entra `Transfers` → `Transfers keeps the summary and its Undo in view
  after unlinking the last pair`. Check 10: ✅ `1 passed`.
- ✅ (respuesta) entra la línea de `Review` tras crear una regla → `Review keeps the
  rule notice and Apply rules now in view from the bottom of the list`.
  Check 11: ✅ `1 passed`.
- ✅ (no quiero) que el aviso tape la fila que estoy mirando → `the notice does not
  cover the row that was just changed`. Check 12: ✅ `1 passed`.
- ✅ (no quiero) que cambie qué hace cada acción ni qué deshace el `Undo` → los doce
  archivos que lo deciden son idénticos a los del commit `8f0dce6`. Check 13: ✅ exit 0.

## Decisiones que se tomaron por ti

- (delegado) Cómo se ve: la línea se queda bajo la barra de arriba al bajar. Vive en
  `StickyBelowTopBar.vue`.
- (delegado) El botón: se quita la flecha y queda la palabra `Undo` con fondo y borde.
- (delegado) Una pieza común solo para lo de quedarse a la vista; cada pantalla conserva
  su línea propia.
- (añadido) La página sube unos píxeles si la fila recién cambiada queda detrás de la
  línea.
- (añadido) La línea queda por debajo de los diálogos.
- (añadido) `Exclude from totals`, `Include in totals`, `Confirm N movements` y
  `Apply category` siguen encima de la lista.
- (añadido) Al pulsar `Undo` desde abajo la página no vuelve al principio.

## Qué NO se tocó / quedó fuera

- El backend, y ningún `store.ts`, `service.ts`, `actions.ts` ni `pairs.ts`.
- La línea gris de `Review` que avisa de que la página pedida ya no existe, los mensajes
  de fallo de carga y los avisos de `Rules` e `Import`.
- Las acciones sobre varias filas siguen pidiendo subir a pulsar su botón.

## Notas para el futuro (opcional)

Medido por el reviewer en Chromium, 1280×720; ninguna incumple un requirement:

- Al pulsar `Undo` con la última fila tocada en parte detrás de la línea, la página sube
  unos 19 px. En `Movements` la línea pierde entonces el botón y encoge, y la fila queda
  unos 13 px más abajo de lo necesario. En `Review` la línea desaparece tras el `Undo`.
- Al abrir el diálogo de regla desde una fila que está en parte detrás de la línea, la
  página sube unos 19 px aunque la fila no haya cambiado.
- Si una acción falla justo después de otra que salió bien, la línea encoge (la frase
  de fallo no lleva botón) y la fila queda unos 13 px más abajo de lo necesario.
- Sin comprobar: Firefox y WebKit (no están instalados en esta máquina), una pantalla
  con escalado de Windows, el zoom del navegador, y una línea de más de un renglón en
  `Movements` y `Transfers` (en `Review` sí, a 700 y 420 px de ancho).
