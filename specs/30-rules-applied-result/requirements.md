# Requirements — F30 `rules-applied-result`

Pantallas `Rules` (`src/features/category-rules/`) y `Review` (`src/features/review/`).
13 requirements en firme, 1 propuesto y pendiente del sí del humano (R16), y 4
restricciones. No se toca el backend.

> **Rehecho el 2026-10-13.** El backend devuelve ya qué movimientos categoriza
> (`categorizedMovements`, su feature 56). Desaparecen las dos lecturas de todas las
> páginas y la comparación. Los identificadores se conservan: R5 a R15 dicen lo mismo
> que en la versión aprobada el 2026-10-12; R1 y R2 se han reescrito; R3 y R4 se
> retiran y no se reutilizan; R16 y C4 son nuevos.

## Definiciones usadas en todo el documento

- **Pendiente sin categoría:** movimiento con `status: 'pending_review'` y
  `categoryId: null`.
- **Movimiento categorizado:** un elemento de `categorizedMovements` en la respuesta de
  `POST /api/category-rules/apply`: `movementId`, `description`, `bookingDate`,
  `amount`, `type`, `categoryId`, `categoryName` y `rules` (cada una con `ruleId` y
  `matchText`).
- **Resultado de la última aplicación:** lo que el store de reglas guarda en memoria
  cuando `POST /api/category-rules/apply` termina sin `error`: la hora y la respuesta
  ya validada (`categorized`, `categorizedMovements`, `unmatched`, `conflictCount`,
  `conflicts`).
- **El bloque del resultado:** el componente `LastApplyReport.vue`
  (`data-test="last-apply"`), que se pinta en `Rules` y en `Review`.

## Saber cuáles se categorizaron (servicio y store de reglas)

## R1
CUANDO `POST /api/category-rules/apply` responde, el sistema DEBE validar
`categorizedMovements` campo a campo (lista; en cada elemento `movementId` entero,
`description` texto, `bookingDate` fecha `YYYY-MM-DD`, `amount` decimal de dos
decimales, `type` `income` o `expense`, `categoryId` entero, `categoryName` texto y
`rules` lista de `ruleId` entero y `matchText` texto) y guardarla en el resultado en el
orden en que llega.

## R2
SI la respuesta no trae `categorizedMovements`, uno de sus elementos no cumple R1, o la
lista no tiene exactamente `categorized` elementos, ENTONCES el sistema DEBE tratarla
como una respuesta ilegible: la ventana queda en el paso `failed` con la frase que ya
existe para ese caso (`Something went wrong applying the rules. Some movements may
already be categorized. The review queue has been reloaded.`) y no se guarda ningún
resultado.

## R3
*(Retirado el 2026-10-13: era la lectura de todos los pendientes después de aplicar.)*

## R4
*(Retirado el 2026-10-13: era «no se enseña la lista si falla la lectura o no cuadra».
Lo que queda de ese caso está en R2.)*

## El bloque del resultado (`LastApplyReport.vue`, en `Rules` y en `Review`)

## R5
MIENTRAS hay un resultado de la última aplicación guardado, el sistema DEBE pintar el
bloque del resultado en `Rules` y en `Review`, debajo del título de la pantalla, con el
titular (`data-test="last-apply-headline"`) `Rules applied at <HH:MM>: <N> movements
categorized.` (`1 movement categorized.` en singular) y, debajo
(`data-test="last-apply-figures"`), `<unmatched> still without a matching rule ·
<conflictCount> conflicts` (`1 conflict` en singular).

## R6
SI `categorized` es 0 ENTONCES el sistema DEBE pintar como titular `Rules applied at
<HH:MM>: no movements were categorized.`, sin botón de lista.

## R7
CUANDO el usuario pulsa `Show the <N> movements`
(`data-test="last-apply-show-movements"`), el sistema DEBE pintar una fila
(`data-test="last-apply-movement"`) por cada movimiento categorizado, con su fecha, su
concepto, su importe (con signo menos si `type` es `expense`) y el nombre de la
categoría que se le escribió (`data-test="last-apply-movement-category"`,
`categoryName`).

## R8
MIENTRAS el resultado guardado trae choques (`conflicts` no vacío), el sistema DEBE
ofrecer en el bloque el botón `Show the <N> conflicts`
(`data-test="last-apply-show-conflicts"`, `<N>` = `conflictCount`) que despliega la
misma lista de choques que enseña la ventana `Rules applied` (`RuleConflictList`).

## R9
CUANDO el usuario pulsa `Dismiss` (`data-test="last-apply-dismiss"`), el sistema DEBE
borrar el resultado guardado, de modo que el bloque deja de pintarse en las dos
pantallas.

## R10
CUANDO el usuario confirma otra aplicación de las reglas, el sistema DEBE borrar el
resultado guardado antes de enviar el `POST`.

## R11
El sistema NO DEBE guardar el resultado de la última aplicación fuera de la memoria de
la página (ni `localStorage`, ni `sessionStorage`, ni la URL): un store recién creado
no tiene resultado y el bloque no se pinta.

## R12
SI el `POST` falla o responde con `error` ENTONCES el sistema NO DEBE guardar ningún
resultado (la ventana enseña el mensaje de fallo de hoy y el bloque no se pinta).

## Cuántos pendientes siguen sin categoría (`Review`)

## R13
CUANDO se abre `Review`, el sistema DEBE pedir
`status=pending_review&uncategorized=true&page=1&pageSize=1` y pintar en la cabecera
(`data-test="review-uncategorized-count"`) la frase con su `pagination.total`:
`<N> pending movements have no category.`, `1 pending movement has no category.` o, con
0, `Every pending movement has a category.`

## R14
CUANDO el store de `Review` vuelve a pedir su página después de una acción, de un
`Undo` o de una aplicación de las reglas (`refreshAfterAction`), el sistema DEBE volver
a hacer la petición de R13.

## R15
SI la petición de R13 falla ENTONCES el sistema NO DEBE pintar la frase (ni un número
anterior ni un error).

## Propuesto, pendiente del sí del humano

## R16
DONDE el humano haya aprobado la decisión 2 de la hoja, el sistema DEBE pintar en cada
fila de R7, debajo del concepto, el texto de cada regla que casó con ese movimiento
(`data-test="last-apply-movement-rule"`, `matchText` entre comillas tipográficas, en el
orden de `rules`).

**Si el humano no la aprueba, R16 no se implementa** y la fila queda como dice R7. R1
valida `rules` en los dos casos: es parte del contrato.

## Restricciones (lo que no cambia; cada una con su test)

- **C1** — Confirmar la aplicación de las reglas hace que el store de reglas mande
  **una sola petición**: `POST /api/category-rules/apply`, sin cuerpo. Ningún `GET` y
  ningún `PATCH` sale de `confirmApply`, así que nada se confirma. (Las lecturas que
  `Review` hace después por su cuenta, al cambiar `applyRun`, son las de hoy más la de
  R14.)
- **C2** — Lo que dejó la feature 27 en `Review` no cambia: el bloque del resultado se
  pinta **fuera** de `StickyBelowTopBar`; `hasNotice` sigue dependiendo de las mismas
  tres fuentes; el aviso de regla creada y el de la última acción siguen sin salir a la
  vez; y una aplicación de las reglas sigue borrando el `Undo` y las casillas marcadas.
- **C3** — La ventana `Rules applied` (paso `done` de `ApplyRulesDialog`) sigue
  enseñando las tres cifras y la lista de choques de hoy, sin cambios.
- **C4** — `parseImportReport` (`src/features/import/service.ts`) sigue leyendo el
  informe de `POST /api/import` cuando su `categorization` trae `categorizedMovements`,
  y sigue sin enseñar ni guardar esa lista: lo que categorizan las reglas al importar
  queda fuera de esta feature.

## Cobertura de `como_se_que_esta_bien`

| Frase del humano | Requirements |
|---|---|
| Aplico las reglas y, al cerrar la ventana, veo cuántos se han categorizado | R5 |
| Desde ahí puedo ver la lista, cada uno con su categoría | R1, R7 |
| Si no se ha categorizado ninguno, me lo dice con esas palabras | R6 |
| Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin categoría | R13, R14 |
| Si recargo la página, lo que veo sigue siendo verdad | R11, R13, R15 |

## Procedencia

- R1 — (humano) Respuesta del 2026-10-12: «prefirió que el backend devuelva qué
  movimientos categoriza en vez de que el frontend lo deduzca comparando antes y
  después». Resuelve el «de dónde sale la lista» que había delegado.
- R2 — (añadido) El humano no dijo qué pasa si la respuesta no cumple el contrato (sin
  lista, o con otro número de elementos que `categorized`). Propongo tratarla como
  cualquier otra respuesta ilegible: sin recuadro, y la ventana dice que algo falló y
  que puede haber movimientos ya categorizados. No es un caso normal: el contrato
  promete que la lista cuadra siempre. ← REVISAR EN APROBACIÓN.
- R5 — (humano) «al cerrar la ventana, veo cuántos movimientos se han categorizado sin
  tener que acordarme del número». (delegado) «Dónde se enseña»: en `Rules` y en
  `Review`, el mismo bloque. La hora en el titular es (añadido): hace que la frase siga
  siendo cierta aunque pase el tiempo. Aprobado el 2026-10-12.
- R6 — (humano) «Si no se ha categorizado ninguno, me lo dice con esas palabras.»
- R7 — (humano) «puedo ver la lista de los movimientos que se acaban de categorizar,
  cada uno con la categoría que le han puesto». Que la lista esté plegada tras un botón
  es (delegado), parte de «dónde se enseña». Aprobado el 2026-10-12.
- R8 — (humano) Respuesta del 2026-10-12: «la lista de choques sigue a la vista igual
  que la de lo categorizado».
- R9 — (delegado) «Cuánto tiempo sigue a la vista»: hasta que lo quita él con
  `Dismiss`. Aprobado el 2026-10-12.
- R10 — (delegado) «Cuánto tiempo sigue a la vista»: hasta la siguiente aplicación.
  Aprobado el 2026-10-12.
- R11 — (delegado/añadido) Su frase «si recargo la página, lo que veo sigue siendo
  verdad» y su respuesta «le basta con verlo justo después de aplicar». Tras recargar no
  se ve nada del resultado. Aprobado el 2026-10-12.
- R12 — (añadido) El humano no habló de una aplicación que falla. Se deja como hoy,
  sin bloque. El contrato dice que en ese caso la lista trae lo que sí se escribió; no
  se enseña porque el humano no lo pidió y la ventana ya avisa de que puede haber
  movimientos categorizados.
- R13 — (humano) «Sin aplicar nada, en `Review` veo cuántos pendientes siguen sin
  categoría.» El texto exacto y que cueste una petición más son (añadido), aprobados el
  2026-10-12.
- R14 — (añadido) Para que el número de R13 no quede viejo tras una acción; sale de «lo
  que veo sigue siendo verdad». Aprobado el 2026-10-12.
- R15 — (añadido) Mismo criterio que el número del menú: si no se sabe, no se pinta.
  Aprobado el 2026-10-12.
- R16 — (añadido, **propuesto y no dado por hecho**) El humano no pidió ver la regla.
  El dato llega ahora con cada movimiento, y su «por qué» es «comprobar que mis reglas
  hacen lo que yo creía». Solo se implementa con su sí. ← REVISAR EN APROBACIÓN.
- C1 — (humano) «No quiero que aplicar las reglas confirme nada.» Y, del encargo del
  2026-10-13: aplicar vuelve a costar una sola petición.
- C2 — (añadido) Protege lo que cerró la feature 27; lo pidió el leader al encargar el
  spec.
- C3 — (añadido) El humano no pidió cambiar la ventana.
- C4 — (humano) Respuesta del 2026-10-12: «lo que categorizan las reglas al importar
  queda fuera». Que se demuestre con un test que la lectura del informe no se rompe lo
  pidió el leader al encargar el spec.
